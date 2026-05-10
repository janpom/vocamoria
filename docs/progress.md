# Progress

## Current Phase

Foundation done. App boots, vocab can be imported via the LLM-prompt flow, all `lib/` logic is unit-tested. No game screens yet.

For shipped features, see `git log`.

## Up Next

1. Quiz game (`src/games/Quiz.tsx`) — multiple choice, drives the SRS update loop end-to-end.
2. Round summary screen + wire the streak/XP write on round completion.
3. Matching game.
4. Typing game (uses `normalize.ts`).
5. Word list / settings screen (Reset progress, Reset vocab, re-open Import).
6. Polish: animations, colors, optional sound effects.

## Ideas / Backlog

- Audio via Web Speech API (`SpeechSynthesisUtterance`, `u.lang` from vocab settings).
- Falling-words / asteroids game.
- Import vocab from CSV or paste.
- Multiple word lists / per-chapter progress (would need a list-picker on Home).
- Export/backup of progress as a JSON file.
- UI localization (Czech UI for the original target user).
