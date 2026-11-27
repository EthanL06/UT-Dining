---
base: staging
tracker: github
branch: "{type}-{slug}"
commit: conventional
review: no-mistakes
browser: agent-browser
specs: local
notify: on
ui_refs: mobbin
commands:
  install: make install
  setup: make setup
  doctor: make doctor
  check: make check
  verify: make verify
  lint: make lint
  fix: make fix
  typecheck: make typecheck
  test: make test
  build: make build
  dev: make dev
  dev_mobile: make mobile
  dev_ios: make ios
  e2e_ios: make e2e
  dev_dashboard: make dashboard
  dev_website: make website
  scrape: make scrape
  admin: make admin
  db_start: make db-up
  db_stop: make db-down
  db_reset: make db-reset
  db_migrate: make db-migrate
  db_seed: make db-seed
  db_types: make db-types
  env_local: make env-local
  cleanup: make clean
deploy_steps:
  - supabase/migrations/**
  - supabase/functions/**
  - supabase/config.toml
  - apps/mobile/app.config.js
  - apps/mobile/eas.json
  - apps/mobile/package.json
  - apps/scraper/src/config.ts
  - .github/workflows/scraper.yml
  - .github/workflows/website-deploy.yml
  - apps/*/.env.example
verifiers: [tests, browser, data, mobile]
---

# UT Dining

A pnpm + Turborepo monorepo for the UT Dining app. `apps/mobile` is the Expo iOS and Android app (Expo Router, NativeWind, Drizzle on SQLite as an offline cache). It reads menus, locations and app settings from Supabase and caches them locally. `apps/scraper` runs daily on GitHub Actions, scrapes UT's FoodPro pages and writes menus to Supabase through the `insert_multiple_locations_and_menus` database function. `apps/dashboard` is the admin dashboard (Next.js, Mantine, Supabase SSR auth) on Vercel; it edits locations and sends push notifications through the edge functions in `supabase/functions`. `apps/website` is the public site and privacy policy, a static Next.js export on GitHub Pages. `packages/core` holds the shared hours and open/closed logic, and `packages/supabase` holds the generated database types. The schema lives in `supabase/migrations`.

Ports: Supabase API 54321 and Postgres 54322 by default (`make db-up` moves them to a free range in the gitignored `supabase/.env` when another project holds them; `make db-status` prints the real ones), dashboard 3000, website 3001 (base path `/ut-dining-website`), Metro 8081.

## Rules

- PRs target `staging`, never `main`. Promoting `staging` to `main` ships production, and only Ethan does it.
- No AI attribution anywhere: no `Co-Authored-By` or session trailers in commits, no "Generated with" lines in PR bodies or comments.
- Do not add code comments in code you write, including workflow YAML.
- Commits and PR titles follow Conventional Commits. Lefthook runs commitlint and Biome on commit; never skip the hooks.
- Run `make verify` after each change and `make check` before you push. CI runs the same checks plus a build of the dashboard and the website.
- Use local Supabase (`make db-up`) for every verifier. Never point a build, test or verifier at the production Supabase project, and never write to the hosted dev project from a build. The scraper uploads only with `ENABLE_SUPABASE=true`; leave it unset unless `SUPABASE_URL` is the local `API_URL` from `pnpm exec supabase status -o env` (an `http://127.0.0.1:` address).
- Never hand-edit `packages/supabase/src/database.types.ts`. Regenerate it with `make db-types` after a migration; on a merge conflict follow `.agents/recipes/cloud-sessions.md`.
- Never edit a migration that is already on `staging`. Add a new one with `pnpm db:new <name>`.
- `packages/core` stays pure: no React, React Native or database imports. Its tests sit next to the source.
- The website base path `/ut-dining-website` must stay, because the App Store privacy link points at it.
- Keep `typescript` on 6.x. Typechecks run TypeScript 7 through the `tsgo` alias, and Expo tooling needs the 6.x JS API.
- The mobile app needs a development build (`APP_VARIANT=development`, bundle id `com.ethanl06.ut-dining.dev`), not Expo Go. A change to native dependencies or `app.config.js` needs a new development build before it can be verified.
- Before an Expo SDK bump, run `npx expo install expo@^<sdk> && npx expo install --fix` in `apps/mobile`, then `npx expo-doctor`.
- Change app data (locations, hours, settings, changelog, push notifications) with `pnpm -s admin` (`apps/cli`), never by hand in SQL. Ask Ethan before any `--prod` write and before sending or scheduling any push notification.
- Never commit keys. Each app commits `.env.example`, and real values go in the gitignored `.env.local` written by `scripts/env.ts`.

## Deploy steps

- `supabase/migrations/**`: Ethan applies the migration to the dev project, then to production, with `supabase db push` against each linked project, before the code that needs it reaches `main`. Then run `pnpm db:types` and commit the types.
- `supabase/functions/**`: `supabase functions deploy <name>` against dev, then production.
- `supabase/config.toml`: auth or API settings changed here must also be changed in the hosted projects' dashboards.
- `apps/mobile/app.config.js`, `apps/mobile/eas.json`, native dependencies in `apps/mobile/package.json`: a new EAS build (`npx eas-cli build --profile <development|production> --platform ios`) and, for production, an App Store submission. The free plan allows 15 iOS builds a month, so batch them. A JS-only change ships as an EAS update on the matching channel.
- `apps/scraper/src/config.ts`, `.github/workflows/scraper.yml`: check the repo secrets `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and the variable `DAYS_TO_SCRAPE` still match what the workflow reads.
- `.github/workflows/website-deploy.yml`: the site deploys from `main` to the Longhorn-Developers/ut-dining-website `gh-pages` branch with the `WEBSITE_DEPLOY_KEY` secret.
- `apps/*/.env.example`: a new variable must also be set where that app runs: Vercel for the dashboard, EAS environment variables for the mobile app, repo secrets for the scraper.
- The dashboard deploys on Vercel when `main` changes. Nothing to do by hand.
