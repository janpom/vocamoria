# Progress

## Current Phase

Foundation done. App boots, vocab can be imported via the LLM-prompt flow, all `lib/` logic is unit-tested. No game screens yet.

For shipped features, see `git log`.

## Up Next

1. Matching game (`src/games/Matching.tsx`).
2. Typing game (`src/games/Typing.tsx`) — uses `normalize.ts` / `checkAnswer`.
3. Word list / settings screen (Reset progress, Reset vocab, re-open Import).
4. Polish: animations, colors, optional sound effects.

## Done so far

- Spec + docs scaffold (mirrors naturnaj layout).
- Vite + React 18 + TS + Tailwind v4 + Vitest. Build clean, dev server boots.
- `src/lib/`: types, srs, normalize, progress, vocab, selection, distractors, promptTemplate. 73 unit tests, all green.
- Import screen: language inputs (persisted), editable LLM prompt with Copy, paste-JSON area with validation + merge.
- Home screen: empty-state redirect to Import; streak + XP header; 3 game cards (Quiz live, others "coming soon").
- Quiz game: 10-question round, MCQ with distractors (same-lesson preferred), green/red feedback, auto-advance on correct, manual Next on wrong, persists progress + XP + streak via `applyRoundResult`.
- RoundSummary: score, XP, streak, missed-words list, Play again / Home buttons.

## Ideas / Backlog

- Audio via Web Speech API (`SpeechSynthesisUtterance`, `u.lang` from vocab settings).
- Falling-words / asteroids game.
- Import vocab from CSV or paste.
- Multiple word lists / per-chapter progress (would need a list-picker on Home).
- Export/backup of progress as a JSON file.
- UI localization (Czech UI for the original target user).
