# UT Dining Scraper

Scrapes UT Austin's FoodPro menus, nutrition labels and allergens for the seven UHD locations and writes them to Supabase through the `insert_multiple_locations_and_menus` function.

```sh
pnpm --filter @ut-dining/scraper start   # or ./dev.sh scrape from the repo root
pnpm --filter @ut-dining/scraper test
```

Node runs the TypeScript directly. Environment variables come from `.env` or `.env.local` (written by `./setup.sh` / `pnpm env:local`). In production it runs daily from `.github/workflows/scraper.yml`.

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
5. Upload each location-day as its own transaction, two at a time, so a slow or failed day never blocks the rest. The database function replaces a menu's stations and items when it already exists, so every day in the range is refreshed on every run.

All requests share one pool of `CONCURRENCY` connections with retries and backoff. If a meal's page or any of its labels still fails after retries, that meal is left out of the upload so the previous data stays, and the run exits non-zero.

## Output

The JSON shape, location names, meal names and allergen keys are the same as the previous scraper's, so the database function and the apps need no changes.
