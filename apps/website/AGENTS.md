# apps/website

Public site, changelog and privacy policy. Next.js 16 on Vercel, server-rendered with ISR. Read the root `AGENTS.md` first and `README.md` here.

- Vercel serves the site from `/`. `WEBSITE_STATIC_EXPORT=1` builds the static GitHub Pages copy under `/ut-dining-website` (override with `WEBSITE_BASE_PATH`), which the App Store privacy link still points at, so every link and asset must go through the base path and `/privacy-policy/` must not move. `make website` serves it at http://localhost:3001/.
- `next dev` keeps the block below up to date. Commit it when it changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
