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

- `src/pages/` one component per route (most lazy-loaded in `App.tsx`); `src/components/` shared UI;
  `src/lib/api.ts` is the only data access layer (Supabase first, fixtures fallback = demo mode when
  `VITE_SUPABASE_*` are unset). The browser client is `@supabase/postgrest-js` + `functions-js`
  (`src/lib/supabase.ts`) — don't import `@supabase/supabase-js` in `src/`.
- `src/lib/pwa.ts` — service worker registration + auto-update; caching rules in `vite.config.ts`.
- `supabase/functions/_shared/{history,era}.ts` — era dataset + engine, shared by web and Deno
  (use `.ts` extensions in imports).
- `supabase/migrations/` — idempotent SQL; add a new numbered file, never edit an applied one.
  `supabase/tests/` — plain-Postgres test harness (functions, RLS/grants, triggers).
- `scripts/` — `generate-seed.ts`, `import-wikidata.ts` (run with `tsx`).

## Design

Light, calm, Apple-inspired UI — tokens in `src/styles/global.css`, components in `src/components/`,
fonts Inter + Newsreader (self-hosted). Read `.claude/skills/design-system` before UI work.

## Conventions

- UI text is Danish; code and comments English.
- Never edit `supabase/seed.sql` by hand — edit `src/data/*` and run `npm run seed:generate`.
- Persons must have died ≥ 10 years ago (databeskyttelsesloven § 2, stk. 5) — enforced by the importer
  and a `persons` trigger.
- New external hosts (APIs, images, tiles) must be added to the Content-Security-Policy in `vercel.json`.
- Only well-established historical facts; approximate numbers say "ca.".
- All model calls go through `supabase/functions/_shared/llm.ts`. Default model `claude-opus-5-5` (Anthropic)
  / `claude-sonnet-4-5` (OpenCode); override with the `LLM_MODEL` function secret.

## Checks

`npm run lint && npm run typecheck && npm test && npx vite build` and
`npx -y deno@2 check --config supabase/functions/deno.json supabase/functions/*/index.ts`. See `.claude/skills/verify-app`.

## Skills

deploy · import-persons · add-person · era-facts · scan-pipeline · design-system · verify-app (in `.claude/skills/`).
