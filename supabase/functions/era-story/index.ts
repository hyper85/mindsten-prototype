// POST { personId: number } → EraStory
//
// Generates a short, grounded Danish narrative about the time a person lived
// in ("Tidsvindue"). Grounded in the curated era facts from _shared/history.ts
// and the person's stored bio. Cached in era_stories so each person is only
// generated once.

import { adminClient, checkRateLimits, numberEnv } from '../_shared/clients.ts';
import { generateJson, LlmRateLimitError, modelName } from '../_shared/llm.ts';
import { buildEraSnapshot, eraSnapshotToPromptContext } from '../_shared/era.ts';
import { clientIp, json, readJsonBody, serve } from '../_shared/http.ts';

const MAX_BODY_BYTES = 32_768;

const SYSTEM = `Du er formidler på et dansk kulturhistorisk museum og skriver "Tidsvinduer":
korte, levende tekster der lader en besøgende på en kirkegård opleve den tid, en afdød person levede i.

Regler:
- Skriv på klart, varmt og respektfuldt dansk. Ingen sensationslyst, ingen spøg med døden.
- Om personen selv må du KUN bruge de oplysninger, du får i beskeden. Opfind ikke citater, relationer eller begivenheder.
- Om tiden må du bruge de givne fakta og almindeligt kendt, veldokumenteret danmarkshistorie. Undlad præcise tal, du ikke er sikker på.
- Forbind gerne personens liv med tiden: hvor gammel var personen, da noget skete?
- Afsnittet "imagine" er en kort sansebeskrivelse i anden person ("Forestil dig …") af en almindelig dag i personens by og tid — tydeligt som en forestilling, ikke som fakta om personen.
- Hold det kort: intro 2-3 sætninger, 3-4 afsnit á 2-4 sætninger.`;

const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'intro', 'sections', 'imagine'],
  properties: {
    title: { type: 'string' },
    intro: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['heading', 'body'],
        properties: { heading: { type: 'string' }, body: { type: 'string' } },
      },
    },
    imagine: { type: 'string' },
  },
} as const;

interface StoryContent {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  imagine: string;
}

serve(async (req) => {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  const personId = Number(body.personId);
  if (!Number.isSafeInteger(personId) || personId <= 0)
    return json({ error: 'invalid_person' }, 400);

  const sb = adminClient();

  // Cache hits and unknown/unsuitable persons cost no rate-limit budget.
  const cached = await sb
    .from('era_stories')
    .select('content, model')
    .eq('person_id', personId)
    .maybeSingle();
  if (cached.data)
    return json({ ...(cached.data.content as StoryContent), model: cached.data.model });

  const { data: person, error } = await sb
    .from('persons')
    .select(
      'id, name, birth_year, death_year, birth_place, death_place, profession, city, cemetery, short_bio, full_bio',
    )
    .eq('id', personId)
    .maybeSingle();
  if (error) throw new Error(`person lookup failed: ${error.message}`);
  if (!person) return json({ error: 'not_found' }, 404);
  if (!person.birth_year && !person.death_year) return json({ error: 'missing_years' }, 422);

  const allowed = await checkRateLimits(
    sb,
    'story',
    clientIp(req),
    numberEnv('STORY_LIMIT_PER_HOUR', 20),
    numberEnv('STORY_LIMIT_PER_DAY', 1000),
  );
  if (!allowed) return json({ error: 'rate_limited' }, 429);

  const birthYear = person.birth_year ?? person.death_year - 60;
  const deathYear = person.death_year ?? person.birth_year + 60;
  const snapshot = buildEraSnapshot(birthYear, deathYear);

  const userPrompt = `Person:
Navn: ${person.name}
Levetid: ${person.birth_year ?? 'ukendt'}–${person.death_year ?? 'ukendt'}
Fødested: ${person.birth_place ?? 'ukendt'} · Dødssted: ${person.death_place ?? 'ukendt'}
Virke: ${person.profession || 'ukendt'}
Begravet: ${person.cemetery || 'ukendt'}${person.city ? `, ${person.city}` : ''}
Biografi: ${person.full_bio || person.short_bio || '(ingen)'}

Fakta om tiden (kurateret):
${eraSnapshotToPromptContext(snapshot)}

Skriv et Tidsvindue om ${person.name}s tid.`;

  let story: StoryContent;
  try {
    const result = await generateJson<StoryContent>({
      system: SYSTEM,
      schema: STORY_SCHEMA,
      effort: 'medium',
      maxTokens: 16000,
      content: userPrompt,
    });
    if (!result) return json({ error: 'refused' }, 422);
    if (
      typeof result.title !== 'string' ||
      typeof result.intro !== 'string' ||
      !Array.isArray(result.sections)
    ) {
      throw new Error('story does not match schema');
    }
    story = {
      title: result.title,
      intro: result.intro,
      sections: result.sections
        .filter((x) => typeof x?.heading === 'string' && typeof x?.body === 'string')
        .map(({ heading, body }) => ({ heading, body })),
      imagine: typeof result.imagine === 'string' ? result.imagine : '',
    };
  } catch (err) {
    if (err instanceof LlmRateLimitError) return json({ error: 'rate_limited' }, 429);
    console.error('story generation failed', err instanceof Error ? err.message : String(err));
    return json({ error: 'generation_failed' }, 502);
  }

  const model = modelName();
  const { error: cacheError } = await sb
    .from('era_stories')
    .upsert({ person_id: personId, content: story, model });
  if (cacheError) console.error('caching era story failed', cacheError.message);

  return json({ ...story, model });
});
