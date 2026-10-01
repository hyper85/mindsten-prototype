---
name: deploy
description: Deploy MindSTEN to Supabase (database, Edge Functions, secrets) and Vercel (web app). Use when asked to deploy, set up hosting, configure secrets/env vars, connect a new Supabase project, or debug a failed deploy workflow.
---

# Deploy MindSTEN (Supabase + Vercel)

Deploys are GitHub-driven. Nothing is deployed from a laptop or a Claude session
unless the user explicitly provides tokens.

| Piece | Where it runs | Deployed by |
| --- | --- | --- |
| Web app (Vite + React PWA) | Vercel | Vercel Git integration on every push (preview per PR, production on `main`) |
| Postgres schema + seed | Supabase | `.github/workflows/supabase-deploy.yml` (runs the CI workflow first, then `supabase db push --include-seed`) |
| Edge Functions `scan-gravestone`, `era-story`, `ask-person` | Supabase | same workflow (`supabase functions deploy --use-api`) |
| Wikidata import | GitHub Actions | `.github/workflows/import-data.yml` (monthly + manual) |

## First-time setup (the user does this — you guide)

1. **Supabase project** — supabase.com → New project, region **EU (Frankfurt/Stockholm)** for GDPR.
   Note the project ref (`https://<ref>.supabase.co`) and the database password.
2. **GitHub secrets** (repo → Settings → Secrets and variables → Actions):
   - `SUPABASE_ACCESS_TOKEN` — supabase.com/dashboard/account/tokens
   - `SUPABASE_PROJECT_REF` — the `<ref>`
   - `SUPABASE_DB_PASSWORD`
   - **One** model key for the Edge Functions:
     `ANTHROPIC_API_KEY` (console.anthropic.com, Claude API directly) **or**
     `OPENCODE_API_KEY` (opencode.ai, OpenCode Zen gateway). Optional `LLM_MODEL` picks the model id —
     with OpenCode it must be a Claude model from the Zen catalogue (default `claude-sonnet-4-5`).
   - `SUPABASE_URL` — `https://<ref>.supabase.co` (import workflow)
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API (import workflow; never put it in Vercel)
3. **Run "Deploy Supabase"** (Actions → Deploy Supabase → Run workflow). It links the project,
   applies `supabase/migrations/*`, runs `supabase/seed.sql`, sets the model key secret(s), deploys all functions.
4. **Run "Import persons from Wikidata"** once (try `limit: 50` + dry run first).
5. **Vercel** — vercel.com → Add New Project → import `hyper85/mindsten-prototype`.
   Framework preset: Vite (also pinned in `vercel.json`). Environment variables:
   - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = anon / publishable key (Project Settings → API)
   - optional `VITE_MAP_TILE_URL` for a commercial tile provider
   Redeploy after adding env vars (Vite inlines them at build time).
6. **Supabase Auth → URL configuration**: add the Vercel domain (only matters if auth is added later).

## Verifying a deploy

- Open the Vercel URL on a phone. The scanner must *not* show "Demo-tilstand"; if it does,
  the `VITE_SUPABASE_*` vars were missing at build time.
- Supabase → Table editor → `persons` has the 25 curated rows (+ imported rows).
- Supabase → Edge Functions → all three functions listed; invoke logs show no `No model API key`.
  With OpenCode: a `model not found` error in the function logs means `LLM_MODEL` must be set to a
  Claude model id that your OpenCode Zen account offers.
- `select * from match_gravestone(array['H C Andersen'], 1805, 1875);` returns id 1 with score ≥ 90.

## Optional function secrets

`LLM_MODEL` (default `claude-opus-5-5` with Anthropic, `claude-sonnet-4-5` with OpenCode),
`LLM_BASE_URL` (OpenCode gateway, default `https://opencode.ai/zen`), `SCAN_LIMIT_PER_HOUR` (40/IP), `SCAN_LIMIT_PER_DAY` (3000 total),
`STORY_LIMIT_PER_HOUR` (20/IP), `STORY_LIMIT_PER_DAY` (1000 total), `ASK_LIMIT_PER_HOUR` (30/IP),
`ASK_LIMIT_PER_DAY` (3000 total), `ALLOWED_ORIGINS` (comma-separated browser origins allowed to call
the functions, `*.vercel.app` style wildcards allowed; unset = any origin; others get 403),
`ASK_SIGNING_KEY` (HMAC key for AI-guide answer signatures; defaults to the service role key).
The deploy workflow passes `LLM_MODEL`, `ALLOWED_ORIGINS` and `ASK_SIGNING_KEY` through from GitHub
secrets of the same name; deleting a GitHub secret does not unset it in Supabase. Set others with
`supabase secrets set --project-ref <ref> NAME=value`.

## Troubleshooting

- `Missing secrets:` in the workflow → step 2.
- `db push` wants to re-apply `0001_init.sql` on a project that was set up by hand in the SQL editor:
  harmless — all migrations are idempotent. Alternatively `supabase migration repair --status applied 0001`.
- Function error codes: 400 `invalid_json`, 403 `origin_not_allowed` (check `ALLOWED_ORIGINS`),
  404 unknown person, 413 `payload_too_large` / `image_too_large`, 429 rate limited,
  500 `internal_error` (see the function logs).
- Function returns 401 → `supabase/config.toml` must keep `verify_jwt = false` for every function
  (the browser calls them with the anon/publishable key).
- Deep links 404 on Vercel → check the SPA rewrite in `vercel.json`.
- Camera doesn't open → site must be HTTPS (Vercel is) and `Permissions-Policy` in `vercel.json`
  must allow `camera=(self)`.
- A Claude cloud session can't reach `api.supabase.com` / `api.vercel.com` unless the environment's
  network policy allows them — deploy through GitHub Actions instead.
