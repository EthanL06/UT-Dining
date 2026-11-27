# UT Dining

pnpm + Turborepo monorepo for the UT Dining iOS/Android app and its services.

This file is the agent guide for every tool (`CLAUDE.md` imports it). Each app with its own rules has an `AGENTS.md` too: `apps/mobile`, `apps/dashboard`, `apps/scraper`. Code comments are not allowed in this repo, so context that would go in a comment goes in these files, a README or the PR description.

## Start here

1. `make verify` after every change: Biome on the changed files, the comment check, typecheck and tests of only the affected packages, then a list of what else to verify for this diff. About 3 s.
2. `make check` once before you push (everything, the same as CI).
3. Read `.agents/recipes/README.md` for gotchas in your area. Cloud sessions: read `.agents/recipes/cloud-sessions.md` first (GitHub writes, screenshots, Supabase projects, generated type conflicts).

## Layout

- `apps/mobile`: Expo SDK 58 app (React Native 0.88, React 19, New Architecture only; Expo Router, NativeWind, Drizzle + expo-sqlite, TanStack Query, Zustand, MMKV). Needs a development build, not Expo Go. EAS config lives here.
- `apps/dashboard`: admin dashboard (Next.js 16, Mantine, Supabase SSR auth). Deployed on Vercel.
- `apps/website`: public site, changelog and privacy policy (Next.js 16 on Vercel, server-rendered with ISR, Tailwind 4). `WEBSITE_STATIC_EXPORT=1` builds the static copy GitHub Pages serves under `/ut-dining-website`, which the App Store privacy link still points at; keep `/privacy-policy/` unchanged.
- `apps/cli` (`@ut-dining/cli`): command line version of the dashboard for agents. See "Dashboard data" below.
- `apps/scraper`: daily menu scraper. Plain ESM TypeScript run directly by Node (no build). Runs daily from `.github/workflows/scraper.yml` (GitHub Actions).
- `packages/core` (`@ut-dining/core`): pure domain logic shared by the app and the dashboard (service hours, open/closed status, Central-time dates, payment methods, sync planning). No React, React Native or database code here; Vitest tests live next to the source. Run with `pnpm --filter @ut-dining/core test`. New pure logic goes here when both apps can use it.
- `packages/supabase` (`@ut-dining/supabase`): generated Supabase types. Regenerate with `make db-types`; never hand-edit.
- `packages/tsconfig` (`@ut-dining/tsconfig`): shared TypeScript presets.
- `supabase/`: the single Supabase project (migrations, seed, Deno edge functions).

## Commands (run from the repo root)

The `Makefile` is the front door. `make` prints every target. Every target is non-interactive, idempotent and prints `==>` steps with `ok`, `warn` and `fail` lines, so it is safe for agents.

- `make setup`: one command for a fresh clone or a stale one: Node, pnpm, deps, git hooks, `.env.local` files, local Supabase (Docker), a few days of scraped menus. Re-running keeps existing env files and data. `DB=local|dev|none`, `SEED=0`.
- `make doctor`: checks the whole setup and exits 1 on a real problem (including any app pointing at production). Run it first when something is off.
- `make verify`: the fast, scoped check (see Start here). `BASE=<ref>` changes the base from `origin/staging`.
- `make check`: Biome + typecheck + tests of everything. Run it before pushing. `make fix`: Biome safe fixes. `make check-comments` fails on added code comments (the pre-commit hook runs it on the staged diff).
- Tests: Vitest in `packages/core`, `apps/scraper` and `apps/mobile` (pure helpers in `apps/mobile/utils` only, `*.test.ts` next to the source; anything that imports React Native or MMKV cannot run there). One file: `pnpm --filter @ut-dining/mobile exec vitest run utils/filter.test.ts`.
- `make typecheck`: TypeScript 7 via the `tsgo` alias; `typescript` itself stays on 6.x because Expo tooling needs the JS API.
- `make dev` (dashboard :3000, website :3001, Metro :8081), or one at a time: `make dashboard`, `make website`, `make mobile`, `make ios SIM=<name or UDID>`, `make scrape`.
- Database: `make db-up`, `make db-down`, `make db-status`, `make db-reset`, `make db-migrate`, `make db-new NAME=x`, `make db-types`, `make db-seed DAYS=3`, `make db-fixtures`, `make db-psql ARGS='-c "select 1"'`. Read the real URLs from `make db-status`: when another project holds 54321, `make db-up` moves the stack and saves the ports in the gitignored `supabase/.env`. Never edit ports in `supabase/config.toml`.
- iOS: `make sim`, `make sims`, `make e2e SIM=<UDID> ARGS="--shards 3"`.
- Worktrees: `make worktree NAME=feat-x` creates `.worktrees/feat-x` from `origin/staging` with env files and deps. All worktrees share one local Supabase.
- Cleanup when you are done: `make clean` (Metro, E2E simulator clones, clean and pushed worktrees, caches) and `make stop` (also local Supabase and every booted simulator). On Ethan's Mac, shut down only simulators you booted.
- `pnpm --filter @ut-dining/<app> <script>`: run one package's script. The root `pnpm` scripts still work.
- New dev scripts go in `scripts/dev/` and get a Makefile target plus a line in `make help`. They must run on macOS bash 3.2. Every script a person or agent runs has a target; only `scripts/claude-session-start.sh` (the SessionStart hook) and `scripts/dev/lib.sh` do not.

