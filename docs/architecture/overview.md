# Architecture Overview

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | React 18 |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router (client-side) |
| State | React state + `localStorage` (no global store) |
| Persistence | Browser `localStorage` only — no backend |
| Tests | Vitest |

**Approach:** Single-page app, statically built, served as a bundle of HTML/JS/CSS. No backend, no API calls, no auth. All state is per-browser; clearing site data resets progress.

## Module Layout

```
src/
  lib/                   // pure logic, no React, unit-tested
    srs.ts               // Leitner box logic, interval/due-date math
    selection.ts         // pick 10 words for a round
    progress.ts          // localStorage read/write for vocab-progress, streak update
    vocab.ts             // localStorage read/write for vocab-list, validation, merge-by-id
    normalize.ts         // string normalization for typing mode
    promptTemplate.ts    // canonical LLM prompt string + substitution helper
  games/
    Matching.tsx
    Quiz.tsx
    Typing.tsx
  screens/
    Home.tsx
    Import.tsx           // prompt template, copy button, paste-JSON area
    RoundSummary.tsx
    WordList.tsx
  App.tsx
  main.tsx
```

The split between `lib/` (pure) and `games/`+`screens/` (React) is load-bearing: anything in `lib/` must remain importable in a Node test runner with no DOM.

## Data Flow

1. User opens app → `vocab.ts` reads `vocab-list` from `localStorage`. If empty, route to Import screen and stop here.
2. User pastes JSON on Import → `vocab.ts` validates, merges by `id`, writes back to `localStorage`. Route to Home.
3. User taps a game → `selection.ts` picks 10 words from the current vocab list using progress from `progress.ts`.
4. Game component drives the round. On each answer, it calls `srs.ts` to update the word's box/`nextDue`, and `progress.ts` to persist.
5. Round ends → `RoundSummary` shows results, `progress.ts` increments streak/XP.

Two independent `localStorage` keys: `vocab-list` (the words) and `vocab-progress` (per-word stats + streak + XP). They are joined by `WordStats[id]` keying off `Word.id`. There is no central store; each screen reads what it needs on mount and writes through the relevant `lib/` helper.

## External Integrations

None. No analytics, no error reporting, no fonts loaded from CDNs (in v1).

## Hosting

Static deploy target. Netlify / Vercel / GitHub Pages all viable. Final host TBD — see [docs/deployment.md](../deployment.md).
