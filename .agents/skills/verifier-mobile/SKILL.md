---
name: verifier-mobile
description: Verify changes to the UT Dining iOS app (apps/mobile, Expo SDK 58 development build) on the iOS Simulator - screens render in light and dark mode, flows work, no red screens or crashes. Use for changes under apps/mobile/** or packages/core/** that a user can see or touch. Needs macOS with Xcode.
---

# verifier-mobile

## Setup

1. macOS with Xcode. On Linux, or with no Xcode, this verifier is BLOCKED; say so and ask for a run on Ethan's Mac.
2. Data: start local Supabase (verifier-data setup steps 2 and 3) and run `node scripts/env.ts --local`, which writes `apps/mobile/.env.local` with `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`. The Simulator reaches the Mac's localhost. For menus, run the scraper once against local Supabase (verifier-data step 5). Never point the app at production.
3. A booted simulator: `xcrun simctl list devices booted`. If none, boot one: `xcrun simctl boot "iPhone 17 Pro"` (any recent iPhone in `xcrun simctl list devices available`) and `open -a Simulator`.
4. A development build of the worktree under test. When the change touches native code, `app.config.js` or a native dependency, or when the dev app is not installed (`xcrun simctl get_app_container booted com.ethanl06.ut-dining.dev` fails), build and install it: `pnpm --filter @ut-dining/mobile ios > "$run/build.log" 2>&1` (it runs `expo run:ios` with `APP_VARIANT=development` and takes several minutes). For a JS-only change the installed build is enough.
5. Start Metro for the worktree: `pnpm --filter @ut-dining/mobile start --port 8081 > "$run/metro.log" 2>&1 &`. Save the PID. Wait for `curl -sf http://localhost:8081/status` to answer `packager-status:running` (at most 90 s).
6. Open the app: `xcrun simctl launch booted com.ethanl06.ut-dining.dev`. On first launch the dev client shows its launcher; connect it to `http://localhost:8081`, or open `xcrun simctl openurl booted "exp+ut-dining://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"`. Finish onboarding once with taps, since a fresh install starts there.

## Steps

1. For each screen the claim names, open it with a deep link on the `ut-dining` scheme: `xcrun simctl openurl booted "ut-dining://<path>"`. Routes: `/` (home), `/map`, `/notifications`, `/settings`, `/favorites`, `/meal-plan`, `/location/<location name, URL-encoded>` for dining halls, `/location_generic/<name>` for other places, `/food/<food>`. Else get there by the flow.
2. Screenshot each state: `xcrun simctl io booted screenshot "$run/<claim>-<state>.png"`. For light and dark: `xcrun simctl ui booted appearance light|dark`, and also flip the in-app dark mode toggle in Settings, because the app keeps its own theme setting and the native tab bar must follow it.
3. There is no tap-flow runner set up yet (no Maestro). Do taps by hand through the Simulator only when a human or a computer-use tool is driving; otherwise mark the tap part BLOCKED and say so.
4. Read the logs for red screens, errors and crashes made during the run: `$run/metro.log`, and the device log for the app's executable (find it with `xcrun simctl listapps booted | grep -A12 com.ethanl06.ut-dining.dev | grep CFBundleExecutable`): `xcrun simctl spawn booted log show --last 5m --predicate 'process == "<executable>"' > "$run/device.log"`. A red screen, a LogBox error or a crash from this change is a FAIL.

## Teardown

Stop the Metro PID you started. Leave the simulator booted and the app installed.

## Result

PASS, FAIL or BLOCKED for each claim, with screenshots and log paths.

## Track record
