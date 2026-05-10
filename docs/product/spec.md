# Vocabulary Trainer — Spec

A small web app for a school-aged kid to learn a custom vocabulary list to mastery. Optimized for short, daily sessions on phone or laptop.

The app is **language-independent**: any pair of languages works. The primary use case is German for a Czech-speaking kid, but neither language is hardcoded — vocab data and an optional per-list config drive everything. In this document the language being learned is `L`, the user's native language is `N`.

## Goals

- **Reach mastery on every word in a custom list.** Goal-driven, not session-driven.
- **Custom word lists**: vocab comes from a JSON object the user supplies. No login, no backend, no accounts.
- **App picks the next exercise.** The user just keeps practicing — type and direction are chosen automatically based on overall progress and per-word need.
- **Visible progress.** A single progress bar from 0% to 100% on the home screen.
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

### Practice state (localStorage key: `vocab-practice`)

```ts
type PracticeState = {
  words: Record<string, WordMastery>;
};

type WordMastery = {
  progress: number;          // 0..1
  typingNToLStreak: number;  // 0..2 — successful typing N→L attempts in a row, no failed typing N→L in between
  attempts: number;          // total attempts across all exercises
  successes: number;         // total successes
};
```

There is no Leitner / SRS state. Mastery is driven by direct progress accumulation per exercise outcome.

## Mastery model

A word's `progress` is a single number in `[0, 1]`.

- The ultimate goal is **two consecutive successful typing N→L attempts on the same word, with no failed typing N→L in between** (other failures don't reset the streak). When that happens, `progress` snaps to `1.0`.
- Until then, `progress` accumulates from any exercise, capped at `0.99`. Each exercise outcome moves `progress` by a fixed `EXERCISE_DELTA` for that exercise type, signed by success (+) or failure (−). Floors at 0.

Per-exercise delta magnitudes (success bumps progress, failure subtracts the same amount):

| Exercise | Δ | Rank |
|----------|------|---|
| pairs | 0.05 | 1 |
| quiz L→N | 0.08 | 2 |
| quiz N→L | 0.10 | 3 |
| hangman L→N | 0.13 | 4 |
| typing L→N | 0.16 | 5 |
| hangman N→L | 0.20 | 6 |
| typing N→L | 0.25 | 7 |

Failure on `typing-n-l` after mastery (`progress = 1.0`) resets the streak to 0 and applies the standard Δ penalty, so the word is no longer mastered.

**Overall progress** = mean of per-word `progress` across the entire vocab list. Shown on the Home screen and at the top of every Practice screen.

### Mastery labels (for the UI)

Derived from `progress`:
- `[0.0, 0.6)` → Learning
- `[0.6, 1.0)` → Practicing
- `[1.0]` → Mastered

## Exercise selection

The Practice screen picks the next `(exerciseType, words)` automatically. **Pick word first, then exercise type tuned to that word's progress** — so a known word naturally pulls hard exercises (and graduates), while an unknown word pulls easy exercises (and gets eased in).

1. **Anchor word** — sampled from the vocab by:
   ```
   wordWeight(p) = (1 - p)^2 + 0.02
   ```
   Mastered words (`p = 1`) keep a 0.02 floor, so they remain reachable for review. Unmastered words (`p = 0`) sit at ~1.02. Ratio ≈ 51:1 — mastered words come up *much* less often, but they can still come up and can drop back below 100% on a typing-n-l miss.

2. **Exercise type** — Gaussian centered on the **anchor word's** progress in normalized rank space `(rank - 1) / 6`. Easy exercises peak at low progress; hard exercises (typing-n-l) peak at near-mastery. Floor of +0.1 keeps every type reachable.
   ```
   typeWeight(t, anchor) = exp(-((normRank(t) - anchor.progress)^2) * 8) + 0.1
   ```
   Multipliers:
   - `pairs` × 0.5 — slows it down, since it's tedious for a small per-step gain.
   - `typing-n-l` × `(1 + 2 * streak)` when `anchor.typingNToLStreak > 0` — once a word has one typing-n-l success, the next pick strongly favors typing-n-l so the second-success path fires reliably and the word graduates to mastery.

3. **For pairs**, the anchor is one of 8; the remaining 7 are sampled by the same `wordWeight` from the rest of the vocab.

The `pairs` exercise is excluded entirely when the vocab has fewer than 2 words. (`Matching` from earlier versions was removed from the active set per spec; the file is gone, recoverable from git history if needed.)

## Exercises

All exercises return per-word outcomes (`{ wordId, success }[]`) which the Practice orchestrator feeds to `applyExerciseResult`. Exercise components have no awareness of mastery — they just play and report.

### Pairs

Two visible columns. Left column shows terms in a random fixed order. Right column shows translations in a random order; user reorders the right column to align row-by-row, then submits. Drag-and-drop via dnd-kit (PointerSensor + TouchSensor + KeyboardSensor). Initial right order reshuffled if it accidentally matches left.

After **Submit**, each row is graded green/red. **Continue** reports per-row outcomes to the orchestrator (8 outcomes per exercise).

### Quiz (L→N or N→L)

Prompt at top (term or translation depending on direction); 4 options; tapping correct → green flash + auto-advance after 600 ms; tapping wrong → red flash + the correct answer highlights + manual Next. Distractors come from other words in the vocab (preferring same `lesson` if set), never random strings. Reports a single outcome per exercise.

### Typing (L→N or N→L)

Prompt at top, text input below, Submit (or Enter). Comparison via `checkAnswer`:

- Lowercase, trim, strip trailing punctuation on both sides.
- Levenshtein ≤ 1 (for targets longer than 4 chars) accepted as "close" — counts as success but shows the correct answer.
- For `n-l` direction only: strip a leading article from `settings.articlePrefixes` before comparing; accept any string in the per-word `alternates` array.
- For `l-n` direction: article stripping and `alternates` do not apply (they're source-language features and don't transfer).

Auto-advance on exact correct after 700 ms; manual Next on wrong / close.

### Hangman (L→N or N→L)

Prompt at top, target rendered cell-by-cell with hidden letters as underline placeholders, on-screen A–Z keyboard at the bottom, plus physical keyboard input. Spaces, punctuation, digits pre-revealed (only Unicode `\p{L}` is guessable). Word-aware wrapping: each space-separated word is its own no-wrap group, only inter-word spaces wrap.

Letter matching is **case- and accent-insensitive**: `O` reveals every `o/O/ö/Ö/ó/Ó` in the target. Internally normalized via `lowercase + stripAccents` (NFD then drop combining marks `\p{M}`).

1 mistake allowed; 2nd mistake fails the word. Win → green flash + auto-advance after 900 ms. Loss → reveal full word with missing letters tinted red, Next to advance.

## Home screen

- Title.
- Mastered count (e.g. `13 / 50 words mastered`).
- **Progress bar** filling 0% → 100% based on overall progress.
- One big **Practice** button → `/practice`.
- Footer links: Words (list view), Settings.

If no vocab is loaded (`vocab-list` empty), Home redirects to the Import screen.

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

- Audio via Web Speech API.
- Direct CSV / image / file upload on the Import screen (v1 is paste-only — the AI step does the parsing).
- Multiple named word lists / per-chapter progress.
- Export/backup of progress and vocab as a JSON file.
- UI localization.
- Streaks, XP, and other engagement metrics layered on top of the progress bar.
