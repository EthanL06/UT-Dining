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
