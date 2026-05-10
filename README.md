# Vocamoria

Tiny browser-based vocabulary trainer. Three games (Matching, Quiz, Typing) over a Leitner-box SRS, with progress in `localStorage`. No backend, no accounts, no audio.

Vocab is **language-agnostic** and **user-supplied at runtime** — the app ships an LLM prompt template you copy into ChatGPT / Claude / Gemini together with any source material (textbook page, word list, lesson notes). You paste the AI's JSON response back into the app, and it merges into your local vocab list.

Built for a kid drilling German→Czech school vocab; works for any language pair.

## Quick start

```sh
npm install
npm run dev
```

Open the URL Vite prints. First load redirects to the **Import** screen — copy the prompt, give it to an AI together with your source material, paste the resulting JSON back, and you're playing.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check + production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Vitest in watch mode (`-- --run` for one-shot) |
| `npm run typecheck` | `tsc -b --noEmit` |

## Tech

React 18 · TypeScript · Vite 5 · Tailwind CSS v4 · React Router 6 · Vitest. Static SPA — `dist/` deploys to any static host (Netlify, Vercel, GitHub Pages).

## Layout

```
src/
  lib/         pure logic, unit-tested (srs, normalize, vocab, progress, …)
  games/       Matching.tsx · Quiz.tsx · Typing.tsx
  screens/     Home · Import · WordList · Settings · RoundSummary
  App.tsx · main.tsx · index.css
```

`src/lib/*` has no React or DOM imports — anything that touches `localStorage` is dependency-injected so tests run on plain Node.

## Docs

Full design lives in [`docs/`](./docs/):

- [`docs/product/spec.md`](./docs/product/spec.md) — product spec, data model, game mechanics, SRS rules, LLM prompt template
- [`docs/architecture/overview.md`](./docs/architecture/overview.md) — module layout, data flow, two `localStorage` keys
- [`docs/architecture/decisions.md`](./docs/architecture/decisions.md) — ADRs for the load-bearing tech choices
- [`docs/deployment.md`](./docs/deployment.md) — static-host deployment notes
- [`docs/progress.md`](./docs/progress.md) — what's done, what's next

`CLAUDE.md` documents the conventions I follow when working on this repo with Claude Code.
