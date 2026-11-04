---
name: verifier-data
description: Verify UT Dining's Supabase migrations, database functions and the menu scraper against a local Supabase - migrations apply from scratch, the schema is what the change says, seed rows survive, and one scraper run writes the expected menus. Use for changes to supabase/migrations/**, supabase/seed.sql, packages/supabase or apps/scraper/**.
---

# verifier-data

Local data only. Never connect to the production Supabase project or the hosted dev project, also not to read. Local Supabase defaults to the API on 54321 and Postgres on 54322, but other projects on the same machine may hold those ports, so always read the real URL from `supabase status`.

## Setup

1. Docker must be running (`docker info`). On macOS, `open -a Docker` and wait for `docker info`. In a Linux cloud container with no daemon, start one: `dockerd > "$run/dockerd.log" 2>&1 &`. With no Docker at all, BLOCKED.
2. Ports. When `docker ps --format '{{.Names}}' | grep -qx supabase_db_ut-dining` is true, a UT Dining stack from another worktree is already up: reuse it, and do not start or stop it. Else check the ports in `supabase/config.toml` (`lsof -iTCP:54321 -sTCP:LISTEN`, same for 54320 to 54329). If any is taken by another project, move this worktree's stack: `sed -i.bak -E 's/^(port|shadow_port) = 543([0-9]{2})$/\1 = 563\2/' supabase/config.toml` (pick another free prefix if 563xx is taken). This edit is for the run only: restore it at teardown and never commit it.
3. Start local Supabase with only what the checks need: `pnpm exec supabase start -x vector,logflare,imgproxy,studio,edge-runtime,realtime,storage-api,postgres-meta > "$run/start.log" 2>&1`. The first start pulls images and takes a few minutes; later starts take about a minute.
4. Read the local URLs and keys: `eval "$(pnpm exec supabase status -o env | grep -E '^(API_URL|DB_URL|SERVICE_ROLE_KEY|ANON_KEY)=')"`. Use `$API_URL` and `$SERVICE_ROLE_KEY` below; they are Supabase's fixed local demo values, not secrets.
5. Reset to the base state: `pnpm db:reset > "$run/reset.log" 2>&1`. It applies every file in `supabase/migrations` from scratch, then `supabase/seed.sql`.
6. A query helper: `psql_local() { docker exec -i supabase_db_ut-dining psql -U postgres -At "$@"; }`.

## Steps

1. The reset in setup step 5 is the migration check: it must end with `Finished supabase db reset` and no error. `psql_local -c "select count(*) from supabase_migrations.schema_migrations"` must equal the number of files in `supabase/migrations`.
2. Check the schema the change says: `psql_local -c "\d public.<table>"` for columns, types and constraints, and `psql_local -c "select indexname from pg_indexes where schemaname='public'"` for indexes. For a database function, `psql_local -c "\df+ public.<function>"`.
3. Seed rows survive: `psql_local -c "select count(*) from public.location"` is 53 on the base seed. When a migration rewrites existing rows, show two or three of them before and after.
4. Types: when a migration changed the schema, run `pnpm db:types` and check that `packages/supabase/src/database.types.ts` has the new tables, columns or functions, and that `pnpm typecheck` still passes. The installed Supabase CLI also reformats the file and adds `ComputedFields: never` everywhere, so a full `git diff` is never empty on base. Judge only the lines the migration explains.
5. Scraper: run one day against the local database only, from `apps/scraper`:
   `ENABLE_SUPABASE=true SUPABASE_URL="$API_URL" SUPABASE_KEY="$SERVICE_ROLE_KEY" DAYS_TO_SCRAPE=1 node src/index.ts > "$run/scrape.log" 2>&1`.
   Check first that `$API_URL` starts with `http://127.0.0.1:`. It must end with `Uploaded 7/7 location-days` and exit 0, in about 16 s. It needs internet access to `hf-foodpro.austin.utexas.edu`. For a parser-only change, leave `ENABLE_SUPABASE` unset for a dry run; the JSON lands in `apps/scraper/data/` (gitignored).
6. Query what the scraper wrote: `psql_local -c "select (select count(*) from public.menu),(select count(*) from public.food_item),(select count(*) from public.nutrition),(select count(*) from public.allergens)"`. `food_item`, `nutrition` and `allergens` counts must match, and the menu and item counts must match the scrape log. Show the items per location and meal: `psql_local -c "select l.name, m.name, count(*) from menu m join location l on l.id = m.location_id join menu_category c on c.menu_id = m.id join food_item f on f.menu_category_id = c.id group by 1, 2 order by 1, 2"`. A second run on the same day must keep the same counts, because the upload replaces a menu that exists.
7. When a migration is not reversible (drops a column or table, rewrites data), say so in the result, so the deploy steps can warn about it.

## Teardown

If you started the stack, `pnpm db:stop`. It keeps the `supabase_db_ut-dining` Docker volume on purpose, so the next start is fast; `pnpm db:reset` puts it back to the base state, so old data never leaks into a check. If you moved the ports, `mv supabase/config.toml.bak supabase/config.toml`. Stop `dockerd` only if you started it.

## Result

PASS, FAIL or BLOCKED for each claim, with the commands, query outputs and log paths.

## Track record
