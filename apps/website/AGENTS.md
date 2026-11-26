# apps/website

Public site and privacy policy, a static Next.js 16 export. Read the root `AGENTS.md` first and `README.md` here.

- Every link and asset must keep the base path from `WEBSITE_BASE_PATH` (default `/ut-dining-website`), because the App Store privacy link points at it. `make website` serves it at http://localhost:3001/ut-dining-website/.
- Deploy: `.github/workflows/website-deploy.yml` builds this app on `main` and pushes the static export to the `gh-pages` branch of Longhorn-Developers/ut-dining-website, a publish-only mirror that owns the `longhorn-developers.github.io/ut-dining-website` URL. It needs the `WEBSITE_DEPLOY_KEY` secret (a deploy key with write access on that repo) and that repo's Pages source set to `gh-pages` / root; without the secret it only builds. It turns Jekyll off so Pages serves `_next/`.
- `next dev` keeps the block below up to date. Commit it when it changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
