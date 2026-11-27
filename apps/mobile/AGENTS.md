# apps/mobile

Expo SDK 58 iOS app (Android builds but is not tested). Read the root `AGENTS.md` first. This file says where things are and how data moves, because the code has no comments.

## Data flow

1. Supabase (`utils/supabase.ts`, typed with `@ut-dining/supabase`) is the source of truth. The anon role can read menus from 2 days ago to 3 days ahead (Central time).
2. `hooks/useMenuSync.ts` runs `syncMenuData` in `utils/queries.ts` on launch, on focus and every 30 minutes. `@ut-dining/core` decides whether to sync (`decideSync`) and which menu days to fetch (`planMenuDays`); keep that logic in core, where it has tests.
3. `services/database/sync.ts` writes Supabase rows into a local SQLite cache (Drizzle over expo-sqlite, schema in `services/database/schema.ts`). The small tables are replaced every run; menu days are fetched only when their version changed, one transaction per day.
4. Screens read only the SQLite cache, through TanStack Query hooks in `hooks/` (`useMenuData`, `useFoodData`, `useLocationDetails`). After each cache write the sync invalidates every query except `menuSync`, so screens refresh.
5. Device state lives in Zustand stores in `store/`, persisted to MMKV (`store/rnmmkv-storage.ts`): settings (dark mode and the rest), filters, onboarding, data sync versions, changelog, app launch count, and the meal plan (keyed by Central date, past days read-only). Favorites are in SQLite, keyed by item name plus location name.

The app works offline from the cache. Never make a screen query Supabase directly; add the table to the sync instead.

## Where things are

| Path | What |
|---|---|
| `app/` | Expo Router routes. `(tabs)/` is Home (`index`), Map, Notifications, Settings. `location/[location].tsx` is a dining hall menu, `location_generic/` a place with no menu, `food/[food].tsx` one item, plus `favorites`, `meal-plan`, `changelog` |
| `app/e2e-setup.tsx` | Dev-build-only deep link `ut-dining://e2e-setup` that skips onboarding for Maestro. `?theme=dark` sets the theme and `?serviceStatus=degraded` (or `outage`) fakes the live status so the Home banner shows |
| `components/` | Shared UI. `components/sheets/` are react-native-actions-sheet sheets registered in `Sheets.tsx` |
| `services/database/` | SQLite cache: `sync.ts` (Supabase to SQLite), `menus.ts`, `locations.ts`, `favorites.ts`, `notifications.ts` (reads and writes), `types.ts`, `schema.ts`. `database.ts` re-exports them all, so existing `~/services/database/database` imports keep working |
| `components/qa/` | Sections of the dev-only QA menu (`app/(tabs)/settings/qa.tsx`) |
| `services/` | Side effects: database, PostHog analytics, push notifications, App Store version check, rating prompt, changelog (read from the Supabase `changelog` table) |
| `utils/` | Helpers. `time.ts` and `date.ts` wrap `@ut-dining/core` for screens; `filter.ts` is the menu filters |
| `drizzle/` | Generated SQLite migrations for the cache. Change `services/database/schema.ts`, then run `npx drizzle-kit generate` here; it also rewrites `drizzle/migrations.js`. Never edit these by hand |
| `e2e/` | Maestro flows, subflows and fixture menus. See `e2e/README.md` |

## Conventions

- Styling is NativeWind (Tailwind classes). Dark mode is the in-app Settings switch (`useSettingsStore.isDarkMode`, applied with `Appearance.setColorScheme` in `app/_layout.tsx`), not the system setting. Check every UI change in both themes.
- Every raw string sits inside a `<Text>` (`noReactNativeRawText`), and every label goes through `Text` (and inputs through `TextInput`) from `components/ui/Text.tsx`; Biome blocks importing them from `react-native` anywhere else. Pick a `variant` from the scale (`largeTitle` 34 screen titles, `title1` 28, `title2` 22 sheet and card titles, `title3` 20 section titles and stat values, `headline` 17 semibold, `body` 17, `callout` 16, `subheadline` 15, `footnote` 13, `caption` 12, `caption2` 11, `eyebrow` 12 bold caps, `display` 38 for the day's calorie total) instead of size or `font-*` classes. `emphasized` makes a regular style semibold, `paragraph` adds the relaxed line height for wrapped text, and `tone` (`primary`, `secondary`, `tertiary`, `tint`, `onTint`) or `color` sets the color. Button labels: `subheadline emphasized` up to 44 pt tall, `callout emphasized` at 48 pt, `headline` at 52 pt and up. Font sizes scale with Dynamic Type, so don't set `allowFontScaling={false}`.
- Interactive icons and rows carry a `testID` that Maestro flows use. Keep them when you restyle, and add one when a flow needs to tap something new.
- Release builds merge a touchable's texts into one accessibility label (`"J2 Dining, Closed"`), so Maestro matches names as `'Name(,.*)?'`.
- Imports use the `~/` alias for this folder.
- Haptics go through `utils/haptics.ts` (selection, tap, remove, success, warning, error). Biome rejects a direct `expo-haptics` import anywhere else. Fire `selection` only when a choice actually changes, `success` when an add commits, `remove` when a removal commits, `error` when a refresh or sync fails; plain navigation taps have none.
- Only `services/` (and `utils/supabase.ts` itself) may import Supabase. Biome rejects `~/utils/supabase` and `@supabase/supabase-js` in screens, components, hooks and stores, which keeps the app offline-first.
- Logging goes through `log` in `utils/log.ts`, never `console` (Biome's `noConsole` is an error here). `log.debug` and `log.warn` print only in dev builds; use `warn` for expected failures such as being offline. `log.error` also sends the error to PostHog error tracking in release builds, so keep it for real bugs.
- Errors: `app/_layout.tsx` exports the Expo Router `ErrorBoundary`, which shows `components/AppErrorScreen.tsx` with Try again. A failed SQLite migration shows the same screen with Restart app instead of opening a broken cache. PostHog also captures uncaught exceptions and unhandled rejections (`services/analytics/posthog.ts`).
- Pure helpers that do not import React Native, Expo or MMKV get a Vitest test next to them (`utils/*.test.ts`); `pnpm --filter @ut-dining/mobile test` runs them in about 1 s with `TZ=America/Chicago`.

## Verifying

- Static: `make verify` from the repo root.
- On a Simulator (macOS only): the verifier-mobile skill, or `make e2e SIM=<UDID>` for the Maestro suite.
- A change to native dependencies, `app.config.js` or `eas.json` needs a new development build before anything can be verified.
- The Expo dev client's floating Tools button covers the food screen's top-right icons in dev builds. Turn it off in the dev menu before tapping there; release builds do not have it.
