# Life Simulator

A small React port of the original single-file `index.html` app.

Quick start:

1. npm install
2. npm run dev

This scaffold uses Vite + React and splits the UI into components in `src/components`.

Build & deploy

- Development (local):
	1. npm install
	2. npm run dev

- Build (production):
	1. npm run build
	2. The production output will be in `dist/`.

- Deploy to GitHub Pages (automatic):
	- This repo contains a GitHub Actions workflow that builds and deploys `dist/` to the `gh-pages` branch when changes are pushed to `main`.
	- The workflow sets `VITE_PUBLIC_PATH` to `/johnmorgan-web/Life-Simulator/` by default; change that in `.github/workflows/gh-pages.yml` if your repo path differs.

Notes
- The "Auto Check" button in the `Ledger` tab is only visible when running locally (Vite dev server). It's controlled by `import.meta.env.DEV` and the `VITE_SHOW_AUTO_CHECK` env var.
- To force-enable the Auto Check button in a non-dev build, set `VITE_SHOW_AUTO_CHECK=true` in your production environment before building.

Next steps:
- Continue porting game logic into React hooks and context
- Add tests and additional TypeScript types if desired
