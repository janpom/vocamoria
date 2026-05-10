# Vocabulary Trainer — Spec

A small web app for a school-aged kid to drill custom vocabulary lists. Three games, shared vocab data, shared progress tracking. Optimized for short, daily sessions on phone or laptop.

The app is **language-independent**: any pair of languages works. The primary use case is German for a Czech-speaking kid, but neither language is hardcoded — vocab data and an optional per-list config file drive everything.

## Goals

- **Replaces** Quizlet for the narrow use case of "drill a custom word list."
- **Custom word lists**: vocab comes from a JSON file the user edits directly. No login, no backend, no accounts.
- **Short sessions**: a round takes 2–3 minutes. The kid can do one and stop without guilt.
- **Visible progress**: per-word mastery tracked across sessions so review actually adapts.
- **Language-agnostic**: nothing in the code assumes German, Czech, or any specific language.

## Non-goals

- Not building Anki. Don't over-engineer the SRS algorithm.
- No multi-user support, no cloud sync, no auth.
- No grammar exercises, conjugation drills, or sentence construction. Pure vocabulary recall.
- No audio/TTS in v1 (can add later via Web Speech API).
- No localization framework. UI is English. Vocab content is whatever the user puts in.

## Data model

### Vocabulary file (`src/data/vocab.json`)

```json
{
  "settings": {
    "articlePrefixes": ["der", "die", "das"]
  },
  "words": [
    { "id": "hund",  "term": "der Hund",  "translation": "pes" },
    { "id": "katze", "term": "die Katze", "translation": "kočka" },
    { "id": "haus",  "term": "das Haus",  "translation": "dům" }
  ]
}
```

**`settings`** (optional, may be omitted entirely):
- `articlePrefixes`: array of leading tokens that are stripped during answer normalization in typing mode (e.g. German articles, Spanish `el`/`la`, French `le`/`la`/`les`). Default: `[]` (no stripping).

**`words`** entries:
- `id`: stable string, used as key for progress tracking. Must be unique. Lowercase ASCII, no spaces.
- `term`: the word being learned, displayed and typed exactly as written. Include any conventional decoration (article, accent, etc.).
- `translation`: the translation in the user's known language. Treat as opaque string.

Optional per-word fields:
- `lesson`: string tag like `"unit-3"` for filtering by chapter.
- `alternates`: array of additional accepted answers for typing mode.

### Progress state (localStorage key: `vocab-progress`)

```ts
type Progress = {
  words: Record<string, WordStats>;
  streak: { count: number; lastPlayedDate: string }; // YYYY-MM-DD
  totalXP: number;
};

type WordStats = {
  seen: number;          // total times shown
  correct: number;       // total correct answers
  lastSeen: string;      // ISO timestamp
  nextDue: string;       // ISO timestamp — when this word is due again
  box: number;           // 0..5, Leitner-style box
};
```

## Spaced repetition (keep it simple)

Leitner boxes, not full SM-2. Each word lives in box 0–5.

- New word starts in box 0.
- Correct answer: `box = min(box + 1, 5)`, set `nextDue` to `now + interval[box]`.
- Wrong answer: `box = max(box - 1, 0)`, set `nextDue` to `now + 1 day`.

Intervals (days): `[0, 1, 3, 7, 14, 30]`. Box 0 means "due immediately."

### Word selection per round

A round is **10 words**. Selection rules, in order:

1. Include up to **7 due words** (where `nextDue <= now`), prioritizing oldest `lastSeen` first.
2. Fill remaining slots with **new words** (never seen).
3. If still under 10 (small vocab list, all words mastered), fill with random words from the lowest non-empty box.

Shuffle the resulting set before presenting.

## Mastery labels (for the UI)

Derived from `box`:
- 0–1: "Learning"
- 2–3: "Practicing"
- 4–5: "Mastered"

## Games

All three games operate on the **same round** of 10 words selected by the rule above. Player picks the game; word selection and progress tracking are identical across games.

### Game 1: Matching

- Grid of 20 cards (10 terms on the left side, 10 translations on the right, shuffled).
- Tap a card → it highlights. Tap a second card → check if they're a pair.
  - Match: cards stay revealed and dim; +1 to that word's `correct`.
  - No match: brief flash, both flip back; **does not** count as wrong (this is recognition only).
- When all 10 pairs found: show round summary.
- Mobile: single column with terms on top half, translations on bottom half also works — pick whichever fits the viewport.

Scoring: +10 XP per pair, +50 XP completion bonus.

### Game 2: Quiz (multiple choice — the SRS-driven one)

- Show one term at the top.
- Show 4 translation options as buttons.
  - 1 correct.
  - 3 distractors: pick from other words in the user's vocab list (NOT random strings). Prefer distractors from the same `lesson` tag if present.
- Tap correct → green flash, +1 to `correct`, advance box, +10 XP. Auto-advance after 600ms.
- Tap wrong → red flash, the correct answer highlights, demote box. Advance on tap.
- 10 questions per round, then summary.

This is the workhorse game. Make sure the SRS logic actually fires here — the others are dessert.

Scoring: +10 XP per correct, +50 XP completion bonus, +20 XP for a flawless round.

### Game 3: Typing

- Show the **translation** at the top (e.g. "pes").
- Text input below, "Submit" button or Enter to submit.
- Compare answer to `term` field after normalization:
  - Lowercase both sides.
  - Trim whitespace and trailing punctuation.
  - If `settings.articlePrefixes` is non-empty, strip a leading article token from both sides before comparing (e.g. given prefixes `["der","die","das"]` and term `"der Hund"`, accept both `"der hund"` and `"hund"`).
  - Accept any string in the optional `alternates` array.
  - Optional nicety: accept Levenshtein distance ≤ 1 for words longer than 4 chars (counts as correct but show a small "Close — correct: *Hund*" note).
- Wrong → show correct answer, "Next" button.
- 10 questions per round.

Scoring: same as Quiz.

## Round summary screen

After each round, show:
- Score this round (e.g. "8/10").
- XP earned.
- Streak status — "Day 4 🔥" — increment on first round of a calendar day.
- List of words missed this round, with term + translation, so the kid can glance at them.
- Two buttons: "Play again" and "Home".

## Streak logic

- A "day" is a calendar day in the user's local timezone.
- First completed round of a day: increment streak, update `lastPlayedDate`.
- If `lastPlayedDate` is more than 1 day ago when a round completes: reset streak to 1.
- If same day as `lastPlayedDate`: streak unchanged.

## Home screen

- Streak indicator (big, top of screen).
- Total XP.
- Three big tappable cards: "Matching", "Quiz", "Typing".
- Small "Words" link → list view of all vocab with mastery labels and per-word stats.
- Settings cog → "Reset progress" (with confirmation), "Lesson filter" (if `lesson` tags are used).

## Visual design

- Mobile-first. Test at 380px width.
- Large tap targets (min 44px).
- Clear feedback animations: green flash on correct, red shake on wrong.
- Use color and emoji for streaks/XP — kids respond to these.
- Don't be ironic or "designed for adults"; lean cheerful.

## Out of scope (note for v2)

- Audio via Web Speech API (`new SpeechSynthesisUtterance(word); u.lang = '<lang>'` — language read from `settings`).
- Falling-words / asteroids game.
- Import vocab from CSV or paste.
- Multiple word lists / per-chapter progress.
- Export/backup of progress.
- UI localization.
