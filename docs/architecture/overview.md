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
  data/
    vocab.json           // user-edited word list + per-list settings
  lib/                   // pure logic, no React, unit-tested
    srs.ts               // Leitner box logic, interval/due-date math
    selection.ts         // pick 10 words for a round
    progress.ts          // localStorage read/write, streak update
    normalize.ts         // string normalization for typing mode
  games/
    Matching.tsx
    Quiz.tsx
    Typing.tsx
  screens/
    Home.tsx
    RoundSummary.tsx
    WordList.tsx
  App.tsx
  main.tsx
```

The split between `lib/` (pure) and `games/`+`screens/` (React) is load-bearing: anything in `lib/` must remain importable in a Node test runner with no DOM.

## Data Flow

1. User opens app → `progress.ts` reads `vocab-progress` from `localStorage` (or returns empty default).
2. User taps a game → `selection.ts` picks 10 words from `vocab.json` using current progress.
3. Game component drives the round. On each answer, it calls `srs.ts` to update the word's box/`nextDue`, and `progress.ts` to persist.
4. Round ends → `RoundSummary` shows results, `progress.ts` increments streak/XP.

There is no central store. Each screen reads progress on mount; writes happen through `progress.ts` helpers that re-serialize the whole `Progress` blob.

## External Integrations

None. No analytics, no error reporting, no fonts loaded from CDNs (in v1).

## Hosting

Static deploy target. Netlify / Vercel / GitHub Pages all viable. Final host TBD — see [docs/deployment.md](../deployment.md).
