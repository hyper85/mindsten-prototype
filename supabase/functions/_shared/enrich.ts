// Lazy Wikipedia enrichment of a discovered person (Deno only).
//
// Discovery stores only the Wikidata description. The first time a person is opened,
// enrich-person fetches the intro of their Wikipedia article in the first language that
// has one (Danish, English, then the languages of the country they are buried in),
// stores it as short_bio / full_bio and marks the row with enriched_at.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';
import {
  firstSentences,
  languageNameDa,
  wikipediaHost,
  wikipediaLanguagesFor,
  wikipediaSiteId,
  wikipediaUrl,
} from './wikidata.ts';

const USER_AGENT = 'MindSTEN/1.0 (https://github.com/hyper85/mindsten-prototype; grave discovery)';
const WD_API = 'https://www.wikidata.org/w/api.php';
const TIMEOUT_MS = 15_000;

export const PERSON_SELECT =
  '*, timeline_events(year, event, sort_order), person_sources(label, url, sort_order)';

export type PersonRow = Record<string, unknown> & {
  id: number;
  name: string;
  wikidata_id: string | null;
  country_code: string | null;
  curated: boolean;
  birth_place: string | null;
  death_place: string | null;
  enriched_at: string | null;
};

export interface EnrichResult {
  person: PersonRow;
  /** True when the row carries a finished enrichment (enriched_at set); false = retry later. */
  enriched: boolean;
  status: 'already' | 'enriched' | 'no_article' | 'unreachable';
}

/** Wikidata / Wikipedia could not be reached: nothing was changed, try again later. */
export class UpstreamError extends Error {}

interface WdEntity {
  id: string;
  missing?: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Array<{ mainsnak: { datavalue?: { value: unknown } }; rank?: string }>>;
  sitelinks?: Record<string, { site: string; title: string }>;
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new UpstreamError(err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new UpstreamError(`HTTP ${res.status} from ${new URL(url).host}`);
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new UpstreamError(err instanceof Error ? err.message : String(err));
  }
}

async function fetchEntities(ids: string[], props: string): Promise<Map<string, WdEntity>> {
  const out = new Map<string, WdEntity>();
  if (ids.length === 0) return out;
  const url =
    `${WD_API}?action=wbgetentities&format=json&props=${encodeURIComponent(props)}` +
    `&languages=da|en&ids=${encodeURIComponent(ids.slice(0, 50).join('|'))}`;
  const data = await getJson<{ entities?: Record<string, WdEntity> }>(url);
  for (const [id, e] of Object.entries(data.entities ?? {})) out.set(id, e);
  return out;
}

