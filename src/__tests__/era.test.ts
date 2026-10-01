import { describe, expect, it } from 'vitest';
import { buildEraSnapshot, populationAt } from '../../supabase/functions/_shared/era.ts';
import { HISTORY_EVENTS, MONARCHS } from '../../supabase/functions/_shared/history.ts';
import { PERSONS } from '../data/persons';
import { ageAtDeath, deriveEra, formatDanishDate } from '../lib/format';

describe('era engine', () => {
  it('computes monarchs and events for H.C. Andersen', () => {
    const s = buildEraSnapshot(1805, 1875);
    expect(s.period.name).toBe('Guldalderen');
    expect(s.monarchs.map((m) => m.name)).toEqual([
      'Christian 7.',
      'Frederik 6.',
      'Christian 8.',
      'Frederik 7.',
      'Christian 9.',
    ]);
    const grundlov = s.events.find((e) => e.year === 1849);
    expect(grundlov?.age).toBe(44);
  });

  it('interpolates population', () => {
    const p = populationAt(1825);
    expect(p?.denmark).toBeGreaterThan(929_001);
    expect(p?.denmark).toBeLessThan(1_414_648);
    expect(populationAt(1200)).toBeNull();
  });

  it('has sane curated history data', () => {
    for (let i = 1; i < MONARCHS.length; i++) {
      expect(MONARCHS[i].from).toBeGreaterThanOrEqual(MONARCHS[i - 1].from);
    }
    const years = HISTORY_EVENTS.map((e) => e.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });
});

describe('format helpers', () => {
  it('formats Danish dates', () => {
    expect(formatDanishDate('1805-04-02')).toBe('2. april 1805');
    expect(formatDanishDate(null)).toBeNull();
  });

  it('computes age at death with birthdays', () => {
    expect(ageAtDeath('1805-04-02', '1875-08-04', 1805, 1875)).toBe(70);
    expect(ageAtDeath('1813-05-05', '1855-11-11', 1813, 1855)).toBe(42);
    expect(ageAtDeath('1900-12-31', '1950-01-01', 1900, 1950)).toBe(49);
  });

  it('derives era titles', () => {
    expect(deriveEra(1805, 1875).timeWindowTitle).toBe('Danmark i Guldalderen');
  });
});

describe('curated fixtures', () => {
  it('have unique ids, coordinates, sources and plausible dates', () => {
    const ids = new Set(PERSONS.map((p) => p.id));
    expect(ids.size).toBe(PERSONS.length);
    for (const p of PERSONS) {
      expect(p.lat, p.name).not.toBeNull();
      expect(p.sources.length, p.name).toBeGreaterThan(0);
      expect(p.birthYear, p.name).not.toBeNull();
      expect(p.deathYear! - p.birthYear!, p.name).toBeGreaterThan(0);
      expect(p.deathYear!, p.name).toBeLessThanOrEqual(new Date().getFullYear() - 10);
      for (const t of p.timeline) {
        expect(t.year, `${p.name}: ${t.event}`).toBeGreaterThanOrEqual(p.birthYear!);
        expect(t.year, `${p.name}: ${t.event}`).toBeLessThanOrEqual(p.deathYear!);
      }
    }
  });
});

describe('extractJsonObject (OpenCode replies)', async () => {
  const { extractJsonObject } = await import('../../supabase/functions/_shared/json.ts');

  it('parses plain, fenced and chatty replies', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(extractJsonObject('```json\n{"a": {"b": "}"}}\n```')).toEqual({ a: { b: '}' } });
    expect(extractJsonObject('Her er svaret: {"names":["Ørsted"]} Tak.')).toEqual({
      names: ['Ørsted'],
    });
  });

  it('throws without an object', () => {
    expect(() => extractJsonObject('ingen json')).toThrow();
  });
});
