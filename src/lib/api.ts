import { distanceMeters, type Coords } from './geo';
import {
  mapCemetery,
  mapPerson,
  mapRoute,
  PERSON_LIST_SELECT,
  PERSON_SELECT,
  type CemeteryRow,
  type PersonRow,
  type RouteRow,
} from './mappers';
import { getSupabase } from './supabase';
import type {
  Cemetery,
  EraStory,
  GraveSubmission,
  Person,
  PersonCategory,
  ScanCandidate,
  ScanResult,
  ThemedRoute,
} from '../types';

const SIMULATED_LATENCY_MS = 150;
// AI calls give up after this long (the Edge Functions stop the model at ~50 s).
const AI_TIMEOUT_MS = 65_000;
// Lists change rarely; reuse them within a visit so back navigation is instant.
const MEMO_TTL_MS = 5 * 60 * 1000;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Curated fixtures: the demo-mode archive, and a fallback when the backend is unreachable. */
const loadFixtures = () => import('./fixtures');

const memoCache = new Map<string, { at: number; value: Promise<unknown> }>();

/** Shares one in-flight/recent request per key; failures are not cached. */
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memoCache.get(key);
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.value as Promise<T>;
  const value = load();
  memoCache.set(key, { at: Date.now(), value });
  value.catch(() => memoCache.delete(key));
  return value;
}

/** Thrown when the backend can't be reached and there's no offline copy of the data. */
export class OfflineError extends Error {
  constructor() {
    super('Kunne ikke hente data. Tjek din forbindelse.');
  }
}

