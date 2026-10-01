export type PersonCategory =
  | 'writers'
  | 'art'
  | 'music'
  | 'science'
  | 'thinkers'
  | 'royals'
  | 'naval'
  | 'politics'
  | 'stage'
  | 'sports'
  | 'other';

export interface TimelineEvent {
  year: number;
  event: string;
}

export interface PersonSource {
  label: string;
  url?: string | null;
}

/** How precise the stored coordinates are. */
export type LocationPrecision = 'grave' | 'cemetery' | 'unknown';

export interface Person {
  id: number;
  name: string;
  /** Display strings, e.g. "2. april 1805" or "ca. 1128". */
  born: string;
  died: string;
  birthDate: string | null; // ISO yyyy-mm-dd
  deathDate: string | null;
  birthYear: number | null;
  deathYear: number | null;
  birthPlace: string | null;
  deathPlace: string | null;
  profession: string;
  cemetery: string;
  cemeteryId: number | null;
  city: string;
  lat: number | null;
  lng: number | null;
  locationPrecision: LocationPrecision;
  /** Data-quality score 0–100 (how well the record is sourced). */
  confidence: number;
  shortBio: string;
  fullBio: string;
  timeline: TimelineEvent[];
  era: string;
  eraYears: string;
  timeWindowTitle: string;
  sources: PersonSource[];
  category: PersonCategory;
  imageUrl: string | null;
  imageCredit: string | null;
  wikidataId: string | null;
  wikipediaUrl: string | null;
}

export interface Cemetery {
  id: number;
  name: string;
  city: string;
  lat: number;
  lng: number;
  description?: string | null;
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
  personIds: number[];
}

export interface CategoryFilter {
  id: PersonCategory | 'all';
  label: string;
}

/** What the vision model read off the stone. */
export interface GravestoneReading {
  isGravestone: boolean;
  people: Array<{ name: string; birthYear: number | null; deathYear: number | null }>;
  inscription: string;
}

export interface ScanCandidate {
  person: Person;
  /** 0–100 match score combining name, years and distance. */
  score: number;
  distanceMeters: number | null;
}

export interface ScanResult {
  reading: GravestoneReading | null;
  candidates: ScanCandidate[];
  /** 'ai' = Claude vision, 'demo' = fixture simulation without backend. */
  mode: 'ai' | 'demo';
}

export interface EraStorySection {
  heading: string;
  body: string;
}

export interface EraStory {
  title: string;
  intro: string;
  sections: EraStorySection[];
  /** "Hvis du mødte X i år YYYY …" */
  imagine: string;
  model: string | null;
}

export interface GraveSubmission {
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  cemetery: string;
  lat: number | null;
  lng: number | null;
  note: string;
}
