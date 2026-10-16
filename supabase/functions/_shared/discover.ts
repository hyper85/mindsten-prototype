// On-demand discovery of notable graves near a GPS position (Deno only).
//
// One SPARQL query against query.wikidata.org per 0.1° grid cell, cached in
// `discovery_cells` for 30 days: new persons (never existing ones) and their cemeteries
// are written to the database with a Wikidata description as a placeholder bio; the
// Wikipedia bio is fetched lazily by enrich-person the first time someone opens them.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';
import { deriveEraFields } from './era.ts';
import {
  buildAroundQuery,
  categorize,
  cellKey,
  commonsImageUrl,
  displayDate,
  isoDate,
  parseDiscoveryBindings,
  professionFrom,
  wikipediaUrl,
  type DiscoveredPerson,
  type SparqlBinding,
} from './wikidata.ts';

export const USER_AGENT =
  'MindSTEN/1.0 (https://github.com/hyper85/mindsten-prototype; grave discovery)';
const SPARQL_URL = 'https://query.wikidata.org/sparql';
const FRESH_MS = 30 * 24 * 3600 * 1000;
// A cell that yielded nothing is retried after a day: Wikidata gains burial places all the
// time, and a query that failed silently should not block an area for a month.
const FRESH_EMPTY_MS = 24 * 3600 * 1000;
const MIN_YEARS_DEAD = 10;

export interface DiscoverOptions {
  /** Re-query even if the cell was discovered less than 30 days ago. */
  force?: boolean;
  /** Wall-clock budget for the SPARQL request. */
  budgetMs?: number;
  radiusKm?: number;
  limit?: number;
}

export interface DiscoverResult {
  cell: string;
  status: 'fresh' | 'discovered';
  /** Persons inserted by this call. */
  added: number;
  /** Persons the query returned (after the 10-year rule), including ones we already had. */
  candidates: number;
}

/** Wikidata could not be queried (network, timeout, HTTP error, malformed result). */
export class DiscoveryError extends Error {}

/** Today − 10 years, in UTC like Postgres' current_date on Supabase. */
export function tenYearCutoff(now = new Date()): { cutoffIso: string; maxDeathYear: number } {
  const year = now.getUTCFullYear() - MIN_YEARS_DEAD;
  return {
    cutoffIso: isoDate(year, now.getUTCMonth() + 1, now.getUTCDate()),
    maxDeathYear: year,
  };
}

/** True when the cell was discovered less than 30 days ago (a day, if it found nothing). */
export async function cellIsFresh(sb: SupabaseClient, cell: string): Promise<boolean> {
  const { data, error } = await sb
    .from('discovery_cells')
    .select('discovered_at, persons_added')
    .eq('cell', cell)
    .maybeSingle();
  if (error) {
    console.error('discovery_cells lookup failed', error.message);
    return false;
  }
  if (!data?.discovered_at) return false;
  const age = Date.now() - new Date(data.discovered_at as string).getTime();
  const ttl = Number(data.persons_added) > 0 ? FRESH_MS : FRESH_EMPTY_MS;
  return Number.isFinite(age) && age < ttl;
}

