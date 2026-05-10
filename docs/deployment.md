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

Final host **TBD**. Any of these will work without modification:

| Host | Notes |
|------|-------|
| Netlify | Connect repo, build command `npm run build`, publish dir `dist`. |
| Vercel | Same. Detects Vite automatically. |
| GitHub Pages | Push `dist/` to `gh-pages` branch, or use the `peaceiris/actions-gh-pages` workflow. Set `base` in `vite.config.ts` if served from a subpath. |

## SPA routing

If the host doesn't fall back to `index.html` for unknown paths, client-side routes (`/quiz`, `/typing`, …) will 404 on refresh. Configure:

- **Netlify**: add `_redirects` with `/* /index.html 200`.
- **Vercel**: works out of the box.
- **GitHub Pages**: copy `index.html` to `404.html`, or use a hash-based router.

## Updating vocabulary

Edit `src/data/vocab.json`, rebuild, redeploy. There is no live update mechanism — the file is bundled into the JS at build time. Existing users keep their progress (`localStorage` is keyed by `id`, not by file content).

## Rollback

Static bundles are immutable per build. Re-deploy a previous build. There is no database to migrate.
