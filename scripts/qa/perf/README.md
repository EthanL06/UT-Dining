# Mobile timing harness

This harness compares launch, sync and menu times of two or more git refs on release bundles (Hermes bytecode) in a temporary iOS Simulator. It reads from the hosted dev Supabase project only. Do not use it with production. Use it for every performance change: build the base and the change, run them in the same session, and put the table in the PR.

## How it works

- `instrument.mjs` adds the timing code to a checkout of `apps/mobile` with small anchors (a regex that must match exactly once) instead of a patch, so the same harness applies to `staging` and to branches that changed the code around it. It copies `perf.ts` (marks, render counters, JS-thread gaps) and `perf-runs.ts` (the scenarios) to `utils/` and edits `app/_layout.tsx`, the Home screen, `utils/queries.ts`, `services/database/sync.ts`, the menu screen and the Search tab. When an anchor no longer matches, it names the file and the regex; update the regex.
- `build.sh` makes a temporary worktree for each ref, installs dependencies, runs `instrument.mjs`, bundles the JavaScript, compiles it with hermesc and puts it into a copy of a release `.app`. The harness files always come from the current checkout, so every ref gets the same instrumentation.
- `proxy.mjs` receives the marks (`marks.jsonl`) and tells the app which scenario to run. With `PERF_PROXY=1` the apps also send Supabase traffic through it, and `drive.py --profile slow|blackhole|fail503` simulates a bad network.
- `drive.py` installs each app, primes it (a fresh install downloads every menu day), then runs each scenario as a fresh launch. Each app is installed again for every round, and the order of the apps alternates from round to round, to reduce drift.
- `analyze.py` prints a Markdown table: median (min-max, n) for each metric and ref.

## Scenarios

| Scenario | What the app does | Metrics |
|---|---|---|
| `warm` | Launch with a fresh cache. No sync runs (a run that syncs is dropped). | launch to JS start, launch to Home painted |
| `foreground` | When Home is idle, set `lastSupabaseQueryTime` to 0 and toggle `focusManager`, like a return from the background. No data changed. | sync duration, `onDatabaseChange` events received in JS, Home renders and commits, query fetches, longest JS-thread gap (a 16 ms `setInterval`), stall time, sync start to the last Home commit |
| `full` | Clear `menuDayVersions` and run `forceMenuSync` (pull to refresh), so every menu day downloads again. | as `foreground`, plus menu days written and write time |
| `location` | Open the dining hall with the most food today. Then, one at a time: collapse the first category, expand it, favorite the first item (and remove it again), type 3 letters into the menu search, toggle the Vegetarian filter, enter and leave multi-select. | open to list painted; per action the JS time from the call to the painted frame (search minus its 300 ms debounce) and the `FoodItemRow`, `FoodComponent` and `CategoryHeader` renders; medians of 9 direct calls of `getLocationMenuData`, `getLocationMenuNames`, `getLocationIdsWithMenus` and the Search tab query |
| `home` | Fire the 60-second `useNow` tick 5 times, switch the type chip 5 times, open the Map tab 3 times, then type 5 different 3-letter queries into the Search tab. | dispatch to painted, and render to commit of the Home, Map or Search screen |
| `menu` | On the dining hall with the most food today, collapse and expand the top section 5 times, then open the Filters sheet and turn the Vegetarian chip on and off 5 times. | first commit painted (for the chip: the chip's commit), last commit settled, and renders of `FoodItemRow`, `FoodComponent`, `CategoryHeader` and `Chip` |
| `place-first`, `place`, `place-offline` | Open the first place without menus that has a photo, wait for the photo's `onLoad`, close it and open it again. `place-first` must come first after the install, `place` measures a reopen after a relaunch, and `place-offline` runs with the photo requests blocked. | time to `onLoad` (or not shown within 10 s) |

The `prime` run records the data size (food items per day) and the SQLite indexes. React's `Profiler` does not report in release builds, so `usePerfRender` counts renders (function calls) and commits (layout effects), and measures the time from a component's render to its commit (this includes its children, like `actualDuration`). To count another component, add it to `renderCounters` in `instrument.mjs`. Place photos load through the proxy (`/img/`), so `place-offline` can block them.

## Run

1. Build a release `.app`: `make ios-app` writes `.context/app/UTDiningDev.app`. The refs must not change native code, because they all use this native build.
2. Build one app per ref. It stops if `apps/mobile/.env.local` does not point at the dev project.

   ```bash
   make perf-build APP=.context/app/UTDiningDev.app OUT=.context/perf PERF_DEV_REF=<dev project ref> REFS="base=origin/staging head=HEAD"
   ```

   To compare branches that are behind `staging`, first merge each one with `origin/staging` into a local branch, so that only the change differs.

3. Create and boot a temporary simulator. Do not use a simulator that another session uses.

   ```bash
   xcrun simctl create UT-Perf-temp "iPhone 17 Pro"
   xcrun simctl boot <udid>
   ```

4. Start the proxy, then the runs. With the defaults (2 rounds, `--scenarios warm:3,foreground:3,full:3,location:3,home:2`) each ref takes about 8 minutes.

   ```bash
   OUT=.context/perf/marks.jsonl node scripts/qa/perf/proxy.mjs
   python3 scripts/qa/perf/drive.py .context/perf <udid> .context/perf/marks.jsonl base head --rounds 2
   python3 scripts/qa/perf/drive.py .context/perf <udid> .context/perf/marks.jsonl base head --rounds 5 --scenarios place-first:1,place:4,place-offline:1
   python3 scripts/qa/perf/analyze.py .context/perf/marks.jsonl
   ```

   Apps built with `PERF_PROXY=1` also need `UP=<dev project URL>` on the proxy.

5. Stop the proxy and delete the simulator with `xcrun simctl delete <udid>`.

## Limits

Simulator times are not iPhone times. Compare refs only within one session on one machine, and report the machine, the simulator and the iOS version with the numbers. Dev Supabase menus change when the scraper runs (1 AM and 9 AM Central); a run across a scrape compares different data.
