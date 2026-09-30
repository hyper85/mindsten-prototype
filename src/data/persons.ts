// Curated reference persons — used as offline fallback and as the seed for
// Supabase (scripts/generate-seed.ts). The Wikidata import merges into these
// rows by name + birth year, so keep names in their common Danish form.
//
// Coordinates are cemetery-level (locationPrecision: 'cemetery') unless the
// exact grave position is known.

import { CEMETERIES } from './cemeteries';
import { deriveEra, formatDanishDate, yearFromIso } from '../lib/format';
import type { Person, PersonCategory, PersonSource, TimelineEvent } from '../types';

interface CuratedInput {
  id: number;
  name: string;
  birthDate?: string;
  deathDate?: string;
  /** Use when only the year (or an approximate year) is known. */
  born?: string;
  died?: string;
  birthYear?: number;
  deathYear?: number;
  birthPlace?: string;
  deathPlace?: string;
  profession: string;
  category: PersonCategory;
  cemeteryId: number;
  shortBio: string;
  fullBio: string;
  timeline: TimelineEvent[];
  wikipedia: string;
  extraSources?: PersonSource[];
  confidence?: number;
}

function curated(input: CuratedInput): Person {
  const cemetery = CEMETERIES.find((c) => c.id === input.cemeteryId);
  if (!cemetery) throw new Error(`Unknown cemetery ${input.cemeteryId} for ${input.name}`);
  const birthYear = input.birthYear ?? yearFromIso(input.birthDate);
  const deathYear = input.deathYear ?? yearFromIso(input.deathDate);
  const wikipediaUrl = `https://da.wikipedia.org/wiki/${encodeURIComponent(input.wikipedia)}`;
  return {
    id: input.id,
    name: input.name,
    born: input.born ?? formatDanishDate(input.birthDate) ?? String(birthYear ?? '?'),
    died: input.died ?? formatDanishDate(input.deathDate) ?? String(deathYear ?? '?'),
    birthDate: input.birthDate ?? null,
    deathDate: input.deathDate ?? null,
    birthYear,
    deathYear,
    birthPlace: input.birthPlace ?? null,
    deathPlace: input.deathPlace ?? null,
    profession: input.profession,
    cemetery: cemetery.name,
    cemeteryId: cemetery.id,
    city: cemetery.city,
    lat: cemetery.lat,
    lng: cemetery.lng,
    locationPrecision: 'cemetery',
    confidence: input.confidence ?? 90,
    shortBio: input.shortBio,
    fullBio: input.fullBio,
    timeline: input.timeline,
    ...deriveEra(birthYear, deathYear),
    sources: [
      { label: 'Wikipedia (dansk)', url: wikipediaUrl },
      ...(input.extraSources ?? [
        { label: 'Dansk Biografisk Leksikon', url: 'https://biografiskleksikon.lex.dk/' },
      ]),
    ],
    category: input.category,
    imageUrl: null,
    imageCredit: null,
    wikidataId: null,
    wikipediaUrl,
  };
}

