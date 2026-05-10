# Architecture Decisions

## ADR-001 — React + Vite + TypeScript SPA

- **Date**: 2026-05-10
- **Decision**: React 18 with TypeScript, bundled by Vite. Client-side routing (React Router).
- **Alternatives considered**: Next.js (overkill, SSR not needed), plain HTML+JS (would have to rebuild component primitives).
- **Rationale**: The app is a stateful UI that lives entirely in the browser. React + Vite is the lightest path to a typed component model with fast dev feedback. No backend means no SSR benefit.

## ADR-002 — Tailwind CSS for styling

- **Date**: 2026-05-10
- **Decision**: Tailwind utility classes inline in JSX. No component CSS files.
- **Alternatives considered**: CSS Modules, vanilla CSS, styled-components.
- **Rationale**: Mobile-first kids' UI with lots of one-off tweaks (animations, color-coded feedback). Utility classes are faster to iterate on at this scale than maintaining a parallel stylesheet, and Tailwind's design tokens enforce consistency.

## ADR-003 — `localStorage` for persistence

- **Date**: 2026-05-10
- **Decision**: Per-word stats, streak, and total XP are stored as a single JSON blob under the key `vocab-progress` in `localStorage`.
- **Alternatives considered**: IndexedDB, backend with auth, browser-side SQLite.
- **Rationale**: One user, one device's worth of state, all of which fits in a few KB. `localStorage` is synchronous, trivially testable, and survives the static-deploy constraint with no infra. Loss tolerance is acceptable — clearing site data resets progress, but there is no shared state to corrupt.

## ADR-004 — Leitner boxes over SM-2

- **Date**: 2026-05-10
- **Decision**: Six Leitner boxes (0–5) with fixed intervals `[0, 1, 3, 7, 14, 30]` days.
- **Alternatives considered**: SuperMemo SM-2 (Anki-style), FSRS.
- **Rationale**: The audience is a kid drilling small word lists, not a power user. Leitner is legible (you can see the boxes) and trivial to debug. SM-2's per-card ease factor is overkill and harder to explain when something feels off.

## ADR-005 — Vocab is user-supplied at runtime, generated via external LLM

- **Date**: 2026-05-10
- **Decision**: Vocabulary is **not** bundled with the app. Users import a JSON object at runtime via an Import screen and the app stores it in `localStorage` (`vocab-list`). The Import screen ships a copy-pasteable LLM prompt template; the user pastes the prompt + their source material into any external AI tool and pastes the AI's JSON response back into the app.
- **Alternatives considered**:
  - Static `src/data/vocab.json` shipped at build time (rejected: hardcodes content into the deploy, requires a rebuild per word list, and the target user is not the developer).
  - Built-in admin UI for hand-typing words (rejected: tedious for the kid's parent vs. dropping a textbook page into ChatGPT).
  - Direct CSV / file / image upload with in-app parsing (rejected for v1: each input format needs its own parser, and the LLM does the messy extraction more flexibly than we can hand-roll).
- **Rationale**: Pushes the "extract structured vocab from messy input" problem to a tool that is already excellent at it. Keeps the app a static bundle with no parsing dependencies. The same flow works for any source language, any source material (textbook scan, photo OCR, lesson notes), with zero code changes. Cost of pasting once per import is negligible.

## ADR-006 — Vitest for unit tests

- **Date**: 2026-05-10
- **Decision**: Vitest as the test runner, scoped to `src/lib/*.ts`.
- **Alternatives considered**: Jest, no tests.
- **Rationale**: Vitest is Vite-native (no separate config), Jest-compatible API, and runs the same TypeScript pipeline as the app. The pure logic in `lib/` is the only place where bugs would be silent — game UIs fail visibly, SRS math does not.

## ADR-007 — Language-agnostic data model

- **Date**: 2026-05-10
- **Decision**: Vocab fields are `term` and `translation` (not `de` / `cs` or anything language-specific). Language-specific behavior (e.g. article stripping in typing mode) is opt-in via a `settings` block in `vocab.json` (e.g. `articlePrefixes: ["der","die","das"]`).
- **Alternatives considered**: Hardcode German article handling; ship multiple language-specific apps.
- **Rationale**: The kid's word lists today are German→Czech, but the app is just as useful for any other pair. Pushing all language knowledge into the data file means one codebase, no per-language forks, and the user can drop in a Spanish or French list without a code change.
