---
name: add-person
description: Hand-curate a person (or cemetery/route) in MindSTEN's reference data — src/data/*.ts plus the generated supabase/seed.sql — or approve a user grave submission. Use when asked to add/fix a specific famous Dane, a cemetery, a themed route, or to review grave_submissions.
---

# Curate a person

Curated data lives in TypeScript and is the single source of truth for both the offline
fallback and the database seed:

- `src/data/cemeteries.ts` — id, name, city, lat/lng (cemetery centre), description
- `src/data/persons.ts` — `curated({...})` entries (ids < 1000; imported rows get ids ≥ 1000)
- `src/data/routes.ts` — themed routes, `personIds` in walking order

## Steps

1. Pick the next free id. Add the cemetery first if it's new.
2. Add a `curated({...})` entry. Required: name, `birthDate`/`deathDate` (ISO) **or**
   `born`/`died` display strings + `birthYear`/`deathYear` when only the year is known,
   profession, category, cemeteryId, shortBio (1–2 sentences), fullBio (3–5 sentences),
   3–5 timeline events, `wikipedia` article slug.
3. `npm run seed:generate` → regenerates `supabase/seed.sql`. Never edit seed.sql by hand.
4. `npm test` — `era.test.ts` checks unique ids, coordinates, sources, timeline years inside
   the lifespan, and the 10-year rule.
5. Deploy happens via the "Deploy Supabase" workflow (`db push --include-seed`).

## Quality checklist

- Only facts you are confident about; when unsure, leave it out. Mark approximate years
  (`born: 'ca. 1128'`).
- Burial place must be well documented (Wikipedia/gravsted.dk/the cemetery's own list).
  Coordinates are cemetery-level unless you know the exact grave — then set
  `locationPrecision: 'grave'` (edit `curated()` accordingly).
- Died at least 10 years ago (GDPR, see import-persons skill).
- Danish text, respectful tone, no speculation about cause of death or private life beyond
  what standard reference works state.

## Grave submissions

Users submit via `/submit` into `grave_submissions` (insert-only for anon; readable with the
service role). Review in the Supabase table editor; for accepted ones either add to Wikidata
(best — the monthly import picks it up) or curate here, then set `status = 'approved'`.
