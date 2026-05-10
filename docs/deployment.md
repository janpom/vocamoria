# Deployment

Static SPA. Build output is a directory of HTML/JS/CSS that any static host can serve.

## Build

```sh
npm install
npm run build
```

Output: `dist/`. Serve as-is. No server-side rendering, no environment variables, no secrets.

## Local preview

```sh
npm run dev       # Vite dev server, hot reload
npm run preview   # serve the production build locally
```

## Hosting

Primary target: **GitHub Pages** at `https://janpom.github.io/vocamoria/`. Workflow + Vite config are already wired (see below). Other hosts work without modification.

| Host | Notes |
|------|-------|
| GitHub Pages | Workflow `.github/workflows/deploy.yml` builds and publishes on every push to `main`. One-time setup: in the repo's **Settings → Pages**, set "Source" to **GitHub Actions**. |
| Netlify | Connect repo, build command `npm run build`, publish dir `dist`. Set `base` in `vite.config.ts` back to `/` (or override per-deploy). |
| Vercel | Same as Netlify. Detects Vite automatically. |

## GitHub Pages specifics

Three things make a Vite SPA work on Pages, all already configured:

1. **Asset base path**: `vite.config.ts` sets `base: '/vocamoria/'` for `command === 'build'`. Dev server keeps `/` so `npm run dev` is unchanged.
2. **Router base**: `src/main.tsx` reads `import.meta.env.BASE_URL` and passes it as `basename` to `BrowserRouter`. Dev → no basename; build → `/vocamoria`.
3. **SPA fallback**: `npm run build` copies `dist/index.html` to `dist/404.html`. Pages serves `404.html` for unknown paths, so client-side routes (`/quiz`, `/typing`, …) work on direct visit and refresh.

If you fork this repo and rename it, change `'/vocamoria/'` in `vite.config.ts` to match the new repo name (or use `'./'` for relative paths, with caveats).

## SPA routing

If the host doesn't fall back to `index.html` for unknown paths, client-side routes (`/quiz`, `/typing`, …) will 404 on refresh. Configure:

- **GitHub Pages**: handled by the `cp index.html 404.html` step in `npm run build`.
- **Netlify**: add `_redirects` with `/* /index.html 200`.
- **Vercel**: works out of the box.

## Updating vocabulary

Edit `src/data/vocab.json`, rebuild, redeploy. There is no live update mechanism — the file is bundled into the JS at build time. Existing users keep their progress (`localStorage` is keyed by `id`, not by file content).

## Rollback

Static bundles are immutable per build. Re-deploy a previous build. There is no database to migrate.
