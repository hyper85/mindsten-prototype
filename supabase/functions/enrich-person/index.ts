// POST { personId: number }
// → { person: <persons row + timeline_events + person_sources>, enriched: boolean }
//
// Fetches a discovered person's Wikipedia bio the first time they are opened (see
// _shared/enrich.ts). Already enriched rows are returned at once without touching the
// rate limit. When Wikipedia/Wikidata are unreachable the stored row is returned with
// enriched = false so the app can still show the person and try again later.

import { adminClient, checkRateLimits, numberEnv } from '../_shared/clients.ts';
import { enrichPerson, PERSON_SELECT, type PersonRow } from '../_shared/enrich.ts';
import { clientIp, json, readJsonBody, serve } from '../_shared/http.ts';

const MAX_BODY_BYTES = 32_768;

serve(async (req) => {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  const personId = Number(body.personId);
  if (!Number.isSafeInteger(personId) || personId <= 0)
    return json({ error: 'invalid_person' }, 400);

  const sb = adminClient();
  const { data, error } = await sb
    .from('persons')
    .select(PERSON_SELECT)
    .eq('id', personId)
    .maybeSingle();
  if (error) throw new Error(`person lookup failed: ${error.message}`);
  if (!data) return json({ error: 'not_found' }, 404);
  const person = data as PersonRow;

  // Already enriched: free.
  if (person.enriched_at) return json({ person, enriched: true });

  const allowed = await checkRateLimits(
    sb,
    'enrich',
    clientIp(req),
    numberEnv('ENRICH_LIMIT_PER_HOUR', 60),
    numberEnv('ENRICH_LIMIT_PER_DAY', 2000),
  );
  if (!allowed) return json({ error: 'rate_limited' }, 429);

  const result = await enrichPerson(sb, person);
  return json({ person: result.person, enriched: result.enriched });
});