export const PERSONS: Person[] = [
  curated({
    id: 1,
    name: 'H.C. Andersen',
    birthDate: '1805-04-02',
    deathDate: '1875-08-04',
    birthPlace: 'Odense',
    deathPlace: 'København',
    profession: 'Forfatter',
    category: 'writers',
    cemeteryId: 1,
    confidence: 97,
    shortBio:
      "Verdens mest elskede eventyrdigter. Hans eventyr som 'Den grimme ælling', 'Den lille havfrue' og 'Kejserens nye klæder' er oversat til over 125 sprog.",
    fullBio:
      'Hans Christian Andersen blev født i Odense i fattige kår og rejste som 14-årig til København for at søge lykken. Efter år med modgang brød han igennem som forfatter og blev en af verdenshistoriens mest oversatte forfattere. Hans eventyr kombinerede folkelig fortælletradition med dyb menneskelig indsigt og blev elsket af både børn og voksne verden over.',
    timeline: [
      { year: 1805, event: 'Født i Odense' },
      { year: 1819, event: 'Rejser til København' },
      { year: 1835, event: "Udgiver 'Eventyr, fortalte for Børn'" },
      { year: 1843, event: "'Den grimme ælling' udkommer" },
      { year: 1875, event: 'Dør på landstedet Rolighed, 70 år' },
    ],
    wikipedia: 'H.C._Andersen',
    extraSources: [{ label: 'H.C. Andersen Centret', url: 'https://andersen.sdu.dk/' }],
  }),
  curated({
    id: 2,
    name: 'Søren Kierkegaard',
    birthDate: '1813-05-05',
    deathDate: '1855-11-11',
    birthPlace: 'København',
    deathPlace: 'København',
    profession: 'Filosof og teolog',
    category: 'thinkers',
    cemeteryId: 1,
    confidence: 94,
    shortBio:
      'Eksistentialismens fader. Hans filosofi om angst, fortvivlelse og troens spring har formet moderne tænkning dybt.',
    fullBio:
      "Søren Aabye Kierkegaard var en dansk filosof, teolog og forfatter, der regnes som eksistentialismens grundlægger. Han udfordrede den etablerede kirke og Hegels filosofi med sine skrifter om den enkeltes ansvar og eksistens. Hans værker som 'Enten – Eller' og 'Begrebet Angest' er grundtekster i vestlig filosofi.",
    timeline: [
      { year: 1813, event: 'Født i København' },
      { year: 1840, event: 'Forlovet med Regine Olsen' },
      { year: 1843, event: "'Enten – Eller' udgives" },
      { year: 1849, event: "'Sygdommen til Døden'" },
      { year: 1855, event: "Angriber kirken i 'Øieblikket' og dør, 42 år" },
    ],
    wikipedia: 'Søren_Kierkegaard',
    extraSources: [{ label: 'Søren Kierkegaard Forskningscenteret', url: 'https://www.sks.dk/' }],
  }),
  curated({
    id: 3,
    name: 'Niels Bohr',
    birthDate: '1885-10-07',
    deathDate: '1962-11-18',
    birthPlace: 'København',
    deathPlace: 'København',
    profession: 'Fysiker',
    category: 'science',
    cemeteryId: 1,
    confidence: 96,
    shortBio:
      'Nobelpristager i fysik og en af grundlæggerne af atomfysikken. Hans atommodel fra 1913 ændrede vores forståelse af stoffets opbygning.',
    fullBio:
      'Niels Henrik David Bohr modtog Nobelprisen i fysik i 1922 for sin forskning i atomets struktur. Hans institut ved Københavns Universitet blev et internationalt centrum for kvantefysikken. Under besættelsen flygtede han i 1943 til Sverige og videre til England og USA. Efter krigen arbejdede han for fredelig brug af atomenergi.',
    timeline: [
      { year: 1885, event: 'Født i København' },
      { year: 1913, event: 'Bohr-modellen for atomet publiceres' },
      { year: 1921, event: 'Institut for Teoretisk Fysik åbner' },
      { year: 1922, event: 'Modtager Nobelprisen i fysik' },
      { year: 1943, event: 'Flugten til Sverige' },
    ],
    wikipedia: 'Niels_Bohr',
    extraSources: [{ label: 'Niels Bohr Arkivet', url: 'https://www.nbarchive.dk/' }],
  }),
  curated({
    id: 4,
    name: 'Niels Juel',
    birthDate: '1629-05-08',
    deathDate: '1697-04-08',
    birthPlace: 'Christiania (Oslo)',
    deathPlace: 'København',
    profession: 'Admiral',
    category: 'naval',
    cemeteryId: 2,
    confidence: 91,
    shortBio:
      'En af Danmarks største søhelte. Hans sejr i Slaget i Køge Bugt i 1677 er den danske flådes mest berømte.',
    fullBio:
      'Niels Juel var en dansk-norsk admiral, der ledte den danske flåde under Skånske Krig. Hans taktiske evner i Slaget ved Femern og Slaget i Køge Bugt i 1677 sikrede dansk kontrol over Østersøen og gjorde ham til en af Danmarks mest fejrede søhelte. Han er begravet i Holmens Kirke.',
    timeline: [
      { year: 1629, event: 'Født i Christiania (Oslo)' },
      { year: 1659, event: 'Deltager i forsvaret af København under svenskernes belejring' },
      { year: 1677, event: 'Sejrer i Slaget i Køge Bugt' },
      { year: 1697, event: 'Dør i København, 67 år' },
    ],
    wikipedia: 'Niels_Juel',
    extraSources: [{ label: 'Orlogsmuseet', url: 'https://natmus.dk/' }],
  }),
  curated({
    id: 5,
    name: 'H.C. Ørsted',
    birthDate: '1777-08-14',
    deathDate: '1851-03-09',
    birthPlace: 'Rudkøbing',
    deathPlace: 'København',
    profession: 'Fysiker og kemiker',
    category: 'science',
    cemeteryId: 1,
    shortBio:
      'Opdagede elektromagnetismen i 1820 — sammenhængen mellem elektricitet og magnetisme, som al moderne elektroteknik bygger på.',
    fullBio:
      'Hans Christian Ørsted voksede op som apotekersøn i Rudkøbing på Langeland. I 1820 viste han, at en elektrisk strøm påvirker en kompasnål, og opdagelsen gjorde ham berømt i hele Europa. Han grundlagde Polyteknisk Læreanstalt (i dag DTU) i 1829 og arbejdede for at udbrede naturvidenskaben til hele befolkningen.',
    timeline: [
      { year: 1777, event: 'Født i Rudkøbing' },
      { year: 1820, event: 'Opdager elektromagnetismen' },
      { year: 1824, event: 'Stifter Selskabet for Naturlærens Udbredelse' },
      { year: 1829, event: 'Grundlægger Polyteknisk Læreanstalt' },
      { year: 1851, event: 'Dør i København, 73 år' },
    ],
    wikipedia: 'H.C._Ørsted',
  }),
  curated({
    id: 6,
    name: 'Martin Andersen Nexø',
    birthDate: '1869-06-26',
    deathDate: '1954-06-01',
    birthPlace: 'København (Christianshavn)',
    deathPlace: 'Dresden',
    profession: 'Forfatter',
    category: 'writers',
    cemeteryId: 1,
    shortBio:
      "Arbejderklassens store fortæller. 'Pelle Erobreren' og 'Ditte Menneskebarn' skildrer fattigdom og kamp for et bedre liv.",
    fullBio:
      "Martin Andersen Nexø voksede op i fattigdom i København og på Bornholm, hvor han tog navn efter byen Nexø. Hans romaner 'Pelle Erobreren' og 'Ditte Menneskebarn' gav stemme til landarbejdere, tjenestepiger og industriarbejdere og blev læst i hele verden. Han døde i Dresden i 1954 og blev begravet på Assistens Kirkegård.",
    timeline: [
      { year: 1869, event: 'Født på Christianshavn' },
      { year: 1877, event: 'Familien flytter til Nexø på Bornholm' },
      { year: 1906, event: "Første bind af 'Pelle Erobreren'" },
      { year: 1917, event: "'Ditte Menneskebarn' begynder at udkomme" },
      { year: 1954, event: 'Dør i Dresden, 84 år' },
    ],
    wikipedia: 'Martin_Andersen_Nexø',
  }),
  curated({
    id: 7,
    name: 'Dan Turèll',
    birthDate: '1946-02-19',
    deathDate: '1993-10-15',
    birthPlace: 'Vangede',
    deathPlace: 'København',
    profession: 'Forfatter og digter',
    category: 'writers',
    cemeteryId: 1,
    shortBio:
      "'Onkel Danny' — digter, krimiforfatter og København-skildrer med sort neglelak og en uendelig kærlighed til hverdagen.",
    fullBio:
      "Dan Turèll skrev digte, essays, erindringer og krimier og blev en af sin generations mest folkekære forfattere. 'Vangede Billeder' fra 1975 er en klassiker om opvækst i forstaden, og hans 'Mord'-serie gjorde Vesterbro til krimiscene. Han døde af kræft i 1993.",
    timeline: [
      { year: 1946, event: 'Født i Vangede' },
      { year: 1975, event: "'Vangede Billeder' udkommer" },
      { year: 1981, event: "Første bog i 'Mord'-serien" },
      { year: 1993, event: 'Dør i København, 47 år' },
    ],
    wikipedia: 'Dan_Turèll',
  }),
  curated({
    id: 8,
    name: 'Tove Ditlevsen',
    birthDate: '1917-12-14',
    deathDate: '1976-03-07',
    birthPlace: 'København (Vesterbro)',
    deathPlace: 'København',
    profession: 'Forfatter og digter',
    category: 'writers',
    cemeteryId: 1,
    shortBio:
      'Digteren fra Vesterbro, hvis erindringer om barndom, ungdom og afhængighed i dag læses verden over.',
    fullBio:
      "Tove Ditlevsen voksede op i en arbejderfamilie på Vesterbro og debuterede med digtsamlingen 'Pigesind' i 1939. Hendes erindringsværker 'Barndom', 'Ungdom' og 'Gift' — i dag kendt som Københavnertrilogien — skildrer ærligt kvindeliv, fattigdom og misbrug og er oversat til mange sprog.",
    timeline: [
      { year: 1917, event: 'Født på Vesterbro' },
      { year: 1939, event: "Debuterer med 'Pigesind'" },
      { year: 1967, event: "'Barndom' og 'Ungdom' udkommer" },
      { year: 1971, event: "'Gift' udkommer" },
      { year: 1976, event: 'Dør i København, 58 år' },
    ],
    wikipedia: 'Tove_Ditlevsen',
  }),
  curated({
    id: 9,
    name: 'Christen Købke',
    birthDate: '1810-05-26',
    deathDate: '1848-02-07',
    birthPlace: 'København',
    deathPlace: 'København',
    profession: 'Maler',
    category: 'art',
    cemeteryId: 1,
    shortBio:
      'Guldaldermaler, der fangede det stille, klare lys over København og Frederiksborg Slot.',
    fullBio:
      "Christen Købke var elev af C.W. Eckersberg på Kunstakademiet og blev en af guldalderens fineste malere. Hans billeder som 'Frederiksborg Slot ved aftenbelysning' og 'Udsigt fra Dosseringen' viser hverdagens København i et roligt, præcist lys. Han døde kun 37 år gammel.",
    timeline: [
      { year: 1810, event: 'Født i København' },
      { year: 1822, event: 'Begynder på Kunstakademiet' },
      { year: 1835, event: "'Frederiksborg Slot ved aftenbelysning'" },
      { year: 1838, event: "'Udsigt fra Dosseringen'" },
      { year: 1848, event: 'Dør i København, 37 år' },
    ],
    wikipedia: 'Christen_Købke',
  }),
  curated({
    id: 10,
    name: 'C.W. Eckersberg',
    birthDate: '1783-01-02',
    deathDate: '1853-07-22',
    birthPlace: 'Blåkrog ved Aabenraa',
    deathPlace: 'København',
    profession: 'Maler',
    category: 'art',
    cemeteryId: 1,
    shortBio:
      "Kaldt 'den danske malerkunsts fader'. Som professor lærte han en hel generation af guldaldermalere at se efter naturen.",
    fullBio:
      'Christoffer Wilhelm Eckersberg studerede i Paris hos Jacques-Louis David og derefter i Rom. Som professor ved Kunstakademiet fra 1818 lærte han eleverne at male direkte efter naturen, og blandt dem var Købke, Marstrand og Rørbye. Han døde af kolera under epidemien i 1853.',
    timeline: [
      { year: 1783, event: 'Født ved Aabenraa' },
      { year: 1811, event: 'Rejser til Paris og studerer hos David' },
      { year: 1813, event: 'Ophold i Rom' },
      { year: 1818, event: 'Professor ved Kunstakademiet' },
      { year: 1853, event: 'Dør under koleraepidemien, 70 år' },
    ],
    wikipedia: 'C.W._Eckersberg',
  }),
  curated({
    id: 11,
    name: 'Rasmus Rask',
    birthDate: '1787-11-22',
    deathDate: '1832-11-14',
    birthPlace: 'Brændekilde på Fyn',
    deathPlace: 'København',
    profession: 'Sprogforsker',
    category: 'science',
    cemeteryId: 1,
    shortBio:
      'Sprogforskeren, der var med til at vise, at de europæiske og indiske sprog er i familie med hinanden.',
    fullBio:
      'Rasmus Rask var bondesøn fra Fyn og en af grundlæggerne af den sammenlignende sprogvidenskab. Han lærte sig et væld af sprog og rejste fra 1816 til 1823 gennem Rusland og Persien til Indien og Ceylon for at studere dem. Hans arbejde med islandsk og de nordiske sprog er stadig grundlæggende.',
    timeline: [
      { year: 1787, event: 'Født i Brændekilde på Fyn' },
      { year: 1814, event: 'Skriver sit prisskrift om oldnordisk sprogs oprindelse' },
      { year: 1816, event: 'Rejser mod Persien og Indien' },
      { year: 1823, event: 'Vender hjem til København' },
      { year: 1832, event: 'Dør i København, 44 år' },
    ],
    wikipedia: 'Rasmus_Rask',
  }),
  curated({
    id: 12,
    name: 'Michael Strunge',
    birthDate: '1958-11-19',
    deathDate: '1986-03-09',
    deathPlace: 'København',
    profession: 'Digter',
    category: 'writers',
    cemeteryId: 1,
    shortBio: 'Den intense stemme i 1980’ernes danske poesi — punk, lys og længsel i storbyen.',
    fullBio:
      "Michael Strunge debuterede i 1978 med 'Livets hastighed' og blev en central figur blandt de unge digtere i 1980'ernes København. Hans digte kombinerede storbyens mørke med drømmen om skønhed. Han døde kun 27 år gammel.",
    timeline: [
      { year: 1958, event: 'Født' },
      { year: 1978, event: "Debuterer med 'Livets hastighed'" },
      { year: 1986, event: 'Dør i København, 27 år' },
    ],
    wikipedia: 'Michael_Strunge',
  }),
  curated({
    id: 13,
    name: 'Ben Webster',
    birthDate: '1909-03-27',
    deathDate: '1973-09-20',
    birthPlace: 'Kansas City, USA',
    deathPlace: 'Amsterdam',
    profession: 'Jazzsaxofonist',
    category: 'music',
    cemeteryId: 1,
    shortBio:
      'Amerikansk tenorsaxofonist fra Duke Ellingtons orkester, som fandt sit andet hjem i København.',
    fullBio:
      "Ben Webster var en af jazzens store tenorsaxofonister og spillede i Duke Ellingtons orkester i begyndelsen af 1940'erne. I 1960'erne slog han sig ned i København, hvor han spillede med danske musikere på bl.a. Jazzhus Montmartre. Han døde i Amsterdam efter en koncert og blev begravet på Assistens Kirkegård.",
    timeline: [
      { year: 1909, event: 'Født i Kansas City' },
      { year: 1940, event: 'Fast solist i Duke Ellingtons orkester' },
      { year: 1965, event: 'Flytter til København' },
      { year: 1973, event: 'Dør i Amsterdam, 64 år' },
    ],
    wikipedia: 'Ben_Webster',
  }),
  curated({
    id: 14,
    name: 'Peter Wessel Tordenskiold',
    birthDate: '1690-10-28',
    deathDate: '1720-11-20',
    birthPlace: 'Trondheim',
    deathPlace: 'Ved Hannover',
    profession: 'Viceadmiral',
    category: 'naval',
    cemeteryId: 2,
    shortBio:
      'Den dristige søhelt fra Store Nordiske Krig, der vandt Slaget i Dynekilen og døde i en duel kun 30 år gammel.',
    fullBio:
      'Peter Wessel blev født i Trondheim og gjorde lynkarriere i den dansk-norske flåde under Store Nordiske Krig. I 1716 blev han adlet med navnet Tordenskiold, og samme år ødelagde han en svensk forsyningsflåde i Dynekilen. Han blev dræbt i en duel i Tyskland i 1720 og ligger i Holmens Kirke.',
    timeline: [
      { year: 1690, event: 'Født i Trondheim' },
      { year: 1716, event: 'Adlet som Tordenskiold og sejr i Dynekilen' },
      { year: 1719, event: 'Erobrer fæstningen Marstrand' },
      { year: 1720, event: 'Dræbt i duel, 30 år' },
    ],
    wikipedia: 'Peter_Wessel_Tordenskiold',
  }),
  curated({
    id: 15,
    name: 'Carl Nielsen',
    birthDate: '1865-06-09',
    deathDate: '1931-10-03',
    birthPlace: 'Sortelung ved Nørre Lyndelse',
    deathPlace: 'København',
    profession: 'Komponist',
    category: 'music',
    cemeteryId: 3,
    shortBio:
      "Danmarks største komponist. Symfonier, operaen 'Maskarade' og sange, som hele landet stadig synger.",
    fullBio:
      "Carl Nielsen voksede op i fattige kår på Fyn og spillede som dreng i et militærorkester i Odense. Han blev Danmarks førende komponist med seks symfonier, operaen 'Maskarade' og et stort antal folkelige sange. Han var gift med billedhuggeren Anne Marie Carl-Nielsen.",
    timeline: [
      { year: 1865, event: 'Født på Fyn' },
      { year: 1884, event: 'Begynder på Musikkonservatoriet i København' },
      { year: 1906, event: "Operaen 'Maskarade' uropføres" },
      { year: 1916, event: "4. symfoni 'Det Uudslukkelige'" },
      { year: 1931, event: 'Dør i København, 66 år' },
    ],
    wikipedia: 'Carl_Nielsen',
  }),
  curated({
    id: 16,
    name: 'Adam Oehlenschläger',
    birthDate: '1779-11-14',
    deathDate: '1850-01-20',
    birthPlace: 'Vesterbro, København',
    deathPlace: 'København',
    profession: 'Digter',
    category: 'writers',
    cemeteryId: 4,
    shortBio:
      "Romantikkens banebryder og forfatter til 'Der er et yndigt land'. Hyldet som 'Nordens digterkonge'.",
    fullBio:
      "Adam Oehlenschläger indledte den danske romantik med digtet 'Guldhornene' i 1802. Han skrev tragedier om nordisk oldtid og i 1819 teksten til 'Der er et yndigt land', der i dag er Danmarks nationalsang. I 1829 blev han kronet med laurbær som Nordens digterkonge i Lund.",
    timeline: [
      { year: 1779, event: 'Født på Vesterbro' },
      { year: 1802, event: "'Guldhornene' indleder romantikken" },
      { year: 1819, event: "Skriver 'Der er et yndigt land'" },
      { year: 1829, event: 'Kronet som Nordens digterkonge i Lund' },
      { year: 1850, event: 'Dør i København, 70 år' },
    ],
    wikipedia: 'Adam_Oehlenschläger',
  }),
  curated({
    id: 17,
    name: 'Bertel Thorvaldsen',
    birthDate: '1770-11-19',
    deathDate: '1844-03-24',
    birthPlace: 'København',
    deathPlace: 'København',
    profession: 'Billedhugger',
    category: 'art',
    cemeteryId: 5,
    shortBio:
      'Europas mest berømte billedhugger i sin tid. Han ligger begravet i gården i sit eget museum.',
    fullBio:
      "Bertel Thorvaldsen rejste i 1797 til Rom, hvor han boede i over 40 år og blev en af nyklassicismens største billedhuggere. Gennembruddet kom med statuen 'Jason med det gyldne skind'. Han vendte hjem i 1838 til en heltemodtagelse, og Thorvaldsens Museum åbnede i 1848 med hans grav i gården.",
    timeline: [
      { year: 1770, event: 'Født i København (måske 1768)' },
      { year: 1797, event: 'Ankommer til Rom' },
      { year: 1803, event: "'Jason med det gyldne skind'" },
      { year: 1838, event: 'Vender hjem til København' },
      { year: 1844, event: 'Dør i Det Kongelige Teater, 73 år' },
    ],
    wikipedia: 'Bertel_Thorvaldsen',
    extraSources: [{ label: 'Thorvaldsens Museum', url: 'https://www.thorvaldsensmuseum.dk/' }],
  }),
  curated({
    id: 18,
    name: 'Margrete 1.',
    born: 'marts 1353',
    birthYear: 1353,
    deathDate: '1412-10-28',
    birthPlace: 'Søborg Slot',
    deathPlace: 'Flensborg Fjord',
    profession: 'Dronning og rigsforstander',
    category: 'royals',
    cemeteryId: 6,
    shortBio:
      'Nordens mægtigste dronning, der samlede Danmark, Norge og Sverige i Kalmarunionen i 1397.',
    fullBio:
      'Margrete var datter af Valdemar Atterdag. Efter sin søn Olufs død i 1387 blev hun enerådende over Danmark og kort efter også Norge og Sverige. Ved Kalmarunionen i 1397 blev hendes grandnevø Erik af Pommern kronet som konge af alle tre riger, mens Margrete i praksis regerede til sin død i 1412.',
    timeline: [
      { year: 1353, event: 'Født på Søborg Slot' },
      { year: 1363, event: 'Gift med kong Håkon af Norge' },
      { year: 1387, event: 'Bliver Danmarks regent' },
      { year: 1397, event: 'Kalmarunionen' },
      { year: 1412, event: 'Dør ombord på et skib i Flensborg Fjord' },
    ],
    wikipedia: 'Margrete_1.',
  }),
  curated({
    id: 19,
    name: 'Christian 4.',
    birthDate: '1577-04-12',
    deathDate: '1648-02-28',
    birthPlace: 'Frederiksborg Slot',
    deathPlace: 'Rosenborg Slot',
    profession: 'Konge',
    category: 'royals',
    cemeteryId: 6,
    shortBio:
      'Byggekongen bag Rundetårn, Børsen og Rosenborg — og Danmarks længst regerende konge i 60 år.',
    fullBio:
      'Christian 4. blev konge som 11-årig og regerede fra 1588 til 1648. Han satte sit præg på København med byggerier som Rosenborg, Børsen, Rundetårn og Nyboder og grundlagde Christianshavn. Hans krige mod Sverige og i Tyskland endte dog med store tab. Han ligger i Christian 4.s Kapel i Roskilde Domkirke.',
    timeline: [
      { year: 1577, event: 'Født på Frederiksborg Slot' },
      { year: 1588, event: 'Bliver konge som 11-årig' },
      { year: 1596, event: 'Krones i Vor Frue Kirke' },
      { year: 1644, event: 'Mister et øje i Slaget på Kolberger Heide' },
      { year: 1648, event: 'Dør på Rosenborg, 70 år' },
    ],
    wikipedia: 'Christian_4.',
  }),
  curated({
    id: 20,
    name: 'Frederik 9.',
    birthDate: '1899-03-11',
    deathDate: '1972-01-14',
    birthPlace: 'Sorgenfri Slot',
    deathPlace: 'København',
    profession: 'Konge',
    category: 'royals',
    cemeteryId: 6,
    shortBio:
      'Folkekongen fra efterkrigstiden, der elskede musik og søfart. Begravet uden for Roskilde Domkirke.',
    fullBio:
      'Frederik 9. var konge fra 1947 til 1972 — årene hvor velfærdssamfundet blev bygget. Han var en dygtig amatørdirigent og tidligere søofficer. Med grundloven og tronfølgeloven af 1953 blev det muligt for hans datter Margrethe at arve tronen. Han blev begravet uden for Roskilde Domkirke.',
    timeline: [
      { year: 1899, event: 'Født på Sorgenfri Slot' },
      { year: 1935, event: 'Gift med prinsesse Ingrid af Sverige' },
      { year: 1947, event: 'Bliver konge' },
      { year: 1953, event: 'Ny tronfølgelov åbner for kvindelig arvefølge' },
      { year: 1972, event: 'Dør i København, 72 år' },
    ],
    wikipedia: 'Frederik_9.',
  }),
  curated({
    id: 21,
    name: 'Ludvig Holberg',
    birthDate: '1684-12-03',
    deathDate: '1754-01-28',
    birthPlace: 'Bergen',
    deathPlace: 'København',
    profession: 'Forfatter og historiker',
    category: 'writers',
    cemeteryId: 7,
    shortBio:
      "Den danske komedies fader. 'Jeppe på Bjerget' og 'Erasmus Montanus' spilles stadig på landets scener.",
    fullBio:
      "Ludvig Holberg kom fra Bergen og blev professor ved Københavns Universitet. Da det første danske teater åbnede i Lille Grønnegade i 1722, skrev han en lang række komedier, der gjorde grin med tidens typer. Han skrev også historieværker og romanen 'Niels Klims underjordiske Rejse'. Han testamenterede sin formue til Sorø Akademi og er begravet i Sorø Klosterkirke.",
    timeline: [
      { year: 1684, event: 'Født i Bergen' },
      { year: 1719, event: "Heltedigtet 'Peder Paars'" },
      { year: 1722, event: "'Jeppe på Bjerget' opføres" },
      { year: 1741, event: "'Niels Klims underjordiske Rejse'" },
      { year: 1747, event: 'Udnævnt til baron' },
    ],
    wikipedia: 'Ludvig_Holberg',
  }),
  curated({
    id: 22,
    name: 'Absalon',
    born: 'ca. 1128',
    birthYear: 1128,
    deathDate: '1201-03-21',
    birthPlace: 'Fjenneslev',
    deathPlace: 'Sorø',
    profession: 'Biskop og statsmand',
    category: 'politics',
    cemeteryId: 7,
    shortBio:
      'Biskoppen og krigeren, der byggede borgen på Slotsholmen og dermed grundlagde København.',
    fullBio:
      'Absalon var Valdemar den Stores fostbror og nærmeste rådgiver. Han blev biskop i Roskilde i 1158 og fik byen Havn som len af kongen. I 1167 byggede han en borg på Slotsholmen, og i 1169 ledte han erobringen af Rügen. Senere blev han ærkebiskop i Lund. Han er begravet i Sorø Klosterkirke.',
    timeline: [
      { year: 1158, event: 'Bliver biskop i Roskilde' },
      { year: 1167, event: 'Bygger borg på Slotsholmen' },
      { year: 1169, event: 'Erobringen af Arkona på Rügen' },
      { year: 1178, event: 'Bliver ærkebiskop i Lund' },
      { year: 1201, event: 'Dør i Sorø' },
    ],
    wikipedia: 'Absalon',
    confidence: 85,
  }),
  curated({
    id: 23,
    name: 'B.S. Ingemann',
    birthDate: '1789-05-28',
    deathDate: '1862-02-24',
    birthPlace: 'Thorkildstrup på Falster',
    deathPlace: 'Sorø',
    profession: 'Digter og salmedigter',
    category: 'writers',
    cemeteryId: 7,
    shortBio:
      "Forfatter til 'I østen stiger solen op', 'Dejlig er jorden' og de historiske romaner om middelalderens konger.",
    fullBio:
      "Bernhard Severin Ingemann var lærer ved Sorø Akademi i 40 år. Hans historiske romaner som 'Valdemar Seier' gav generationer af danskere et billede af middelalderen, og hans morgen- og aftensange samt salmer som 'Dejlig er jorden' synges stadig.",
    timeline: [
      { year: 1789, event: 'Født på Falster' },
      { year: 1822, event: 'Lektor ved Sorø Akademi' },
      { year: 1826, event: "Romanen 'Valdemar Seier'" },
      { year: 1837, event: 'Morgen- og aftensange' },
      { year: 1862, event: 'Dør i Sorø, 72 år' },
    ],
    wikipedia: 'B.S._Ingemann',
  }),
  curated({
    id: 24,
    name: 'Karen Blixen',
    birthDate: '1885-04-17',
    deathDate: '1962-09-07',
    birthPlace: 'Rungsted',
    deathPlace: 'Rungsted',
    profession: 'Forfatter',
    category: 'writers',
    cemeteryId: 8,
    shortBio:
      "Forfatteren bag 'Den afrikanske farm' og 'Babettes gæstebud'. Hun ligger begravet under en bøg ved Rungstedlund.",
    fullBio:
      "Karen Blixen drev en kaffefarm i Kenya fra 1914 til 1931. Tilbage i Rungsted debuterede hun under navnet Isak Dinesen med 'Seven Gothic Tales' i 1934, og 'Den afrikanske farm' fra 1937 gjorde hende verdensberømt. Hun er begravet på Ewalds Høj i parken ved Rungstedlund.",
    timeline: [
      { year: 1885, event: 'Født på Rungstedlund' },
      { year: 1914, event: 'Rejser til Kenya' },
      { year: 1931, event: 'Må opgive farmen og vender hjem' },
      { year: 1934, event: "'Seven Gothic Tales'" },
      { year: 1937, event: "'Den afrikanske farm'" },
    ],
    wikipedia: 'Karen_Blixen',
    extraSources: [{ label: 'Karen Blixen Museet', url: 'https://blixen.dk/' }],
  }),
  curated({
    id: 25,
    name: 'Valdemar den Store',
    birthDate: '1131-01-14',
    deathDate: '1182-05-12',
    birthPlace: 'Slesvig',
    deathPlace: 'Vordingborg',
    profession: 'Konge',
    category: 'royals',
    cemeteryId: 9,
    confidence: 85,
    shortBio:
      'Kongen der samlede Danmark efter årtiers borgerkrig og indledte Valdemarstiden sammen med Absalon.',
    fullBio:
      'Valdemar 1. blev født kort efter, at hans far Knud Lavard var blevet myrdet. Efter borgerkrigen og sejren på Grathe Hede i 1157 blev han enekonge. Sammen med Absalon førte han korstog mod venderne og erobrede Rügen i 1169. Han er begravet i Sankt Bendts Kirke i Ringsted.',
    timeline: [
      { year: 1131, event: 'Født en uge efter faderens død' },
      { year: 1157, event: 'Enekonge efter slaget på Grathe Hede' },
      { year: 1169, event: 'Erobrer Rügen' },
      { year: 1170, event: 'Sønnen Knud krones som medkonge' },
      { year: 1182, event: 'Dør i Vordingborg' },
    ],
    wikipedia: 'Valdemar_den_Store',
  }),
];