async function fetchBindings(query: string, budgetMs: number): Promise<SparqlBinding[]> {
  const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json' },
      signal: AbortSignal.timeout(budgetMs),
    });
  } catch (err) {
    throw new DiscoveryError(
      `wikidata query failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new DiscoveryError(`wikidata query failed: HTTP ${res.status}`);
  }
  let data: { results?: { bindings?: unknown } };
  try {
    data = await res.json();
  } catch (err) {
    throw new DiscoveryError(
      `wikidata result unreadable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const bindings = data?.results?.bindings;
  if (!Array.isArray(bindings)) throw new DiscoveryError('wikidata result has no bindings');
  return bindings as SparqlBinding[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Wikidata ids of the candidates that are already in `persons`. */
async function knownWikidataIds(sb: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  for (const batch of chunk(ids, 200)) {
    const { data, error } = await sb.from('persons').select('wikidata_id').in('wikidata_id', batch);
    if (error) {
      console.error('persons lookup failed', error.message);
      continue;
    }
    for (const row of data ?? []) if (row.wikidata_id) known.add(row.wikidata_id as string);
  }
  return known;
}

/** Upserts the burial places as cemeteries; returns cemetery id by Wikidata id. */
async function upsertCemeteries(
  sb: SupabaseClient,
  persons: DiscoveredPerson[],
): Promise<Map<string, number>> {
  const byQid = new Map<string, Record<string, unknown>>();
  for (const p of persons) {
    if (byQid.has(p.placeId)) continue;
    byQid.set(p.placeId, {
      wikidata_id: p.placeId,
      name: p.placeLabel,
      city: p.city ?? '',
      lat: p.placeCoord?.lat ?? null,
      lng: p.placeCoord?.lng ?? null,
      country_code: p.countryCode,
    });
  }
  const ids = new Map<string, number>();
  for (const batch of chunk([...byQid.values()], 200)) {
    const { data, error } = await sb
      .from('cemeteries')
      .upsert(batch, { onConflict: 'wikidata_id' })
      .select('id, wikidata_id');
    if (error) {
      console.error('cemetery upsert failed', error.message);
      continue;
    }
    for (const r of data ?? []) ids.set(r.wikidata_id as string, r.id as number);
  }
  return ids;
}

interface PersonExtras {
  timeline: Array<[number, string]>;
  sources: Array<[string, string]>;
}

function toPersonRow(
  p: DiscoveredPerson,
  cemeteryId: number | null,
): { row: Record<string, unknown>; extras: PersonExtras } {
  const coord = p.graveCoord ?? p.placeCoord;
  const region = p.countryCode === 'DK' ? 'dk' : 'world';
  const era = deriveEraFields(p.birth.year, p.death.year, region, p.name);
  const exactDates = Boolean(p.birth.iso && p.death.iso);
  const confidence = Math.min(
    95,
    50 + (p.graveCoord ? 10 : 0) + (p.imageFile ? 10 : 0) + (exactDates ? 10 : 0),
  );
  const article = p.dawiki
    ? { lang: 'da', title: p.dawiki }
    : p.enwiki
      ? { lang: 'en', title: p.enwiki }
      : null;
  const articleUrl = article ? wikipediaUrl(article.lang, article.title) : null;

  const row: Record<string, unknown> = {
    wikidata_id: p.wikidataId,
    name: p.name,
    born: displayDate(p.birth),
    died: displayDate(p.death),
    birth_date: p.birth.iso,
    death_date: p.death.iso,
    birth_year: p.birth.year,
    death_year: p.death.year,
    profession: professionFrom(p.description),
    category: categorize(p.description, p.occupations),
    cemetery: p.placeLabel,
    cemetery_id: cemeteryId,
    city: p.city ?? '',
    lat: coord?.lat ?? null,
    lng: coord?.lng ?? null,
    location_precision: p.graveCoord ? 'grave' : p.placeCoord ? 'cemetery' : 'unknown',
    confidence,
    short_bio: p.description ?? '',
    full_bio: '',
    bio_lang: null,
    enriched_at: null,
    sitelinks: p.sitelinks,
    country_code: p.countryCode,
    era: era.era,
    era_years: era.eraYears,
    time_window_title: era.timeWindowTitle,
    image_url: p.imageFile ? commonsImageUrl(p.imageFile) : null,
    image_credit: p.imageFile ? `Wikimedia Commons: ${p.imageFile}` : null,
    wikipedia_url: articleUrl,
  };

  const timeline: Array<[number, string]> = [];
  if (p.birth.year !== null) timeline.push([p.birth.year, 'Født']);
  if (p.death.year !== null) timeline.push([p.death.year, 'Dør']);
  const sources: Array<[string, string]> = [];
  if (article && articleUrl) {
    sources.push([`Wikipedia (${article.lang === 'da' ? 'dansk' : 'engelsk'})`, articleUrl]);
  }
  sources.push(['Wikidata', `https://www.wikidata.org/wiki/${p.wikidataId}`]);
  return { row, extras: { timeline, sources } };
}

/**
 * Inserts the rows that are not in `persons` yet (ON CONFLICT DO NOTHING on wikidata_id,
 * so a concurrent discovery of the same cell is harmless). A failing batch falls back to
 * one row at a time, so one bad row never blocks the others. Returns inserted (id, qid).
 */
async function insertPersons(
  sb: SupabaseClient,
  rows: Array<Record<string, unknown>>,
): Promise<Array<{ id: number; wikidata_id: string }>> {
  const inserted: Array<{ id: number; wikidata_id: string }> = [];
  const insert = (batch: Array<Record<string, unknown>>) =>
    sb
      .from('persons')
      .upsert(batch, { onConflict: 'wikidata_id', ignoreDuplicates: true })
      .select('id, wikidata_id');
  for (const batch of chunk(rows, 100)) {
    const { data, error } = await insert(batch);
    if (!error) {
      inserted.push(...((data ?? []) as Array<{ id: number; wikidata_id: string }>));
      continue;
    }
    console.error('person batch insert failed, retrying one by one', error.message);
    let failed = 0;
    for (const row of batch) {
      const single = await insert([row]);
      if (single.error) failed++;
      else inserted.push(...((single.data ?? []) as Array<{ id: number; wikidata_id: string }>));
    }
    if (failed > 0) console.error(`discovery: ${failed} person rows rejected`);
  }
  return inserted;
}

async function insertExtras(
  sb: SupabaseClient,
  inserted: Array<{ id: number; wikidata_id: string }>,
  extras: Map<string, PersonExtras>,
): Promise<void> {
  const timelineRows: Array<Record<string, unknown>> = [];
  const sourceRows: Array<Record<string, unknown>> = [];
  for (const r of inserted) {
    const x = extras.get(r.wikidata_id);
    if (!x) continue;
    x.timeline.forEach(([year, event], i) =>
      timelineRows.push({ person_id: r.id, year, event, sort_order: i }),
    );
    x.sources.forEach(([label, url], i) =>
      sourceRows.push({ person_id: r.id, label, url, sort_order: i }),
    );
  }
  if (timelineRows.length > 0) {
    const { error } = await sb.from('timeline_events').insert(timelineRows);
    if (error) console.error('timeline insert failed', error.message);
  }
  if (sourceRows.length > 0) {
    const { error } = await sb.from('person_sources').insert(sourceRows);
    if (error) console.error('sources insert failed', error.message);
  }
}

/**
 * Finds notable graves within `radiusKm` of (lat, lng) on Wikidata and caches the new
 * persons in the database. Throws DiscoveryError when Wikidata is unreachable; database
 * failures of individual rows are logged (counts only) and skipped.
 */
export async function discoverAround(
  sb: SupabaseClient,
  lat: number,
  lng: number,
  { force = false, budgetMs = 20_000, radiusKm = 10, limit = 80 }: DiscoverOptions = {},
): Promise<DiscoverResult> {
  const cell = cellKey(lat, lng);
  if (!force && (await cellIsFresh(sb, cell))) {
    return { cell, status: 'fresh', added: 0, candidates: 0 };
  }

  const { cutoffIso, maxDeathYear } = tenYearCutoff();
  const started = Date.now();
  const bindings = await fetchBindings(
    buildAroundQuery(lat, lng, radiusKm, maxDeathYear, limit),
    budgetMs,
  );
  const candidates = parseDiscoveryBindings(bindings, cutoffIso, maxDeathYear);
  console.log(
    `discovery ${cell}: ${bindings.length} rows, ${candidates.length} candidates in ${Date.now() - started} ms`,
  );

  const known = await knownWikidataIds(
    sb,
    candidates.map((p) => p.wikidataId),
  );
  const fresh = candidates.filter((p) => !known.has(p.wikidataId));

  let added = 0;
  if (fresh.length > 0) {
    const cemeteryIds = await upsertCemeteries(sb, fresh);
    const rows: Array<Record<string, unknown>> = [];
    const extras = new Map<string, PersonExtras>();
    for (const p of fresh) {
      const { row, extras: x } = toPersonRow(p, cemeteryIds.get(p.placeId) ?? null);
      rows.push(row);
      extras.set(p.wikidataId, x);
    }
    const inserted = await insertPersons(sb, rows);
    await insertExtras(sb, inserted, extras);
    added = inserted.length;
  }

  const { error } = await sb
    .from('discovery_cells')
    .upsert(
      { cell, lat, lng, discovered_at: new Date().toISOString(), persons_added: added },
      { onConflict: 'cell' },
    );
  if (error) console.error('discovery_cells upsert failed', error.message);

  console.log(`discovery ${cell}: ${added} persons added (${known.size} already known)`);
  return { cell, status: 'discovered', added, candidates: candidates.length };
}
