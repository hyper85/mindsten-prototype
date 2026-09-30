// Curated Danish (and a few world) history facts used by the "Tidsvindue"
// era engine. Shared between the web app (Vite) and Supabase Edge Functions
// (Deno) — keep this file dependency-free.
//
// Accuracy rules: only well-established facts, years as integers, Danish text.
// Approximate figures are marked "ca." in the text. See
// .claude/skills/era-facts/SKILL.md before editing.

export interface Monarch {
  name: string;
  from: number;
  to: number | null; // null = still reigning
}

export type HistoryScope = 'dk' | 'world';

export interface HistoryEvent {
  year: number;
  title: string;
  scope: HistoryScope;
  /** Short explanation shown under the title. */
  detail?: string;
}

export interface EraPeriod {
  id: string;
  name: string;
  from: number;
  to: number;
  summary: string;
  /** Everyday-life facts: how people lived, travelled, lit their homes … */
  everyday: string[];
}

export interface PopulationPoint {
  year: number;
  denmark: number;
  copenhagen?: number;
  /** Middellevetid ved fødslen (begge køn), ca. */
  lifeExpectancy?: number;
}

export const MONARCHS: Monarch[] = [
  { name: 'Gorm den Gamle', from: 936, to: 958 },
  { name: 'Harald Blåtand', from: 958, to: 986 },
  { name: 'Svend Tveskæg', from: 986, to: 1014 },
  { name: 'Harald 2.', from: 1014, to: 1018 },
  { name: 'Knud den Store', from: 1018, to: 1035 },
  { name: 'Hardeknud', from: 1035, to: 1042 },
  { name: 'Magnus den Gode', from: 1042, to: 1047 },
  { name: 'Svend Estridsen', from: 1047, to: 1076 },
  { name: 'Harald Hén', from: 1076, to: 1080 },
  { name: 'Knud den Hellige', from: 1080, to: 1086 },
  { name: 'Oluf Hunger', from: 1086, to: 1095 },
  { name: 'Erik Ejegod', from: 1095, to: 1103 },
  { name: 'Niels', from: 1104, to: 1134 },
  { name: 'Erik Emune', from: 1134, to: 1137 },
  { name: 'Erik Lam', from: 1137, to: 1146 },
  { name: 'Svend Grathe', from: 1146, to: 1157 },
  { name: 'Valdemar den Store', from: 1157, to: 1182 },
  { name: 'Knud 6.', from: 1182, to: 1202 },
  { name: 'Valdemar Sejr', from: 1202, to: 1241 },
  { name: 'Erik Plovpenning', from: 1241, to: 1250 },
  { name: 'Abel', from: 1250, to: 1252 },
  { name: 'Christoffer 1.', from: 1252, to: 1259 },
  { name: 'Erik Klipping', from: 1259, to: 1286 },
  { name: 'Erik Menved', from: 1286, to: 1319 },
  { name: 'Christoffer 2.', from: 1320, to: 1332 },
  { name: 'Valdemar Atterdag', from: 1340, to: 1375 },
  { name: 'Oluf 2.', from: 1376, to: 1387 },
  { name: 'Margrete 1.', from: 1387, to: 1412 },
  { name: 'Erik af Pommern', from: 1412, to: 1439 },
  { name: 'Christoffer af Bayern', from: 1440, to: 1448 },
  { name: 'Christian 1.', from: 1448, to: 1481 },
  { name: 'Hans', from: 1481, to: 1513 },
  { name: 'Christian 2.', from: 1513, to: 1523 },
  { name: 'Frederik 1.', from: 1523, to: 1533 },
  { name: 'Christian 3.', from: 1534, to: 1559 },
  { name: 'Frederik 2.', from: 1559, to: 1588 },
  { name: 'Christian 4.', from: 1588, to: 1648 },
  { name: 'Frederik 3.', from: 1648, to: 1670 },
  { name: 'Christian 5.', from: 1670, to: 1699 },
  { name: 'Frederik 4.', from: 1699, to: 1730 },
  { name: 'Christian 6.', from: 1730, to: 1746 },
  { name: 'Frederik 5.', from: 1746, to: 1766 },
  { name: 'Christian 7.', from: 1766, to: 1808 },
  { name: 'Frederik 6.', from: 1808, to: 1839 },
  { name: 'Christian 8.', from: 1839, to: 1848 },
  { name: 'Frederik 7.', from: 1848, to: 1863 },
  { name: 'Christian 9.', from: 1863, to: 1906 },
  { name: 'Frederik 8.', from: 1906, to: 1912 },
  { name: 'Christian 10.', from: 1912, to: 1947 },
  { name: 'Frederik 9.', from: 1947, to: 1972 },
  { name: 'Margrethe 2.', from: 1972, to: 2024 },
  { name: 'Frederik 10.', from: 2024, to: null },
];

