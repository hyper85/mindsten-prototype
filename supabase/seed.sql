-- Seed data mirroring src/data/persons.ts and src/data/routes.ts.
-- Idempotent: re-running upserts the same rows.

-- --- persons -----------------------------------------------------------------

insert into persons (
  id, name, born, died, profession, cemetery, city, confidence,
  short_bio, full_bio, era, era_years, time_window_title, category
) values
(
  1, 'H.C. Andersen', '2. april 1805', '4. august 1875', 'Forfatter',
  'Assistens Kirkegård', 'København', 97,
  'Verdens mest elskede eventyrdigter. Hans eventyr som ''Den Grimme Ælling'', ''Den Lille Havfrue'' og ''Kejserens Nye Klæder'' er oversat til over 125 sprog.',
  'Hans Christian Andersen blev født i Odense i fattige kår og rejste som 14-årig til København for at søge lykken. Efter år med modgang brød han igennem som forfatter og blev en af verdenshistoriens mest oversatte forfattere. Hans eventyr kombinerede folkelig fortælletradition med dyb menneskelig indsigt og blev elsket af både børn og voksne verden over.',
  'Guldalderen', '1800-tallet', 'København i Guldalderen', 'writers'
),
(
  2, 'Søren Kierkegaard', '5. maj 1813', '11. november 1855', 'Filosof',
  'Assistens Kirkegård', 'København', 94,
  'Eksistentialismens fader. Hans filosofi om angst, fortvivlelse og troens spring har formet moderne tænkning dybt.',
  'Søren Aabye Kierkegaard var en dansk filosof, teolog og digter, der regnes som eksistentialismens grundlægger. Han udfordrede den etablerede kirke og Hegels filosofi med sine skrifter om individets ansvar og eksistens. Hans værker som ''Enten-Eller'' og ''Begrebet Angest'' er fundamentale tekster i vestlig filosofi.',
  'Guldalderen', '1800-tallet', 'Filosofiens København', 'science'
),
(
  3, 'Niels Bohr', '7. oktober 1885', '18. november 1962', 'Fysiker',
  'Assistens Kirkegård', 'København', 96,
  'Nobelpristager i fysik. Grundlægger af atomfysikken og skaberen af Bohr-modellen for atomet.',
  'Niels Henrik David Bohr var en dansk fysiker, der modtog Nobelprisen i fysik i 1922 for sin forskning i atomstruktur og kvantemekanik. Han grundlagde Institut for Teoretisk Fysik ved Københavns Universitet, som blev et internationalt centrum for fysisk forskning. Under Anden Verdenskrig flygtede han til Sverige og bidrog senere til det amerikanske Manhattan-projekt.',
  'Det 20. århundrede', '1900-tallet', 'Atomfysikkens tidsalder', 'science'
),
(
  4, 'Niels Juel', '8. maj 1629', '8. april 1697', 'Admiral',
  'Holmens Kirkegård', 'København', 91,
  'Danmarks største flådehelt. Vandt Slaget i Køge Bugt i 1677, den danske flådes mest berømte sejr.',
  'Niels Juel var en dansk admiral, der ledte den danske flåde til sejr i Skånske Krig. Hans taktiske geni i Slaget i Køge Bugt sikrede dansk kontrol over Østersøen og cementerede hans plads som Danmarks mest fejrede søhelt.',
  'Enevælden', '1600-tallet', 'Danmarks flådemagt', 'naval'
)
on conflict (id) do update set
  name              = excluded.name,
  born              = excluded.born,
  died              = excluded.died,
  profession        = excluded.profession,
  cemetery          = excluded.cemetery,
  city              = excluded.city,
  confidence        = excluded.confidence,
  short_bio         = excluded.short_bio,
  full_bio          = excluded.full_bio,
  era               = excluded.era,
  era_years         = excluded.era_years,
  time_window_title = excluded.time_window_title,
  category          = excluded.category,
  updated_at        = now();

-- --- timeline_events ---------------------------------------------------------
-- Wipe + re-insert per person to keep ordering deterministic on re-seeds.

delete from timeline_events where person_id in (1,2,3,4);

insert into timeline_events (person_id, year, event, sort_order) values
(1, 1805, 'Født i Odense', 0),
(1, 1819, 'Rejser til København', 1),
(1, 1835, 'Udgiver ''Eventyr, fortalte for Børn''', 2),
(1, 1843, '''Den Grimme Ælling'' udkommer', 3),
(1, 1875, 'Dør i København, 70 år', 4),

(2, 1813, 'Født i København', 0),
(2, 1840, 'Forlovet med Regine Olsen', 1),
(2, 1843, '''Enten-Eller'' udgives', 2),
(2, 1849, '''Sygdommen til Døden''', 3),
(2, 1855, 'Dør i København, 42 år', 4),

(3, 1885, 'Født i København', 0),
(3, 1913, 'Bohr-modellen publiceres', 1),
(3, 1922, 'Modtager Nobelprisen', 2),
(3, 1943, 'Flugten til Sverige', 3),
(3, 1962, 'Dør i København, 77 år', 4),

(4, 1629, 'Født i Christiania (Oslo)', 0),
(4, 1656, 'Første søslag', 1),
(4, 1677, 'Slaget i Køge Bugt', 2),
(4, 1683, 'Udnævnt til Rigsadmiral', 3),
(4, 1697, 'Dør i København, 67 år', 4);

-- --- person_sources ----------------------------------------------------------

delete from person_sources where person_id in (1,2,3,4);

insert into person_sources (person_id, label, sort_order) values
(1, 'Dansk Biografisk Leksikon', 0),
(1, 'Rigsarkivet', 1),
(1, 'H.C. Andersen Centret', 2),

(2, 'Dansk Biografisk Leksikon', 0),
(2, 'Søren Kierkegaard Forskningscenteret', 1),

(3, 'Dansk Biografisk Leksikon', 0),
(3, 'Niels Bohr Arkivet', 1),
(3, 'Nobelprize.org', 2),

(4, 'Dansk Biografisk Leksikon', 0),
(4, 'Orlogsmuseet', 1);

-- --- routes ------------------------------------------------------------------

insert into routes (id, title, subtitle, stops, duration, distance, category, emoji) values
(1, 'Guldaldervandring',     'Assistens Kirkegård', 5, '45 min', '1.2 km', 'writers', '✍️'),
(2, 'Flådeheltene',          'Holmens Kirkegård',   4, '35 min', '0.8 km', 'naval',   '⚓'),
(3, 'Videnskabens pionerer', 'Assistens Kirkegård', 6, '55 min', '1.5 km', 'science', '🔬'),
(4, 'Kongernes Roskilde',    'Roskilde Domkirke',   8, '60 min', '0.9 km', 'royals',  '👑')
on conflict (id) do update set
  title    = excluded.title,
  subtitle = excluded.subtitle,
  stops    = excluded.stops,
  duration = excluded.duration,
  distance = excluded.distance,
  category = excluded.category,
  emoji    = excluded.emoji;
