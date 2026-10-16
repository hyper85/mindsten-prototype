// Imports people buried in Denmark from Wikidata (CC0) with Danish Wikipedia
// intros (CC BY-SA) into Supabase.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run import:wikidata
//   npm run import:wikidata -- --dry-run --limit 50
//
// Flags:
//   --dry-run            fetch + transform, print a sample, write nothing
//   --limit N            stop after N persons (for testing)
//   --min-years-dead N   skip people who died less than N years ago (default and minimum
//                        10, cf. databeskyttelsesloven § 2, stk. 5 — the database rejects
//                        anything newer). Uses the precision of the Wikidata date: a death
//                        known only to the year/decade/century counts from its last day.
//   --from-year Y        only people who died in or after year Y (default 800)
//
// Curated rows (persons.curated = true) are never overwritten — the import only
// fills in wikidata_id / image / Wikipedia link on them.
// See .claude/skills/import-persons/SKILL.md.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { deriveEra } from '../src/lib/format';
import {
  categorize,
  diedLongEnoughAgo,
  displayDate,
  firstSentences,
  isoDate,
  parseWikidataTime,
  professionFrom,
  type WdTime,
} from '../supabase/functions/_shared/wikidata.ts';

const USER_AGENT = 'MindSTEN/1.0 (https://github.com/hyper85/mindsten-prototype; data import)';
const SPARQL_URL = 'https://query.wikidata.org/sparql';
const WD_API = 'https://www.wikidata.org/w/api.php';
const DAWIKI_API = 'https://da.wikipedia.org/w/api.php';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) ? v : fallback;
};
const DRY_RUN = flag('dry-run');
const LIMIT = opt('limit', Infinity);
const MIN_YEARS_DEAD = Math.max(10, opt('min-years-dead', 10));
const FROM_YEAR = opt('from-year', 800);
// Dates are compared in UTC, like the database's current_date on Supabase.
const TODAY = new Date();
const CUTOFF = isoDate(
  TODAY.getUTCFullYear() - MIN_YEARS_DEAD,
  TODAY.getUTCMonth() + 1,
  TODAY.getUTCDate(),
);
const MAX_DEATH_YEAR = TODAY.getUTCFullYear() - MIN_YEARS_DEAD;

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 5;

/** Network failures and timeouts (fetch throws TypeError / AbortError / TimeoutError). */
function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError'))
  );
}

