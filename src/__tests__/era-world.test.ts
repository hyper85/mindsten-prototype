import { describe, expect, it } from 'vitest';
import {
  buildEraSnapshot,
  deriveEraFields,
  eraSnapshotToPromptContext,
} from '../../supabase/functions/_shared/era.ts';

describe('era engine: world region', () => {
  it('builds a world snapshot for Chaplin without Danish monarchs', () => {
    const s = buildEraSnapshot(1889, 1977, 'world');
    expect(s.region).toBe('world');
    expect(s.monarchs).toEqual([]);
    expect(s.periods.map((p) => p.id)).toEqual(['c1800', 'c1900']);
    expect(s.period.id).toBe('c1900');
    expect(s.events.some((e) => e.year === 1945)).toBe(true);
    expect(s.events.every((e) => e.scope === 'world')).toBe(true);
    expect(s.populationAtBirth).toBeNull();
    expect(eraSnapshotToPromptContext(s)).toContain('ikke begravet i Danmark');
  });

  it('derives world era fields', () => {
    expect(deriveEraFields(1889, 1977, 'world', 'Charlie Chaplin')).toEqual({
      era: '1900-tallet',
      eraYears: '1900-tallet',
      timeWindowTitle: 'Verden i Charlie Chaplins tid',
    });
    expect(deriveEraFields(1889, 1977, 'world').timeWindowTitle).toBe('Verden i 1900-tallet');
    expect(deriveEraFields(1805, 1875, 'dk').timeWindowTitle).toBe('Danmark i Guldalderen');
  });
});
