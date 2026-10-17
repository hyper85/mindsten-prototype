// POST { lat: number, lng: number, force?: boolean }  (force: re-query a fresh cell)
// → { cell, status: 'fresh' | 'discovered', added, candidates }
//
// Finds notable graves near the visitor on Wikidata and caches them in the database
// (see _shared/discover.ts). A cell discovered in the last 30 days is answered without
// querying Wikidata and without spending the caller's rate-limit budget.

import { adminClient, checkRateLimits, numberEnv } from '../_shared/clients.ts';
import { cellIsFresh, discoverAround, DiscoveryError } from '../_shared/discover.ts';
import { clientIp, json, readJsonBody, serve } from '../_shared/http.ts';
import { cellKey } from '../_shared/wikidata.ts';

const MAX_BODY_BYTES = 32_768;
const BUDGET_MS = 20_000;

function validCoord(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? v : null;
}

serve(async (req) => {
  const body = await readJsonBody(req, MAX_BODY_BYTES);
  if (body instanceof Response) return body;
  const lat = validCoord(body.lat, 90);
  const lng = validCoord(body.lng, 180);
  if (lat === null || lng === null) return json({ error: 'invalid_coords' }, 400);

  const force = body.force === true;
  const sb = adminClient();
  const cell = cellKey(lat, lng);
  if (!force && (await cellIsFresh(sb, cell))) {
    return json({ cell, status: 'fresh', radiusKm: 0, added: 0, candidates: 0 });
  }

  const allowed = await checkRateLimits(
    sb,
    'discover',
    clientIp(req),
    numberEnv('DISCOVER_LIMIT_PER_HOUR', 20),
    numberEnv('DISCOVER_LIMIT_PER_DAY', 400),
  );
  if (!allowed) return json({ error: 'rate_limited' }, 429);

  try {
    return json(await discoverAround(sb, lat, lng, { budgetMs: BUDGET_MS, force }));
  } catch (err) {
    if (err instanceof DiscoveryError) {
      console.error('discovery failed', err.message);
      return json({ error: 'discovery_failed' }, 502);
    }
    throw err;
  }
});
