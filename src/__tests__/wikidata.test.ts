import { describe, expect, it } from 'vitest';
import {
  buildAroundQuery,
  categorize,
  cellKey,
  commonsImageUrl,
  diedLongEnoughAgo,
  firstSentences,
  formatDanishDate,
  languageNameDa,
  parseDiscoveryBindings,
  parseWikidataTime,
  professionFrom,
  wikipediaLanguagesFor,
  wikipediaUrl,
  type SparqlBinding,
} from '../../supabase/functions/_shared/wikidata.ts';

const uri = (value: string) => ({ type: 'uri', value });
const lit = (value: string, datatype?: string) => ({ type: 'literal', value, datatype });
const time = (value: string) => lit(value, 'http://www.w3.org/2001/XMLSchema#dateTime');
const int = (value: number) => lit(String(value), 'http://www.w3.org/2001/XMLSchema#integer');

/** Charlie Chaplin, buried at Corsier-sur-Vevey (CH). */
const chaplin: SparqlBinding = {
  person: uri('http://www.wikidata.org/entity/Q882'),
  sitelinks: int(180),
  name: lit('Charlie Chaplin'),
  description: lit('British comic actor and filmmaker (1889–1977)'),
  deathTime: time('1977-12-25T00:00:00Z'),
  deathPrecision: int(11),
  birthTime: time('1889-04-16T00:00:00Z'),
  birthPrecision: int(11),
  img: uri('http://commons.wikimedia.org/wiki/Special:FilePath/Charlie%20Chaplin.jpg'),
  burialPlace: uri('http://www.wikidata.org/entity/Q2978421'),
  burialPlaceLabel: lit('cimetière de Corsier-sur-Vevey'),
  burialCoord: lit('Point(6.8437 46.4756)', 'http://www.opengis.net/ont/geosparql#wktLiteral'),
  grave: lit('Point(6.8440 46.4760)', 'http://www.opengis.net/ont/geosparql#wktLiteral'),
  country: lit('CH'),
  city: lit('Corsier-sur-Vevey'),
  occupations: lit('http://www.wikidata.org/entity/Q33999 http://www.wikidata.org/entity/Q2526255'),
  dawikiTitle: lit('Charlie Chaplin'),
  enwikiTitle: lit('Charlie Chaplin'),
};

const recent: SparqlBinding = {
  person: uri('http://www.wikidata.org/entity/Q1'),
  sitelinks: int(40),
  name: lit('Nyligt Afdød'),
  deathTime: time('2020-03-01T00:00:00Z'),
  deathPrecision: int(11),
  burialPlace: uri('http://www.wikidata.org/entity/Q2978421'),
  burialPlaceLabel: lit('cimetière de Corsier-sur-Vevey'),
  occupations: lit(''),
};

const decade2010s: SparqlBinding = {
  person: uri('http://www.wikidata.org/entity/Q2'),
  sitelinks: int(5),
  name: lit('Død i 2010erne'),
  deathTime: time('2010-01-01T00:00:00Z'),
  deathPrecision: int(8),
  burialPlace: uri('http://www.wikidata.org/entity/Q2978421'),
  burialPlaceLabel: lit('cimetière de Corsier-sur-Vevey'),
  occupations: lit(''),
};

const yearOnly: SparqlBinding = {
  person: uri('http://www.wikidata.org/entity/Q3'),
  sitelinks: int(9),
  name: lit('Kun Årstal'),
  deathTime: time('1850-01-01T00:00:00Z'),
  deathPrecision: int(9),
  birthTime: time('1790-01-01T00:00:00Z'),
  birthPrecision: int(9),
  burialPlace: uri('http://www.wikidata.org/entity/Q2978421'),
  burialPlaceLabel: lit('cimetière de Corsier-sur-Vevey'),
  occupations: lit(''),
};

const CUTOFF = '2016-10-16';
const MAX_YEAR = 2016;

describe('cellKey', () => {
  it('rounds to a 0.1° grid', () => {
    expect(cellKey(55.6908, 12.5501)).toBe('55.7,12.6');
    expect(cellKey(46.4756, 6.8437)).toBe('46.5,6.8');
    expect(cellKey(-33.86, 151.21)).toBe('-33.9,151.2');
    expect(cellKey(55, 12)).toBe('55.0,12.0');
  });

  it('never produces -0.0', () => {
    expect(cellKey(-0.04, -0.01)).toBe('0.0,0.0');
  });
});

