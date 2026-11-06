# Mobile E2E tests (Maestro)

End-to-end flows for the iOS app, written for [Maestro](https://docs.maestro.dev). They drive the development build of `com.ethanl06.ut-dining.dev` on the iOS Simulator against local Supabase.

## Run

Needs macOS with Xcode, Docker, Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`, which needs Java 17+) and a simulator with the development client installed (`pnpm dev:ios`).

```sh
pnpm db:start
pnpm e2e:ios --sim <UDID>
pnpm e2e:ios --sim <UDID> apps/mobile/e2e/flows/favorites.yaml
pnpm e2e:ios --sim <UDID> --include-tags smoke
pnpm e2e:ios --sim <UDID> --shards 3
```

`scripts/qa/mobile-e2e.sh` loads the fixture menus into local Supabase (`scripts/qa/e2e-load-fixtures.ts`), points `apps/mobile/.env.local` at it, boots the simulator in light appearance, starts Metro when it is not running, runs Maestro, and stops what it started. The JUnit report, screenshots and Maestro logs go to `.context/maestro/<time>/`. Pass `--release` when the simulator has a release build of the dev bundle id instead of a development client. Pass `--shards <n>` to split the flows across n simulators at once: the extra ones are clones of `--sim` with the app already installed, and the script deletes them when it finishes. Each simulator needs about 2 GB of free RAM.

It refuses to run unless `supabase status` reports a `http://127.0.0.1:` API URL, so fixtures never reach the hosted projects.

## Test data

`fixtures/menus.json` defines menus for J2 Dining from yesterday to three days ahead (Central time). `scripts/qa/e2e-fixtures.ts` turns it into the scraper's upload shape, and `scripts/qa/e2e-load-fixtures.ts` sends that through the same `insert_multiple_locations_and_menus` function the scraper uses. It replaces any J2 menus on those days and is safe to run again.

`fixtures/base.json` is a snapshot of what the anon role reads from the seeded tables (locations, location types, app information, notifications). Refresh it after a change to `supabase/seed.sql` or to those tables' columns.

| Item | Where |
| --- | --- |
| Maestro Veggie Burger, Maestro Grilled Chicken | Maestro Grill, every meal and day |
| Maestro Garden Salad, Maestro Tofu Bowl | Maestro Greens, every meal and day |
| Maestro Breakfast Tacos | Maestro Grill, Breakfast only |
| Maestro Tomorrow Special | Maestro Grill, tomorrow only |

## Flows

| Flow | Checks |
| --- | --- |
| `onboarding.yaml` | Onboarding steps, Finish lands on Home, a relaunch skips onboarding |
| `location-menu.yaml` | J2 menu shows categories and items, a category collapses and expands |
| `menu-search.yaml` | Search narrows the menu, a miss shows the empty state, Cancel clears it |
| `menu-meals-and-dates.yaml` | The meal picker switches menus, and the week strip (`menu-day-<offset>`) loads tomorrow's menu |
| `food-details.yaml` | A food opens nutrition and allergens |
| `save-hold-and-select.yaml` | Press and hold on a food adds it to the meal plan, Select Multiple adds several foods at once, and Reset empties the plan |
| `favorites.yaml` | Heart on a food and a left swipe add favorites, left swipes remove them |
| `meal-plan.yaml` | A right swipe and the chef hat add to the meal plan, right swipes remove |
| `settings.yaml` | Dark mode switch, Sync Data, Favorites quick link |
| `filters.yaml` | Hiding soy removes the soy foods from the J2 menu, and Reset brings them back |
| `no-menu-location.yaml` | Search opens a place without a menu, which shows Directions and Hours |
| `map.yaml` | The map sheet filters to dining halls, opens J2's place card and its menu, and closes the card |
| `tabs.yaml` | Every tab by its `testID` (`home-tab`, `map-tab`, `notifications-tab`, `settings-tab`, `search-tab`), with the search tab last because opening it collapses the other tabs |
| `search.yaml` | The search tab finds a food on today's menus and opens it, and a miss shows the empty state |
| `meal-strip.yaml` | When a dining hall is serving a meal, the strip opens its menu, and its x hides it after a relaunch. Skipped when no meal is being served at run time |

Every flow except `onboarding.yaml` starts from a clean install on Home (`subflows/start.yaml`: clear state, open Metro, skip onboarding). It opens `ut-dining://e2e-setup`, which marks onboarding done only in the dev bundle id (`com.ethanl06.ut-dining.dev`) and then goes Home. Flows tagged `smoke` are the short set.

## Writing flows

- Match on visible text when it is stable. For icon buttons, use the `testID` on the component (`back-button`, `location-favorites-button`, `food-favorite-button`, `food-meal-plan-button`, `menu-day-1`, `select-done-button`, `select-add-meal-plan-button`, `menu-search-input`, `settings-dark-mode-switch` and others).
- Use the fixture items, never scraped menus, so a flow does not depend on what UT serves that day.
- Run one flow with `maestro test <file>` while you write it, and `maestro studio` to inspect the screen.

## CI

`.github/workflows/mobile-e2e.yml` runs the suite on GitHub macOS runners: one job builds the release simulator app (or finds it in the cache), then three jobs split the flows, and a `Maestro on iOS` job reports the combined result. It runs only on pull requests from `staging` into `main`, and can be started by hand from the Actions tab. macOS runners have no Docker, so the app points at `scripts/qa/e2e-fixture-server.ts` and each job runs `mobile-e2e.sh --release --fixture-server --retry-failed <its flows>`, which runs any failed flows once more in a fresh Maestro session. The runner is slow and its XCTest driver sometimes dies, so one retry keeps those from failing the check; a flow that fails twice is a real failure. A flow that passes only on the retry shows up as a "Flaky" warning on the run, so fix it instead of letting the retry hide it. The shards are balanced by how long each flow takes: `SHARD_1_FLOWS` and `SHARD_2_FLOWS` in the workflow name theirs, and shard 3 runs every other flow, so a new flow lands there until you move it. The fixture server answers the Supabase REST reads the app makes (`select`, `eq`, `in`, `order`, `offset`, `limit`) from `base.json` and `menus.json`, with the same rows and columns local Supabase returns. If the app starts using another table or filter, add it to the server, or the CI run fails with a 400 or 404 from it.

To run the same thing on a Mac without Docker, build the app with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331` and pass `--fixture-server`.
