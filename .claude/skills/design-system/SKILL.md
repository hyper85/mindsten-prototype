---
name: design-system
description: MindSTEN's visual design and UX conventions (light, calm, Apple-inspired) — colours, fonts, components, layout patterns and copy tone. Use whenever adding or changing UI, a page, a component, styling, icons or Danish UI copy, so new work matches the existing look.
---

# MindSTEN design system

Goal: calm, light, respectful and obvious to use — Apple-style simplicity. One primary
action per screen, large titles, inset grouped lists, generous spacing.

## Tokens (`src/styles/global.css` `:root`)

| Token | Use |
| --- | --- |
| `--bg` #f5f3ee (warm limestone) | page background |
| `--bg-elevated` #fff | cards, lists, sheets |
| `--fill` / `--fill-strong` | search field, segmented track, timeline line |
| `--text` / `--text-2` / `--text-3` | primary / secondary / tertiary text |
| `--tint` #2d6a4f (moss green) | the ONE interactive colour: buttons, links, active tab |
| `--gold*` | only for the Tidsvindue (time window) |
| `--danger` | destructive actions only |

Never introduce a dark theme by default (the owner explicitly wants light). Category colours live
in `src/lib/categories.ts` (icon + strong + soft colour per category) — reuse them.

## Typography

- **Inter Variable** (UI) and **Newsreader Variable** (editorial serif), self-hosted via
  `@fontsource-variable/*` (imported in `src/main.tsx`) — no Google Fonts requests (GDPR, offline).
- Serif for large titles, person names, stone engravings, story text. Sans for everything else.
- Sizes: large title 34, section title 21 semibold, body 16, secondary 14–15, footnote 13.

## Components (`src/components/`)

| Component | When |
| --- | --- |
| `Page`, `LargeTitle`, `Section` (`Layout.tsx`) | every top-level tab screen |
| `NavBar` (`Layout.tsx`) | every pushed screen; title fades in on scroll |
| `List`, `Row`, `ValueRow` (`List.tsx`) | all lists and label/value facts (iOS inset grouped) |
| `PersonRow` + `Avatar` | any list of people (monogram on category tint, or portrait) |
| `CategoryIcon`, `CategoryPill` | category visuals — never emoji |
| `SegmentedControl` | 2–3 mutually exclusive views |
| `EmptyState`, `LoadingState` | every async screen |
| `showToast()` (`lib/toast.ts`) | short confirmations ("Gemt", "Link kopieret") |
| `AppMark`, `ScanIllustration`, `Ornament` | brand + illustrations (inline SVG) |

Buttons: `.btn .btn-primary` (one per screen), `.btn-secondary`, `.btn-plain`, `.btn-sm`.
Icons: `lucide-react` only, `aria-hidden` when next to text.

## Patterns

- Person page = stone/arched portrait hero → name → 4 quick actions → bio → Tidsvindue card → facts → timeline → sources.
- Ask for location in context (button), never on page load — `useGeolocation()` only auto-locates
  when permission is already granted.
- Camera UI stays dark (like the system camera); everything else is light.
- Sheets: white/limestone with a grabber, rounded 24px top.
- Desktop (≥1081px) shows the app in a phone mock-up next to `DeskIntro` (with QR code); phones and
  tablets (`max-width: 600px` or `pointer: coarse`) get the app full screen with safe-area insets.

## Copy (Danish)

Short, warm, concrete, second person ("Peg kameraet mod en gravsten"). Explain what happens before
asking for anything. Respectful about death — no jokes, no sensational wording.

## Checklist for UI changes

1. Reuse tokens/components above; add new CSS next to the related block in `global.css`.
2. Tap targets ≥ 44px, visible focus, `prefers-reduced-motion` respected.
3. `npm run lint && npm run typecheck && npm test && npx vite build`.
4. Screenshot at 390×844 (see verify-app skill) and check light, spacing and truncation.
