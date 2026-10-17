// Runs the exact Wikidata query discover-graves uses, from a machine that can reach
// query.wikidata.org (a GitHub Actions runner or a laptop), and prints what came back.
// Writes nothing. Used to debug "no graves found" reports from the field.
//
//   npm run probe:discovery -- --lat 47.4612 --lng 9.0453 [--radius 10] [--limit 80]

import {
  buildAroundQuery,
  isoDate,
  parseDiscoveryBindings,
  type SparqlBinding,
} from '../supabase/functions/_shared/wikidata.ts';

const USER_AGENT = 'MindSTEN/1.0 (https://github.com/hyper85/mindsten-prototype; grave discovery)';
const SPARQL_URL = 'https://query.wikidata.org/sparql';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const lat = Number(opt('lat', ''));
const lng = Number(opt('lng', ''));
const radiusKm = Number(opt('radius', '10'));
const limit = Number(opt('limit', '80'));
const budgetMs = Number(opt('budget', '20000'));
const minSitelinks = Number(opt('min-sitelinks', '2'));
if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
  console.error('usage: --lat <deg> --lng <deg> [--radius km] [--limit n] [--budget ms]');
  process.exit(2);
}

const now = new Date();
const maxDeathYear = now.getUTCFullYear() - 10;
const cutoffIso = isoDate(maxDeathYear, now.getUTCMonth() + 1, now.getUTCDate());
const query = buildAroundQuery(lat, lng, radiusKm, maxDeathYear, limit, minSitelinks);
const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;

console.log(`probe ${lat},${lng} radius ${radiusKm} km, ≥ ${minSitelinks} sitelinks, budget ${budgetMs} ms, URL ${url.length} chars`);
const started = Date.now();
let res: Response;
try {
  res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
    signal: AbortSignal.timeout(budgetMs),
  });
} catch (err) {
  console.log(`FETCH FAILED after ${Date.now() - started} ms: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`);
  process.exit(1);
}
const ms = Date.now() - started;
console.log(`HTTP ${res.status} in ${ms} ms (${res.headers.get('content-type') ?? 'no content-type'})`);
const text = await res.text();
if (!res.ok) {
  console.log(text.slice(0, 2000));
  process.exit(1);
}
let data: { results?: { bindings?: SparqlBinding[] } };
try {
  data = JSON.parse(text);
} catch {
  console.log(`unparseable body: ${text.slice(0, 500)}`);
  process.exit(1);
}
const bindings = data.results?.bindings ?? [];
const persons = parseDiscoveryBindings(bindings, cutoffIso, maxDeathYear);
console.log(`${bindings.length} rows → ${persons.length} candidates (10-year cutoff ${cutoffIso})`);
if (bindings.length > 0) {
  console.log('first raw row keys:', Object.keys(bindings[0]).join(', '));
  console.log('first raw row:', JSON.stringify(bindings[0]).slice(0, 1200));
}
for (const p of persons.slice(0, 25)) {
  console.log(
    `- ${p.name} (${p.wikidataId}) ${p.birth.year ?? '?'}–${p.death.year ?? '?'} · ${p.placeLabel} [${p.countryCode ?? '--'}] · ${p.sitelinks} sitelinks · ${p.description ?? ''}`,
  );
}
