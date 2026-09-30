# Supabase

- `migrations/` — schema, idempotent (safe to re-run). `0001_init.sql` is the prototype schema;
  `0002_full_app.sql` adds cemeteries, geo/fuzzy search functions, scan matching, the AI story
  cache, grave submissions and rate limiting.
- `seed.sql` — **generated** from `src/data/*.ts` by `npm run seed:generate`.
- `functions/` — Edge Functions (Deno): `scan-gravestone`, `era-story`; `_shared/` holds code
  shared with the web app.
- `tests/` — run migrations + seed + `functions.sql` on plain Postgres (CI does this).
- `config.toml` — CLI config (`verify_jwt = false` for the two public functions).

Deploying: see `.claude/skills/deploy/SKILL.md`.

## Tables

| Table | Access |
| --- | --- |
| `persons`, `timeline_events`, `person_sources`, `cemeteries`, `routes`, `era_stories` | public read, writes with service role |
| `grave_submissions` | anon insert (`status = 'pending'` only), no public read |
| `rate_limits` | service role only (via `mindsten_bump_rate_limit`) |

## RPC functions

- `nearby_persons(lat, lng, radius_m, limit)` → `(person_id, distance_m)`
- `search_persons(query, limit)` → `(person_id, score)` — accent-insensitive trigram search
- `match_gravestone(names[], birth_year, death_year, lat, lng, limit)` → `(person_id, score 0–100, distance_m)`
