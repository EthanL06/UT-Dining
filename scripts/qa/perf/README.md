# Mobile timing harness

This harness measures launch, sync and navigation times on a release bundle in a temporary iOS Simulator. It reads from the hosted dev Supabase project only. Do not use it with production.

## Run

1. Get a release `.app` of the development variant. `xcrun simctl get_app_container <udid> com.ethanl06.ut-dining.dev` gives the path of an installed one.
2. Build the two test apps. `build.sh` applies `harness.patch`, builds, and removes the patch when it ends. It stops if `apps/mobile/.env.local` does not point at the dev project.

   ```bash
   PERF_DEV_REF=<dev project ref> scripts/qa/perf/build.sh <base.app> <out dir>
   ```

3. Create and boot a temporary simulator. Do not use a simulator that another session uses.

   ```bash
   xcrun simctl create UT-Perf-temp "iPhone 17 Pro"
   xcrun simctl boot <udid>
   ```

4. Start the proxy, then the runs. The run takes about 15 minutes.

   ```bash
   UP=<dev project URL> OUT=<out dir>/marks.jsonl node scripts/qa/perf/proxy.mjs
   python3 scripts/qa/perf/drive.py <out dir> <udid> <out dir>/marks.jsonl
   python3 scripts/qa/perf/analyze.py <out dir>/marks.jsonl
   ```

5. Stop the proxy and delete the simulator with `xcrun simctl delete <udid>`.

## Network profiles

The proxy has four profiles: `pass`, `slow` (150 ms, 200 KB/s), `blackhole` (no answer) and `fail503`. The proxy uses HTTP/1.1, so the `direct` app measures good-network times.

## Limits

Simulator times are not iPhone times. Compare runs on the same machine. If a code change makes `git apply` fail in `build.sh`, update `harness.patch`.

## Dropped frames

`make frames SIM=<UDID> ARGS="--label <name>"` (`scripts/qa/perf/frames.sh`) measures how smooth the app is, not how fast it loads. It needs a release simulator app of the dev bundle id that reads the hosted dev project (`make ios-app` with `apps/mobile/.env.local` pointing at dev), so menus are real sized.

1. `setup.yaml` in `apps/mobile/e2e/perf` opens `ut-dining://e2e-setup?frames=on`. That turns on `components/qa/FrameMonitor.tsx` (dev bundle id only), which records every UI thread frame (a Reanimated frame callback) and every JS thread frame (`requestAnimationFrame`) into `Documents/frame-log.jsonl` in batches of 500 ms. `?frames=off` turns it off.
2. The script runs each scenario flow (`home-scroll`, `tabs`, `open-place`, `menu-scroll`, `food-sheet`, `favorite`) `--runs` times and saves the wall-clock window of each.
3. `frames.ts` reads the log and reports, per scenario, the median across runs of dropped frames (missed vsyncs), the worst frame and hitch time per second (ms past the frame budget per second, Apple's hitch time ratio), for each thread. `apps/mobile/utils/frameStats.ts` holds the math and its tests.

Compare a base and a change on the same Mac, simulator and day, since the dev menus change daily: run `--label base` on `origin/staging`, swap the JavaScript (`scripts/qa/ios-sim-app.sh --swap <app>`), then run `--label <branch>`.

The Simulator renders at 60 Hz with the Mac's CPU, so it shows regressions and JS thread stalls well but not what a 120 Hz iPhone feels like. For device numbers, record the same flows with Instruments' Animation Hitches template on an iPhone with the dev build.
