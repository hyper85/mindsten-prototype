import { deriveEra, formatDanishDate } from './format';
import type {
  Cemetery,
  LocationPrecision,
  Person,
  PersonCategory,
  PersonSource,
  ThemedRoute,
  TimelineEvent,
} from '../types';

export interface PersonRow {
  id: number;
  name: string;
  born: string | null;
  died: string | null;
  birth_date: string | null;
  death_date: string | null;
  birth_year: number | null;
  death_year: number | null;
  birth_place: string | null;
  death_place: string | null;
  profession: string | null;
  cemetery: string | null;
  cemetery_id: number | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  location_precision: LocationPrecision | null;
  confidence: number | null;
  short_bio: string | null;
  full_bio: string | null;
  era: string | null;
  era_years: string | null;
  time_window_title: string | null;
  category: PersonCategory;
  image_url: string | null;
  image_credit: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  timeline_events?: TimelineEventRow[] | null;
  person_sources?: PersonSourceRow[] | null;
}

export interface TimelineEventRow {
  year: number;
  event: string;
  sort_order: number;
}

export interface PersonSourceRow {
  label: string;
  url: string | null;
  sort_order: number;
}

export interface RouteRow {
  id: number;
  title: string;
  subtitle: string;
  stops: number;
  duration: string;
  distance: string;
  category: PersonCategory;
  emoji: string;
  person_ids: number[] | null;
}

export interface CemeteryRow {
  id: number;
  name: string;
  city: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
}

export function mapPerson(row: PersonRow): Person {
  const timeline: TimelineEvent[] = (row.timeline_events ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ year, event }) => ({ year, event }));

  const sources: PersonSource[] = (row.person_sources ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ label: s.label, url: s.url }));

  const derived = deriveEra(row.birth_year, row.death_year);

  return {
    id: row.id,
    name: row.name,
    born:
      row.born ??
      formatDanishDate(row.birth_date) ??
      (row.birth_year ? String(row.birth_year) : '?'),
    died:
      row.died ??
      formatDanishDate(row.death_date) ??
      (row.death_year ? String(row.death_year) : '?'),
    birthDate: row.birth_date,
    deathDate: row.death_date,
    birthYear: row.birth_year,
    deathYear: row.death_year,
    birthPlace: row.birth_place,
    deathPlace: row.death_place,
    profession: row.profession ?? '',
    cemetery: row.cemetery ?? '',
    cemeteryId: row.cemetery_id,
    city: row.city ?? '',
    lat: row.lat,
    lng: row.lng,
    locationPrecision: row.location_precision ?? 'unknown',
    confidence: row.confidence ?? 70,
    shortBio: row.short_bio ?? '',
    fullBio: row.full_bio || row.short_bio || '',
    era: row.era ?? derived.era,
    eraYears: row.era_years ?? derived.eraYears,
    timeWindowTitle: row.time_window_title ?? derived.timeWindowTitle,
    category: row.category,
    imageUrl: row.image_url,
    imageCredit: row.image_credit,
    wikidataId: row.wikidata_id,
    wikipediaUrl: row.wikipedia_url,
    timeline,
    sources,
  };
}

export function mapRoute(row: RouteRow): ThemedRoute {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    stops: row.stops,
    duration: row.duration,
    distance: row.distance,
    category: row.category,
    emoji: row.emoji,
    personIds: row.person_ids ?? [],
  };
}

export function mapCemetery(row: CemeteryRow): Cemetery | null {
  if (row.lat === null || row.lng === null) return null;
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    description: row.description,
  };
}

export const PERSON_SELECT =
  '*, timeline_events(year, event, sort_order), person_sources(label, url, sort_order)';

/** Lighter select for lists and map pins (no long text). */
export const PERSON_LIST_SELECT =
  'id, name, born, died, birth_date, death_date, birth_year, death_year, birth_place, death_place, profession, cemetery, cemetery_id, city, lat, lng, location_precision, confidence, category, image_url, image_credit, wikidata_id, wikipedia_url';
