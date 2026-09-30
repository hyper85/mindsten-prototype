// POST { personId: number } → EraStory
//
// Generates a short, grounded Danish narrative about the time a person lived
// in ("Tidsvindue"). Grounded in the curated era facts from _shared/history.ts
// and the person's stored bio. Cached in era_stories so each person is only
// generated once.

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import {
  adminClient,
  anthropicClient,
  MODEL,
  numberEnv,
  withinRateLimit,
} from '../_shared/clients.ts';
import { buildEraSnapshot, eraSnapshotToPromptContext } from '../_shared/era.ts';
import { clientIp, corsHeaders, json } from '../_shared/http.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const personId = Number(body?.personId);
  if (!Number.isSafeInteger(personId) || personId <= 0)
    return json({ error: 'invalid_person' }, 400);

  const sb = adminClient();

  const cached = await sb
    .from('era_stories')
    .select('content, model')
    .eq('person_id', personId)
    .maybeSingle();
  if (cached.data)
    return json({ ...(cached.data.content as StoryContent), model: cached.data.model });

  const ip = clientIp(req);
  const perIp = await withinRateLimit(
    sb,
    `story:${ip}`,
    numberEnv('STORY_LIMIT_PER_HOUR', 20),
    3600,
  );
  const global = await withinRateLimit(
    sb,
    'story:global',
    numberEnv('STORY_LIMIT_PER_DAY', 1000),
    86400,
  );
  if (!perIp || !global) return json({ error: 'rate_limited' }, 429);

  const { data: person, error } = await sb
    .from('persons')
    .select(
      'id, name, birth_year, death_year, birth_place, death_place, profession, city, cemetery, short_bio, full_bio',
    )
    .eq('id', personId)
    .maybeSingle();
  if (error || !person) return json({ error: 'not_found' }, 404);
  if (!person.birth_year && !person.death_year) return json({ error: 'missing_years' }, 422);

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
    const client = anthropicClient();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: STORY_SCHEMA },
      },
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('no text block in response');
    story = JSON.parse(text.text) as StoryContent;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    console.error('story generation failed', err);
    return json({ error: 'generation_failed' }, 502);
  }

  const { error: cacheError } = await sb
    .from('era_stories')
    .upsert({ person_id: personId, content: story, model: MODEL });
  if (cacheError) console.error('caching era story failed', cacheError);

  return json({ ...story, model: MODEL });
});
