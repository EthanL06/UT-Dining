---
name: verifier-data
description: Verify UT Dining's Supabase migrations, database functions and the menu scraper against a local Supabase - migrations apply from scratch, the schema is what the change says, seed rows survive, and one scraper run writes the expected menus. Use for changes to supabase/migrations/**, supabase/seed.sql, packages/supabase or apps/scraper/**.
---

# verifier-data

Local data only. Never connect to the production Supabase project or the hosted dev project, also not to read. The local database is Postgres in Docker on port 54322, with the API on 54321.

## Setup

1. Docker must be running (`docker info`). In a cloud container with no daemon, start one: `dockerd > "$run/dockerd.log" 2>&1 &` and wait for `docker info`. With no Docker at all, BLOCKED.
2. Start local Supabase with only what the checks need: `pnpm exec supabase start -x vector,logflare,imgproxy,studio,edge-runtime,realtime,storage-api,inbucket,postgres-meta > "$run/start.log" 2>&1`. The first start pulls images and takes a few minutes.
3. Reset to the base state: `pnpm db:reset > "$run/reset.log" 2>&1`. It applies every file in `supabase/migrations` from scratch, then `supabase/seed.sql`.
4. A query helper: `psql_local() { docker exec -i supabase_db_ut-dining psql -U postgres -At "$@"; }`.

## Steps

1. The reset in setup step 3 is the migration check: it must end with `Finished supabase db reset` and no error. `psql_local -c "select count(*) from supabase_migrations.schema_migrations"` must equal the number of files in `supabase/migrations`.
2. Check the schema the change says: `psql_local -c "\d public.<table>"` for columns, types and constraints, and `psql_local -c "select indexname from pg_indexes where schemaname='public'"` for indexes. For a database function, `psql_local -c "\df+ public.<function>"`.
3. Seed rows survive: `psql_local -c "select count(*) from public.location"` is 53 on the base seed. When a migration rewrites existing rows, show two or three of them before and after.
4. Types: when a migration changed the schema, run `pnpm db:types` and check that `packages/supabase/src/database.types.ts` has the new tables, columns or functions, and that `pnpm typecheck` still passes. The installed Supabase CLI also reformats the file and adds `ComputedFields: never` everywhere, so a full `git diff` is never empty on base. Judge only the lines the migration explains.
5. Scraper: run one day against the local database only, from `apps/scraper`:
   `ENABLE_SUPABASE=true SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_KEY="$(pnpm exec supabase status -o env | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"/\1/p')" DAYS_TO_SCRAPE=1 node src/index.ts > "$run/scrape.log" 2>&1`.
   It must end with `Uploaded 7/7 location-days` and exit 0. It needs internet access to `hf-foodpro.austin.utexas.edu`. For a parser-only change, leave `ENABLE_SUPABASE` unset for a dry run; the JSON lands in `apps/scraper/data/` (gitignored).
6. Query what the scraper wrote: `psql_local -c "select (select count(*) from public.menu),(select count(*) from public.food_item),(select count(*) from public.nutrition),(select count(*) from public.allergens)"`. `food_item`, `nutrition` and `allergens` counts must match, and the menu and item counts must match the scrape log. Show two or three rows per location and meal: `psql_local -c "select l.name, m.name, count(*) from menu m join location l on l.id = m.location_id join menu_category c on c.menu_id = m.id join food_item f on f.menu_category_id = c.id group by 1, 2 order by 1, 2"`. A second run on the same day must keep the same counts, because the upload replaces a menu that exists.
7. When a migration is not reversible (drops a column or table, rewrites data), say so in the result, so the deploy steps can warn about it.

## Teardown

`pnpm db:stop` if you started Supabase. Stop `dockerd` only if you started it.

## Result

PASS, FAIL or BLOCKED for each claim, with the commands, query outputs and log paths.

## Track record
