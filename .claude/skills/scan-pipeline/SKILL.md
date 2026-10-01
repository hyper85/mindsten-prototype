---
name: scan-pipeline
description: How MindSTEN recognises a gravestone (camera → Claude vision → Postgres fuzzy match with years + GPS) and how to tune it. Use when scans return the wrong person or nothing, when changing the vision prompt, the match_gravestone scoring, rate limits, or the scanner UI.
---

# Scan pipeline

1. **Browser** (`src/pages/ScannerPage.tsx`): rear camera via `getUserMedia`, frame drawn to a
   canvas, downscaled to ≤1280 px, JPEG q=0.82, base64. File upload fallback. GPS via
   `getCurrentPosition` (5 s timeout, may be null).
2. **Client** (`scanGravestone` in `src/lib/api.ts`): `supabase.functions.invoke('scan-gravestone')`.
   Without Supabase env vars → demo mode (nearest curated graves, labelled in the UI).
3. **Edge Function** (`supabase/functions/scan-gravestone/index.ts`): rejects bodies > 2 MB (413)
   and images > ~1.5 MB decoded (`image_too_large`; the client sends ≤ 1280 px JPEGs of a few
   hundred KB), checks the per-IP limit before the global one (`mindsten_bump_rate_limit`), calls Claude via `_shared/llm.ts` (Claude API or
   OpenCode gateway, whichever key is set) with the image and a JSON schema
   (`is_gravestone`, `people[{name, birth_year, death_year}]`, `inscription`), effort `low`.
   The photo is never stored. The model's reading is shape-checked before matching.
4. **SQL** (`match_gravestone`, current version in `supabase/migrations/0004_hardening.sql`,
   callable by the service role only): at most 5 names of 100 chars; candidates come from the
   trigram and year indexes; per person read off
   the stone, score = name trigram word-similarity × 60 + years (±15 exact, ±8 off-by-one, −10
   mismatch) + distance (10 if < 300 m, 5 if < 3 km). Candidates < 35 are dropped.
5. **UI** shows up to 5 candidates with % match; none → "Tilføj denne grav" prefilled.

## Debugging a bad match

- Check what Claude read: the response `reading.people` is shown in the result sheet ("Læst på stenen").
- Reproduce the SQL directly (SQL editor / service role): `select * from match_gravestone(array['<name>'], <born>, <died>, <lat>, <lng>);`
- `search_name` is `lower(unaccent(name + aliases))` — add spelling variants to `persons.aliases`
  (e.g. "Kirkegaard", "Kierkegård") rather than loosening thresholds.
- SQL tests: `supabase/tests/functions.sql` (run in CI and locally, see verify-app skill). Add a case
  for every fixed mismatch.
