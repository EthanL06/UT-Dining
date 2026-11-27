# apps/mobile

Expo SDK 58 iOS app (Android builds but is not tested). Read the root `AGENTS.md` first. This file says where things are and how data moves, because the code has no comments.

## Data flow

1. Supabase (`utils/supabase.ts`, typed with `@ut-dining/supabase`) is the source of truth. The anon role can read menus from 2 days ago to 3 days ahead (Central time).
2. `hooks/useMenuSync.ts` runs `syncMenuData` in `utils/queries.ts` on launch, on focus and every 30 minutes. `@ut-dining/core` decides whether to sync (`decideSync`) and which menu days to fetch (`planMenuDays`); keep that logic in core, where it has tests.
3. `services/database/database.ts` writes Supabase rows into a local SQLite cache (Drizzle over expo-sqlite, schema in `services/database/schema.ts`). The small tables are replaced every run; menu days are fetched only when their version changed, one transaction per day.
4. Screens read only the SQLite cache, through TanStack Query hooks in `hooks/` (`useMenuData`, `useFoodData`, `useLocationDetails`). After each cache write the sync invalidates every query except `menuSync`, so screens refresh.
5. Device state lives in Zustand stores in `store/`, persisted to MMKV (`store/rnmmkv-storage.ts`): settings (dark mode and the rest), filters, onboarding, data sync versions, changelog, app launch count, and the meal plan (keyed by Central date, past days read-only). Favorites are in SQLite, keyed by item name plus location name.

The app works offline from the cache. Never make a screen query Supabase directly; add the table to the sync instead.

## Where things are

| Path | What |
|---|---|
| `app/` | Expo Router routes. `(tabs)/` is Home (`index`), Map, Notifications, Settings. `location/[location].tsx` is a dining hall menu, `location_generic/` a place with no menu, `food/[food].tsx` one item, plus `favorites`, `meal-plan`, `changelog` |
| `app/e2e-setup.tsx` | Dev-build-only deep link `ut-dining://e2e-setup` that skips onboarding for Maestro. `?theme=dark` sets the theme and `?serviceStatus=degraded` (or `outage`) fakes the live status so the Home banner shows |
| `components/` | Shared UI. `components/sheets/` are react-native-actions-sheet sheets registered in `Sheets.tsx` |
| `services/` | Side effects: database, PostHog analytics, push notifications, App Store version check, rating prompt, changelog (read from the Supabase `changelog` table) |
| `utils/` | Helpers. `time.ts` and `date.ts` wrap `@ut-dining/core` for screens; `filter.ts` is the menu filters |
| `drizzle/` | Generated SQLite migrations for the cache. Change `services/database/schema.ts`, then run `npx drizzle-kit generate` here; it also rewrites `drizzle/migrations.js`. Never edit these by hand |
| `e2e/` | Maestro flows, subflows and fixture menus. See `e2e/README.md` |

## Conventions

- Styling is NativeWind (Tailwind classes). Dark mode is the in-app Settings switch (`useSettingsStore.isDarkMode`, applied with `Appearance.setColorScheme` in `app/_layout.tsx`), not the system setting. Check every UI change in both themes.
- Interactive icons and rows carry a `testID` that Maestro flows use. Keep them when you restyle, and add one when a flow needs to tap something new.
- Release builds merge a touchable's texts into one accessibility label (`"J2 Dining, Closed"`), so Maestro matches names as `'Name(,.*)?'`.
- Imports use the `~/` alias for this folder.
- Haptics go through `utils/haptics.ts` (selection, tap, remove, success, warning, error). Biome rejects a direct `expo-haptics` import anywhere else. Fire `selection` only when a choice actually changes, `success` when an add commits, `remove` when a removal commits, `error` when a refresh or sync fails; plain navigation taps have none.
- Only `services/` (and `utils/supabase.ts` itself) may import Supabase. Biome rejects `~/utils/supabase` and `@supabase/supabase-js` in screens, components, hooks and stores, which keeps the app offline-first.
- Text: every raw string sits inside a `<Text>` (`noReactNativeRawText`). Use the shared typography components rather than React Native's `Text` once they exist; a Biome rule banning raw `Text` outside the typography module comes with them.
- Pure helpers that do not import React Native, Expo or MMKV get a Vitest test next to them (`utils/*.test.ts`); `pnpm --filter @ut-dining/mobile test` runs them in about 1 s with `TZ=America/Chicago`.

## Dev app, PR previews and OTA updates

- `APP_VARIANT` picks the app. Unset (the `production` EAS profile) is the App Store app: bundle `com.ethanl06.ut-dining`, channel `production`, runtime version `appVersion`, prod Supabase. `development` and `preview` are both **UT Dining (Dev)**: bundle `com.ethanl06.ut-dining.dev`, dev Supabase (EAS environments `development` and `preview`), runtime version `fingerprint`, channel `staging`.
- Dev and App Store builds can never share an update: different bundle, different channel, and a fingerprint runtime never equals an `appVersion` one. `scripts/ci/mobile-preview.sh` also refuses the `production` channel and checks the resolved bundle and runtime policy before it publishes.
- OTA updates are on in the dev app only when `DEV_UPDATES=1`: the `preview` profile sets it in `eas.json` (so `eas build` and the EAS worker agree), `scripts/ci/mobile-preview.sh` exports it for `eas update`, and a local device build opts in with it. Local, simulator, E2E and screenshot builds leave it unset, so a test never runs JS downloaded from staging instead of the code under test. The value is part of the fingerprint, so a build and its updates must agree on it; EAS fails the build with "Runtime version mismatch" otherwise.
- `fingerprint.config.cjs` is the default `balanced` preset plus `ExpoConfigExtraSection`, because `extra.gitCommit` changes on every commit. Without it every commit would need a new build.
- `.github/workflows/mobile-preview.yml` runs `scripts/ci/mobile-preview.sh` (`make mobile-preview ARGS="pr <n>"` locally, needs `EXPO_TOKEN`):
  - Push to `staging`: publishes to channel `staging`, so the installed dev app picks the change up on its next launch.
  - A PR: publishes to channel `pr-<n>` and posts one PR comment with the links. QA Menu > Load PR Preview switches the dev app to that channel (`Updates.setUpdateRequestHeadersOverride`), Back to Staging switches it back.
  - Either way, when no `preview` build exists for the iOS fingerprint (native code changed), it starts one on EAS with `--no-wait` and links its install page. PRs opened by bots never start builds. The free plan has 15 iOS builds a month.
- A change to native dependencies, config plugins or native parts of `app.config.js` changes the fingerprint and needs a new build installed before its OTA updates apply.

## Verifying

- Static: `make verify` from the repo root.
- On a Simulator (macOS only): the verifier-mobile skill, or `make e2e SIM=<UDID>` for the Maestro suite.
- A change to native dependencies, `app.config.js` or `eas.json` needs a new development build before anything can be verified.
- The Expo dev client's floating Tools button covers the food screen's top-right icons in dev builds. Turn it off in the dev menu before tapping there; release builds do not have it.
