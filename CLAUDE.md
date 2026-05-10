# Vocamoria — Vocabulary Trainer

Context loaded automatically at session start.

## Docs

- @docs/product/spec.md — product spec, data model, game mechanics, SRS rules
- @docs/architecture/overview.md — tech stack, module layout, data flow
- @docs/architecture/decisions.md — technical decisions & rationale (ADR-NNN format)
- @docs/deployment.md — build + static-host deployment guide
- @docs/progress.md — current status, what's done, what's next

## Quick Summary

Single-page web app for drilling custom vocabulary lists. Three games (Matching, Quiz, Typing) share a Leitner-box SRS and per-word progress in `localStorage`. No backend, no auth, no accounts.

**Language-agnostic.** UI is English. Vocab content (any language pair) lives in `src/data/vocab.json`. Nothing in the code should hardcode a specific language; language-specific behavior (e.g. article stripping) is driven by `settings` in the vocab file.

Stack: React + Vite + TypeScript + Tailwind. Static deploy target.

## Working Conventions

- Keep `docs/progress.md` updated as features are completed or priorities shift.
- Log architecture decisions in `docs/architecture/decisions.md` (ADR-NNN format).
- `docs/product/spec.md` is the source of truth for product behavior. If implementation diverges from spec, update the spec in the same change.
- Pure logic (`src/lib/*.ts`) has no React imports and no DOM access — keeps it unit-testable and reusable.
- No language-specific strings in code. Anything user-facing in a non-English language must come from `vocab.json` (a word, a translation, an alternate). UI chrome stays English.
- Tailwind utility classes inline; no component CSS files unless a utility class can't express it.
- Prefer `npm` (matches Vite defaults). Lockfile: `package-lock.json`.

## Environment

- Node + npm at the project root. `npm install`, `npm run dev`, `npm run build`, `npm test`.
- No virtualenv, no Docker, no `.env` (no secrets in v1).

## Testing

- **Write unit tests for `src/lib/*.ts` before considering a feature done.** `srs.ts`, `selection.ts`, and `normalize.ts` carry real logic that will silently rot without coverage.
- Test runner: Vitest (Vite-native, ESM-friendly, Jest-compatible API).
- No UI / component tests in v1 — manual smoke test per spec is enough.
- Run: `npm test` (watch) or `npm test -- --run` (one-shot).

## Claude Behaviour

- **Do not auto-commit.** Wait for an explicit "commit" instruction.
- **After every commit, ask the user to push** (`git push`). Do not push automatically — `~/.ssh` is inaccessible inside the sandbox.
- **Remind the user to commit** if they appear to be moving on to a new task with uncommitted changes.
- **Temporary files** (helper scripts, scratch data, comparison tools) go in `claude_tmp/` at the project root, not `/tmp` or `$TMPDIR`. Keeps them visible for debugging and inside the sandbox-writable project tree. `claude_tmp/` is gitignored.
- **Mobile-first.** When eyeballing a UI change, default to a 380px viewport before checking desktop.
