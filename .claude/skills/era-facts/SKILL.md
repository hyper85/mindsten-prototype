---
name: era-facts
description: Extend or correct the curated Danish history dataset behind the Tidsvindue (monarchs, events, era periods, population) in supabase/functions/_shared/history.ts, or change the era engine / AI era-story prompt. Use when asked to add historical facts, fix a date, tune "facts about the time they lived", or change the era-story Edge Function.
---

# Era facts (Tidsvindue)

- **Data**: `supabase/functions/_shared/history.ts` — `MONARCHS`, `HISTORY_EVENTS`,
  `ERA_PERIODS` (with `everyday` facts), `POPULATION`. Dependency-free; imported by both the
  web app (Vite) and the `era-story` Edge Function (Deno) — keep `.ts` import extensions.
- **Engine**: `supabase/functions/_shared/era.ts` — `buildEraSnapshot(birth, death)` returns
  the period, monarchs, events with the person's age, population at birth/death;
  `eraSnapshotToPromptContext()` turns it into grounding text for Claude.
- **UI**: `src/pages/TimeWindowPage.tsx` (full view) and the highlights on `PersonPage.tsx`.
- **AI story**: `supabase/functions/era-story/index.ts` — system prompt + JSON schema; results
  cached in `era_stories` (delete rows to regenerate after prompt changes).

## Adding facts

1. Only well-established facts. One sentence title, optional one-sentence `detail`.
   `scope: 'dk'` for Danish history, `'world'` sparingly (major world events only).
2. Keep `HISTORY_EVENTS` sorted by year and `MONARCHS` sorted by `from` — tests enforce it.
3. Approximate numbers are written with "ca." and treated as estimates in the UI.
4. Run `npm test` and `npm run check:functions` (Deno) — the shared files are type-checked in both.

## Prompt rules for era-story (keep)

- Facts about the person come only from the stored bio/fields — no invented quotes or relations.
- The "imagine" paragraph must read as imagination, not as fact about the person.
- Model calls go through `_shared/llm.ts` (`generateJson`): JSON-schema structured output with the
  Claude API, prompt-requested JSON + lenient parsing via OpenCode. Handle refusals (returns null).
- Model defaults: `claude-opus-5-5` (Anthropic) / `claude-sonnet-4-5` (OpenCode); `LLM_MODEL` overrides.
  Load the `claude-api` skill before changing API parameters.

## AI guide (»Spørg om …«)

- **Function**: `supabase/functions/ask-person/index.ts` — free-text questions about one person.
  Prompt rules + grounding live in `_shared/ask.ts` (`ASK_SYSTEM`, `buildPersonContext`), which
  feeds the bio, timeline, sources and `eraSnapshotToPromptContext()` to `generateText` in `llm.ts`.
- First questions (no history) are cached in `person_answers` by `questionKey()`; delete rows for a
  person after editing their bio or the prompt. Never log question text.
- **UI**: `src/pages/AskPage.tsx` (chat) + the "AI-guide" card on `PersonPage.tsx`; suggested
  questions in `src/lib/ask.ts`. Keep the same rules as era-story: no invented quotes, relations or
  years, nothing speculative about death, illness or private life.
