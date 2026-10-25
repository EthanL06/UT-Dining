# UT Dining

pnpm + Turborepo monorepo for the UT Dining iOS/Android app and its services.

## Layout

- `apps/mobile`: Expo SDK 58 app (React Native 0.88, React 19, New Architecture only; Expo Router, NativeWind, Drizzle + expo-sqlite, TanStack Query, Zustand, MMKV). Needs a development build, not Expo Go. EAS config lives here.
- `apps/scraper`: daily menu scraper. Plain ESM TypeScript run directly by Node (no build). Deployed as a Render cron job.
- `packages/supabase` (`@ut-dining/supabase`): generated Supabase types. Regenerate with `pnpm db:types`; never hand-edit.
- `packages/tsconfig` (`@ut-dining/tsconfig`): shared TypeScript presets.
- `supabase/`: the single Supabase project (migrations, seed, Deno edge functions).

## Commands (run from the repo root)

- `./setup.sh`: first-time setup. `./dev.sh [mobile|ios|android|scrape|db]`: run things.
- `pnpm check`: Biome + typecheck + tests. Run it before committing.
- `pnpm fix`: Biome safe fixes.
- `pnpm typecheck`: TypeScript 7 via the `tsgo` alias; `typescript` itself stays on 6.x because Expo tooling needs the JS API.
- `pnpm --filter @ut-dining/<app> <script>`: run one package's script.

## Conventions

- Conventional commits (enforced by commitlint through Lefthook). Branches are `<type>-<kebab-description>`, e.g. `feat-meal-reminders`.
- Biome formats and lints everything: single quotes, 2 spaces, 100 columns.
- Shared versions go in the `catalog:` in `pnpm-workspace.yaml`.
- pnpm uses its default isolated `node_modules`. The app must list every package it imports directly (for example `react-native-css-interop`, which NativeWind's JSX runtime needs).
- Before an Expo SDK bump, run `npx expo install expo@^<sdk> && npx expo install --fix` in `apps/mobile`, then `npx expo-doctor`.
- Env files: each app commits `.env.example`; real values go in the gitignored `.env.local` (written by `scripts/env.ts`). Never commit keys.
- Cloud sessions: the SessionStart hook installs deps and, when `SUPABASE_DEV_*` vars are set, points the apps at the hosted dev Supabase project. Never point a session at production.
