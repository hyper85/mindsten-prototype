---
name: import-persons
description: Import or refresh people buried in Denmark from Wikidata and Danish Wikipedia into Supabase (scripts/import-wikidata.ts). Use when asked to add more persons, refresh data, change categorisation, debug the import workflow, or reason about data licensing/GDPR for person data.
---

# Import persons from Wikidata

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
  Do not lower this without the user's explicit decision.
- **Curated rows win**: rows with `curated = true` (from `src/data/persons.ts` via seed) are only
  linked (`wikidata_id`, image, Wikipedia URL if empty). Matching is by `wikidata_id`, else
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
