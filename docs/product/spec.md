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

## Vocab input flow

Vocab is **not bundled with the app**. The user supplies it at runtime by importing a JSON object that conforms to the schema below. The intended workflow:

1. User opens the **Import** screen (auto-shown on first load when no vocab exists; reachable from Settings otherwise).
2. UI displays a **prompt template** with two editable fields: source language and target language. The template is pre-filled with sensible defaults but fully editable.
3. User clicks **Copy prompt**, opens an external AI tool (ChatGPT, Claude, Gemini, …), pastes the prompt, then appends their source material (textbook page text, lesson notes, photo OCR, raw word list — anything).
4. AI returns a JSON object. User pastes it into the **Paste JSON** textarea on the Import screen.
5. App validates the JSON, stores it in `localStorage`, and routes to Home.

A user can re-import at any time. Re-importing **merges by `id`** (preserves existing progress for words whose `id` is unchanged; adds new words; does not auto-remove omitted words — explicit "Remove word" is a Settings action).

### Loading vocab from a URL (shareable links)

The Home route accepts a `?vocab=<url>` query parameter. When present, the app fetches the URL, validates the response against the vocab schema, **replaces** the local vocab list, and redirects to `/`. Per-word progress (keyed by `id` in a separate `localStorage` slot) is preserved across the replace.

Example:

```
https://janpom.github.io/vocamoria/?vocab=https://gist.githubusercontent.com/<user>/<id>/raw/vocab.json
```

This is the primary way to share a specific word list with someone — host the JSON on any service that serves raw text with permissive CORS headers (GitHub Gist raw URLs work; Google Drive direct links and most pastebin services do not), then send the link.

The URL is fetched once per visit and not cached separately — visiting the bare `/` after a successful load uses the local copy. Errors (bad URL, fetch failure, schema violation) render a dedicated error screen with Retry and "Import manually" buttons.

### Vocab schema

```json
{
  "settings": {
    "articlePrefixes": ["der", "die", "das"]
  },
  "words": [
    { "id": "hund",  "term": "der Hund",  "translation": "pes" },
    { "id": "katze", "term": "die Katze", "translation": "kočka" }
  ]
}
```

**`settings`** (optional, may be omitted entirely):
- `articlePrefixes`: array of leading tokens that are stripped during answer normalization in typing mode (e.g. German articles, Spanish `el`/`la`, French `le`/`la`/`les`). Default: `[]` (no stripping).
- `sourceLang`, `targetLang`: optional short English names of the two languages (e.g. `"German"`, `"Czech"`). Used as labels on the Home screen direction toggle and in error messages. If omitted, the app falls back to the language fields the user typed on the Import screen, then to literal `"Term"` / `"Translation"`.

**`words`** entries:
- `id`: stable string, used as key for progress tracking. Must be unique. Lowercase ASCII, no spaces.
- `term`: the word being learned, displayed and typed exactly as written. Include any conventional decoration (article, accent, etc.).
- `translation`: the translation in the user's known language. Treat as opaque string.

Optional per-word fields:
- `lesson`: string tag like `"unit-3"` for filtering by chapter.
- `alternates`: array of additional accepted answers for typing mode.

Stored in `localStorage` under the key `vocab-list`.

### LLM prompt template (shown in the Import UI)

The Import screen displays this verbatim, with `{SOURCE_LANG}` and `{TARGET_LANG}` substituted from the user's input fields. Users edit if they want; a **Reset to default** button restores it.

