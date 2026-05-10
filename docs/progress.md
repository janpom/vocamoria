# Progress

## Current Phase

Pre-implementation. Repo holds spec + docs only — no code yet.

For shipped features (once any exist), see `git log`.

## Up Next

Build order:

1. Scaffold Vite + React + TS + Tailwind + Vitest. (Files written; `npm install` pending.)
2. `vocab.ts` + `progress.ts` + `srs.ts` + `normalize.ts` with Vitest unit tests. No UI yet.
3. `promptTemplate.ts` + Import screen (prompt copy, paste-JSON, validate, merge).
4. Home screen with empty-state redirect to Import. Quiz game end-to-end with `localStorage`.
5. Round summary + streak logic.
6. Matching game.
7. Typing game (uses `normalize.ts`).
8. Word list / settings screen (incl. Reset progress, Reset vocab, re-open Import).
9. Polish: animations, colors, optional sound effects.

## Ideas / Backlog

- Audio via Web Speech API (`SpeechSynthesisUtterance`, `u.lang` from vocab settings).
- Falling-words / asteroids game.
- Import vocab from CSV or paste.
- Multiple word lists / per-chapter progress (would need a list-picker on Home).
- Export/backup of progress as a JSON file.
- UI localization (Czech UI for the original target user).
