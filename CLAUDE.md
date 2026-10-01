# MindSTEN

Mobile-first PWA: point the phone at a gravestone → identify the person (Claude vision + fuzzy
match on name, years and GPS) → biography + "Tidsvindue" (what Denmark was like while they lived).
Starts with famous Danes (curated set + Wikidata import).

## Stack

- **Web**: Vite + React 18 + TypeScript, react-router, Leaflet (react-leaflet 4), vite-plugin-pwa. Hosted on Vercel.
- **Backend**: Supabase Postgres (pg_trgm, unaccent) + Edge Functions (Deno) calling Claude — directly
  (`ANTHROPIC_API_KEY`) or via the OpenCode Zen gateway (`OPENCODE_API_KEY`); see `_shared/llm.ts`.
- **Data**: `src/data/*.ts` curated fixtures → `supabase/seed.sql` (generated); Wikidata/Wikipedia import script.

## Layout

- `src/pages/` one component per route; `src/components/` shared UI; `src/lib/api.ts` is the only data
  access layer (Supabase first, fixtures fallback = demo mode when `VITE_SUPABASE_*` are unset).
- `supabase/functions/_shared/{history,era}.ts` — era dataset + engine, shared by web and Deno
  (use `.ts` extensions in imports).
- `supabase/migrations/` — idempotent SQL; `supabase/tests/` — plain-Postgres test harness.
- `scripts/` — `generate-seed.ts`, `import-wikidata.ts` (run with `tsx`).

## Conventions

- UI text is Danish; code and comments English.
- Never edit `supabase/seed.sql` by hand — edit `src/data/*` and run `npm run seed:generate`.
- Persons must have died ≥ 10 years ago (databeskyttelsesloven § 2, stk. 5).
- Only well-established historical facts; approximate numbers say "ca.".
- All model calls go through `supabase/functions/_shared/llm.ts`. Default model `claude-opus-5-5` (Anthropic)
  / `claude-sonnet-4-5` (OpenCode); override with the `LLM_MODEL` function secret.

## Checks

`npm run lint && npm run typecheck && npm test && npx vite build` and
`npx -y deno@2 check --config supabase/functions/deno.json supabase/functions/*/index.ts`. See `.claude/skills/verify-app`.

## Skills

deploy · import-persons · add-person · era-facts · scan-pipeline · verify-app (in `.claude/skills/`).
