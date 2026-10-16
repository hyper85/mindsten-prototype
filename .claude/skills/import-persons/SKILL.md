---
name: import-persons
description: How MindSTEN gets its persons from Wikidata and Wikipedia - the monthly Denmark import (scripts/import-wikidata.ts) and the on-demand discovery of graves near any GPS position (discover-graves / enrich-person Edge Functions). Use when asked to add more persons, cover another country, refresh data, change categorisation, debug the import or discovery, or reason about data licensing/GDPR for person data.
---

# Persons from Wikidata

Two paths fill the `persons` table; both keep the 10-year rule and never overwrite curated rows.

## A. On-demand discovery (anywhere in the world)

- `supabase/functions/discover-graves` (`POST {lat, lng}`): one SPARQL query
  (`buildAroundQuery` in `_shared/wikidata.ts`) for notable humans (≥ 2 sitelinks) with a burial
  place within 10 km, ordered by sitelinks. New persons are INSERTED with the Wikidata label and
  description only (`enriched_at` null, `bio_lang` null); cemeteries are upserted with
  `country_code`. Results are cached per 0.1° grid cell in `discovery_cells` for 30 days (one
  day when nothing was found), so a fresh cell costs one DB read. The Home screen and the map
  call it; `scan-gravestone` calls `discoverAround()` before matching when the scan has
  coordinates.
- The query is a Blazegraph named subquery (`WITH … AS %top`, geo lookup first via
  `hint:Query hint:optimizer "None"`) that picks the top-N persons before joining labels,
  images and Wikipedia titles. Keep that shape: joining everything first took > 20 s in
  Copenhagen, and a plain sub-SELECT timed out everywhere.
- **Debugging "no graves here"**: the Claude sandbox cannot reach query.wikidata.org. Run the
  real query from a GitHub runner instead — the "Discovery probe" workflow (manual dispatch with
  lat/lng, or automatically on a push that changes `scripts/probe-points.txt`,
  `scripts/discover-probe.ts` or `_shared/wikidata.ts`). Locally:
  `npm run probe:discovery -- --lat 47.46 --lng 9.05`. It prints status, timing, the first raw
  row and the parsed candidates; it writes nothing.
- `supabase/functions/enrich-person` (`POST {personId}`): the first time a discovered person is
  opened, fetches the Wikipedia intro in the first language that has an article
  (`wikipediaLanguagesFor(country)`: da → en → the country's languages), stores `bio_lang`,
  `wikipedia_url`, birth/death places and sources, sets `enriched_at`. The UI shows the bio in its
  language with a note; the AI guide answers in Danish.
- Region: `country_code` 'DK'/null → Danish time window; anything else → world events only.
- Danish keywords AND English keywords drive `categorize()`; occupations (P106 QIDs) are the fallback.

## B. Monthly Denmark import

`scripts/import-wikidata.ts` (run via `npm run import:wikidata`) does five phases:

1. **SPARQL** (query.wikidata.org): humans (`P31=Q5`) with a burial place (`P119`) whose
   country (`P17`) is Denmark (`Q35`), bucketed by death year to stay under the 60 s query limit.
   Grave-level coordinates come from the `P625` qualifier on the `P119` statement when present.
2. **wbgetentities** (50 ids/call): labels, descriptions, dates (`P569`/`P570` with precision),
   birth/death place (`P19`/`P20`), image (`P18`), occupations (`P106`), `dawiki` sitelink.
3. **Danish Wikipedia intros** (`prop=extracts`, 20 titles/call) → `short_bio` / `full_bio`.
4. Upsert **cemeteries** on `wikidata_id`.
5. Upsert **persons** on `wikidata_id`, rewrite their `timeline_events` + `person_sources`.

## Running

```bash
npm run import:wikidata -- --dry-run --limit 50     # no writes, prints sample rows
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… npm run import:wikidata
```

In CI: Actions → "Import persons from Wikidata" (inputs `limit`, `dry_run`). Needs secrets
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Hosts needed: `query.wikidata.org`,
`www.wikidata.org`, `da.wikipedia.org` (blocked in restricted Claude cloud environments).

## Rules the importer enforces — keep them

- **10-year rule**: persons who died less than 10 years ago are skipped (`--min-years-dead`,
  default 10). Danish databeskyttelseslov § 2, stk. 5 applies GDPR to the deceased for 10 years.
  The check uses Wikidata's date precision (day/month exact; a year, decade or century counts
  as its last possible day), and the database enforces it too: the `persons` trigger in
  `0004_hardening.sql` rejects rows that break it.
  Do not lower this without the user's explicit decision.
- **Curated rows win**: rows with `curated = true` (from `src/data/persons.ts` via seed) are only
  linked (`wikidata_id`, image, Wikipedia URL if empty) — also enforced by the `persons` trigger.
  Changing a person's name, bio or years clears their cached AI story and guide answers. Matching is by `wikidata_id`, else
  normalised name + birth year.
- **Attribution**: Wikipedia text is CC BY-SA → every imported person gets a "Wikipedia (dansk)"
  source link; images keep `image_credit` = Commons file name. Wikidata is CC0.
- Send the `User-Agent` header (Wikimedia policy) and keep the sleeps between calls.

## Changing categorisation

`categorize()` first matches Danish keywords in the Wikidata description (`KEYWORDS`, order
matters — royals before politics before writers), then occupation QIDs (`OCCUPATIONS`).
Categories must stay in sync with: `PersonCategory` in `src/types/index.ts`, `CATEGORY_META`
in `src/lib/format.ts`, and the `persons_category_check` / `routes_category_check` constraints
(new migration needed to add a category).

## After an import

- Spot-check: `select category, count(*) from persons group by 1 order by 2 desc;`
- Persons with `location_precision = 'unknown'` don't show on the map; fixing the cemetery's
  coordinates on Wikidata is the durable fix.
- `era_stories` cache is keyed by person id and survives re-imports; delete a row to regenerate.