## Dashboard data

When Ethan asks to change app data (hours, force close, locations, support links, credits, About text, changelog entries, push notifications), use the CLI instead of the dashboard or raw SQL. Full docs: `apps/cli/README.md`.

- `pnpm -s admin <group> <command>` (or `make admin ARGS="..."`). `pnpm -s admin help --json` lists every command. Add `--json` for machine output and `--dry-run` to preview a write.
- Targets: `--dev` (default) needs `SUPABASE_DEV_URL` and `SUPABASE_DEV_SERVICE_KEY`; `--local` needs nothing; `--prod` needs `SUPABASE_PROD_URL` and `SUPABASE_PROD_SERVICE_KEY`. Keys come only from the environment. Never paste a key into chat, a file or a commit.
- Always ask Ethan before any production write. Show him the `--dry-run` output and wait for his OK, then add `--prod --confirm-prod yrmylgizphirqqkzgbth`.
- Push notifications reach real phones. `notifications send` and `schedule` only preview unless `--send` is passed. Always show Ethan the exact title and body and get his OK before sending or scheduling, on any target.
- Run `pnpm -s admin status` first. If the dev keys are missing, say which variables Ethan needs to add to the cloud environment; don't fall back to production.

## Conventions

- No code comments in code you write, workflow YAML and shell included (`biome-ignore` and `@ts-expect-error` directives are fine). There are none in the repo, and `make check` and CI fail on any (`scripts/dev/check-comments.sh --all`, which parses TypeScript, JavaScript and CSS); Lefthook checks the staged diff. `node scripts/dev/comments.ts --write` removes them. Only `supabase/config.toml` (the Supabase CLI template), SQL migrations and generated files are exempt.
- Lint is Biome only (`biome.json`), and warnings count: `make check`, `make lint`, `make verify` and CI all run with `--error-on-warnings`, so an unused `biome-ignore`, an unsorted Tailwind class list or any other warning fails the build. `make fix` applies the safe fixes. Rules that are errors on purpose, so agents get a clear failure instead of a review comment:
  - Types: no `any` (explicit or implicit `let`), no non-null `!`, no `@ts-ignore` (use `@ts-expect-error`), no `enum` or `namespace`, `import type`/`export type` for type-only imports.
  - Hygiene: no unused imports, variables or function parameters (prefix with `_` when a signature needs it), `===` only, `const` when never reassigned, no `var`, no reassigned parameters, throw only `Error`s, no `else` after `return`, template literals over string concatenation, `node:` prefix for Node built-ins, `T[]` array types.
  - Tests: no `.only` or `.skip` left in a test file.
  - Dependencies: every import must be listed in that package's `package.json` (pnpm's isolated `node_modules` breaks undeclared ones at runtime).
  - Mobile (`apps/mobile`): haptics only through `~/utils/haptics` (never import `expo-haptics`), and only `services/` imports Supabase (`~/utils/supabase` or `@supabase/supabase-js`); screens, components, hooks and stores read the SQLite cache. Raw strings must sit inside a `<Text>` (`noReactNativeRawText`). More in `apps/mobile/AGENTS.md`.
  - Fix the code. Do not add a `biome-ignore` unless the rule is wrong for that line, and say why in the ignore. A new rule goes in `biome.json` only when the repo passes it, or the same PR fixes every violation.
