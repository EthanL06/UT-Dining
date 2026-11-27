# Local sample data

`make db-fresh` resets local Supabase (migrations plus the locations in `supabase/seed.sql`) and loads this sample data. `make db-sample` loads it again without a reset. It needs no network and refuses any database that is not on `127.0.0.1`, so it can never touch dev or production.

Use it to test the app, the dashboard and the website against known edge cases. For real menus from UT's site use `make db-seed`; the Maestro suite uses `make db-fixtures`.

## What it loads

Menu dates are relative to today in Central time. `SAMPLE_TODAY=2026-12-24 make db-fresh` pins "today" to another date, for example to test a break or a date near midnight UTC.

| Location | Scenario |
|---|---|
| J2 Dining | Open every day, full menus, an empty Breakfast tomorrow and a different Chef's Table dish today and tomorrow (Central time) |
| JCL Dining | Lunch and Dinner only; UT never posted the day after tomorrow |
| Kins Dining | Closed for a break: force closed, menus stop yesterday |
| Wendy's | Late night hours split at midnight (00:00-04:00 and 10:00-23:59), colloquial name Jendy's |
| Gabriel's Café | Closes at 23:59, the last minute of the Central day |
| Papua Coffee | No map pin (no coordinates) |
| Guatemala Love | Food truck closed between semesters: every day closed, no map pin |
| Jester City Market | Colloquial name Jarket, no accepted payment methods listed |

Menus (`data.json` > `menus`):

- J2 Dining: Breakfast, Lunch and Dinner from 2 days ago to 6 days ahead. Tomorrow's Breakfast exists with no categories (UT posted an empty meal). The Chef's Table at Dinner has `Central Today Special` only today and `Central Tomorrow Special` only tomorrow, so a client that uses the UTC date in the evening shows the wrong one. `Allergen Test Kitchen` has a dish with every allergen, a dish with blank nutrition, and `Seasoned Fries`, which also appears under Grill. One Grill dish has a very long name.
- JCL Dining: Lunch and Dinner only, with no menu at all the day after tomorrow (UT never posted it; status pages should show a neutral note, not an error).
- Kins Dining: menus only 2 days ago and yesterday, and force closed (a break).
- The changelog entries from `apps/mobile/e2e/fixtures/changelog.json`.

## Changing it

Add a scenario to `data.json` (a place's `set` is any `location` columns) and a row to the table above in the same PR. Places are matched by exact `name` from `supabase/seed.sql`.
