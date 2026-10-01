# 🪦 MindSTEN

> *Bring fortiden til live, én sten ad gangen.*

**MindSTEN** er en app til kirkegårdsbesøg: Peg telefonen mod en gravsten, så læser appen navn og
årstal, finder personen og fortæller om både personen og **tiden, de levede i** — konger, krige,
opfindelser, befolkningstal og hverdagsliv.

Vi starter med kendte danskere: et kurateret sæt på 25 personer plus en automatisk import af alle
personer med kendt gravsted i Danmark fra Wikidata og dansk Wikipedia.

## Funktioner

| Skærm | Hvad den gør |
| --- | --- |
| **Scan** | Kamera (eller foto-upload) → Claude læser stenen → match på navn, årstal og GPS → op til 5 kandidater med match-procent |
| **Person** | Portræt, datoer, alder, fødested, biografi, tidslinje, "Vis vej" til graven, kilder, del/favorit |
| **Tidsvindue** | Regenter i levetiden, begivenheder med personens alder, befolkningstal, hverdagsliv pr. periode + AI-fortælling om tiden (cachet) |
| **Hjem** | Grave i nærheden (GPS), "På denne dag", temaruter |
| **Kort** | OpenStreetMap med alle kendte grave, kategorifiltre, grupperede markører pr. kirkegård |
| **Søg** | Fejltolerant navnesøgning (ø/o, å/a …), kategorier, kirkegårde |
| **Kirkegård / Rute** | Alle kendte grave på en kirkegård; temaruter med stop i rækkefølge |
| **Profil** | Lokal historik, favoritter, statistik, eksport/sletning af data (GDPR) |
| **Tilføj en grav** | Brugerbidrag og rettelser til redaktionel godkendelse |

Appen er en PWA: den kan lægges på hjemmeskærmen, og kort og portrætter caches til dårlig dækning på
kirkegården.

## Design

Lyst, roligt og inspireret af Apples apps: varm kalkstensbaggrund, hvide kort, mosgrøn som eneste
handlingsfarve og varm guld til Tidsvinduet. Skrifttyperne er **Inter** (tekst) og **Newsreader**
(overskrifter) – hostet i appen selv, så de virker offline og ikke sender data til Google.
Se skill'en `design-system` for farver, komponenter og mønstre.

## Arkitektur

```
Telefon (Vercel, React PWA)
  ├─ Supabase Postgres  ← persons, cemeteries, routes, era_stories, person_answers, grave_submissions
  │     match_gravestone() · search_persons() · nearby_persons()   (pg_trgm + unaccent)
  └─ Supabase Edge Functions (Deno)
        scan-gravestone  → Claude vision → match_gravestone()
        era-story        → Claude + kuraterede historiske fakta → cache
        ask-person       → »Spørg om …«: AI-guide om personen og tiden → cache
GitHub Actions
  ├─ CI: lint, typecheck, tests, build, Deno-check, SQL-tests på Postgres 16
  ├─ Deploy Supabase: migrationer + seed + functions + secrets
  └─ Import: Wikidata + dansk Wikipedia (månedligt)
```

Uden Supabase-miljøvariabler kører appen i **demo-tilstand** på de kuraterede data i `src/data/`.

## Kom i gang lokalt

```bash
npm install
npm run dev            # http://localhost:5173 — demo-tilstand
```

Med backend: kopiér `.env.example` til `.env.local` og udfyld `VITE_SUPABASE_URL` og
`VITE_SUPABASE_ANON_KEY`.

### Scripts

| Kommando | |
| --- | --- |
| `npm run dev` / `build` / `preview` | Vite |
| `npm run lint` / `typecheck` / `test` | Kvalitetstjek |
| `npm run check:functions` | Deno-typecheck af Edge Functions (kræver `deno`) |
| `npm run seed:generate` | Genererer `supabase/seed.sql` fra `src/data/` |
| `npm run import:wikidata -- --dry-run --limit 50` | Wikidata-import (se skill `import-persons`) |

## Deploy

Se [`.claude/skills/deploy/SKILL.md`](.claude/skills/deploy/SKILL.md). Kort fortalt:

1. Opret et Supabase-projekt (EU-region).
2. Tilføj GitHub-secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` og én modelnøgle: `ANTHROPIC_API_KEY` **eller**
   `OPENCODE_API_KEY` (OpenCode Zen).
3. Kør workflowet **Deploy Supabase** og derefter **Import persons from Wikidata**.
4. Importér repoet i Vercel og sæt `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

## Data, licenser og privatliv

- **Wikidata** (CC0), **dansk Wikipedia** (CC BY-SA 4.0, kildehenvisning på hver person),
  **Wikimedia Commons** (licens pr. fil), **OpenStreetMap** (ODbL).
- Kun personer, der har været døde i mindst 10 år (databeskyttelseslovens § 2, stk. 5).
- Ingen konto. Historik og favoritter ligger kun på telefonen. Scan-billeder gemmes ikke.
- AI-fortællinger er markeret som AI-genererede og bygger på kuraterede fakta.

## Claude-skills i repoet

`deploy` · `import-persons` · `add-person` · `era-facts` · `scan-pipeline` · `design-system` · `verify-app`
— se `.claude/skills/`. `CLAUDE.md` giver overblikket.

---

*Fordi enhver sten har en historie at fortælle.*