describe('Wikidata time', () => {
  it('parses dates with their precision', () => {
    expect(parseWikidataTime('1977-12-25T00:00:00Z', 11)).toMatchObject({
      iso: '1977-12-25',
      year: 1977,
      precision: 11,
    });
    expect(parseWikidataTime('+1850-00-00T00:00:00Z', '11')).toMatchObject({
      iso: null,
      year: 1850,
      precision: 9,
    });
    expect(parseWikidataTime('-0500-01-01T00:00:00Z', 9).year).toBe(-500);
    expect(parseWikidataTime(undefined, undefined).year).toBeNull();
  });

  it('applies the 10-year rule by precision', () => {
    // Day: exactly ten years ago is fine, one day later is not.
    expect(diedLongEnoughAgo(parseWikidataTime('2016-10-16T00:00:00Z', 11), CUTOFF)).toBe(true);
    expect(diedLongEnoughAgo(parseWikidataTime('2016-10-17T00:00:00Z', 11), CUTOFF)).toBe(false);
    // Month: its last day counts.
    expect(diedLongEnoughAgo(parseWikidataTime('2016-10-01T00:00:00Z', 10), CUTOFF)).toBe(false);
    expect(diedLongEnoughAgo(parseWikidataTime('2016-09-01T00:00:00Z', 10), CUTOFF)).toBe(true);
    // Year / decade / century: the last day of the last year counts.
    expect(diedLongEnoughAgo(parseWikidataTime('2016-01-01T00:00:00Z', 9), CUTOFF)).toBe(false);
    expect(diedLongEnoughAgo(parseWikidataTime('2015-01-01T00:00:00Z', 9), CUTOFF)).toBe(true);
    expect(diedLongEnoughAgo(parseWikidataTime('2010-01-01T00:00:00Z', 8), CUTOFF)).toBe(false);
    expect(diedLongEnoughAgo(parseWikidataTime('2000-01-01T00:00:00Z', 8), CUTOFF)).toBe(true);
    expect(diedLongEnoughAgo(parseWikidataTime('1900-01-01T00:00:00Z', 7), CUTOFF)).toBe(true);
    // Coarser than a century: never certain enough.
    expect(diedLongEnoughAgo(parseWikidataTime('1000-01-01T00:00:00Z', 6), CUTOFF)).toBe(false);
  });

  it('formats Danish dates', () => {
    expect(formatDanishDate('1805-04-02')).toBe('2. april 1805');
    expect(formatDanishDate(null)).toBeNull();
  });
});

describe('parseDiscoveryBindings', () => {
  it('keeps Chaplin and drops recent and imprecise deaths', () => {
    const persons = parseDiscoveryBindings(
      [chaplin, recent, decade2010s, yearOnly],
      CUTOFF,
      MAX_YEAR,
    );
    expect(persons.map((p) => p.wikidataId)).toEqual(['Q882', 'Q3']);
    const c = persons[0];
    expect(c.name).toBe('Charlie Chaplin');
    expect(c.death).toMatchObject({ iso: '1977-12-25', year: 1977, precision: 11 });
    expect(c.birth).toMatchObject({ iso: '1889-04-16', year: 1889 });
    expect(c.imageFile).toBe('Charlie Chaplin.jpg');
    expect(c.placeId).toBe('Q2978421');
    expect(c.placeLabel).toBe('cimetière de Corsier-sur-Vevey');
    expect(c.placeCoord).toEqual({ lat: 46.4756, lng: 6.8437 });
    expect(c.graveCoord).toEqual({ lat: 46.476, lng: 6.844 });
    expect(c.countryCode).toBe('CH');
    expect(c.city).toBe('Corsier-sur-Vevey');
    expect(c.sitelinks).toBe(180);
    expect(c.occupations).toEqual(['Q33999', 'Q2526255']);
    expect(c.dawiki).toBe('Charlie Chaplin');
    expect(c.enwiki).toBe('Charlie Chaplin');
    expect(persons[1]).toMatchObject({
      birth: { iso: null, year: 1790 },
      death: { iso: null, year: 1850 },
      placeCoord: null,
      graveCoord: null,
      countryCode: null,
      city: null,
      imageFile: null,
      dawiki: null,
      occupations: [],
    });
  });

  it('de-duplicates and drops rows without a name or death', () => {
    const noName = {
      ...yearOnly,
      person: uri('http://www.wikidata.org/entity/Q4'),
      name: undefined,
    };
    const noDeath = {
      ...yearOnly,
      person: uri('http://www.wikidata.org/entity/Q5'),
      deathTime: undefined,
    };
    const persons = parseDiscoveryBindings([chaplin, chaplin, noName, noDeath], CUTOFF, MAX_YEAR);
    expect(persons).toHaveLength(1);
  });
});