async function getJson<T>(url: string, init: RequestInit = {}, attempt = 1): Promise<T> {
  const retry = async (reason: string, wait: number) => {
    if (attempt >= MAX_ATTEMPTS) throw new Error(`${reason} from ${url.slice(0, 120)}`);
    console.warn(`  ${reason}, retrying in ${Math.round(wait / 1000)}s…`);
    await sleep(wait);
    return getJson<T>(url, init, attempt + 1);
  };
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(60_000),
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(init.headers ?? {}) },
    });
  } catch (err) {
    if (!isNetworkError(err)) throw err;
    return retry(
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      2000 * 2 ** attempt,
    );
  }
  if (res.status === 429 || res.status >= 500) {
    await res.body?.cancel().catch(() => undefined);
    const wait = Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt;
    return retry(String(res.status), wait);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url.slice(0, 120)}`);
  try {
    return (await res.json()) as T;
  } catch (err) {
    // The body stream can also time out or drop mid-transfer.
    if (!isNetworkError(err)) throw err;
    return retry(
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      2000 * 2 ** attempt,
    );
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Phase 1: who is buried in Denmark? (SPARQL, bucketed by year of death)
// ---------------------------------------------------------------------------

interface BurialHit {
  personId: string;
  placeId: string;
  graveLat: number | null;
  graveLng: number | null;
}

const qid = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1);

function parsePoint(wkt: string | undefined): { lat: number; lng: number } | null {
  const m = wkt ? /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt) : null;
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null;
}

async function fetchBurials(): Promise<BurialHit[]> {
  const buckets: Array<[number, number]> = [];
  const edges = [
    FROM_YEAR,
    1700,
    1800,
    1850,
    1900,
    1930,
    1950,
    1970,
    1985,
    2000,
    MAX_DEATH_YEAR + 1,
  ];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = Math.max(edges[i], FROM_YEAR);
    const to = Math.min(edges[i + 1], MAX_DEATH_YEAR + 1);
    if (from < to) buckets.push([from, to]);
  }

  const hits = new Map<string, BurialHit>();
  for (const [from, to] of buckets) {
    const query = `
      SELECT ?person ?place ?graveCoord WHERE {
        ?person wdt:P31 wd:Q5; p:P119 ?st; wdt:P570 ?died.
        ?st ps:P119 ?place.
        ?place wdt:P17 wd:Q35.
        OPTIONAL { ?st pq:P625 ?graveCoord }
        FILTER(YEAR(?died) >= ${from} && YEAR(?died) < ${to})
      }`;
    const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
    const data = await getJson<{
      results: { bindings: Array<Record<string, { value: string } | undefined>> };
    }>(url, { headers: { Accept: 'application/sparql-results+json' } });
    let added = 0;
    for (const b of data.results.bindings) {
      const personId = qid(b.person!.value);
      if (hits.has(personId)) continue;
      const grave = parsePoint(b.graveCoord?.value);
      hits.set(personId, {
        personId,
        placeId: qid(b.place!.value),
        graveLat: grave?.lat ?? null,
        graveLng: grave?.lng ?? null,
      });
      added++;
    }
    console.log(`  died ${from}–${to - 1}: ${added} persons`);
    await sleep(1000); // be polite to the query service
  }
  return [...hits.values()];
}

// ---------------------------------------------------------------------------
// Phase 2: entity details (wbgetentities, 50 per call)
// ---------------------------------------------------------------------------

interface WdSnak {
  mainsnak: { datavalue?: { value: unknown } };
  rank?: string;
}
interface WdEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, WdSnak[]>;
  sitelinks?: Record<string, { title: string }>;
}

async function fetchEntities(
  ids: string[],
  props = 'labels|descriptions|claims|sitelinks',
): Promise<Map<string, WdEntity>> {
  const out = new Map<string, WdEntity>();
  for (const batch of chunk([...new Set(ids)], 50)) {
    const url =
      `${WD_API}?action=wbgetentities&format=json&props=${encodeURIComponent(props)}` +
      `&languages=da|en&sitefilter=dawiki&ids=${batch.join('|')}`;
    const data = await getJson<{ entities: Record<string, WdEntity> }>(url);
    for (const [id, e] of Object.entries(data.entities ?? {})) out.set(id, e);
    await sleep(200);
  }
  return out;
}

const label = (e: WdEntity | undefined) => e?.labels?.da?.value ?? e?.labels?.en?.value ?? null;

function claimValues(e: WdEntity, prop: string): unknown[] {
  const claims = (e.claims?.[prop] ?? []).filter((c) => c.rank !== 'deprecated');
  const preferred = claims.filter((c) => c.rank === 'preferred');
  return (preferred.length > 0 ? preferred : claims)
    .map((c) => c.mainsnak.datavalue?.value)
    .filter((v) => v !== undefined);
}

function claimIds(e: WdEntity, prop: string): string[] {
  return claimValues(e, prop)
    .map((v) => (v as { id?: string }).id)
    .filter((v): v is string => Boolean(v));
}

/** Wikidata time → ISO date (only when precision is day) + year. */
function parseTime(e: WdEntity, prop: string): WdTime {
  const v = claimValues(e, prop)[0] as { time?: string; precision?: number } | undefined;
  return parseWikidataTime(v?.time, v?.precision);
}

function coordOf(e: WdEntity | undefined): { lat: number; lng: number } | null {
  if (!e) return null;
  const v = claimValues(e, 'P625')[0] as { latitude?: number; longitude?: number } | undefined;
  return v?.latitude !== undefined && v.longitude !== undefined
    ? { lat: v.latitude, lng: v.longitude }
    : null;
}

// ---------------------------------------------------------------------------
// Phase 3: Danish Wikipedia intros (20 per call)
// ---------------------------------------------------------------------------

async function fetchExtracts(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const batch of chunk([...new Set(titles)], 20)) {
    const url =
      `${DAWIKI_API}?action=query&format=json&formatversion=2&prop=extracts&exintro=1&explaintext=1` +
      `&exlimit=20&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`;
    const data = await getJson<{
      query?: {
        pages?: Array<{ title: string; extract?: string }>;
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
      };
    }>(url);
    const alias = new Map<string, string>();
    for (const n of data.query?.normalized ?? []) alias.set(n.to, n.from);
    for (const r of data.query?.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);
    for (const page of data.query?.pages ?? []) {
      if (!page.extract) continue;
      out.set(alias.get(page.title) ?? page.title, page.extract.trim());
    }
    await sleep(200);
  }
  return out;
}

// Categorisation (categorize / professionFrom / firstSentences) lives in
// supabase/functions/_shared/wikidata.ts, shared with the discover-graves function.

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zæøå0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface ExistingPerson {
  id: number;
  name: string;
  birth_year: number | null;
  wikidata_id: string | null;
  curated: boolean;
  image_url: string | null;
  wikipedia_url: string | null;
}

async function loadExisting(sb: SupabaseClient): Promise<ExistingPerson[]> {
  const rows: ExistingPerson[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('persons')
      .select('id, name, birth_year, wikidata_id, curated, image_url, wikipedia_url')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as ExistingPerson[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!DRY_RUN && (!url || !key)) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or use --dry-run).');
    process.exit(1);
  }
  const sb = !DRY_RUN ? createClient(url!, key!, { auth: { persistSession: false } }) : null;

  console.log(`1/5 Finding people buried in Denmark (died ${FROM_YEAR}–${MAX_DEATH_YEAR})…`);
  let burials = await fetchBurials();
  if (Number.isFinite(LIMIT)) burials = burials.slice(0, LIMIT);
  console.log(`    ${burials.length} persons`);

  console.log('2/5 Fetching person and place details from Wikidata…');
  const people = await fetchEntities(burials.map((b) => b.personId));
  const placeIds = [...new Set(burials.map((b) => b.placeId))];
  const places = await fetchEntities(placeIds, 'labels|descriptions|claims');
  const refIds = new Set<string>();
  for (const e of people.values()) {
    claimIds(e, 'P19').forEach((id) => refIds.add(id));
    claimIds(e, 'P20').forEach((id) => refIds.add(id));
  }
  for (const e of places.values()) claimIds(e, 'P131').forEach((id) => refIds.add(id));
  const refs = await fetchEntities([...refIds], 'labels');

  console.log('3/5 Fetching Danish Wikipedia intros…');
  const titles = [...people.values()]
    .map((e) => e.sitelinks?.dawiki?.title)
    .filter((t): t is string => Boolean(t));
  const extracts = await fetchExtracts(titles);
  console.log(`    ${extracts.size} intros`);

  // --- cemeteries ---------------------------------------------------------
  console.log('4/5 Upserting cemeteries…');
  const cemeteryRows = placeIds
    .map((id) => {
      const e = places.get(id);
      const c = coordOf(e);
      if (!e || !label(e)) return null;
      return {
        wikidata_id: id,
        name: label(e)!,
        city: label(refs.get(claimIds(e, 'P131')[0] ?? '')) ?? '',
        lat: c?.lat ?? null,
        lng: c?.lng ?? null,
        description: e.descriptions?.da?.value ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const cemeteryIdByQid = new Map<string, number>();
  if (sb) {
    for (const batch of chunk(cemeteryRows, 200)) {
      const { data, error } = await sb
        .from('cemeteries')
        .upsert(batch, { onConflict: 'wikidata_id' })
        .select('id, wikidata_id');
      if (error) throw error;
      for (const r of data ?? []) cemeteryIdByQid.set(r.wikidata_id as string, r.id as number);
    }
  }
  console.log(`    ${cemeteryRows.length} cemeteries`);

  // --- persons ------------------------------------------------------------
  console.log('5/5 Upserting persons…');
  const existing = sb ? await loadExisting(sb) : [];
  const byQid = new Map(existing.filter((p) => p.wikidata_id).map((p) => [p.wikidata_id!, p]));
  const curatedByKey = new Map(
    existing
      .filter((p) => p.curated)
      .map((p) => [`${normalizeName(p.name)}|${p.birth_year ?? ''}`, p]),
  );

  const rows: Array<Record<string, unknown>> = [];
  const curatedPatches: Array<{ id: number; patch: Record<string, unknown> }> = [];
  const extras = new Map<
    string,
    { timeline: Array<[number, string]>; sources: Array<[string, string]> }
  >();

  for (const b of burials) {
    const e = people.get(b.personId);
    const name = label(e);
    if (!e || !name) continue;
    const place = places.get(b.placeId);
    const placeCoord = coordOf(place);
    const birth = parseTime(e, 'P569');
    const death = parseTime(e, 'P570');
    if (!death.year || !diedLongEnoughAgo(death, CUTOFF)) continue;

    const description = e.descriptions?.da?.value ?? e.descriptions?.en?.value ?? null;
    const title = e.sitelinks?.dawiki?.title ?? null;
    const extract = title ? (extracts.get(title) ?? null) : null;
    const wikipediaUrl = title
      ? `https://da.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
      : null;
    const image = claimValues(e, 'P18')[0] as string | undefined;
    const imageUrl = image
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image)}?width=640`
      : null;
    const imageCredit = image ? `Wikimedia Commons: ${image}` : null;

    const match =
      byQid.get(b.personId) ?? curatedByKey.get(`${normalizeName(name)}|${birth.year ?? ''}`);
    if (match?.curated) {
      const patch: Record<string, unknown> = { wikidata_id: b.personId };
      if (!match.image_url && imageUrl)
        Object.assign(patch, { image_url: imageUrl, image_credit: imageCredit });
      if (!match.wikipedia_url && wikipediaUrl) patch.wikipedia_url = wikipediaUrl;
      curatedPatches.push({ id: match.id, patch });
      continue;
    }

    const hasGrave = b.graveLat !== null && b.graveLng !== null;
    const lat = hasGrave ? b.graveLat : (placeCoord?.lat ?? null);
    const lng = hasGrave ? b.graveLng : (placeCoord?.lng ?? null);
    const birthPlace = label(refs.get(claimIds(e, 'P19')[0] ?? ''));
    const deathPlace = label(refs.get(claimIds(e, 'P20')[0] ?? ''));
    const category = categorize(description, claimIds(e, 'P106'));
    const era = deriveEra(birth.year, death.year);
    const confidence = Math.min(
      95,
      50 +
        (extract ? 15 : 0) +
        (hasGrave ? 10 : 0) +
        (imageUrl ? 10 : 0) +
        (birth.iso && death.iso ? 10 : 0),
    );
    const shortBio = extract ? firstSentences(extract, 280) : (description ?? '');

    rows.push({
      wikidata_id: b.personId,
      name,
      born: displayDate(birth),
      died: displayDate(death),
      birth_date: birth.iso,
      death_date: death.iso,
      birth_year: birth.year,
      death_year: death.year,
      birth_place: birthPlace,
      death_place: deathPlace,
      profession: professionFrom(description),
      cemetery: label(place) ?? '',
      cemetery_id: cemeteryIdByQid.get(b.placeId) ?? null,
      city: cemeteryRows.find((c) => c.wikidata_id === b.placeId)?.city ?? '',
      lat,
      lng,
      location_precision: hasGrave ? 'grave' : placeCoord ? 'cemetery' : 'unknown',
      confidence,
      short_bio: shortBio,
      full_bio: extract ? firstSentences(extract, 1600) : shortBio,
      // Everyone here is buried in Denmark; the Danish intro (when there is one) is the
      // bio, so enrich-person leaves these rows alone. Without an intro, enrich-person may
      // still find an article in another language the first time the person is opened.
      country_code: 'DK',
      bio_lang: extract ? 'da' : null,
      enriched_at: extract ? TODAY.toISOString() : null,
      era: era.era,
      era_years: era.eraYears,
      time_window_title: era.timeWindowTitle,
      category,
      image_url: imageUrl,
      image_credit: imageCredit,
      wikipedia_url: wikipediaUrl,
      // `curated` is left out on purpose: new rows get the default (false) and existing
      // rows keep theirs — the import never un-curates a row.
    });

    const timeline: Array<[number, string]> = [];
    if (birth.year) timeline.push([birth.year, birthPlace ? `Født i ${birthPlace}` : 'Født']);
    timeline.push([death.year, deathPlace ? `Dør i ${deathPlace}` : 'Dør']);
    const sources: Array<[string, string]> = [];
    if (wikipediaUrl) sources.push(['Wikipedia (dansk)', wikipediaUrl]);
    sources.push(['Wikidata', `https://www.wikidata.org/wiki/${b.personId}`]);
    extras.set(b.personId, { timeline, sources });
  }

  console.log(
    `    ${rows.length} persons to upsert, ${curatedPatches.length} curated rows to link`,
  );

  if (DRY_RUN || !sb) {
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
    return;
  }

  for (const { id, patch } of curatedPatches) {
    const { error } = await sb.from('persons').update(patch).eq('id', id);
    if (error) console.warn(`    could not link curated person ${id}:`, error.message);
  }

  let done = 0;
  for (const batch of chunk(rows, 200)) {
    const { data, error } = await sb
      .from('persons')
      .upsert(batch, { onConflict: 'wikidata_id' })
      .select('id, wikidata_id');
    if (error) throw error;
    const ids = (data ?? []).map((r) => r.id as number);
    const { error: dtErr } = await sb.from('timeline_events').delete().in('person_id', ids);
    if (dtErr) throw dtErr;
    const { error: dsErr } = await sb.from('person_sources').delete().in('person_id', ids);
    if (dsErr) throw dsErr;
    const timelineRows: Array<Record<string, unknown>> = [];
    const sourceRows: Array<Record<string, unknown>> = [];
    for (const r of data ?? []) {
      const x = extras.get(r.wikidata_id as string);
      if (!x) continue;
      x.timeline.forEach(([year, event], i) =>
        timelineRows.push({ person_id: r.id, year, event, sort_order: i }),
      );
      x.sources.forEach(([label, url], i) =>
        sourceRows.push({ person_id: r.id, label, url, sort_order: i }),
      );
    }
    if (timelineRows.length) {
      const { error: tErr } = await sb.from('timeline_events').insert(timelineRows);
      if (tErr) throw tErr;
    }
    if (sourceRows.length) {
      const { error: sErr } = await sb.from('person_sources').insert(sourceRows);
      if (sErr) throw sErr;
    }
    done += batch.length;
    console.log(`    ${done}/${rows.length}`);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
