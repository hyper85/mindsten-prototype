export type PersonCategory = 'writers' | 'naval' | 'science' | 'royals';

export interface TimelineEvent {
  year: number;
  event: string;
}

export interface Person {
  id: number;
  name: string;
  born: string;
  died: string;
  profession: string;
  cemetery: string;
  city: string;
  confidence: number;
  shortBio: string;
  fullBio: string;
  timeline: TimelineEvent[];
  era: string;
  eraYears: string;
  timeWindowTitle: string;
  sources: string[];
  category: PersonCategory;
}

export interface ThemedRoute {
  id: number;
  title: string;
  subtitle: string;
  stops: number;
  duration: string;
  distance: string;
  category: PersonCategory;
  emoji: string;
}

export interface MapPin {
  person: Person;
  x: string;
  y: string;
  type: 'gold' | 'green';
}

export interface CategoryFilter {
  id: PersonCategory | 'all';
  label: string;
}