```
You are converting source material into a vocabulary list for a flash-card app.

Source language (the words to learn): {SOURCE_LANG}
Translation language (the user's known language): {TARGET_LANG}

The source material is appended below, after the marker `---INPUT---`. It may
be a word list, a textbook page, lesson notes, OCR output, or arbitrary text.
Extract every distinct vocabulary item suitable for drilling.

For each item produce one JSON object with:
- "id": short stable slug, lowercase ASCII letters/digits/hyphens only, no
  spaces. Derive from the term itself (e.g. "der Hund" -> "hund",
  "to go to school" -> "to-go-to-school"). Must be unique within the list.
- "term": the word or short phrase in {SOURCE_LANG}, exactly as it should be
  displayed and typed by the learner. Include articles for nouns, accents,
  capitalization conventions of the language.
- "translation": the {TARGET_LANG} equivalent. Keep it short and unambiguous.

Also produce a top-level "settings" object:
- "articlePrefixes": array of leading article tokens common in {SOURCE_LANG}
  that a learner might omit when typing (e.g. ["der","die","das"] for German,
  ["el","la","los","las"] for Spanish, ["le","la","les"] for French). Use []
  if the language has no such articles or it does not apply.

Output exactly one JSON object and nothing else — no prose, no markdown
fences, no commentary. Schema:

{
  "settings": { "articlePrefixes": [...] },
  "words": [
    { "id": "...", "term": "...", "translation": "..." }
  ]
}

Rules:
- ids must be unique; if two items would collide, suffix with -2, -3, ...
- skip exact duplicates
- do not include grammar metadata (gender labels, part-of-speech tags) as
  separate fields; if useful, fold into "term" the way a dictionary would
- if input is empty or unusable, return {"settings":{"articlePrefixes":[]},"words":[]}

---INPUT---
<paste your source material here>
```

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

### Game 0: Pairs (reorder columns)

Two visible columns. Left column shows terms in a random fixed order. Right column shows translations in a random order; the user reorders the right column to align row-by-row with the left, then submits.

