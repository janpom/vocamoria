# Vocamoria

Tiny browser-based vocabulary trainer with a goal: learn every word in a custom list to the point where you can type it from your native language to the language being learned, twice in a row, without a mistake. The app picks the next exercise itself based on per-word streaks and your recent success rate. Progress is a single bar from 0% to 100%.

Vocab is **language-agnostic** and **user-supplied at runtime** — the app ships an LLM prompt template you copy into ChatGPT / Claude / Gemini together with any source material (textbook page, word list, lesson notes). Paste the AI's JSON response back and the app merges it. Words can also be added/edited/removed in-app on the Words page.

Built for a kid drilling German→Czech school vocab; works for any language pair.

Live: <https://janpom.github.io/vocamoria/>

## Quick start

```sh
npm install
npm run dev
```

Open the URL Vite prints. First load redirects to the **Import** screen — copy the prompt, give it to an AI together with your source material, paste the resulting JSON back, and start practicing.

## Exercises

The app has five exercise types and picks one for you each round. They form a difficulty staircase from easiest to hardest:

| Rank | Exercise | What it does |
|---|---|---|
| 1 | Pairs | 8 visible word pairs, drag-or-tap to align two columns |
| 2 | Quiz L→N | Multiple choice, see term, pick translation |
| 3 | Quiz N→L | Multiple choice, see translation, pick term |
| 4 | Hangman L→N | Guess the translation letter by letter |
| 5 | Typing L→N | Type the translation |
| 6 | Hangman N→L | Guess the term letter by letter |
| 7 | Typing N→L | Type the term — the only path to mastery |

(`L` = the language being learned, `N` = your native language.)

A word is **mastered** when typing N→L succeeds twice in a row. Other exercises advance the word toward that goal but never substitute for it. The selector tracks consecutive successes per (word, exercise type) and biases harder once any easier streak hits 2.

## Sharing a word list

Append `?vocab=<url-to-json>` to the app URL to load a vocab list from anywhere on the web:

```
https://janpom.github.io/vocamoria/?vocab=https://gist.githubusercontent.com/USER/ID/raw/vocab.json
```

Replaces the local vocab list. Per-word progress (separate `localStorage` slot, joined by `id`) is preserved. The host must serve the JSON with permissive CORS headers — **GitHub Gist raw URLs** and most JSON-paste services work; **Google Drive direct links** and pastebin.com do not.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check + production bundle into `dist/` (also writes `404.html` for GitHub Pages) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest in watch mode (`-- --run` for one-shot) |
| `npm run typecheck` | `tsc -b --noEmit` |

## Tech

React 18 · TypeScript · Vite 5 · Tailwind CSS v4 · React Router 6 · dnd-kit (Pairs drag-and-drop) · Vitest. Static SPA — `dist/` deploys to any static host (GitHub Pages, Netlify, Vercel).

## Layout

```
src/
  lib/         pure logic, unit-tested
               mastery · exerciseSelector · practice · vocab · normalize
               · answers · distractors · promptTemplate · remoteVocab
               · selection (just shuffle) · types
  practice/   one-shot exercise components used by the Practice screen
               QuizExercise · TypingExercise · HangmanExercise · PairsExercise
  screens/    Home · Practice · Import · WordList · Settings · RemoteLoader
  App.tsx · main.tsx · index.css · vite-env.d.ts
```

`src/lib/*` has no React or DOM imports — anything that touches `localStorage` is dependency-injected so tests run on plain Node.

## Docs

Full design lives in [`docs/`](./docs/):

- [`docs/product/spec.md`](./docs/product/spec.md) — product spec, mastery model, exercise mechanics, LLM prompt template
- [`docs/architecture/overview.md`](./docs/architecture/overview.md) — module layout, data flow, `localStorage` keys
- [`docs/architecture/decisions.md`](./docs/architecture/decisions.md) — ADRs for the load-bearing tech choices
- [`docs/deployment.md`](./docs/deployment.md) — static-host deployment notes (GitHub Pages already wired)
- [`docs/progress.md`](./docs/progress.md) — what's done, what's next

`CLAUDE.md` documents the conventions I follow when working on this repo with Claude Code.