export const HISTORY_EVENTS: HistoryEvent[] = [
  {
    year: 965,
    scope: 'dk',
    title: 'Harald Blåtand gør danerne kristne',
    detail: 'Mindet på den store Jellingsten.',
  },
  {
    year: 1085,
    scope: 'dk',
    title: 'Knud den Hellige udsteder gavebrev til Lund',
    detail: 'Et af de ældste bevarede danske dokumenter.',
  },
  {
    year: 1167,
    scope: 'dk',
    title: 'Absalon bygger borg på Slotsholmen',
    detail: 'Begyndelsen på København som magtcentrum.',
  },
  {
    year: 1219,
    scope: 'dk',
    title: 'Dannebrog falder ned fra himlen',
    detail: 'Ifølge sagnet under slaget ved Lyndanisse i Estland.',
  },
  { year: 1241, scope: 'dk', title: 'Jyske Lov vedtages', detail: '"Med lov skal land bygges."' },
  {
    year: 1282,
    scope: 'dk',
    title: 'Den første håndfæstning',
    detail: 'Kongens magt begrænses af stormændene.',
  },
  {
    year: 1350,
    scope: 'dk',
    title: 'Den sorte død hærger Danmark',
    detail: 'Pesten slår måske en tredjedel af befolkningen ihjel.',
  },
  {
    year: 1397,
    scope: 'dk',
    title: 'Kalmarunionen',
    detail: 'Danmark, Norge og Sverige samles under én konge.',
  },
  {
    year: 1450,
    scope: 'world',
    title: 'Gutenbergs bogtrykkerkunst',
    detail: 'Bøger kan pludselig masseproduceres.',
  },
  { year: 1479, scope: 'dk', title: 'Københavns Universitet grundlægges' },
  { year: 1492, scope: 'world', title: 'Columbus når Amerika' },
  { year: 1517, scope: 'world', title: 'Luther slår sine teser op i Wittenberg' },
  {
    year: 1520,
    scope: 'dk',
    title: 'Det Stockholmske Blodbad',
    detail: 'Christian 2. lader svenske stormænd henrette.',
  },
  {
    year: 1536,
    scope: 'dk',
    title: 'Reformationen',
    detail: 'Danmark bliver luthersk; kirkens gods overgår til kronen.',
  },
  {
    year: 1550,
    scope: 'dk',
    title: 'Christian 3.s Bibel',
    detail: 'Den første hele bibel på dansk.',
  },
  { year: 1642, scope: 'dk', title: 'Rundetårn står færdigt' },
  {
    year: 1658,
    scope: 'dk',
    title: 'Freden i Roskilde',
    detail: 'Skåne, Halland og Blekinge tabes til Sverige.',
  },
  { year: 1660, scope: 'dk', title: 'Enevælden indføres', detail: 'Kongen får al magt.' },
  { year: 1683, scope: 'dk', title: 'Danske Lov', detail: 'Én fælles lov for hele riget.' },
  {
    year: 1711,
    scope: 'dk',
    title: 'Pesten i København',
    detail: 'Omkring en tredjedel af byens indbyggere dør.',
  },
  { year: 1728, scope: 'dk', title: 'Københavns første store brand' },
  { year: 1776, scope: 'world', title: 'USA erklærer sig uafhængigt' },
  {
    year: 1788,
    scope: 'dk',
    title: 'Stavnsbåndet ophæves',
    detail: 'Bondekarle må nu frit flytte fra godset.',
  },
  { year: 1789, scope: 'world', title: 'Den Franske Revolution' },
  { year: 1795, scope: 'dk', title: 'Københavns anden store brand' },
  {
    year: 1801,
    scope: 'dk',
    title: 'Slaget på Reden',
    detail: 'Den britiske flåde angriber København.',
  },
  {
    year: 1807,
    scope: 'dk',
    title: 'Bombardementet af København',
    detail: 'Briterne beskyder byen og tager flåden.',
  },
  {
    year: 1813,
    scope: 'dk',
    title: 'Statsbankerotten',
    detail: 'Danmarks økonomi bryder sammen efter krigene.',
  },
  {
    year: 1814,
    scope: 'dk',
    title: 'Norge afstås ved Kielerfreden',
    detail: 'Samme år indføres almen skolepligt.',
  },
  {
    year: 1847,
    scope: 'dk',
    title: 'Første danske jernbane',
    detail: 'Strækningen København–Roskilde åbner.',
  },
  {
    year: 1848,
    scope: 'dk',
    title: 'Treårskrigen begynder',
    detail: 'Krig mod slesvig-holstenerne, 1848–1850.',
  },
  {
    year: 1849,
    scope: 'dk',
    title: 'Grundloven underskrives',
    detail: 'Enevælden afløses af demokrati den 5. juni.',
  },
  {
    year: 1857,
    scope: 'dk',
    title: 'Øresundstolden ophæves',
    detail: 'Samme år vedtages loven om næringsfrihed.',
  },
  {
    year: 1864,
    scope: 'dk',
    title: 'Nederlaget ved Dybbøl',
    detail: 'Slesvig, Holsten og Lauenborg tabes.',
  },
  { year: 1876, scope: 'world', title: 'Telefonen opfindes' },
  {
    year: 1882,
    scope: 'dk',
    title: 'Det første andelsmejeri i Hjedding',
    detail: 'Andelsbevægelsen forandrer landbruget.',
  },
  {
    year: 1886,
    scope: 'world',
    title: 'Den første benzindrevne bil',
    detail: 'Carl Benz patenterer sin motorvogn.',
  },
  {
    year: 1891,
    scope: 'dk',
    title: 'Lov om alderdomsunderstøttelse',
    detail: 'Begyndelsen på den danske velfærdsstat.',
  },
  {
    year: 1899,
    scope: 'dk',
    title: 'Septemberforliget',
    detail: 'Grundlaget for den danske arbejdsmarkedsmodel.',
  },
  {
    year: 1901,
    scope: 'dk',
    title: 'Systemskiftet',
    detail: 'Folketingets flertal danner regering.',
  },
  { year: 1903, scope: 'world', title: 'Brødrene Wright flyver' },
  {
    year: 1914,
    scope: 'world',
    title: 'Første Verdenskrig bryder ud',
    detail: 'Danmark holder sig neutralt.',
  },
  {
    year: 1915,
    scope: 'dk',
    title: 'Kvinder får stemmeret',
    detail: 'Ny grundlov giver kvinder og tjenestefolk valgret.',
  },
  { year: 1917, scope: 'dk', title: 'De Vestindiske Øer sælges til USA' },
  {
    year: 1918,
    scope: 'world',
    title: 'Den spanske syge',
    detail: 'Influenzapandemien rammer også Danmark.',
  },
  {
    year: 1920,
    scope: 'dk',
    title: 'Genforeningen',
    detail: 'Nordslesvig kommer tilbage til Danmark.',
  },
  {
    year: 1925,
    scope: 'dk',
    title: 'Statsradiofonien begynder at sende',
    detail: 'Radioen kommer ind i de danske stuer.',
  },
  {
    year: 1933,
    scope: 'dk',
    title: 'Kanslergadeforliget',
    detail: 'Socialreformen følger samme år.',
  },
  { year: 1939, scope: 'world', title: 'Anden Verdenskrig bryder ud' },
  { year: 1940, scope: 'dk', title: 'Tyskland besætter Danmark', detail: 'Den 9. april.' },
  {
    year: 1943,
    scope: 'dk',
    title: 'Samarbejdspolitikken bryder sammen',
    detail: 'Den 29. august; i oktober flygter de danske jøder til Sverige.',
  },
  { year: 1945, scope: 'dk', title: 'Befrielsen', detail: 'Den 5. maj er Danmark frit igen.' },
  { year: 1949, scope: 'dk', title: 'Danmark bliver medlem af NATO' },
  { year: 1951, scope: 'dk', title: 'De første danske tv-udsendelser' },
  {
    year: 1953,
    scope: 'dk',
    title: 'Ny grundlov',
    detail: 'Landstinget afskaffes, og kvinder kan arve tronen.',
  },
  {
    year: 1968,
    scope: 'dk',
    title: 'CPR-nummeret indføres',
    detail: 'Samme år præges af studenteroprøret.',
  },
  { year: 1969, scope: 'world', title: 'Mennesket lander på Månen' },
  { year: 1971, scope: 'dk', title: 'Christiania grundlægges' },
  { year: 1973, scope: 'dk', title: 'Danmark træder ind i EF' },
  { year: 1989, scope: 'world', title: 'Berlinmuren falder' },
  {
    year: 1989,
    scope: 'dk',
    title: 'Registreret partnerskab',
    detail: 'Danmark er det første land i verden.',
  },
  { year: 1992, scope: 'dk', title: 'Danmark vinder EM i fodbold' },
  {
    year: 1998,
    scope: 'dk',
    title: 'Storebæltsforbindelsen åbner for tog og biler',
    detail: 'Togene kørte fra 1997, biltrafikken fra 1998.',
  },
  { year: 2000, scope: 'dk', title: 'Øresundsbroen åbner' },
  { year: 2007, scope: 'world', title: 'Smartphonen slår igennem' },
  {
    year: 2020,
    scope: 'dk',
    title: 'Coronanedlukningen',
    detail: 'Danmark lukker ned den 11. marts.',
  },
  {
    year: 2024,
    scope: 'dk',
    title: 'Frederik 10. bliver konge',
    detail: 'Dronning Margrethe 2. abdicerer den 14. januar.',
  },
];

