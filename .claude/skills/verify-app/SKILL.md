---
name: verify-app
description: Run and verify MindSTEN locally — dev server, lint/typecheck/tests, Deno check of Edge Functions, SQL migrations + function tests on a local Postgres, and mobile screenshots with Playwright. Use before committing, when asked to run/screenshot the app, or to confirm a change works.
---

# Verify MindSTEN

## Fast checks (always before committing)

```bash
npm run lint && npm run typecheck && npm test && npx vite build
npx -y deno@2 check --config supabase/functions/deno.json supabase/functions/*/index.ts     # Edge Functions (Deno)
```

## Database (local Postgres 16)

Cloud sessions have Postgres 16 installed but stopped:

```bash
service postgresql start
su postgres -c "psql -c 'create database mindsten_test'"
cp supabase/tests/*.sql supabase/migrations/*.sql supabase/seed.sql /tmp/ && chmod a+r /tmp/*.sql
for f in roles 0001_init 0002_full_app seed functions; do
  su postgres -c "psql -v ON_ERROR_STOP=1 -q -d mindsten_test -f /tmp/$f.sql"
done
```

Migrations must stay idempotent (CI applies them twice).

## Run the app

`npm run dev` (fixtures / demo mode without `.env.local`) or `npx vite build && npx vite preview --port 4173`.

## Accessibility, performance and CSP

In the scratchpad: `npm i --no-save playwright @axe-core/playwright lighthouse@12`.

- **axe**: for each route, `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze()`
  must report no violations (onboarding skipped as below).
- **Lighthouse** (mobile, against `npx vite preview` so responses are gzipped):
  `CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome npx lighthouse http://localhost:4173/home --chrome-flags="--headless=new --no-sandbox"`.
  Expect accessibility, best practices and SEO at 100.
- **CSP**: `vercel.json` sets a strict Content-Security-Policy. When adding a new external host
  (API, images, tiles), add it to the right directive (`connect-src` / `img-src`). To test, serve
  `dist/` with the `vercel.json` headers (a tiny Node server) and fail on console messages
  containing "Content Security Policy".

## Mobile screenshots

Install Playwright in the scratchpad (not in the project), launch the preinstalled Chromium
with `executablePath: '/opt/pw-browsers/chromium-*/chrome-linux/chrome'`, viewport 390×844,
`isMobile: true`, grant `geolocation` (e.g. Assistens Kirkegård 55.6908, 12.5501), and set
`localStorage['mindsten.onboarded.v1'] = 'true'` in an init script to skip onboarding.
Screens worth checking: `/home`, `/scanner` (+ click "Scan gravsten"), `/person/1`,
`/person/1/time-window`, `/person/1/ask`, `/map`, `/search?q=blixen`, `/profile`, `/route/1`,
`/cemetery/6`, `/submit`, `/about`.
External fonts and map tiles are blocked in the sandbox — grey map and fallback fonts are expected.
