import { buildEraSnapshot, periodFor } from '../../supabase/functions/_shared/era.ts';
import type { CategoryFilter, PersonCategory } from '../types';

const MONTHS = [
  'januar',
  'februar',
  'marts',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'december',
];

/** "1805-04-02" → "2. april 1805". Returns null for unparseable input. */
export function formatDanishDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(-?\d{1,4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return null;
  return `${Number(d)}. ${month} ${Number(y)}`;
}

export function yearFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^(-?\d{1,4})/.exec(iso);
  return m ? Number(m[1]) : null;
}

export function lifespanLabel(birthYear: number | null, deathYear: number | null): string {
  if (birthYear && deathYear) return `${birthYear}–${deathYear}`;
  if (deathYear) return `† ${deathYear}`;
  if (birthYear) return `f. ${birthYear}`;
  return '';
}

export function ageAtDeath(
  birthDate: string | null,
  deathDate: string | null,
  birthYear: number | null,
  deathYear: number | null,
): number | null {
  if (birthDate && deathDate) {
    const [by, bm, bd] = birthDate.split('-').map(Number);
    const [dy, dm, dd] = deathDate.split('-').map(Number);
    let age = dy - by;
    if (dm < bm || (dm === bm && dd < bd)) age -= 1;
    return age;
  }
  if (birthYear && deathYear) return deathYear - birthYear;
  return null;
}

/** Derives era name/years/title from a lifespan when the DB has none. */
export function deriveEra(birthYear: number | null, deathYear: number | null) {
  if (!birthYear && !deathYear) {
    return { era: 'Ukendt periode', eraYears: '', timeWindowTitle: 'Danmark i fortiden' };
  }
  const from = birthYear ?? (deathYear as number) - 60;
  const to = deathYear ?? from + 60;
  const { period } = buildEraSnapshot(from, to);
  const name = period.name.replace(/^(Det|Den) /, (m) => m.toLowerCase());
  const midpoint = Math.floor((from + to) / 2);
  return {
    era: period.name,
    eraYears: `${Math.floor(midpoint / 100) * 100}-tallet`,
    timeWindowTitle: `Danmark i ${name}`,
  };
}

export { periodFor };

export const CATEGORY_META: Record<PersonCategory, { label: string; emoji: string }> = {
  writers: { label: 'Forfattere', emoji: '✍️' },
  art: { label: 'Kunst', emoji: '🎨' },
  music: { label: 'Musik', emoji: '🎵' },
  science: { label: 'Videnskab', emoji: '🔬' },
  thinkers: { label: 'Tænkere & tro', emoji: '💭' },
  royals: { label: 'Kongelige', emoji: '👑' },
  naval: { label: 'Flåde & militær', emoji: '⚓' },
  politics: { label: 'Politik & magt', emoji: '🏛️' },
  stage: { label: 'Scene & film', emoji: '🎭' },
  sports: { label: 'Sport', emoji: '🏅' },
  other: { label: 'Andre', emoji: '✨' },
};

export const PERSON_CATEGORIES = Object.keys(CATEGORY_META) as PersonCategory[];

export const CATEGORY_FILTERS: CategoryFilter[] = [
  { id: 'all', label: 'Alle' },
  ...PERSON_CATEGORIES.map((id) => ({
    id,
    label: `${CATEGORY_META[id].emoji} ${CATEGORY_META[id].label}`,
  })),
];

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(meters / 1000)} km`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('da-DK');
}
