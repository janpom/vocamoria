# Progress

## Current Phase

v1 feature-complete per `docs/product/spec.md`. App boots, vocab is imported via the LLM-prompt flow, all three games are playable, progress and streak persist. Browser smoke test pending — recommend playing one round of each game end-to-end before shipping.

For shipped features, see `git log`.

## Up Next

Nothing scheduled. See "Out of scope (note for v2)" in `docs/product/spec.md` for ideas (audio via Web Speech API, CSV import, multiple word lists, export/backup, UI localization).

## Done

- Spec + docs scaffold (mirrors naturnaj layout).
- Vite + React 18 + TS + Tailwind v4 + Vitest. Build clean, dev server boots.
- `src/lib/`: types, srs, normalize, progress, vocab, selection, distractors, promptTemplate. 74 unit tests, all green.
- Import screen with copy-pasteable LLM prompt + paste-JSON + merge-by-id.
- Home with streak + XP header, three game cards, Words / Settings links.
- Quiz: MCQ with same-lesson-preferred distractors, green/red feedback, SRS update via recordCorrect/recordWrong + applyRoundResult.
- Matching: 20-card grid, recognition-only stats via recordRecognition (no box change), +10/pair + 50 completion XP.
- Typing: text input, checkAnswer with article stripping + Levenshtein ≤ 1 fuzzy match, "close" note, same scoring as Quiz.
- WordList: per-word mastery label and seen/correct count.
- Settings: Reset progress, Reset vocab and progress (both with inline confirm), Import shortcut.
- Polish: animate-pop on correct, animate-shake on wrong (Tailwind v4 @theme keyframes).

## Ideas / Backlog

- Audio via Web Speech API (`SpeechSynthesisUtterance`, `u.lang` from vocab settings).
- Falling-words / asteroids game.
- Import vocab from CSV or paste.
- Multiple word lists / per-chapter progress (would need a list-picker on Home).
- Export/backup of progress as a JSON file.
- UI localization (Czech UI for the original target user).
