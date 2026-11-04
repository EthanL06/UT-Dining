# Set up and run UT Dining

Steps that worked on a fresh Linux cloud container on 2026-11-04 (Node 24, pnpm 10.28).

## Install and check

1. `pnpm install --frozen-lockfile`. Lefthook installs its git hooks from the root `prepare` script.
2. `pnpm check` runs Biome, the typecheck of every package and the Vitest suites. It passes on `staging` in about 6 s cold.
3. CI also builds the web apps: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder pnpm turbo run build --filter=@ut-dining/dashboard --filter=@ut-dining/website` (about 25 s).

## Local Supabase

1. Docker must be running. A cloud container may have the `docker` CLI with no daemon; start it with `dockerd > /tmp/dockerd.log 2>&1 &` and wait for `docker info`.
2. `pnpm exec supabase start -x vector,logflare,imgproxy,studio,edge-runtime,realtime,storage-api,inbucket,postgres-meta` starts only Postgres, the API gateway, auth and PostgREST. The first run pulls images for a few minutes. Plain `pnpm db:start` starts everything.
3. `pnpm db:reset` applies all migrations and `supabase/seed.sql` (53 locations, no menus).
4. `node scripts/env.ts --local` writes each app's `.env.local` with the local URL and keys. These are Supabase's fixed local demo keys, not secrets.
5. Menus: from `apps/scraper`, run one day into the local database with `ENABLE_SUPABASE=true SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_KEY=<local SERVICE_ROLE_KEY from pnpm exec supabase status -o env> DAYS_TO_SCRAPE=1 node src/index.ts`. It took 16 s for 7 location-days and 840 items.
6. Query it: `docker exec -i supabase_db_ut-dining psql -U postgres -At -c "<sql>"`.

The cloud SessionStart hook (`scripts/claude-session-start.sh`) points the apps at the hosted dev project when `SUPABASE_DEV_*` vars are set. Verifiers use local Supabase instead, so run `node scripts/env.ts --local` after the hook.

## Web apps

- Website: `pnpm --filter @ut-dining/website dev --port 3001`, open `http://localhost:3001/ut-dining-website/`.
- Dashboard: `pnpm --filter @ut-dining/dashboard dev`, open `http://localhost:3000/login`. Create a local user with the auth admin API (see verifier-browser setup step 5) and sign in with it.
- agent-browser in a Linux container: `npm i -g agent-browser`, then `export AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium AGENT_BROWSER_ARGS=--no-sandbox` to use the preinstalled Chromium.

## Mobile app

Needs macOS with Xcode, a development build and Metro. See verifier-mobile. `pnpm dev:ios` builds and installs the dev build, `pnpm dev:mobile` starts Metro on 8081.

## Known noise

- `pnpm db:types` with the installed Supabase CLI reformats `packages/supabase/src/database.types.ts` and adds `ComputedFields: never`, so the diff is never empty even with no schema change.
- Turborepo warns "no output files found" for the `test` tasks. It is harmless.
