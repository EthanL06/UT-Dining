![UT Dining Logo](https://github.com/user-attachments/assets/21c5d1d5-e0c2-41d6-b171-79f8364bd050)

# UT Dining

UT Dining is your companion app for exploring dining options at the University of Texas at Austin.
Browse menus, check dining hours, and find the perfect meal on campus.

> This project has been adopted by [Longhorn Developers](https://github.com/Longhorn-Developers). Originally created by [Ethan Lanting](https://github.com/EthanL06).

<a href="https://apps.apple.com/us/app/ut-dining/id6743042002">
   <img alt="Download on the app store" src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" height="48">
</a>

![UT Dining App Screenshot](https://github.com/user-attachments/assets/04b49653-3202-43ce-8ecc-7a19fed814ce)

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [How it Works](#how-it-works)
4. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [VSCode Extensions](#vscode-extensions)
   - [Installation](#installation)
5. [Project Structure](#project-structure)
6. [Contributing](#contributing)
7. [Frequently Asked Questions](#frequently-asked-questions)
8. [Related Repositories](#related-repositories)
9. [License](#license)

## Features

- **Real-time Menu Updates**: View current menus for UT Austin dining locations
- **Menu History & Planning**: View past menus and upcoming menus for the week
- **Interactive Campus Map**: Find and navigate to dining halls, food trucks, microwaves, coffee shops, and convenience stores across campus
- **Favorites**: Save your favorite food items and get notified when they appear on menus
- **Meal Planning**: Create daily meal plans with nutrition tracking
- **Allergen Information**: Filter food items based on dietary restrictions and allergens
- **Comprehensive Location Info**: Check operating hours, payment methods, and real-time status for all dining locations
- **Push Notifications**: Stay updated with the latest dining alerts and updates
- **Offline Support w/ Caching**: Access menus, location info, and your favorites even without an internet connection
- **Accessibility Features**:
  - Dark Mode: Enhanced visibility in low-light conditions
  - Color Blind Mode: Improved color accessibility
  - Colloquial Names: Toggle between official and common location names

## Tech Stack

- **Framework**: [Expo](https://expo.dev/) + [React Native](https://reactnative.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Global State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**:
  - Remote: [Supabase](https://supabase.com/)
  - Local: [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) with [Drizzle ORM](https://orm.drizzle.team/) (learn more [here](https://expo.dev/blog/modern-sqlite-for-react-native-apps))
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Persistent Storage**: [MMKV](https://github.com/mrousavy/react-native-mmkv)
- **Analytics**: [PostHog](https://posthog.com/) with session replay and auto-capture
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **Icons**: [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native)
- **Code Quality**: [Biome](https://biomejs.dev/) for formatting and linting

## How it Works

<img src="https://github.com/user-attachments/assets/f1264b22-d0ad-44e8-9342-ec53ec94d37b"><br>

At the core of the system is a scheduled **GitHub Actions** workflow that runs every day at 7:00 AM UTC _(or 1:00 AM CST)_. It is responsible for scraping the dining menus from UT Austin, sourced from [this page](https://hf-foodpro.austin.utexas.edu/foodpro/location.aspx). Once the menus are scraped, the data is stored in a **Supabase** database. The web scraper lives in [`apps/scraper`](apps/scraper).

Every 24 hours, the **Expo** mobile application fetches the latest menu data from the database, keeping the application up-to-date. To optimize performance and reduce loading times, the data is cached locally in an **SQLite** database using **Drizzle ORM**. This local cache allows the app to quickly retrieve the necessary information, ensuring a smooth, **offline-first** user experience.

## Getting Started

UT Dining is a monorepo: the mobile app, the admin dashboard, the website, the menu scraper and the shared database types live in this one repository, managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turborepo.com).

### Prerequisites

- macOS or Linux with `make` and `git` (on macOS they come with the Xcode Command Line Tools)
- [Node.js](https://nodejs.org/) 24 (22.18 or newer works). `.node-version` is read by fnm, mise and nvm, and `make setup` installs it through any of them.
- [Docker Desktop](https://docs.docker.com/get-docker/) or [OrbStack](https://orbstack.dev) for the local Supabase database
- For the mobile app: Xcode with an iOS Simulator (or Android Studio), CocoaPods and, for E2E tests, [Maestro](https://docs.maestro.dev)

pnpm, the Supabase CLI, Biome and the git hooks are installed for you.

### Quick start

```sh
git clone https://github.com/<your-username>/UT-Dining.git
cd UT-Dining
make setup   # one command: deps, env files, local Supabase, a few days of real menus
make dev     # dashboard, website and Metro together
```

`make setup` is safe to re-run: it keeps your `.env.local` files and the data in your local database, and only does what is missing. It never prompts, so agents and CI can run it too. It starts Docker if it is installed but not running. If another project already uses Supabase's default ports (54321 and up), it picks a free range and saves it in the gitignored `supabase/.env`; `make db-status` prints the real URLs.

Pick the database with `DB=`:

| Command                                      | Database                                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make setup`                                 | Local Supabase when Docker is installed, otherwise the hosted dev project when `SUPABASE_DEV_URL`, `SUPABASE_DEV_ANON_KEY` and `SUPABASE_DEV_SERVICE_KEY` are set. If the apps already point at a hosted project, they keep it. |
| `make setup DB=local` / `DB=dev` / `DB=none` | Force one                                                                                                                                                                                                                       |
| `make setup SEED=0`                          | Skip scraping menus                                                                                                                                                                                                             |

Nothing ever points at the production Supabase project: `scripts/env.ts` refuses to write it, `make setup` switches away from it, and `make doctor` fails when an app uses it.

When something looks off, run `make doctor`. It checks Node, pnpm, dependencies, git hooks, Docker, local Supabase, where each app's `.env.local` points, running dev servers and, on macOS, Xcode, CocoaPods, Maestro and which simulators have the development build. It exits with an error when a required check fails.

### Mobile app

The app uses native modules (MMKV, SQLCipher), so it runs in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go.

```sh
make sim                     # boot a simulator (one with the dev build if there is one) and open it
make ios                     # build and install the development build, then start Metro
make ios SIM="iPhone 17"     # same, on a named simulator or UDID
make mobile                  # only Metro, for a development build that is already installed
make mobile ARGS=--tunnel    # reach Metro from a phone on another network
make sims                    # list simulators and which have the development build
```

No Mac? Build the development build in the cloud with `npx eas-cli build --profile development --platform ios` from `apps/mobile`, install it on your iPhone, then use `make mobile ARGS=--tunnel`.

While Metro runs, press `Shift + M` and pick `expo-drizzle-studio-plugin` to inspect the local SQLite cache.

### Everyday commands

Run `make` (or `make help`) for the full list. Variables go after the target, for example `make db-seed DAYS=5`.

| Command                                           | What it does                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `make dev`                                        | Start local Supabase if the apps use it, then the dashboard (:3000), website (:3001) and Metro (:8081)  |
| `make dashboard` / `make website` / `make mobile` | Start one of them                                                                                       |
| `make scrape`                                     | Run the scraper once with `apps/scraper/.env.local`                                                     |
| `make check`                                      | Lint, format check, typecheck and tests for everything. Run it before you push.                         |
| `make fix`                                        | Apply Biome's safe lint and format fixes                                                                |
| `make typecheck` / `make test` / `make build`     | One step of the checks                                                                                  |
| `make db-up` / `make db-down`                     | Start or stop local Supabase (data is kept), and point the apps at it                                   |
| `make db-status`                                  | Local URLs and how many locations and menus are loaded                                                  |
| `make db-seed DAYS=3`                             | Scrape real UT menus into the local database                                                            |
| `make db-fixtures`                                | Load the fixed E2E test menus instead                                                                   |
| `make db-reset`                                   | Rebuild the local database from migrations and `supabase/seed.sql`                                      |
| `make db-new NAME=add_meal_notes`                 | Create a migration in `supabase/migrations`                                                             |
| `make db-migrate`                                 | Apply new migrations without dropping data                                                              |
| `make db-types`                                   | Regenerate `@ut-dining/supabase` from the local database                                                |
| `make db-psql` / `make db-studio`                 | Open psql or Supabase Studio on the local database                                                      |
| `make env-local` / `make env-dev`                 | Point every app at local Supabase or the hosted dev project                                             |
| `make e2e SIM=<UDID>`                             | Run the Maestro flows (see [apps/mobile/e2e](apps/mobile/e2e/README.md))                                |
| `make worktree NAME=feat-x`                       | New git worktree in `.worktrees/feat-x` from `origin/staging`, with env files and dependencies          |
| `make clean`                                      | Stop Metro, delete leftover E2E simulator clones, remove clean and pushed worktrees, clear build caches |
| `make stop`                                       | End of the day: stop Metro and local Supabase and shut down every simulator                             |

The `pnpm` scripts in `package.json` (`pnpm check`, `pnpm db:reset` and so on) still work; the Makefile is a front door over them.

Commits are checked by commitlint and staged files are formatted by Biome through [Lefthook](https://lefthook.dev) hooks, installed automatically by `pnpm install`.

### Editor

Install the recommended VS Code extensions: [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) and [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss).

## Project Structure

```txt
UT-Dining/
├── apps/
│   ├── mobile/            # Expo app (Expo Router, NativeWind, Drizzle + SQLite, EAS config)
│   ├── dashboard/         # Admin dashboard (Next.js + Mantine, deployed on Vercel)
│   ├── website/           # Public website and privacy policy (Next.js static export, GitHub Pages)
│   └── scraper/           # Daily menu scraper (Node, runs on GitHub Actions at 07:00 UTC)
├── packages/
│   ├── core/              # @ut-dining/core: shared hours, open/closed status and Central-time logic
│   ├── supabase/          # @ut-dining/supabase: generated database types shared by all apps
│   └── tsconfig/          # @ut-dining/tsconfig: shared TypeScript presets
├── supabase/              # Supabase config, migrations, seed data and edge functions
├── scripts/
│   ├── dev/               # what the Makefile runs: setup, doctor, database, simulators, cleanup
│   └── qa/                # Maestro E2E runner and fixtures
└── Makefile               # every setup and daily command: run `make`
```

## Frequently Asked Questions

### General

**Q: Is this app officially affiliated with UT Austin?**  
A: No, this is a student-created project that aims to improve the dining experience at UT Austin. While we use publicly available data from UT's University Housing and Dining, we are not officially affiliated with the university (yet 👀).

**Q: Where does the menu data come from?**  
A: The menu data is scraped daily from [UT Austin's official dining page](https://hf-foodpro.austin.utexas.edu/foodpro/location.aspx) using the scraper in [`apps/scraper`](apps/scraper).

**Q: How often is the menu data updated?**  
A: The menu data is updated every day at 1:00 AM CST (7:00 AM UTC) to ensure you have the most current information.

### Development

**Q: Do I need to run the scraper to test the app locally?**  
A: No, you can develop and test the app without running the scraper, but we highly recommend you do to be able to fully test all of the app's features. To work with real menu data, run `make db-seed` (`make setup` already scrapes a few days).

**Q: What is local Supabase development and why do I need it?**  
A: Local Supabase development means running Supabase on your own computer instead of using a hosted service. This gives you:

- A completely isolated development environment
- Freedom to experiment without affecting production data
- No need for external credentials or API keys
- Faster development since you're working with a local database

The setup requires Docker Desktop and Supabase CLI, but once configured, it provides a full Supabase environment including database, authentication, and real-time features. Check the [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development) docs for more details.

**Q: Why can't I use Expo Go?**  
A: The app uses [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) for storage, which requires native code. Expo Go doesn't support native modules, so you need to use a development build instead.

**Q: I'm getting SQLite errors, what should I do?**  
A: Make sure you're using a development build and not Expo Go. If the error persists, try:

1. Delete the app from your device/emulator
2. Rebuild using `make ios` or `make android`
3. If issues continue, check Drizzle Studio (press `Shift + M` in terminal) to inspect the database

**Q: How do I test admin features?**  
A: Admin features can be tested by:

1. Setting up the [UT Dining Dashboard](https://github.com/EthanL06/ut-dining-dashboard) locally
2. Using the same Supabase credentials from your local instance
3. Accessing the dashboard through your web browser

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a branch named `<type>-<description>` using a conventional commit type (`git checkout -b feat-meal-reminders`)
3. Commit your changes using [conventional commit messages](https://www.conventionalcommits.org/):

   ```sh
   feat: add new feature
   fix: resolve issue with X
   docs: update documentation
   style: format code (no functional changes)
   refactor: restructure code without changing behavior
   test: add or update tests
   chore: update dependencies or configuration
   ```
4. Run `make check`, then push the branch (`git push origin feat-meal-reminders`)
5. Open a Pull Request

## Deployments

- **Mobile app**: EAS builds from `apps/mobile`.
- **Scraper**: `.github/workflows/scraper.yml` runs `pnpm --filter @ut-dining/scraper start` daily at 07:00 UTC, and on demand from the Actions tab. It reads `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` from repository secrets.
- **Dashboard**: Vercel project with root directory `apps/dashboard`.
- **Website**: `.github/workflows/website-deploy.yml` builds `apps/website` and publishes it to the `gh-pages` branch of [Longhorn-Developers/ut-dining-website](https://github.com/Longhorn-Developers/ut-dining-website), which keeps the existing GitHub Pages URL (the App Store privacy-policy link points there).

## License

This project is licensed under the MIT License.

You are free to use, modify, and distribute this software under the terms of the MIT License. See the [LICENSE](https://github.com/Longhorn-Developers/UT-Dining/blob/main/LICENSE) file for more details.
