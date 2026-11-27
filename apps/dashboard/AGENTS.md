# apps/dashboard

Admin dashboard (Next.js 16 App Router, Mantine, Supabase SSR auth) on Vercel. Read the root `AGENTS.md` first and `README.md` here for the file layout.

- Sign-in is Google only, limited to emails in `public.dashboard_admins` and checked by `public.is_dashboard_admin()`. `proxy.ts` refreshes the session on every request (`lib/supabase/middleware.ts`). To use the dashboard locally without Google, follow step 5 of the verifier-browser skill.
- Writes go through server actions: `app/(private)/dashboard/action.ts` (locations) and the `action.ts` next to each section (`configuration`, `notifications`, `changelog`), plus `app/actions/auth.ts`.
- Supabase types come from `@ut-dining/supabase`; hours and payment logic come from `@ut-dining/core`. Both ship TypeScript source, so they are in `transpilePackages`.
- Vercel envs: Production uses the prod Supabase project, Preview and Development use the dev project. Never point a local run at production.
- `make dashboard` runs it on :3000. CI builds it with placeholder Supabase env vars, so a build that reads env at import time breaks CI.
- `next dev` keeps the block below up to date. Commit it when it changes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
