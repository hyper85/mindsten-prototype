import type { Person, PersonCategory, ThemedRoute, TimelineEvent } from '../types';

export interface PersonRow {
  id: number;
  name: string;
  born: string;
  died: string;
  profession: string;
  cemetery: string;
  city: string;
  confidence: number;
  short_bio: string;
  full_bio: string;
  era: string;
  era_years: string;
  time_window_title: string;
  category: PersonCategory;
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
}

export function mapPerson(row: PersonRow): Person {
  const timeline: TimelineEvent[] = (row.timeline_events ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ year, event }) => ({ year, event }));

  const sources: string[] = (row.person_sources ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => s.label);

  return {
    id: row.id,
    name: row.name,
    born: row.born,
    died: row.died,
    profession: row.profession,
    cemetery: row.cemetery,
    city: row.city,
    confidence: row.confidence,
    shortBio: row.short_bio,
    fullBio: row.full_bio,
    era: row.era,
    eraYears: row.era_years,
    timeWindowTitle: row.time_window_title,
    category: row.category,
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
  };
}

export const PERSON_SELECT =
  '*, timeline_events(year, event, sort_order), person_sources(label, sort_order)';
