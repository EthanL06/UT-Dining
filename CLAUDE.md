# UT Dining

pnpm + Turborepo monorepo for the UT Dining iOS/Android app and its services.

## Layout

- `apps/mobile`: Expo SDK 58 app (React Native 0.88, React 19, New Architecture only; Expo Router, NativeWind, Drizzle + expo-sqlite, TanStack Query, Zustand, MMKV). Needs a development build, not Expo Go. EAS config lives here.
- `apps/dashboard`: admin dashboard (Next.js 16, Mantine, Supabase SSR auth). Deployed on Vercel.
- `apps/website`: public site and privacy policy (Next.js 16 static export, Tailwind 4). Base path `/ut-dining-website` must stay: the App Store privacy link points at its GitHub Pages URL.
- `apps/scraper`: daily menu scraper. Plain ESM TypeScript run directly by Node (no build). Runs daily from `.github/workflows/scraper.yml` (GitHub Actions).
- `packages/core` (`@ut-dining/core`): pure domain logic shared by the app and the dashboard (service hours, open/closed status, Central-time dates, payment methods). No React, React Native or database code here; Vitest tests live next to the source. Run with `pnpm --filter @ut-dining/core test`.
- `packages/supabase` (`@ut-dining/supabase`): generated Supabase types. Regenerate with `make db-types`; never hand-edit.
- `packages/tsconfig` (`@ut-dining/tsconfig`): shared TypeScript presets.
- `supabase/`: the single Supabase project (migrations, seed, Deno edge functions).

## Commands (run from the repo root)

The `Makefile` is the front door. `make` prints every target. Every target is non-interactive, idempotent and prints `==>` steps with `ok`, `warn` and `fail` lines, so it is safe for agents.

- `make setup`: one command for a fresh clone or a stale one: Node, pnpm, deps, git hooks, `.env.local` files, local Supabase (Docker), a few days of scraped menus. Re-running keeps existing env files and data. `DB=local|dev|none`, `SEED=0`.
- `make doctor`: checks the whole setup and exits 1 on a real problem (including any app pointing at production). Run it first when something is off.
- `make check`: Biome + typecheck + tests. Run it before committing. `make fix`: Biome safe fixes.
- `make typecheck`: TypeScript 7 via the `tsgo` alias; `typescript` itself stays on 6.x because Expo tooling needs the JS API.
- `make dev` (dashboard :3000, website :3001, Metro :8081), or one at a time: `make dashboard`, `make website`, `make mobile`, `make ios SIM=<name or UDID>`, `make scrape`.
- Database: `make db-up`, `make db-down`, `make db-status`, `make db-reset`, `make db-migrate`, `make db-new NAME=x`, `make db-types`, `make db-seed DAYS=3`, `make db-fixtures`, `make db-psql ARGS='-c "select 1"'`. Read the real URLs from `make db-status`: when another project holds 54321, `make db-up` moves the stack and saves the ports in the gitignored `supabase/.env`. Never edit ports in `supabase/config.toml`.
- iOS: `make sim`, `make sims`, `make e2e SIM=<UDID> ARGS="--shards 3"`.
- Worktrees: `make worktree NAME=feat-x` creates `.worktrees/feat-x` from `origin/staging` with env files and deps. All worktrees share one local Supabase.
- Cleanup when you are done: `make clean` (Metro, E2E simulator clones, clean and pushed worktrees, caches) and `make stop` (also local Supabase and every booted simulator). On Ethan's Mac, shut down only simulators you booted.
- `pnpm --filter @ut-dining/<app> <script>`: run one package's script. The root `pnpm` scripts still work.
- New dev scripts go in `scripts/dev/` and get a Makefile target plus a line in `make help`. They must run on macOS bash 3.2.

## Conventions

- Conventional commits (enforced by commitlint through Lefthook). Branches are `<type>-<kebab-description>`, e.g. `feat-meal-reminders`.
- Biome formats and lints everything: single quotes, 2 spaces, 100 columns.
- Shared versions go in the `catalog:` in `pnpm-workspace.yaml`.
- PR screenshots go on an orphan `assets/<topic>` branch. Include `apps/dashboard/vercel.json` containing `{ "git": { "deploymentEnabled": false } }` in that branch, or Vercel tries to build it and fails because `apps/dashboard` is missing.
- pnpm uses its default isolated `node_modules`. The app must list every package it imports directly (for example `react-native-css-interop`, which NativeWind's JSX runtime needs).
- Before an Expo SDK bump, run `npx expo install expo@^<sdk> && npx expo install --fix` in `apps/mobile`, then `npx expo-doctor`.
- Env files: each app commits `.env.example`; real values go in the gitignored `.env.local` (written by `scripts/env.ts`). Never commit keys.
- Cloud sessions: the SessionStart hook installs deps and, when `SUPABASE_DEV_*` vars are set, points the apps at the hosted dev Supabase project. Never point a session at production.

## Cooking

This repo uses [cook](https://github.com/EthanL06/cook).

- Project facts for agents: `.agents/cook.md`. Follow its rules.
- Before you start a task, read `.agents/recipes/README.md` and the recipes for your area.
- To prove a change works, run the verifier skills in `.agents/skills/verifier-*` (or `/cook-verify`).
- Repeatable QA flows live in `scripts/qa/` when that folder exists. Use them before you test by hand.