describe('buildAroundQuery', () => {
  it('centres on the point and limits the result', () => {
    const q = buildAroundQuery(46.4756, 6.8437, 10, 2016, 80);
    expect(q).toContain('"Point(6.8437 46.4756)"^^geo:wktLiteral');
    expect(q).toContain('wikibase:radius "10"');
    expect(q).toContain('FILTER(YEAR(?deathDate) <= 2016)');
    expect(q).toContain('FILTER(?sitelinks >= 2)');
    expect(q).toContain('wdt:P119 ?place');
    expect(q).toContain('GROUP BY ?person ?sitelinks');
    expect(q.trimEnd().endsWith('LIMIT 80')).toBe(true);
  });
});

describe('categorize / professionFrom', () => {
  it('understands English and Danish descriptions', () => {
    expect(categorize('British comic actor and filmmaker', [])).toBe('stage');
    expect(categorize('Swiss painter', [])).toBe('art');
    expect(categorize('German-born theoretical physicist', [])).toBe('science');
    expect(categorize('Irish poet and playwright', [])).toBe('writers');
    expect(categorize('Queen of Denmark', [])).toBe('royals');
    expect(categorize('French footballer', [])).toBe('sports');
    expect(categorize('dansk forfatter', [])).toBe('writers');
    expect(categorize('dansk komponist', [])).toBe('music');
    expect(categorize('dansk søofficer', [])).toBe('naval');
    expect(categorize(null, ['Q82955'])).toBe('politics');
    expect(categorize('something else', [])).toBe('other');
  });

  it('strips nationalities and parentheses', () => {
    expect(professionFrom('Swiss painter (1853–1918)')).toBe('Painter');
    expect(professionFrom('German-born theoretical physicist')).toBe('Theoretical physicist');
    expect(professionFrom('dansk forfatter og digter')).toBe('Forfatter og digter');
    expect(professionFrom(null)).toBe('');
  });
});

describe('languages and urls', () => {
  it('orders candidate Wikipedia languages', () => {
    expect(wikipediaLanguagesFor('CH')).toEqual(['da', 'en', 'de', 'fr', 'it']);
    expect(wikipediaLanguagesFor('DK')).toEqual(['da', 'en']);
    expect(wikipediaLanguagesFor(null)).toEqual(['da', 'en']);
    expect(wikipediaLanguagesFor('NO')).toEqual(['da', 'en', 'nb', 'no']);
  });

  it('names languages in Danish', () => {
    expect(languageNameDa('de')).toBe('tysk');
    expect(languageNameDa('nb')).toBe('norsk');
    expect(languageNameDa('xx')).toBe('xx');
  });

  it('builds Commons and Wikipedia urls', () => {
    expect(commonsImageUrl('Charlie Chaplin.jpg')).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Charlie%20Chaplin.jpg?width=640',
    );
    expect(wikipediaUrl('de', 'Charlie Chaplin')).toBe(
      'https://de.wikipedia.org/wiki/Charlie_Chaplin',
    );
    expect(wikipediaUrl('nb', 'Charlie Chaplin')).toBe(
      'https://no.wikipedia.org/wiki/Charlie_Chaplin',
    );
  });
});

describe('firstSentences', () => {
  it('cuts at a sentence boundary', () => {
    const text = 'Første sætning. Anden sætning er lidt længere. Tredje sætning.';
    expect(firstSentences(text, 1000)).toBe(text);
    expect(firstSentences(text, 50)).toBe('Første sætning. Anden sætning er lidt længere.');
    expect(firstSentences('x'.repeat(100), 20)).toBe(`${'x'.repeat(20)}…`);
  });
});