function logSupabaseFallback(op: string, err: unknown): void {
  console.warn(`[api] Supabase ${op} failed, falling back to fixtures.`, err);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

async function fetchPersonsByIds(
  ids: number[],
  select = PERSON_LIST_SELECT,
): Promise<Person[] | null> {
  const sb = getSupabase();
  if (!sb || ids.length === 0) return ids.length === 0 ? [] : null;
  const { data, error } = await sb.from('persons').select(select).in('id', ids);
  if (error || !data) {
    logSupabaseFallback('fetchPersonsByIds', error);
    return null;
  }
  const byId = new Map((data as unknown as PersonRow[]).map((r) => [r.id, mapPerson(r)]));
  return ids.map((id) => byId.get(id)).filter((p): p is Person => Boolean(p));
}

// ---------------------------------------------------------------------------
// Persons
// ---------------------------------------------------------------------------

export interface PersonQuery {
  category?: PersonCategory;
  cemeteryId?: number;
  limit?: number;
}

export function getPersons(query: PersonQuery = {}): Promise<Person[]> {
  const key = `persons:${query.category ?? ''}:${query.cemeteryId ?? ''}:${query.limit ?? ''}`;
  return memo(key, async () => {
    const sb = getSupabase();
    if (sb) {
      let req = sb.from('persons').select(PERSON_LIST_SELECT).not('lat', 'is', null);
      if (query.category) req = req.eq('category', query.category);
      if (query.cemeteryId) req = req.eq('cemetery_id', query.cemeteryId);
      const { data, error } = await req
        .order('curated', { ascending: false })
        .order('confidence', { ascending: false })
        .order('id')
        // PostgREST caps responses at 1000 rows by default (Supabase "Max rows").
        .limit(query.limit ?? 1000);
      if (!error && data) return (data as unknown as PersonRow[]).map(mapPerson);
      logSupabaseFallback('getPersons', error);
    }
    const { PERSONS } = await loadFixtures();
    let result = [...PERSONS];
    if (query.category) result = result.filter((p) => p.category === query.category);
    if (query.cemeteryId) result = result.filter((p) => p.cemeteryId === query.cemeteryId);
    return delay(result.slice(0, query.limit ?? result.length));
  });
}

/**
 * One person with timeline and sources. Resolves null when the person doesn't exist;
 * throws OfflineError when the backend is unreachable and the person isn't a curated one.
 */
export function getPersonById(id: number): Promise<Person | null> {
  return memo(`person:${id}`, async () => {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('persons')
        .select(PERSON_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (!error) return data ? mapPerson(data as PersonRow) : null;
      logSupabaseFallback('getPersonById', error);
    }
    const { PERSONS } = await loadFixtures();
    const person = PERSONS.find((p) => p.id === id) ?? null;
    if (sb && !person) throw new OfflineError();
    return delay(person);
  });
}

export async function getPersonsByIds(ids: number[]): Promise<Person[]> {
  const remote = await fetchPersonsByIds(ids);
  if (remote) return remote;
  const { PERSONS } = await loadFixtures();
  return delay(
    ids.map((id) => PERSONS.find((p) => p.id === id)).filter((p): p is Person => Boolean(p)),
  );
}

export interface NearbyPerson {
  person: Person;
  distanceMeters: number | null;
}

/**
 * Persons near `coords`. Without coords, returns featured (curated) persons.
 */
export async function getNearbyPersons(
  coords: Coords | null,
  limit = 10,
  radiusMeters = 3000,
): Promise<NearbyPerson[]> {
  const sb = getSupabase();
  if (sb && coords) {
    const { data, error } = await sb.rpc('nearby_persons', {
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_radius_m: radiusMeters,
      p_limit: limit,
    });
    if (!error && data) {
      const rows = data as Array<{ person_id: number; distance_m: number }>;
      const persons = await fetchPersonsByIds(rows.map((r) => r.person_id));
      if (persons) {
        const dist = new Map(rows.map((r) => [r.person_id, r.distance_m]));
        return persons.map((person) => ({ person, distanceMeters: dist.get(person.id) ?? null }));
      }
    } else {
      logSupabaseFallback('getNearbyPersons', error);
    }
  } else if (sb && !coords) {
    const featured = await getPersons({ limit });
    return featured.map((person) => ({ person, distanceMeters: null }));
  }

  const { PERSONS } = await loadFixtures();
  if (!coords)
    return delay(PERSONS.slice(0, limit).map((person) => ({ person, distanceMeters: null })));
  const withDistance = PERSONS.filter((p) => p.lat !== null && p.lng !== null)
    .map((person) => ({
      person,
      distanceMeters: distanceMeters(coords, {
        lat: person.lat as number,
        lng: person.lng as number,
      }),
    }))
    .filter((p) => p.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  return delay(withDistance.slice(0, limit));
}

export async function searchPersons(query: string, limit = 25): Promise<Person[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.rpc('search_persons', { p_query: trimmed, p_limit: limit });
    if (!error && data) {
      const ids = (data as Array<{ person_id: number }>).map((r) => r.person_id);
      const persons = await fetchPersonsByIds(ids);
      if (persons) return persons;
    } else {
      logSupabaseFallback('searchPersons', error);
    }
  }
  const { PERSONS } = await loadFixtures();
  const q = normalize(trimmed);
  return delay(
    PERSONS.filter((p) =>
      normalize(`${p.name} ${p.profession} ${p.cemetery} ${p.city}`).includes(q),
    ).slice(0, limit),
  );
}

// ---------------------------------------------------------------------------
// Cemeteries & routes
// ---------------------------------------------------------------------------

export function getCemeteries(): Promise<Cemetery[]> {
  return memo('cemeteries', async () => {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('cemeteries')
        .select('id, name, city, lat, lng, description')
        .order('name')
        .limit(2000);
      if (!error && data) {
        return (data as CemeteryRow[]).map(mapCemetery).filter((c): c is Cemetery => Boolean(c));
      }
      logSupabaseFallback('getCemeteries', error);
    }
    const { CEMETERIES } = await loadFixtures();
    return delay([...CEMETERIES]);
  });
}

export async function getCemeteryById(id: number): Promise<Cemetery | null> {
  const all = await getCemeteries();
  const found = all.find((c) => c.id === id);
  if (found) return found;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('cemeteries')
    .select('id, name, city, lat, lng, description')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new OfflineError();
  return data ? mapCemetery(data as CemeteryRow) : null;
}

export function getRoutes(): Promise<ThemedRoute[]> {
  return memo('routes', async () => {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb.from('routes').select('*').order('id');
      if (!error && data) return (data as RouteRow[]).map(mapRoute);
      logSupabaseFallback('getRoutes', error);
    }
    const { ROUTES } = await loadFixtures();
    return delay([...ROUTES]);
  });
}

