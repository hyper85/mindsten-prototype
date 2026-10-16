// Era engine: turns a lifespan into "what was the world like" facts.
// Pure functions shared by the web app and the era-story Edge Function.

import {
  ERA_PERIODS,
  HISTORY_EVENTS,
  MONARCHS,
  POPULATION,
  type EraPeriod,
  type HistoryEvent,
  type Monarch,
  type PopulationPoint,
} from './history.ts';

/** 'dk': the Danish time window (monarchs, everyday life, population); 'world': world events only. */
export type EraRegion = 'dk' | 'world';

export interface LivedEvent extends HistoryEvent {
  /** Age of the person when the event happened. */
  age: number;
}

export interface EraSnapshot {
  region: EraRegion;
  birthYear: number;
  deathYear: number;
  lifespan: number;
  /** Primary period (the one covering most of the adult life). */
  period: EraPeriod;
  /** All periods the life touched, in order. */
  periods: EraPeriod[];
  monarchs: Array<Monarch & { ageAtStart: number | null }>;
  events: LivedEvent[];
  populationAtBirth: PopulationPoint | null;
  populationAtDeath: PopulationPoint | null;
}

function overlaps(aFrom: number, aTo: number, bFrom: number, bTo: number): boolean {
  return aFrom <= bTo && bFrom <= aTo;
}

/** Linear interpolation between the two nearest census points. */
export function populationAt(year: number): PopulationPoint | null {
  if (POPULATION.length === 0) return null;
  const first = POPULATION[0];
  const last = POPULATION[POPULATION.length - 1];
  if (year < first.year) return null;
  if (year >= last.year) return { ...last, year };
  for (let i = 0; i < POPULATION.length - 1; i++) {
    const a = POPULATION[i];
    const b = POPULATION[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year);
      const lerp = (x?: number, y?: number) =>
        x !== undefined && y !== undefined ? Math.round(x + (y - x) * t) : undefined;
      return {
        year,
        denmark: lerp(a.denmark, b.denmark) ?? a.denmark,
        copenhagen: lerp(a.copenhagen, b.copenhagen),
        lifeExpectancy: lerp(a.lifeExpectancy, b.lifeExpectancy),
      };
    }
  }
  return null;
}

export function periodFor(year: number): EraPeriod {
  return (
    ERA_PERIODS.find((p) => year >= p.from && year < p.to) ??
    (year < ERA_PERIODS[0].from ? ERA_PERIODS[0] : ERA_PERIODS[ERA_PERIODS.length - 1])
  );
}

/** A century as a period ("1800-tallet"), for lives outside Denmark. */
export function centuryPeriod(year: number): EraPeriod {
  const start = Math.floor(year / 100) * 100;
  return {
    id: `c${start}`,
    name: `${start}-tallet`,
    from: start,
    to: start + 100,
    summary: '',
    everyday: [],
  };
}

export function buildEraSnapshot(
  birthYear: number,
  deathYear: number,
  region: EraRegion = 'dk',
): EraSnapshot {
  const from = Math.min(birthYear, deathYear);
  const to = Math.max(birthYear, deathYear);
  // The prime working years (around age 35) say most about "their time".
  const focusYear = from + Math.min(35, Math.round((to - from) * 0.6));

  if (region === 'world') {
    const centuries: EraPeriod[] = [];
    for (let c = Math.floor(from / 100) * 100; c <= to; c += 100) centuries.push(centuryPeriod(c));
    // World events only; a detail that is about Denmark is dropped abroad.
    const events: LivedEvent[] = HISTORY_EVENTS.filter(
      (e) => e.scope === 'world' && e.year >= from && e.year <= to,
    )
      .map((e) => ({
        ...e,
        detail: e.detail && /danmark|dansk/i.test(e.detail) ? undefined : e.detail,
        age: e.year - from,
      }))
      .sort((a, b) => a.year - b.year);
    return {
      region,
      birthYear: from,
      deathYear: to,
      lifespan: to - from,
      period: centuryPeriod(focusYear),
      periods: centuries,
      monarchs: [],
      events,
      populationAtBirth: null,
      populationAtDeath: null,
    };
  }

  const periods = ERA_PERIODS.filter((p) => overlaps(from, to, p.from, p.to - 1));

  const monarchs = MONARCHS.filter((m) => overlaps(from, to, m.from, m.to ?? 9999)).map((m) => ({
    ...m,
    ageAtStart: m.from >= from ? m.from - from : null,
  }));

  const events: LivedEvent[] = HISTORY_EVENTS.filter((e) => e.year >= from && e.year <= to)
    .map((e) => ({ ...e, age: e.year - from }))
    .sort((a, b) => a.year - b.year);

  return {
    region,
    birthYear: from,
    deathYear: to,
    lifespan: to - from,
    period: periodFor(focusYear),
    periods: periods.length > 0 ? periods : [periodFor(focusYear)],
    monarchs,
    events,
    populationAtBirth: populationAt(from),
    populationAtDeath: populationAt(to),
  };
}

