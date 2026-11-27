# UT Dining Scraper

Scrapes UT Austin's FoodPro menus, nutrition labels and allergens for the seven UHD locations and writes them to Supabase through the `insert_multiple_locations_and_menus` function.

```sh
pnpm --filter @ut-dining/scraper start   # or make scrape from the repo root
pnpm --filter @ut-dining/scraper test
```

Node runs the TypeScript directly. Environment variables come from `.env` or `.env.local` (written by `make setup` / `make env-local`). `make db-seed DAYS=3` scrapes into local Supabase without touching `.env.local`. In production `.github/workflows/scraper.yml` runs it twice a day, at 1 AM and 9:17 AM Central, and retries a failed run once after 10 minutes.

## Configuration

| Variable              | Default | Purpose                                                            |
| --------------------- | ------- | ------------------------------------------------------------------ |
| `DAYS_TO_SCRAPE`      | `1`     | Days to scrape, starting today in Central time                     |
| `ENABLE_SUPABASE`     | unset   | `true` uploads to Supabase; anything else is a dry run             |
| `SUPABASE_URL`        |         | Required when uploading                                            |
| `SUPABASE_KEY`        |         | Service role key, required when uploading                          |
| `CONCURRENCY`         | `32`    | Requests in flight to FoodPro at once                              |
| `START_DATE`          | today   | First day to scrape as `YYYY-MM-DD`, for testing and backfill      |
| `MENU_RETENTION_DAYS` | unset   | When uploading, delete menus older than this many days (minimum 7) |

Every run also writes the scraped data to `data/ut_menus_<timestamp>.json`.

## How it works

1. For each day and location, fetch the short menu page and collect the meal links.
2. Fetch each meal's long menu and read its stations, items, recipe numbers and allergen icons.
3. Fetch each recipe's nutrition label once, however many stations, locations or days serve it.
4. Each item's allergens are the union of its menu icons and the ALLERGENS line on its label, because FoodPro's icons sometimes miss allergens the label lists. Vegan and vegetarian are cleared when the label lists an animal allergen.
   When a station lists the same name for more than one recipe, one item is kept with the first recipe's nutrition, every recipe's allergens, and only the dietary flags that all recipes share.
   A nutrient that the label leaves blank is stored as null, not zero.
5. Upload each location-day as its own transaction, two at a time, so a slow or failed day never blocks the rest. The database function replaces a menu's stations and items when it already exists, so every day in the range is refreshed on every run.

6. With `MENU_RETENTION_DAYS` set, delete menus older than that many days through `prune_old_menus`, 200 menus per call until none are left. Deleting a menu cascades to its stations, items, nutrition and allergens. The app only reads menus from 2 days back, and the daily open data export keeps the history.

All requests share one pool of `CONCURRENCY` connections with retries and backoff. If a meal's page or any of its labels still fails after retries, that meal is left out of the upload so the previous data stays, and the run exits non-zero.

## Performance

A 5-day run takes about 15 to 30 seconds to scrape and 2 to 8 seconds to upload. The whole GitHub Actions job, including checkout and install, takes under a minute.

