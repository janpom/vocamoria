# Progress

## Current Phase

Pre-implementation. Repo holds spec + docs only — no code yet.

For shipped features (once any exist), see `git log`.

## Up Next

Build order from the spec:

1. Scaffold Vite + React + TS + Tailwind. `vocab.json` with ~10 sample words.
2. `progress.ts` and `srs.ts` + Vitest unit tests. No UI yet.
3. Home screen + Quiz game. End-to-end loop with `localStorage`.
4. Round summary + streak logic.
5. Matching game.
6. Typing game with normalization (`normalize.ts` + tests).
7. Word list / settings screen.
8. Polish: animations, colors, sound effects (optional).

## Ideas / Backlog

- Audio via Web Speech API (`SpeechSynthesisUtterance`, `u.lang` from vocab settings).
- Falling-words / asteroids game.
- Import vocab from CSV or paste.
- Multiple word lists / per-chapter progress (would need a list-picker on Home).
- Export/backup of progress as a JSON file.
- UI localization (Czech UI for the original target user).
