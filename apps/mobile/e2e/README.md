# Mobile E2E tests (Maestro)

End-to-end flows for the iOS app, written for [Maestro](https://docs.maestro.dev). They drive the development build of `com.ethanl06.ut-dining.dev` on the iOS Simulator against local Supabase.

## Run

Needs macOS with Xcode, Docker, Maestro (`curl -fsSL https://get.maestro.mobile.dev | bash`, which needs Java 17+) and a simulator with the development client installed (`make ios`). `make doctor` checks all of this.

```sh
make db-up
make e2e SIM=<UDID or name>
make e2e SIM=<UDID> ARGS=apps/mobile/e2e/flows/favorites.yaml
make e2e SIM=<UDID> ARGS="--include-tags smoke"
make e2e SIM=<UDID> ARGS="--shards 3 --retry-failed"
make e2e-fixtures SIM=<UDID>
make clean-sims
```

`make e2e` runs `scripts/qa/mobile-e2e.sh` (also `pnpm e2e:ios`), and `ARGS` passes straight through to it. `make clean-sims` deletes shard clones a cancelled run left behind.

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

## Regression QA (`make qa`)

`apps/mobile/e2e/qa` holds flows for bugs agents fixed by hand in the Simulator, so they stay fixed. They run on the sample data from `scripts/dev/sample/data.json` (the same as `make db-fresh`) at fixed Central times, so the result does not depend on the hour or the Mac's time zone.

```sh
make qa SIM=<UDID>
make qa SIM=<UDID> ARGS=apps/mobile/e2e/qa/central-time.yaml
make qa SIM=<UDID> ARGS=--fixture-server
```

`make qa` is `scripts/qa/mobile-e2e.sh --suite qa`: it loads the sample data into local Supabase (`scripts/dev/sample/load.ts`), or, with `--fixture-server`, serves it from `scripts/qa/e2e-fixture-server.ts <port> sample` and starts its own Metro with `EXPO_PUBLIC_SUPABASE_URL` pointed there (pass a `--port` no other Metro uses). That mode leaves the shared local Supabase untouched.

The clock: `subflows/start-at.yaml` opens `ut-dining://e2e-setup?clock=HH:MM`, which sets the dev app's clock to that Central time on today's Central date (`days=N` moves the date). It patches `Date` in the dev bundle only (`apps/mobile/utils/qaClock.ts`), keeps running from there, and survives a relaunch, so a flow can step through times with `subflows/set-clock.yaml`. Start flows with `PERMISSIONS: unset` to see the iOS permission prompts, and `RATING: 'on'` to keep the rating prompt armed.

| Flow | Guards |
| --- | --- |
| `central-time.yaml` | At 8:30 PM Central (already the next day in UTC): Good Evening, J2 and JCL open until 9:00 and 8:00 PM, Kins temporarily closed, Today and Tomorrow show their own Chef's Table dish, Yesterday label (PRs 98, 104) |
| `hours-and-greeting.yaml` | Wendy's 00:00 to 04:00 range at 2 AM, Gabriel's open until 11:59 PM, Good Morning until noon (PRs 98, 118) |
| `permissions-onboarding.yaml` | Onboarding asks for location and notifications only on its Permissions page (PR 98) |
| `permissions-map.yaml` | Home asks for nothing; the Map tab asks for location when opened (PR 98) |
| `settings-permissions.yaml` | Settings shows Off, asks, and refreshes to On (PR 98) |
| `colloquial-names.yaml` | With colloquial names on, the map opens Jarket's Details, map search finds Wendy's by its location name, and search finds Jendy's (PRs 98, 106) |
| `past-day-and-selection.yaml` | Changing the day or the meal ends Select Multiple; a past day offers favorites only (PR 98) |
| `no-menu-days.yaml` | A day UT never posted and a hall on break show No menu for this day instead of another day's food (PR 105) |
| `missing-screens.yaml` | A missing place or food shows a message, not a blank screen or an endless spinner (PRs 98, 99) |
| `map-sheet.yaml` | The map sheet never shows No places match while loading, lists places without a pin, and hides the locate button when tall (PRs 118, 127 rule) |
| `rating-prompt.yaml` | The rating prompt waits for a third launch at least three days after the first (PR 118) |

Not covered by Maestro: a notification tapped while the app was closed (needs a real push), and "scroll only on overflow" (Maestro cannot see bounce). Both stay with manual QA.

CI: add the `qa` label to a pull request, or run Mobile QA from the Actions tab. `.github/workflows/mobile-qa.yml` builds the release app, serves the sample data from the fixture server and runs the suite with `--retry-failed`. It is optional, never a required check. The runner's time zone is UTC, so the Central time flows also catch device time zone bugs there.

## Writing flows

- Match on visible text when it is stable. For icon buttons, use the `testID` on the component (`back-button`, `location-favorites-button`, `food-favorite-button`, `food-meal-plan-button`, `menu-day-1`, `select-done-button`, `select-add-meal-plan-button`, `menu-search-input`, `settings-dark-mode-switch` and others).
- Use the fixture items, never scraped menus, so a flow does not depend on what UT serves that day.
- Run one flow with `maestro test <file>` while you write it, and `maestro studio` to inspect the screen.

## CI

`.github/workflows/mobile-e2e.yml` runs the suite on GitHub macOS runners: one job builds the release simulator app (or finds it in the cache), then three jobs split the flows, and a `Maestro on iOS` job reports the combined result. It runs only on pull requests from `staging` into `main`, and can be started by hand from the Actions tab. macOS runners have no Docker, so the app points at `scripts/qa/e2e-fixture-server.ts` and each job runs `mobile-e2e.sh --release --fixture-server --retry-failed <its flows>`, which runs any failed flows once more in a fresh Maestro session. The runner is slow and its XCTest driver sometimes dies, so one retry keeps those from failing the check; a flow that fails twice is a real failure. A flow that passes only on the retry shows up as a "Flaky" warning on the run, so fix it instead of letting the retry hide it. The shards are balanced by how long each flow takes: `SHARD_1_FLOWS` and `SHARD_2_FLOWS` in the workflow name theirs, and shard 3 runs every other flow, so a new flow lands there until you move it. The fixture server answers the Supabase REST reads the app makes (`select`, `eq`, `in`, `order`, `offset`, `limit`) from `base.json` and `menus.json`, with the same rows and columns local Supabase returns. If the app starts using another table or filter, add it to the server, or the CI run fails with a 400 or 404 from it.

To run the same thing on a Mac without Docker, build the app with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331` and pass `--fixture-server`.

The release app build is `scripts/qa/ios-sim-app.sh` (`make ios-app`), wrapped with caches in `.github/actions/ios-sim-app` for this workflow and the screenshots workflow. It builds arm64 only and keeps the native build in `.context/ios-shell/<native key>/`, where the key hashes the Xcode version, `pnpm-lock.yaml`, the root and app `package.json`, `pnpm-workspace.yaml`, `app.config.js` and `assets/icons`. When one of those changes, Xcode builds everything (about 35 minutes on a runner). The Expo fingerprint was tried first, but it gave different hashes for the same commit on different runners. Otherwise the script copies the saved build and rebuilds only the JavaScript: `expo export:embed`, `hermesc` from the saved build, and the `EXUpdates.bundle` and `EXConstants.bundle` files, the same steps Xcode runs (a few minutes). In CI the native build is cached by that key, and a cache hit on the app sources skips both. On a Mac, `IOS_SHELL_DIR` can point every worktree at one folder of native builds, and `scripts/qa/ios-sim-app.sh --swap <app>` rebuilds the JavaScript of any release `.app` in place. EXPO_PUBLIC_* values are read at bundle time, so build with the same ones the run needs.

## Screenshots

`apps/mobile/e2e/screenshots.txt` lists the screens to capture, one per line: a name, then the deep link path opened as `ut-dining://<path>` (no path means Home). `scripts/qa/mobile-screenshots.sh` (or `make screenshots SIM=<UDID>`) generates a Maestro flow that opens `ut-dining://e2e-setup?theme=light|dark` to skip onboarding and pick the theme, then screenshots each screen in both themes into `.context/screenshots/<name>-<theme>.png`.

Screenshots for a PR come from the Mac Simulator by default. When the Mac is offline, or someone asks for it, add the `screenshots` label to the pull request, and `.github/workflows/mobile-screenshots.yml` runs the same script on a GitHub macOS runner against the fixture server. It runs again on each push while the label stays on, and only for PRs that touch `apps/mobile`, `packages/core`, the lockfile or the screenshot scripts. It also runs after every push to `staging` that touches the app, writing to `assets/staging`, so a break after merging shows up without blocking a PR. It force-pushes the images to the orphan branch `assets/pr-<number>` (with both `vercel.json` files) and writes `index.md` there: a light and dark table to paste into the PR body, also in the run summary. Read it from `https://raw.githubusercontent.com/EthanL06/UT-Dining/assets/pr-<number>/index.md`. Add a line to `screenshots.txt` for each screen a PR changes. Screens that need taps first (the food screen, sheets) are not covered; add a Maestro flow with `takeScreenshot` for those.