export const ERA_PERIODS: EraPeriod[] = [
  {
    id: 'viking',
    name: 'Vikingetiden',
    from: 793,
    to: 1066,
    summary: 'Danerne sejler ud på togter og handel, og riget samles under Jelling-kongerne.',
    everyday: [
      'De fleste bor i langhuse, hvor mennesker og dyr deler tag.',
      'Man spiser grød, fisk og saltet kød — og drikker øl og mjød.',
      'Runer bruges til indskrifter på sten og træ.',
    ],
  },
  {
    id: 'middelalder',
    name: 'Middelalderen',
    from: 1066,
    to: 1536,
    summary: 'Kirken er samfundets midtpunkt, og kongemagt og stormænd kæmper om magten.',
    everyday: [
      'Ni ud af ti bor på landet og dyrker jorden.',
      'Kirkeklokkerne styrer dagens rytme.',
      'Latin er lærdommens sprog; kun få kan læse.',
    ],
  },
  {
    id: 'renaessance',
    name: 'Renæssancen',
    from: 1536,
    to: 1660,
    summary:
      'Efter reformationen bygger kongerne slotte, og Christian 4. sætter sit præg på København.',
    everyday: [
      'Man lyser op med tællelys og tranlamper.',
      'Hekseprocesser topper i begyndelsen af 1600-tallet.',
      'Rejser sker til hest, i vogn eller med skib.',
    ],
  },
  {
    id: 'enevaelde',
    name: 'Enevælden',
    from: 1660,
    to: 1800,
    summary: 'Kongen har al magt. Landbruget reformeres, og oplysningstidens tanker spredes.',
    everyday: [
      'Stavnsbåndet binder bondekarle til godset indtil 1788.',
      'Kaffe og te bliver moderne blandt de velhavende.',
      'Aviser som Berlingske (fra 1749) bringer nyheder.',
    ],
  },
  {
    id: 'guldalder',
    name: 'Guldalderen',
    from: 1800,
    to: 1850,
    summary: 'Trods krig og statsbankerot blomstrer kunst, litteratur og videnskab i København.',
    everyday: [
      'København er stadig omgivet af volde, og portene lukker om natten.',
      'Man læser ved tællelys eller olielampe — gaslyset kommer først i 1857.',
      'En rejse fra København til Aarhus tager flere dage.',
    ],
  },
  {
    id: 'demokrati',
    name: 'Det moderne gennembrud',
    from: 1850,
    to: 1914,
    summary: 'Grundloven, jernbaner og andelsbevægelse forvandler Danmark til et moderne samfund.',
    everyday: [
      'Voldene rives ned, og brokvartererne vokser hurtigt.',
      'Jernbanen gør det muligt at krydse landet på en dag.',
      'Petroleumslampen og senere elektrisk lys oplyser hjemmene.',
    ],
  },
  {
    id: 'verdenskrige',
    name: 'Verdenskrigenes tid',
    from: 1914,
    to: 1945,
    summary: 'Neutralitet, krise og besættelse — men også radio, biograf og begyndende velfærd.',
    everyday: [
      'Cyklen er danskernes foretrukne transportmiddel.',
      'Radioen samler familien om aftenen.',
      'Under besættelsen er der rationering og mørklægning.',
    ],
  },
  {
    id: 'velfaerd',
    name: 'Velfærdssamfundet',
    from: 1945,
    to: 1990,
    summary: 'Efterkrigstidens opsving skaber velfærdsstaten, parcelhuse og ungdomsoprør.',
    everyday: [
      'Fjernsynet kommer ind i stuerne i 1950’erne og 60’erne.',
      'Mange familier får bil og flytter i parcelhus.',
      'Kvinder går ud på arbejdsmarkedet i stort tal.',
    ],
  },
  {
    id: 'digital',
    name: 'Den digitale tid',
    from: 1990,
    to: 2100,
    summary: 'Internettet, EU og globalisering præger hverdagen.',
    everyday: [
      'Mobiltelefonen og internettet forandrer kommunikationen.',
      'Broer over Storebælt og Øresund binder landet sammen.',
      'Danmark digitaliserer det offentlige med NemID og MitID.',
    ],
  },
];

// Approximate census figures. Denmark = present-day territory where possible.
export const POPULATION: PopulationPoint[] = [
  { year: 1500, denmark: 600_000 },
  { year: 1660, denmark: 600_000, copenhagen: 30_000 },
  { year: 1769, denmark: 797_584, copenhagen: 80_000 },
  { year: 1801, denmark: 929_001, copenhagen: 100_975, lifeExpectancy: 40 },
  { year: 1850, denmark: 1_414_648, copenhagen: 129_695, lifeExpectancy: 43 },
  { year: 1901, denmark: 2_449_540, copenhagen: 378_235, lifeExpectancy: 52 },
  { year: 1950, denmark: 4_281_275, copenhagen: 768_105, lifeExpectancy: 70 },
  { year: 2000, denmark: 5_330_020, copenhagen: 495_699, lifeExpectancy: 77 },
  { year: 2024, denmark: 5_961_249, copenhagen: 660_000, lifeExpectancy: 81 },
];
