# Supabase setup

This directory holds the database schema and seed data for MindSTEN's backend.

## One-time setup

1. Create a Supabase project at https://supabase.com (EU region recommended).
2. In the Supabase SQL editor, run the files **in this order**:
   - `migrations/0001_init.sql` — creates tables and RLS policies
   - `seed.sql` — inserts the four reference persons and four routes
3. In Project Settings → API, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon (public) key** → `VITE_SUPABASE_ANON_KEY`
4. Create a `.env.local` file in the repo root:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

5. Run `npm run dev` — the app will now read from Supabase.

## Fixture fallback

If either env var is missing at build/runtime, `src/lib/api.ts` silently falls
back to the in-repo fixtures (`src/data/persons.ts`, `src/data/routes.ts`).
This keeps the GitHub Pages demo working without any backend. Flip to Supabase
by setting the env vars.

## Re-seeding

`seed.sql` is idempotent. Re-running it upserts the four persons, wipes and
reinserts their timeline events and sources, and upserts the routes. Safe to
run on a live DB.

## Schema overview

- `persons` — core biographical record (id is a stable numeric to keep
  `/person/:id` URLs stable).
- `timeline_events` — 1-to-many, ordered by `sort_order`.
- `person_sources` — 1-to-many, ordered by `sort_order`.
- `routes` — themed walking routes.

RLS is enabled on all four tables with `select using (true)`. Writes require
the service role key and should only happen from server-side editorial tools.
