// Wikidata helpers shared by the Node import script (scripts/import-wikidata.ts), the
// discover-graves / enrich-person Edge Functions (Deno) and the Vitest suite.
// PURE: no Deno or Node globals, no fetch — only data in, data out.

/** Mirrors PersonCategory in src/types/index.ts and the persons_category_check constraint. */
export type WikidataCategory =
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

// ---------------------------------------------------------------------------
// Grid cells
// ---------------------------------------------------------------------------

/** 0.1° grid key for a position, e.g. "55.7,12.5" (one decimal, never "-0.0"). */
export function cellKey(lat: number, lng: number): string {
  const round = (v: number) => {
    const x = Math.round(v * 10) / 10;
    return (x === 0 ? 0 : x).toFixed(1);
  };
  return `${round(lat)},${round(lng)}`;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface WdTime {
  /** ISO date, only when the precision is a day (and the year is positive). */
  iso: string | null;
  year: number | null;
  month: number;
  day: number;
  /** Wikidata precision: 11 day, 10 month, 9 year, 8 decade, 7 century, … 0 unknown. */
  precision: number;
}

export const UNKNOWN_TIME: WdTime = { iso: null, year: null, month: 0, day: 0, precision: 0 };

/**
 * Parses a Wikidata time ("+1805-04-02T00:00:00Z" from wbgetentities, "1805-04-02T00:00:00Z"
 * from SPARQL, "+1850-00-00T00:00:00Z" for a bare year) with its stated precision.
 */
export function parseWikidataTime(
  time: string | null | undefined,
  precision: number | string | null | undefined,
): WdTime {
  const m = time ? /^([+-]?)(\d+)-(\d{2})-(\d{2})/.exec(time) : null;
  if (!m) return UNKNOWN_TIME;
  const year = Number(m[2]) * (m[1] === '-' ? -1 : 1);
  const month = Number(m[3]);
  const day = Number(m[4]);
  const stated = Number(precision);
  // A "day" value without month/day is really coarser.
  const prec = Math.min(Number.isFinite(stated) ? stated : 0, day > 0 ? 11 : month > 0 ? 10 : 9);
  const iso = prec >= 11 && year > 0 ? isoDate(year, month, day) : null;
  return { iso, year, month, day, precision: prec };
}

/**
 * Databeskyttelsesloven § 2, stk. 5: true only when the person certainly died on or before
 * `cutoffIso` (today minus 10 years), i.e. the latest date the Wikidata value allows is
 * ≤ the cutoff. Day: the date; month: its last day; year/decade/century: the last day of
 * the last year; anything coarser is skipped.
 */
export function diedLongEnoughAgo(t: WdTime, cutoffIso: string): boolean {
  if (t.year === null) return false;
  const offset: Record<number, number> = { 11: 0, 10: 0, 9: 0, 8: 9, 7: 99 };
  if (!(t.precision in offset)) return false; // coarser than a century
  const lastYear = t.year + offset[t.precision];
  if (lastYear < 1) return true;
  const latest =
    t.precision === 11
      ? isoDate(t.year, t.month, t.day)
      : t.precision === 10
        ? isoDate(t.year, t.month, new Date(Date.UTC(t.year, t.month, 0)).getUTCDate())
        : isoDate(lastYear, 12, 31);
  return latest <= cutoffIso;
}

const MONTHS_DA = [
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

/** "1805-04-02" → "2. april 1805". Null for unparseable input. */
export function formatDanishDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(-?\d{1,4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const month = MONTHS_DA[Number(m[2]) - 1];
  if (!month) return null;
  return `${Number(m[3])}. ${month} ${Number(m[1])}`;
}

/** Display string for a date column: the Danish date, else the year, else null. */
export function displayDate(t: WdTime): string | null {
  return formatDanishDate(t.iso) ?? (t.year !== null ? String(t.year) : null);
}

// ---------------------------------------------------------------------------
// SPARQL: notable people buried near a point
// ---------------------------------------------------------------------------

const LABEL_LANGUAGES = 'da,en,de,fr,it,es,sv,nb,nl';

/**
 * SPARQL for query.wikidata.org: humans with a burial place within `radiusKm` of the point,
 * one row per person (aggregated), most sitelinks first. Only deaths in or before
 * `maxDeathYear` (today − 10 years; the exact 10-year rule is applied when parsing).
 *
 * The inner query picks the `limit` best-known persons with as few joins as possible;
 * labels, images, occupations and Wikipedia titles are only fetched for those. Joining
 * everything first and limiting last took > 20 s around Copenhagen or Paris, where
 * thousands of people are buried within 10 km.
 */
export function buildAroundQuery(
  lat: number,
  lng: number,
  radiusKm: number,
  maxDeathYear: number,
  limit: number,
  minSitelinks = 2,
): string {
  const num = (v: number, digits: number) => Number(v.toFixed(digits)).toString();
  const links = Math.max(1, Math.trunc(minSitelinks));
  const point = `Point(${num(lng, 5)} ${num(lat, 5)})`;
  const radius = num(Math.max(0.1, radiusKm), 2);
  const year = Math.trunc(maxDeathYear);
  const max = Math.max(1, Math.trunc(limit));
  // Blazegraph runs a named subquery (WITH … AS %top) first and exactly once; the
  // optimizer hint keeps the join order as written, so the geo lookup comes first.
  return `SELECT ?person ?sitelinks
  (SAMPLE(?personLabel) AS ?name) (SAMPLE(?personDescription) AS ?description)
  (SAMPLE(?death) AS ?deathTime) (SAMPLE(?deathPrec) AS ?deathPrecision)
  (SAMPLE(?birth) AS ?birthTime) (SAMPLE(?birthPrec) AS ?birthPrecision)
  (SAMPLE(?image) AS ?img)
  (SAMPLE(?place) AS ?burialPlace) (SAMPLE(?placeLabel) AS ?burialPlaceLabel)
  (SAMPLE(?placeCoord) AS ?burialCoord) (SAMPLE(?graveCoord) AS ?grave)
  (SAMPLE(?countryCode) AS ?country) (SAMPLE(?cityLabel) AS ?city)
  (GROUP_CONCAT(DISTINCT ?occupation; separator=" ") AS ?occupations)
  (SAMPLE(?dawiki) AS ?dawikiTitle) (SAMPLE(?enwiki) AS ?enwikiTitle)
WITH {
  SELECT DISTINCT ?person ?place ?placeCoord ?sitelinks WHERE {
    hint:Query hint:optimizer "None" .
    SERVICE wikibase:around {
      ?place wdt:P625 ?placeCoord .
      bd:serviceParam wikibase:center "${point}"^^geo:wktLiteral ;
                      wikibase:radius "${radius}" .
    }
    ?person wdt:P119 ?place .
    ?person wdt:P31 wd:Q5 .
    ?person wdt:P570 ?deathDate .
    ?person wikibase:sitelinks ?sitelinks .
    FILTER(?sitelinks >= ${links})
    FILTER(YEAR(?deathDate) <= ${year})
  }
  ORDER BY DESC(?sitelinks)
  LIMIT ${max}
} AS %top
WHERE {
  INCLUDE %top .
  ?person p:P570/psv:P570 ?dv .
  ?dv wikibase:timeValue ?death ;
      wikibase:timePrecision ?deathPrec .
  OPTIONAL {
    ?person p:P569/psv:P569 ?bv .
    ?bv wikibase:timeValue ?birth ;
        wikibase:timePrecision ?birthPrec .
  }
  OPTIONAL { ?person wdt:P18 ?image . }
  OPTIONAL { ?person p:P119 ?st . ?st ps:P119 ?place ; pq:P625 ?graveCoord . }
  OPTIONAL { ?place wdt:P17 ?countryItem . ?countryItem wdt:P297 ?countryCode . }
  OPTIONAL { ?place wdt:P131 ?cityItem . }
  OPTIONAL { ?person wdt:P106 ?occupation . }
  OPTIONAL {
    ?daArticle schema:about ?person ;
               schema:isPartOf <https://da.wikipedia.org/> ;
               schema:name ?dawiki .
  }
  OPTIONAL {
    ?enArticle schema:about ?person ;
               schema:isPartOf <https://en.wikipedia.org/> ;
               schema:name ?enwiki .
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "${LABEL_LANGUAGES}" .
    ?person rdfs:label ?personLabel ;
            schema:description ?personDescription .
    ?place rdfs:label ?placeLabel .
    ?cityItem rdfs:label ?cityLabel .
  }
}
GROUP BY ?person ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT ${max}`;
}

/** One cell of a SPARQL JSON result. */
export interface SparqlValue {
  type: string;
  value: string;
  datatype?: string;
  'xml:lang'?: string;
}
export type SparqlBinding = Record<string, SparqlValue | undefined>;

export interface DiscoveredPerson {
  wikidataId: string;
  name: string;
  description: string | null;
  birth: WdTime;
  death: WdTime;
  /** Commons file name (P18), e.g. "Charlie Chaplin.jpg". */
  imageFile: string | null;
  placeId: string;
  placeLabel: string;
  placeCoord: { lat: number; lng: number } | null;
  graveCoord: { lat: number; lng: number } | null;
  /** ISO 3166-1 alpha-2, upper-case. */
  countryCode: string | null;
  city: string | null;
  sitelinks: number;
  /** Occupation QIDs (P106). */
  occupations: string[];
  /** Article titles on da/en Wikipedia. */
  dawiki: string | null;
  enwiki: string | null;
}

export const qidOf = (uri: string): string => uri.slice(uri.lastIndexOf('/') + 1);

export function parsePoint(wkt: string | null | undefined): { lat: number; lng: number } | null {
  const m = wkt ? /Point\(\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s*\)/.exec(wkt) : null;
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

/**
 * Turns the bindings of `buildAroundQuery` into persons: drops rows without a name or a
 * death year, applies the 10-year rule (`cutoffIso` = today − 10 years, `maxDeathYear` its
 * year) and de-duplicates by Wikidata id.
 */
export function parseDiscoveryBindings(
  bindings: SparqlBinding[],
  cutoffIso: string,
  maxDeathYear: number,
): DiscoveredPerson[] {
  const out = new Map<string, DiscoveredPerson>();
  for (const b of bindings) {
    const personUri = b.person?.value;
    const name = b.name?.value?.trim();
    const placeUri = b.burialPlace?.value;
    if (!personUri || !name || !placeUri) continue;
    const wikidataId = qidOf(personUri);
    if (!/^Q\d+$/.test(wikidataId) || out.has(wikidataId)) continue;
    // A label that fell back to the QID means no label in any of our languages.
    if (name === wikidataId) continue;

    const death = parseWikidataTime(b.deathTime?.value, b.deathPrecision?.value);
    if (death.year === null || death.year > maxDeathYear) continue;
    if (!diedLongEnoughAgo(death, cutoffIso)) continue;
    const birth = parseWikidataTime(b.birthTime?.value, b.birthPrecision?.value);

    const placeId = qidOf(placeUri);
    const placeLabel = b.burialPlaceLabel?.value?.trim() || placeId;
    const country = b.country?.value?.trim().toUpperCase() ?? '';
    const sitelinks = Number(b.sitelinks?.value);
    const occupations = (b.occupations?.value ?? '')
      .split(/\s+/)
      .map((uri) => qidOf(uri))
      .filter((id) => /^Q\d+$/.test(id));
    const image = b.img?.value ? decodeCommonsFile(b.img.value) : null;

    out.set(wikidataId, {
      wikidataId,
      name,
      description: b.description?.value?.trim() || null,
      birth,
      death,
      imageFile: image,
      placeId,
      placeLabel,
      placeCoord: parsePoint(b.burialCoord?.value),
      graveCoord: parsePoint(b.grave?.value),
      countryCode: /^[A-Z]{2}$/.test(country) ? country : null,
      city: b.city?.value?.trim() || null,
      sitelinks: Number.isFinite(sitelinks) ? sitelinks : 0,
      occupations: [...new Set(occupations)],
      dawiki: b.dawikiTitle?.value?.trim() || null,
      enwiki: b.enwikiTitle?.value?.trim() || null,
    });
  }
  return [...out.values()];
}

/** "http://commons.wikimedia.org/wiki/Special:FilePath/Charlie%20Chaplin.jpg" → "Charlie Chaplin.jpg". */
export function decodeCommonsFile(value: string): string | null {
  const m = /Special:FilePath\/(.+)$/.exec(value);
  const raw = m ? m[1] : value;
  try {
    const file = decodeURIComponent(raw).replace(/_/g, ' ').trim();
    return file || null;
  } catch {
    return raw.trim() || null;
  }
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

export function commonsImageUrl(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`;
}

export function wikipediaUrl(lang: string, title: string): string {
  return `https://${wikipediaHost(lang)}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

/** Wikipedia subdomain for a language code (Bokmål lives on no.wikipedia.org). */
export function wikipediaHost(lang: string): string {
  return lang === 'nb' ? 'no' : lang;
}

/** Wikidata sitelink id for a language's Wikipedia ("dawiki", "nowiki"). */
export function wikipediaSiteId(lang: string): string {
  return `${wikipediaHost(lang)}wiki`;
}

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

const COUNTRY_LANGUAGES: Record<string, string[]> = {
  CH: ['de', 'fr', 'it'],
  DE: ['de'],
  AT: ['de'],
  FR: ['fr'],
  BE: ['nl', 'fr'],
  IT: ['it'],
  ES: ['es'],
  SE: ['sv'],
  NO: ['nb', 'no'],
  FI: ['fi', 'sv'],
  NL: ['nl'],
  PT: ['pt'],
  PL: ['pl'],
  CZ: ['cs'],
  RU: ['ru'],
  GR: ['el'],
  TR: ['tr'],
  IS: ['is'],
  HU: ['hu'],
};

/** Wikipedia languages to try for a person's bio, in order: Danish, English, then the country's. */
export function wikipediaLanguagesFor(countryCode: string | null | undefined): string[] {
  const local = COUNTRY_LANGUAGES[(countryCode ?? '').toUpperCase()] ?? [];
  return [...new Set(['da', 'en', ...local])];
}

const LANGUAGE_NAMES_DA: Record<string, string> = {
  da: 'dansk',
  en: 'engelsk',
  de: 'tysk',
  fr: 'fransk',
  it: 'italiensk',
  es: 'spansk',
  sv: 'svensk',
  nb: 'norsk',
  no: 'norsk',
  nl: 'hollandsk',
  pt: 'portugisisk',
  pl: 'polsk',
  fi: 'finsk',
  cs: 'tjekkisk',
  ru: 'russisk',
  el: 'græsk',
  tr: 'tyrkisk',
  is: 'islandsk',
  hu: 'ungarsk',
};

/** Danish name of a language ("Wikipedia (tysk)"); the code itself when unknown. */
export function languageNameDa(code: string): string {
  return LANGUAGE_NAMES_DA[code.toLowerCase()] ?? code;
}

// ---------------------------------------------------------------------------
// Categorisation (Danish + English + a few German keywords, then occupation QIDs)
// ---------------------------------------------------------------------------

// Order matters: royals before politics before writers (a "dronning og forfatter" is a royal).
const KEYWORDS: Array<[WikidataCategory, RegExp]> = [
  [
    'royals',
    /\b(konge|dronning|prins|prinsesse|kronprins|regent|hertug|king|queen|prince|princess|emperor|empress|duke|duchess|monarch|könig|königin|kaiser)/i,
  ],
  [
    'naval',
    /\b(admiral|søofficer|officer|general|oberst|kaptajn|militær|søhelt|soldier|military|naval|marshal|colonel|commander)/i,
  ],
  [
    'politics',
    /\b(politiker|minister|statsminister|borgmester|diplomat|folketingsmedlem|dommer|jurist|embedsmand|politician|president|mayor|judge|lawyer|chancellor|senator|statesman|politikerin?)/i,
  ],
  [
    'thinkers',
    /\b(filosof|teolog|præst|biskop|salmedigter|missionær|provst|philosopher|theologian|priest|bishop|cardinal|pope|rabbi|pastor|clergyman|philosoph)/i,
  ],
  [
    'science',
    /\b(fysiker|kemiker|matematiker|astronom|læge|biolog|botaniker|zoolog|videnskabs|forsker|ingeniør|opfinder|historiker|sprogforsker|arkæolog|geolog|physicist|chemist|mathematician|astronomer|physician|surgeon|biologist|botanist|zoologist|engineer|inventor|historian|scientist|psychologist|psychoanalyst|economist|archaeologist|geologist|linguist|naturalist|physiker|chemiker|mathematiker|arzt)/i,
  ],
  [
    'music',
    /\b(komponist|musiker|sanger|sangerinde|pianist|violinist|dirigent|organist|jazz|composer|singer|musician|conductor|songwriter|guitarist|cellist|komponistin?)/i,
  ],
  [
    'stage',
    /\b(skuespiller|skuespillerinde|instruktør|filminstruktør|danser|balletdanser|tv-vært|komiker|revy|manuskript|actor|actress|director|film director|filmmaker|dancer|comedian|screenwriter|choreographer|schauspieler|schauspielerin|regisseur)/i,
  ],
  [
    'art',
    /\b(maler|billedhugger|arkitekt|kunstner|fotograf|tegner|grafiker|designer|keramiker|painter|sculptor|architect|photographer|artist|illustrator|cartoonist|engraver|bildhauer|architekt|künstler)/i,
  ],
  [
    'writers',
    /\b(forfatter|digter|romanforfatter|dramatiker|journalist|skribent|lyriker|redaktør|writer|poet|novelist|playwright|author|essayist|dramatist|editor|publisher|schriftsteller|dichter)/i,
  ],
  [
    'sports',
    /\b(fodbold|cykelrytter|bokser|atlet|svømmer|roer|sejler|bryder|håndbold|badminton|idræt|footballer|football player|cyclist|boxer|athlete|swimmer|skier|tennis|racing driver|golfer|wrestler|rower|sprinter|fußballspieler)/i,
  ],
];

const OCCUPATIONS: Record<string, WikidataCategory> = {
  Q116: 'royals',
  Q12097: 'royals',
  Q47064: 'naval',
  Q189290: 'naval',
  Q82955: 'politics',
  Q193391: 'politics',
  Q16533: 'politics',
  Q4964182: 'thinkers',
  Q1234713: 'thinkers',
  Q152002: 'thinkers',
  Q901: 'science',
  Q169470: 'science',
  Q593644: 'science',
  Q170790: 'science',
  Q11063: 'science',
  Q864503: 'science',
  Q39631: 'science',
  Q201788: 'science',
  Q205375: 'science',
  Q81096: 'science',
  Q36834: 'music',
  Q639669: 'music',
  Q177220: 'music',
  Q158852: 'music',
  Q486748: 'music',
  Q33999: 'stage',
  Q10800557: 'stage',
  Q2526255: 'stage',
  Q5716684: 'stage',
  Q1028181: 'art',
  Q1281618: 'art',
  Q42973: 'art',
  Q33231: 'art',
  Q483501: 'art',
  Q36180: 'writers',
  Q49757: 'writers',
  Q6625963: 'writers',
  Q214917: 'writers',
  Q1930187: 'writers',
  Q2066131: 'sports',
  Q937857: 'sports',
  Q2309784: 'sports',
};

export function categorize(description: string | null, occupations: string[]): WikidataCategory {
  if (description) {
    for (const [cat, re] of KEYWORDS) if (re.test(description)) return cat;
  }
  for (const occ of occupations) {
    const cat = OCCUPATIONS[occ];
    if (cat) return cat;
  }
  return 'other';
}

// Leading nationality adjectives dropped from "dansk forfatter" / "Swiss painter".
const NATIONALITIES =
  /^(?:dansk|danske|dansk-norsk|norsk|svensk|tysk|finsk|islandsk|hollandsk|nederlandsk|fransk|italiensk|spansk|britisk|engelsk|amerikansk|østrigsk|schweizisk|polsk|russisk|Danish|Norwegian|Swedish|Finnish|Icelandic|German|Austrian|Swiss|French|Italian|Spanish|Portuguese|Dutch|Belgian|Flemish|British|English|Scottish|Irish|Welsh|American|Canadian|Australian|Russian|Polish|Czech|Slovak|Hungarian|Romanian|Bulgarian|Serbian|Croatian|Slovenian|Ukrainian|Estonian|Latvian|Lithuanian|Georgian|Greek|Turkish|Japanese|Chinese|Indian|Mexican|Brazilian|Argentine|Argentinian|Swiss-born|German-born|Austrian-born|French-born|American-born|Russian-born)(?:\s*[-–]\s*(?:born|American|British|French|German|Swiss|Danish))?\s+/i;

/** Danish words for the English occupation terms Wikidata descriptions use most. */
const PROFESSIONS_DA: Record<string, string> = {
  and: 'og',
  actor: 'skuespiller',
  actress: 'skuespiller',
  architect: 'arkitekt',
  artist: 'kunstner',
  astronomer: 'astronom',
  author: 'forfatter',
  biologist: 'biolog',
  businessman: 'forretningsmand',
  businesswoman: 'forretningskvinde',
  chemist: 'kemiker',
  comedian: 'komiker',
  composer: 'komponist',
  conductor: 'dirigent',
  critic: 'kritiker',
  dancer: 'danser',
  diplomat: 'diplomat',
  director: 'instruktør',
  dramatist: 'dramatiker',
  economist: 'økonom',
  editor: 'redaktør',
  engineer: 'ingeniør',
  entrepreneur: 'iværksætter',
  explorer: 'opdagelsesrejsende',
  filmmaker: 'filmskaber',
  historian: 'historiker',
  industrialist: 'industrimand',
  inventor: 'opfinder',
  journalist: 'journalist',
  judge: 'dommer',
  lawyer: 'advokat',
  linguist: 'sprogforsker',
  mathematician: 'matematiker',
  musician: 'musiker',
  novelist: 'romanforfatter',
  officer: 'officer',
  painter: 'maler',
  philosopher: 'filosof',
  photographer: 'fotograf',
  physician: 'læge',
  physicist: 'fysiker',
  pianist: 'pianist',
  playwright: 'dramatiker',
  poet: 'digter',
  politician: 'politiker',
  priest: 'præst',
  psychiatrist: 'psykiater',
  psychoanalyst: 'psykoanalytiker',
  psychologist: 'psykolog',
  publisher: 'forlægger',
  scientist: 'videnskabsmand',
  screenwriter: 'manuskriptforfatter',
  sculptor: 'billedhugger',
  singer: 'sanger',
  soldier: 'soldat',
  statesman: 'statsmand',
  teacher: 'lærer',
  theoretical: 'teoretisk',
  theologian: 'teolog',
  translator: 'oversætter',
  writer: 'forfatter',
};

/**
 * "dansk forfatter (1805-1875)" → "Forfatter"; "Swiss painter" → "Maler". Common English
 * occupation words are translated (Wikidata only falls back to the English description when
 * there is no Danish one); anything unknown is kept as is.
 */
export function professionFrom(description: string | null): string {
  if (!description) return '';
  const cleaned = description
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(NATIONALITIES, '')
    .replace(NATIONALITIES, '')
    .trim();
  if (!cleaned) return '';
  const translated = cleaned
    .split(/(\s+|,)/)
    .map((part) => PROFESSIONS_DA[part.toLowerCase()] ?? part)
    .join('');
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

/** Cuts a text at a sentence boundary before `maxChars` (or adds an ellipsis). */
export function firstSentences(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
  return end > maxChars * 0.4 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}
