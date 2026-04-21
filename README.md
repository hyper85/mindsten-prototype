# 🪦 MindSTEN — Interactive Prototype

> *Bring fortiden til live, én sten ad gangen.*
> *(Bring the past to life, one stone at a time.)*

**MindSTEN** is an augmented heritage platform that transforms grave visits into immersive historical experiences. Point your phone at a gravestone, and unlock the story of the person buried there.

This is a fully interactive prototype demonstrating the core user experience.

![MindSTEN Prototype](https://img.shields.io/badge/Status-Prototype-C9A84C?style=flat-square) ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react) ![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)

---

## ✨ What's in the Prototype

| Screen | Description |
|--------|-------------|
| **Onboarding** | 3-step intro flow (Scan → Tidsvindue → Udforsk) |
| **Home** | Nearby graves, themed walking routes |
| **Scanner** | Camera viewfinder with scan simulation |
| **Person Profile** | H.C. Andersen, Kierkegaard, Niels Bohr, Niels Juel |
| **Tidsvindue** | Time Window video experience with era context |
| **Map** | Filterable pins, category chips, bottom sheet |
| **Profile** | Stats, GDPR settings, institutional access |

## 🎨 Design

- **Palette**: Stone (dark), Moss (green), Gold (accent) — colors of a Danish churchyard
- **Typography**: Cormorant Garamond (heritage serif) + DM Sans (interface)
- **Tone**: Calm, respectful, historically grounded

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run locally (uses in-repo fixtures)
npm run dev
```

Then open [http://localhost:5173/mindsten-prototype/](http://localhost:5173/mindsten-prototype/) in your browser.

### Connect to Supabase (optional)

The app runs against typed fixtures in `src/data/` by default, so nothing is
required to get started. To read from a real Postgres database instead:

1. Create a Supabase project (EU region recommended for GDPR).
2. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`
   followed by `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from Project Settings → API.
4. Restart `npm run dev`.

If the env vars are missing or Supabase errors out, the app silently falls
back to the fixtures — so the GitHub Pages demo keeps working either way.
See `supabase/README.md` for details.

### Scripts

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm run typecheck` — TypeScript only
- `npm run test` — Vitest smoke tests
- `npm run lint` — ESLint
- `npm run format` — Prettier write

---

## 📦 Deploy to GitHub Pages

### Option A: Automated (gh-pages package)

```bash
# 1. Create a repo on GitHub (e.g., "mindsten-prototype")

# 2. Update the base path in vite.config.js to match your repo name:
#    base: '/your-repo-name/',

# 3. Initialize git and push
git init
git add .
git commit -m "Initial commit — MindSTEN prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mindsten-prototype.git
git push -u origin main

# 4. Deploy to GitHub Pages
npm run deploy
```

Your prototype will be live at: `https://YOUR_USERNAME.github.io/mindsten-prototype/`

### Option B: GitHub Actions (automatic on push)

Create `.github/workflows/deploy.yml` in your repo:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Then in your repo settings → **Pages** → Source: **GitHub Actions**.

> ⚠️ If using GitHub Actions, change `base` in `vite.config.js` to `'/mindsten-prototype/'` (matching your repo name).

---

## 📁 Project Structure

```
mindsten-prototype/
├── index.html              # Entry HTML
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite + Vitest config
├── .env.example            # Template for VITE_SUPABASE_* vars
├── supabase/
│   ├── migrations/         # SQL schema (0001_init.sql)
│   ├── seed.sql            # Idempotent seed for 4 reference persons
│   └── README.md           # Backend setup notes
└── src/
    ├── main.tsx            # React entry + BrowserRouter
    ├── App.tsx             # Routes + phone-frame shell
    ├── types/              # Person, ThemedRoute, …
    ├── data/               # PERSONS, ROUTES fixtures (fallback)
    ├── lib/
    │   ├── api.ts          # Supabase-first, fixture fallback
    │   ├── supabase.ts     # Client singleton
    │   ├── mappers.ts      # DB row → domain type
    │   └── onboarding.ts   # localStorage flag
    ├── components/         # Icons, TabBar, ErrorBoundary, StatePanel, …
    ├── pages/              # One component per route
    ├── styles/global.css   # Extracted global styles
    └── __tests__/          # Vitest smoke tests
```

---

## 🇩🇰 About MindSTEN

MindSTEN (from Danish *mindesten* — memorial stone) is designed for the Danish market, starting with iconic sites like Assistens Kirkegård in Copenhagen. The platform serves curious citizens, teachers, museum curators, and tourists.

**Key concepts:**
- **Grave Scanner** — AI + geolocation identifies who is buried
- **Tidsvindue (Time Window)** — Curated video experiences from the past
- **Institutional tools** — Teacher dashboards, museum curator portals
- **GDPR-first** — Privacy by design, Danish market compliance

---

*Fordi enhver sten har en historie at fortælle.*
*(Because every stone has a story to tell.)*
