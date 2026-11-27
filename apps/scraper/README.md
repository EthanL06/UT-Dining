# UT Dining Scraper

Scrapes UT Austin's FoodPro menus, nutrition labels and allergens for the seven UHD locations and writes them to Supabase through the `insert_multiple_locations_and_menus` function.

```sh
pnpm --filter @ut-dining/scraper start   # or make scrape from the repo root
pnpm --filter @ut-dining/scraper test
```

Node runs the TypeScript directly. Environment variables come from `.env` or `.env.local` (written by `make setup` / `make env-local`). `make db-seed DAYS=3` scrapes into local Supabase without touching `.env.local`. In production it runs daily from `.github/workflows/scraper.yml`.

## Configuration

| Variable          | Default | Purpose                                                       |
| ----------------- | ------- | ------------------------------------------------------------- |
| `DAYS_TO_SCRAPE`  | `1`     | Days to scrape, starting today in Central time                |
| `ENABLE_SUPABASE` | unset   | `true` uploads to Supabase; anything else is a dry run        |
| `SUPABASE_URL`    |         | Required when uploading                                       |
| `SUPABASE_KEY`    |         | Service role key, required when uploading                     |
| `CONCURRENCY`     | `32`    | Requests in flight to FoodPro at once                         |
| `START_DATE`      | today   | First day to scrape as `YYYY-MM-DD`, for testing and backfill |

Every run also writes the scraped data to `data/ut_menus_<timestamp>.json`.

## How it works

1. For each day and location, fetch the short menu page and collect the meal links.
2. Fetch each meal's long menu and read its stations, items, recipe numbers and allergen icons.
3. Fetch each recipe's nutrition label once, however many stations, locations or days serve it.
4. Each item's allergens are the union of its menu icons and the ALLERGENS line on its label, because FoodPro's icons sometimes miss allergens the label lists. Vegan and vegetarian are cleared when the label lists an animal allergen.
   When a station lists the same name for more than one recipe, one item is kept with the first recipe's nutrition, every recipe's allergens, and only the dietary flags that all recipes share.
   A nutrient that the label leaves blank is stored as null, not zero.
5. Upload each location-day as its own transaction, two at a time, so a slow or failed day never blocks the rest. The database function replaces a menu's stations and items when it already exists, so every day in the range is refreshed on every run.

All requests share one pool of `CONCURRENCY` connections with retries and backoff. If a meal's page or any of its labels still fails after retries, that meal is left out of the upload so the previous data stays, and the run exits non-zero.

## Health check

Every run also checks that FoodPro still looks the way the parser expects and writes `data/health.json` and `data/health.md`. It tells three cases apart:

- **No menu posted.** FoodPro shows "No Data Available" for the location or meal. This is normal on holidays and breaks and is never a problem. A run where UT posted nothing at all exits 0.
- **Layout changed.** A location page has no meal links and no "No Data Available" note, a meal page links nutrition labels the parser could not turn into items (fewer than half), the meal name cannot be read, or more than a quarter of the nutrition labels come back with no nutrition facts. The run exits non-zero and that meal is not pruned, so the previous data stays.
- **New allergens or icons.** A label lists an allergen, or a menu shows an icon, that the parser has no mapping for.

Pages that fail to load after retries are listed too.

`scraper-dev.yml` runs nightly against the dev project and on every push to `staging`. When the check finds a problem it opens one issue labeled `scraper-health`, assigned to the repo owner, and comments on it on later failing nights. The first clean run closes it. Runs from other branches do not touch issues.

## Output

The JSON shape, location names, meal names and allergen keys are the same as the previous scraper's, so the database function and the apps need no changes.