export async function getRouteById(id: number): Promise<ThemedRoute | null> {
  const routes = await getRoutes();
  return routes.find((r) => r.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Scanning (Claude vision via the scan-gravestone Edge Function)
// ---------------------------------------------------------------------------

interface ScanFunctionResponse {
  reading: ScanResult['reading'];
  candidates: Array<{ person_id: number; score: number; distance_m: number | null }>;
  error?: string;
}

export class ScanError extends Error {
  constructor(
    message: string,
    public readonly code: 'rate_limited' | 'not_gravestone' | 'failed',
  ) {
    super(message);
  }
}

/**
 * Sends a JPEG (base64, no data: prefix) to the scan function. Without a
 * backend it runs a demo scan against the fixtures (nearest curated grave).
 */
export async function scanGravestone(
  imageBase64: string | null,
  coords: Coords | null,
): Promise<ScanResult> {
  const sb = getSupabase();
  if (sb && imageBase64) {
    const { data, error } = await sb.functions.invoke<ScanFunctionResponse>('scan-gravestone', {
      body: { image: imageBase64, lat: coords?.lat ?? null, lng: coords?.lng ?? null },
      timeout: AI_TIMEOUT_MS,
    });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 429)
        throw new ScanError('For mange scanninger lige nu. Prøv igen om lidt.', 'rate_limited');
      throw new ScanError('Scanningen fejlede. Tjek din forbindelse og prøv igen.', 'failed');
    }
    if (!data) throw new ScanError('Tomt svar fra scanneren.', 'failed');
    const persons = (await fetchPersonsByIds(data.candidates.map((c) => c.person_id))) ?? [];
    const candidates: ScanCandidate[] = data.candidates
      .map((c) => {
        const person = persons.find((p) => p.id === c.person_id);
        return person ? { person, score: c.score, distanceMeters: c.distance_m } : null;
      })
      .filter((c): c is ScanCandidate => Boolean(c));
    return { reading: data.reading, candidates, mode: 'ai' };
  }

  // Demo mode: pretend we recognised the nearest curated grave.
  const { PERSONS } = await loadFixtures();
  const nearby = await getNearbyPersons(coords, 3, 50_000);
  const pool =
    nearby.length > 0
      ? nearby
      : PERSONS.slice(0, 3).map((person) => ({ person, distanceMeters: null }));
  return delay(
    {
      reading: null,
      mode: 'demo',
      candidates: pool.map((n, i) => ({
        person: n.person,
        score: 92 - i * 17,
        distanceMeters: n.distanceMeters,
      })),
    },
    1800,
  );
}

// ---------------------------------------------------------------------------
// AI era story (era-story Edge Function, cached server-side)
// ---------------------------------------------------------------------------

export async function getEraStory(personId: number): Promise<EraStory | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const cached = await sb
    .from('era_stories')
    .select('content, model')
    .eq('person_id', personId)
    .maybeSingle();
  if (!cached.error && cached.data) {
    return {
      ...(cached.data.content as Omit<EraStory, 'model'>),
      model: cached.data.model as string | null,
    };
  }
  const { data, error } = await sb.functions.invoke<EraStory>('era-story', {
    body: { personId },
    timeout: AI_TIMEOUT_MS,
  });
  if (error || !data) {
    console.warn('[api] era-story failed', error);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// "Spørg om personen" (ask-person Edge Function)
// ---------------------------------------------------------------------------

export interface AskTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Server signature on assistant turns; turns without a valid one are ignored as context. */
  sig?: string;
}

export class AskError extends Error {
  constructor(
    message: string,
    public readonly code: 'offline' | 'rate_limited' | 'failed',
  ) {
    super(message);
  }
}

export async function askAboutPerson(
  personId: number,
  question: string,
  history: AskTurn[],
): Promise<{ answer: string; sig?: string }> {
  const sb = getSupabase();
  if (!sb) {
    throw new AskError('AI-guiden er ikke koblet på endnu. Prøv igen senere.', 'offline');
  }
  const { data, error } = await sb.functions.invoke<{ answer?: string; sig?: string }>(
    'ask-person',
    { body: { personId, question, history: history.slice(-6) }, timeout: AI_TIMEOUT_MS },
  );
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 429) {
      throw new AskError('Der er mange spørgsmål lige nu. Prøv igen om lidt.', 'rate_limited');
    }
    throw new AskError(
      'Det lykkedes ikke at få et svar. Tjek forbindelsen og prøv igen.',
      'failed',
    );
  }
  if (!data?.answer) {
    throw new AskError('Det lykkedes ikke at få et svar. Prøv igen.', 'failed');
  }
  return { answer: data.answer, sig: data.sig };
}

// ---------------------------------------------------------------------------
// Community submissions
// ---------------------------------------------------------------------------

export async function submitGrave(
  submission: GraveSubmission,
): Promise<{ ok: boolean; offline: boolean }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, offline: true };
  const { error } = await sb.from('grave_submissions').insert({
    name: submission.name,
    birth_year: submission.birthYear,
    death_year: submission.deathYear,
    cemetery: submission.cemetery,
    lat: submission.lat,
    lng: submission.lng,
    note: submission.note,
  });
  if (error) {
    console.warn('[api] submitGrave failed', error);
    return { ok: false, offline: false };
  }
  return { ok: true, offline: false };
}