| 5 days                            | Scrape  | Upload | FoodPro requests | Items |
| --------------------------------- | ------- | ------ | ---------------- | ----- |
| Full week (PR #18, local)         | 28–32 s |        | 1,164            | 4,105 |
| Nov 27 to Dec 1 (Actions, dev)    | 20–27 s | 2–8 s  | 896              | 2,497 |
| Nov 26 to 30, Thanksgiving (dev)  | 15–19 s | 2–6 s  | 725              | 1,654 |

The previous scraper took 69 to 81 seconds for the same full week and made 4,210 requests. FoodPro serves about 40 to 50 requests a second however many connections are open, so the request count sets the runtime. That is why each recipe's label is fetched only once per run. The run log prints the time, request count, retries and upload time, so the numbers for any run are in its Actions log.

## Health check

Every run also checks that FoodPro still looks the way the parser expects and writes `data/health.json` and `data/health.md`. It tells three cases apart:

- **No menu posted.** FoodPro shows "No Data Available" for the location or meal. This is normal on holidays and breaks and is never a problem. A run where UT posted nothing at all exits 0.
- **Layout changed.** A location page has no meal links and no "No Data Available" note, a meal page links nutrition labels the parser could not turn into items (fewer than half), the meal name cannot be read, or more than a quarter of the nutrition labels come back with no nutrition facts. The run exits non-zero and that meal is not pruned, so the previous data stays.
- **New allergens or icons.** A label lists an allergen, or a menu shows an icon, that the parser has no mapping for.

Pages that fail to load after retries are listed too.

`scraper-dev.yml` runs nightly against the dev project and on every push to `staging`. When the check finds a problem it opens one issue labeled `scraper-health`, assigned to the repo owner, and comments on it on later failing nights. The first clean run closes it. Runs from other branches do not touch issues.

## Output

The JSON shape, location names, meal names and allergen keys are the same as the previous scraper's, so the database function and the apps need no changes.

## Restaurants, cafés, markets and food trucks

`pnpm --filter @ut-dining/scraper places` (or `make places`) keeps the hours and payment methods of the places that UT runs in step with UT's own sites. Both scraper workflows run it after the menus, so production updates twice a day and dev nightly. The dining halls are left alone, and so are the private vendors (the Dobie food court, the AT&T Center, O's Campus Café and the rest), which no UT site lists.

| Source | What it gives |
| --- | --- |
| [housing.utexas.edu/dining/hours-of-operation](https://housing.utexas.edu/dining/hours-of-operation) | Hours for every UHD restaurant, coffee shop, market and two food trucks, one table per date range: the semester, Thanksgiving, finals, closing week |
| housing.utexas.edu `dining-locations/<list>/<slug>` pages | Methods of payment |
| [universityunions.utexas.edu/eat/food-trucks](https://universityunions.utexas.edu/eat/food-trucks) and each truck's page | The current trucks and their weekly hours |

How a run works:

1. Fetch the pages above (about 35 requests, under 2 seconds) and the `location` rows.
2. For each place in `src/places/sources.ts`, build `regular_service_hours` for the next seven days, starting today. Each day comes from the shortest UHD date range that covers it and lists the place, so a break week replaces the semester hours for the days it covers and the app shows breaks without an update. Food trucks without a UHD row use their Unions weekly hours, closed on days inside a UHD range named "Break", because the Unions page says trucks close for breaks. A day no range covers (UT has not posted next semester yet) keeps its current hours. Midnight is stored as 2359, as the dashboard does.
3. Payment methods come from the UHD page of each place. Bevo Pay is gone since August 2026, so it drops out of every synced place.
4. Only rows that changed are written, with `ENABLE_SUPABASE=true`. Without it the run only prints what would change.
5. `data/places.json` has the computed week for every place, and `data/places-health.json` and `places-health.md` list what needs a person:
   - **New on UT's sites**: a place on a UHD list, the Unions truck list or the hours table that `sources.ts` does not know. Add it with `pnpm -s admin locations create --file <place.json>`, then a line in `sources.ts`.
   - **No longer listed by UT**: a place in `sources.ts` that UT dropped. Check whether it closed.
   - **Missing from the app**: a name in `sources.ts` with no `location` row of that name. `sources.ts` matches rows by name, so renaming a place in the dashboard needs the same change there.
   - **Pages the scraper could not read** and **pages that failed to load**: these make the run exit 1, and nothing is written for the place they belong to.

`scraper-dev.yml` turns that report into one issue labeled `places-health`, assigned to the repo owner, through `scripts/ci/health-issue.sh`. It comments only when the report changed and closes the issue on the first clean run. New, missing and dropped places open the issue without failing the job.

To stop syncing a place, remove its line from `sources.ts`; its hours then stay as they are and can be edited in the dashboard again. Edits in the dashboard to a synced place are overwritten on the next run.