- No AI attribution in commits, PR bodies or comments: no `Co-Authored-By` or session trailers, no "Generated with" lines.
- PRs target `staging` and are squash merged with a hand-written message. Ask Ethan before merging. Only Ethan promotes `staging` to `main`, which ships production.
- Conventional commits (enforced by commitlint through Lefthook) and conventional PR titles (the "Conventional PR title" check, required on `main`). Branches are `<type>-<kebab-description>`, e.g. `feat-meal-reminders`.
- A PR that changes UI includes screenshots (both themes for the app; the `screenshots` label runs the mobile screenshot workflow).
- Test only against local Supabase or the hosted dev project. Never point a test, build, script or session at production.
- Migrations must be backwards compatible, because the shipped app and the deployed dashboard keep running against the new schema: add columns, tables and functions; do not drop, rename or change the type of anything existing code reads. Never edit a migration that is already on `staging`.
- Biome formats and lints everything: single quotes, 2 spaces, 100 columns.
- Shared versions go in the `catalog:` in `pnpm-workspace.yaml`.
- PR screenshots go on an orphan `assets/<topic>` branch. Include both `apps/dashboard/vercel.json` and `apps/website/vercel.json` containing `{ "git": { "deploymentEnabled": false } }` in that branch, or Vercel tries to build it, fails because the app folder is missing, and emails Ethan. `.agents/recipes/cloud-sessions.md` has the commands.
- Vercel builds the dashboard and the website only when needed, to stay under the free plan's 100 deployments a day. Both `vercel.json` files run `scripts/vercel-ignore.mjs`: a preview builds only for `staging` or a branch with an open PR, and any build is skipped unless the diff touches the app, a workspace package it depends on, or a root build file (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.node-version`). The diff base is the last deployed commit, or where the branch left `staging` when that commit is gone. A push made before its PR exists builds nothing, so push again after opening the PR to get a preview. When a new app or package path should trigger a build, update the script.
- pnpm uses its default isolated `node_modules`. The app must list every package it imports directly (for example `react-native-css-interop`, which NativeWind's JSX runtime needs).
- Dependencies update through Renovate (`renovate.json`): weekly PRs into `staging` on Monday mornings (Central), with patches grouped in `renovate/patch` and merged by Renovate once every check passes, minors grouped for review, mobile patches and minors in their own PR that never auto-merges, and majors one PR each. Expo SDK packages and the native packages the SDK pins are left to `npx expo install`, and TypeScript stays on 6.x. Change the rules in `renovate.json` rather than closing Renovate PRs by hand.
- Security checks on PRs: CodeQL (`codeql.yml`) and `dependency-audit.yml`, which fails only when the PR adds a high or critical advisory that the base branch does not already have. `branch-cleanup.yml` deletes a PR's branch when it merges and sweeps older merged branches weekly (never `main`, `staging` or `assets/*`), and `website-preview.yml` deletes a PR's Cloudflare preview when the PR closes.
- Before an Expo SDK bump, run `npx expo install expo@^<sdk> && npx expo install --fix` in `apps/mobile`, then `npx expo-doctor`.
- Env files: each app commits `.env.example`; real values go in the gitignored `.env.local` (written by `scripts/env.ts`). Never commit keys.
- Cloud sessions: the SessionStart hook installs deps and, when `SUPABASE_DEV_*` vars are set, points the apps at the hosted dev Supabase project. Never point a session at production.

## Cooking

This repo uses [cook](https://github.com/EthanL06/cook).

- Project facts for agents: `.agents/cook.md`. Follow its rules.
- Before you start a task, read `.agents/recipes/README.md` and the recipes for your area.
- To prove a change works, run the verifier skills in `.agents/skills/verifier-*` (or `/cook-verify`). `.claude/skills` links to the same folder, so Claude Code lists them as skills.
- Repeatable QA flows live in `scripts/qa/` when that folder exists. Use them before you test by hand.