- 8 rows per round (smaller than the standard 10).
- Drag the right-column cells to reorder them (mouse, touch, or keyboard via dnd-kit's `SortableContext` with PointerSensor + TouchSensor + KeyboardSensor).
- Left column is read-only.
- The initial right-column order is reshuffled if it accidentally matches the left, so the user always has at least one swap to make.
- **Submit** at the bottom locks the answer. Each row is then graded inline: green if `rightCol[i].id === leftCol[i].id`, red otherwise. The Submit button becomes **Continue**, which advances to the round summary.
- Stats per row:
  - Correct → recognition recorded (`seen` and `correct` bump, no Leitner box change).
  - Wrong → `seen` bumps only (`correct`, `box`, and `nextDue` unchanged). Mistakes don't demote the box because the user has both the term and the translation in front of them — getting it wrong is a recognition slip, not a real lapse.
- Scoring: +10 XP per correct row, +50 XP completion bonus.
- No direction toggle — both languages are always visible, so flipping wouldn't change the exercise.

### Game 1: Matching

- Grid of 20 cards (10 terms on the left side, 10 translations on the right, shuffled).
- Tap a card → it highlights. Tap a second card → check if they're a pair.
  - Match: cards stay revealed and dim; +1 to that word's `correct`.
  - No match: brief flash, both flip back; **does not** count as wrong (this is recognition only).
- When all 10 pairs found: show round summary.
- Mobile: single column with terms on top half, translations on bottom half also works — pick whichever fits the viewport.

Scoring: +10 XP per pair, +50 XP completion bonus.

### Direction toggle (Quiz and Typing only)

Each of these two games has an independent **direction** preference, stored in `localStorage` (`quiz-direction`, `typing-direction`). Possible values: `term-to-translation` (the prompt is the term, the answer is the translation) and `translation-to-term` (the inverse).

Defaults: Quiz starts at `term-to-translation` (recognition, easier). Typing starts at `translation-to-term` (production, harder). The Home screen shows the current direction next to each card with a `⇄` swap button.

When typing the **translation** (i.e. `term-to-translation` direction), article-stripping and per-word `alternates` are not applied — they are properties of the source language and don't transfer to the target. Comparison still uses lowercase + trim + Levenshtein ≤ 1 fuzzy match.

### Game 2: Quiz (multiple choice — the SRS-driven one)

- Show one prompt at the top (term or translation, depending on direction).
- Show 4 options on the opposite side of the pair as buttons.
  - 1 correct.
  - 3 distractors: pick from other words in the user's vocab list (NOT random strings). Prefer distractors from the same `lesson` tag if present.
- Tap correct → green flash, +1 to `correct`, advance box, +10 XP. Auto-advance after 600ms.
- Tap wrong → red flash, the correct answer highlights, demote box. Advance on tap.
- 10 questions per round, then summary.

This is the workhorse game. Make sure the SRS logic actually fires here — the others are dessert.

Scoring: +10 XP per correct, +50 XP completion bonus, +20 XP for a flawless round.

### Game 4: Hangman

- 10 words per round, SRS-driven (same as Quiz / Typing).
- Direction toggle on Home (`hangman-direction`, defaults to `translation-to-term`).
- Layout: prompt at the top (the side that's *not* being guessed); below it, the target word rendered cell-by-cell with hidden letters as an underline placeholder; on-screen A–Z keyboard at the bottom.
- Spaces, punctuation, and digits in the target are pre-revealed — only Unicode letters need to be guessed.
- Letter matching is **case-insensitive and accent-insensitive**: tapping `O` reveals all of `o`, `O`, `ö`, `Ö`, `ó`, `Ó`, etc. Internally each character is normalized via `lowercase + stripAccents` (NFD then drop combining marks).
- 1 mistake allowed; the 2nd mistake fails the word. On a miss the letter button turns red; on a hit it turns green.
- Win → green flash, +1 to `correct`, advance box, +10 XP, auto-advance after 900 ms.
- Loss → red label, full word revealed (the missing letters tinted red so you can see what you missed), Next button to advance, demote box.
- Scoring: same as Quiz (+10 per correct, +50 completion, +20 flawless).

### Game 3: Typing

- Show the prompt at the top — by default the **translation** (e.g. "pes"), or the **term** if direction is flipped.
- Text input below, "Submit" button or Enter to submit.
- Compare answer to the opposite field after normalization. The rules below describe the default `translation-to-term` direction; in the flipped direction, article-stripping and `alternates` do not apply (they are source-language features).
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
- Settings cog → "Import vocab" (re-open Import screen), "Reset progress" (with confirmation), "Reset vocab" (with confirmation), "Lesson filter" (if `lesson` tags are used).

If no vocab is loaded (`localStorage` key `vocab-list` empty), Home redirects to the Import screen and the game cards are not reachable.

## Import screen

- Two text inputs: **Source language** (e.g. "German"), **Target language** (e.g. "Czech"). Persisted to `localStorage` under `vocab-import-prefs` so re-imports remember the values.
- Read-only-by-default textarea showing the **prompt template** with the language fields substituted in. **Edit** toggle makes it editable; **Reset to default** restores the canonical template.
- **Copy prompt** button (writes to clipboard).
- Step-by-step instructions: "Paste this prompt into ChatGPT / Claude / your AI tool, append your source material, then paste the JSON response below."
- **Paste JSON** textarea + **Import** button. On click: parse, validate against schema, merge into existing `vocab-list` by `id`, route to Home. On parse/validation failure, show inline error with the offending message; do not partially import.

## Visual design

- Mobile-first. Test at 380px width.
- Large tap targets (min 44px).
- Clear feedback animations: green flash on correct, red shake on wrong.
- Use color and emoji for streaks/XP — kids respond to these.
- Don't be ironic or "designed for adults"; lean cheerful.

## Out of scope (note for v2)

- Audio via Web Speech API (`new SpeechSynthesisUtterance(word); u.lang = '<lang>'` — language read from `settings`).
- Falling-words / asteroids game.
- Direct CSV / image / file upload on the Import screen (v1 is paste-only — the AI step does the parsing).
- Multiple named word lists / per-chapter progress.
- Export/backup of progress and vocab as a JSON file.
- UI localization.