function claimIds(e: WdEntity, prop: string): string[] {
  const claims = (e.claims?.[prop] ?? []).filter((c) => c.rank !== 'deprecated');
  const preferred = claims.filter((c) => c.rank === 'preferred');
  return (preferred.length > 0 ? preferred : claims)
    .map((c) => (c.mainsnak.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((v): v is string => Boolean(v));
}

const labelOf = (e: WdEntity | undefined) => e?.labels?.da?.value ?? e?.labels?.en?.value ?? null;

/** Intro (plain text) of a Wikipedia article, or null when there is none. */
async function fetchIntro(lang: string, title: string): Promise<string | null> {
  const url =
    `https://${wikipediaHost(lang)}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2` +
    `&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`;
  const data = await getJson<{
    query?: { pages?: Array<{ extract?: string; missing?: boolean }> };
  }>(url);
  const page = data.query?.pages?.[0];
  const extract = page?.extract?.trim();
  return extract ? extract : null;
}

async function reload(sb: SupabaseClient, personId: number): Promise<PersonRow> {
  const { data, error } = await sb
    .from('persons')
    .select(PERSON_SELECT)
    .eq('id', personId)
    .maybeSingle();
  if (error) throw new Error(`person reload failed: ${error.message}`);
  if (!data) throw new Error('person vanished during enrichment');
  return data as PersonRow;
}

async function markEnriched(sb: SupabaseClient, personId: number): Promise<void> {
  const { error } = await sb
    .from('persons')
    .update({ enriched_at: new Date().toISOString(), bio_lang: null })
    .eq('id', personId)
    .is('enriched_at', null);
  if (error) console.error('marking person enriched failed', error.message);
}

/**
 * Fetches and stores the Wikipedia bio for `person` (a row selected with PERSON_SELECT).
 * Rows that are already enriched, curated or have no Wikidata id are returned as they are
 * (the latter two are marked enriched so they are not looked at again). When Wikidata or
 * Wikipedia cannot be reached, nothing is changed and `enriched` is false.
 */
export async function enrichPerson(sb: SupabaseClient, person: PersonRow): Promise<EnrichResult> {
  if (person.enriched_at) return { person, enriched: true, status: 'already' };
  // Curated texts are hand-written and protected by the persons trigger: never replace them.
  if (person.curated || !person.wikidata_id) {
    await markEnriched(sb, person.id);
    return { person: await reload(sb, person.id), enriched: true, status: 'no_article' };
  }

  let entity: WdEntity | undefined;
  try {
    entity = (await fetchEntities([person.wikidata_id], 'sitelinks|claims')).get(
      person.wikidata_id,
    );
  } catch (err) {
    if (!(err instanceof UpstreamError)) throw err;
    console.error('wikidata unreachable', err.message);
    return { person, enriched: false, status: 'unreachable' };
  }
  if (!entity || entity.missing !== undefined) {
    await markEnriched(sb, person.id);
    return { person: await reload(sb, person.id), enriched: true, status: 'no_article' };
  }

  // The first candidate language with an article whose intro is not empty.
  let article: { lang: string; title: string; extract: string } | null = null;
  const tried = new Set<string>();
  for (const lang of wikipediaLanguagesFor(person.country_code)) {
    const site = wikipediaSiteId(lang);
    if (tried.has(site)) continue;
    tried.add(site);
    const title = entity.sitelinks?.[site]?.title;
    if (!title) continue;
    let extract: string | null;
    try {
      extract = await fetchIntro(lang, title);
    } catch (err) {
      if (!(err instanceof UpstreamError)) throw err;
      console.error('wikipedia unreachable', site, err.message);
      return { person, enriched: false, status: 'unreachable' };
    }
    if (extract) {
      article = { lang, title, extract };
      break;
    }
  }

  // Birth/death places from Wikidata when the row has none (best effort).
  const patch: Record<string, unknown> = { enriched_at: new Date().toISOString() };
  const placeIds = [
    ...(person.birth_place ? [] : claimIds(entity, 'P19').slice(0, 1)),
    ...(person.death_place ? [] : claimIds(entity, 'P20').slice(0, 1)),
  ];
  if (placeIds.length > 0) {
    try {
      const places = await fetchEntities(placeIds, 'labels');
      const birthPlace = labelOf(places.get(claimIds(entity, 'P19')[0] ?? ''));
      const deathPlace = labelOf(places.get(claimIds(entity, 'P20')[0] ?? ''));
      if (!person.birth_place && birthPlace) patch.birth_place = birthPlace;
      if (!person.death_place && deathPlace) patch.death_place = deathPlace;
    } catch (err) {
      if (!(err instanceof UpstreamError)) throw err;
      console.error('place labels skipped', err.message);
    }
  }

  if (article) {
    const url = wikipediaUrl(article.lang, article.title);
    Object.assign(patch, {
      short_bio: firstSentences(article.extract, 280),
      full_bio: firstSentences(article.extract, 1600),
      bio_lang: article.lang,
      wikipedia_url: url,
    });
    const { error } = await sb.from('persons').update(patch).eq('id', person.id);
    if (error) throw new Error(`person update failed: ${error.message}`);
    const { error: delError } = await sb.from('person_sources').delete().eq('person_id', person.id);
    if (delError) console.error('clearing sources failed', delError.message);
    const { error: srcError } = await sb.from('person_sources').insert([
      {
        person_id: person.id,
        label: `Wikipedia (${languageNameDa(article.lang)})`,
        url,
        sort_order: 0,
      },
      {
        person_id: person.id,
        label: 'Wikidata',
        url: `https://www.wikidata.org/wiki/${person.wikidata_id}`,
        sort_order: 1,
      },
    ]);
    if (srcError) console.error('writing sources failed', srcError.message);
    return { person: await reload(sb, person.id), enriched: true, status: 'enriched' };
  }

  // No article in any candidate language: keep the Wikidata description as the bio.
  patch.bio_lang = null;
  const { error } = await sb.from('persons').update(patch).eq('id', person.id);
  if (error) throw new Error(`person update failed: ${error.message}`);
  return { person: await reload(sb, person.id), enriched: true, status: 'no_article' };
}
