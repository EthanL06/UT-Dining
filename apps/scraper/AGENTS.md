# apps/scraper

Daily FoodPro menu scraper, plus the sync of UT-run restaurants, cafés, markets and food trucks (`src/places/`, run with `pnpm --filter @ut-dining/scraper places`). Read the root `AGENTS.md` first, then `README.md` here, which explains the configuration and how a run works.

- It uploads only with `ENABLE_SUPABASE=true`. Leave that unset unless `SUPABASE_URL` is the local `http://127.0.0.1:` API from `make db-status`. Without it a run is a dry run that writes `data/*.json`.
- Parsing lives in `src/parse.ts` with tests in `src/parse.test.ts`. A parser change needs a test built from a saved FoodPro HTML snippet, not a live request.
- `src/config.ts` reads `SUPABASE_URL`, `SUPABASE_KEY` and `DAYS_TO_SCRAPE`; `.github/workflows/scraper.yml` maps the repo secrets `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` onto them. Keep the two in step.
- `scraper-dev.yml` scrapes into the hosted dev project on pushes to `staging` that touch the scraper. The daily production cron only runs from `main`.
- `src/health.ts` decides whether FoodPro still parses. "No Data Available" means UT posted no menu and is never a failure. When the parser changes, keep `health.test.ts` passing so a real layout change still opens the `scraper-health` issue.
- `src/export.ts` publishes the open data repo (`ut-dining-data`) after each scrape; it only reads. `open-data/README.md` is that repo's README and schema, so keep it in step with `src/export/build.ts`. See "Open data export" in `README.md`.
- `src/places/` keeps hours and payment methods of UT-run places in step with housing.utexas.edu and universityunions.utexas.edu. `sources.ts` maps each app location name to its UT pages; it matches `location` rows by name. Parser changes need a test in `places.test.ts` built from a saved HTML snippet. Never point it at production from a session: without `ENABLE_SUPABASE=true` it only reads and prints. See "Restaurants, cafés, markets and food trucks" in `README.md`.