/** Plain-text summary used as grounding context for the AI era story. */
export function eraSnapshotToPromptContext(s: EraSnapshot): string {
  const lines: string[] = [];
  lines.push(`Levetid: ${s.birthYear}–${s.deathYear} (${s.lifespan} år).`);
  lines.push(`Perioder: ${s.periods.map((p) => `${p.name} (${p.from}–${p.to})`).join(', ')}.`);
  if (s.monarchs.length > 0) {
    lines.push(
      `Regenter i levetiden: ${s.monarchs.map((m) => `${m.name} (${m.from}–${m.to ?? 'nu'})`).join(', ')}.`,
    );
  }
  if (s.events.length > 0) {
    lines.push('Begivenheder i levetiden:');
    for (const e of s.events) {
      lines.push(`- ${e.year} (alder ${e.age}): ${e.title}${e.detail ? ` — ${e.detail}` : ''}`);
    }
  }
  if (s.populationAtBirth) {
    lines.push(
      `Danmarks befolkning ved fødslen: ca. ${s.populationAtBirth.denmark.toLocaleString('da-DK')}.`,
    );
  }
  if (s.populationAtDeath) {
    lines.push(
      `Danmarks befolkning ved døden: ca. ${s.populationAtDeath.denmark.toLocaleString('da-DK')}.`,
    );
  }
  for (const p of s.periods) {
    if (p.everyday.length > 0) lines.push(`Hverdag i ${p.name}: ${p.everyday.join(' ')}`);
  }
  if (s.region === 'world') {
    lines.push(
      'Personen er ikke begravet i Danmark: brug kun verdensbegivenhederne ovenfor og almindeligt kendt verdenshistorie, ikke danske forhold.',
    );
  }
  return lines.join('\n');
}

/** Danish genitive: "H.C. Andersen" → "H.C. Andersens", "Thomas" → "Thomas'". */
export function genitive(name: string): string {
  const n = name.trim();
  return /[sxz]$/i.test(n) ? `${n}'` : `${n}s`;
}

export interface EraFields {
  era: string;
  eraYears: string;
  timeWindowTitle: string;
}

/**
 * The stored/derived era labels of a person: the Danish period ("Guldalderen",
 * "Danmark i guldalderen") or, for a life outside Denmark, the century
 * ("1800-tallet", "Verden i Chaplins tid" / "Verden i 1800-tallet").
 */
export function deriveEraFields(
  birthYear: number | null,
  deathYear: number | null,
  region: EraRegion = 'dk',
  name?: string,
): EraFields {
  if (!birthYear && !deathYear) {
    return region === 'world'
      ? { era: 'Ukendt periode', eraYears: '', timeWindowTitle: 'Verden i fortiden' }
      : { era: 'Ukendt periode', eraYears: '', timeWindowTitle: 'Danmark i fortiden' };
  }
  const from = birthYear ?? (deathYear as number) - 60;
  const to = deathYear ?? from + 60;
  const midpoint = Math.floor((from + to) / 2);
  const eraYears = `${Math.floor(midpoint / 100) * 100}-tallet`;
  if (region === 'world') {
    return {
      era: eraYears,
      eraYears,
      timeWindowTitle: name ? `Verden i ${genitive(name)} tid` : `Verden i ${eraYears}`,
    };
  }
  const { period } = buildEraSnapshot(from, to);
  const lower = period.name.replace(/^(Det|Den) /, (m) => m.toLowerCase());
  return { era: period.name, eraYears, timeWindowTitle: `Danmark i ${lower}` };
}
