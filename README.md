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

At the core of the system is a remote **Render** instance, which is scheduled to run every 24 hours at 7:00 AM UTC _(or 1:00 AM CST)_. This instance is responsible for scraping the dining menus from UT Austin, sourced from [this page](https://hf-foodpro.austin.utexas.edu/foodpro/location.aspx). Once the menus are scraped, the data is stored in a **Supabase** database. The web scraper lives in [`apps/scraper`](apps/scraper).

Every 24 hours, the **Expo** mobile application fetches the latest menu data from the database, keeping the application up-to-date. To optimize performance and reduce loading times, the data is cached locally in an **SQLite** database using **Drizzle ORM**. This local cache allows the app to quickly retrieve the necessary information, ensuring a smooth, **offline-first** user experience.

## Getting Started

UT Dining is a monorepo: the mobile app, the admin dashboard, the website, the menu scraper and the shared database types live in this one repository, managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Turborepo](https://turborepo.com).

### Prerequisites

- [Node.js](https://nodejs.org/) 24 (22.18 or newer works). `.node-version` is read by fnm, mise and nvm.
- [Docker](https://docs.docker.com/get-docker/) if you want a local Supabase database
- An [Expo account](https://expo.dev) and an iOS simulator, Android emulator or phone for the mobile app

pnpm and the Supabase CLI are installed for you.

### Quick start

```sh
git clone https://github.com/<your-username>/UT-Dining.git
cd UT-Dining
./setup.sh   # installs Node deps, writes each app's .env.local, starts local Supabase if Docker is running
./dev.sh     # pick what to run: mobile app, dashboard, website, scraper, local Supabase
```

`setup.sh` points the apps at the hosted dev Supabase project when `SUPABASE_DEV_URL`, `SUPABASE_DEV_ANON_KEY` and `SUPABASE_DEV_SERVICE_KEY` are set, and at a local Supabase otherwise. Run `pnpm env:local` or `pnpm env:dev` to switch later.

To seed your local database with real menus, run the scraper once: `./dev.sh scrape`.

### Mobile app

The app uses native modules (MMKV, SQLCipher), so it runs in a [development build](https://docs.expo.dev/develop/development-builds/introduction/), not Expo Go.

```sh
./dev.sh ios             # build and install the development build on the iOS simulator (macOS)
./dev.sh android         # same for Android
./dev.sh mobile          # start the dev server for an installed development build
./dev.sh mobile --tunnel # reach the dev server from a phone on another network
```

No Mac? Build the development build in the cloud with `npx eas-cli build --profile development --platform ios` from `apps/mobile`, install it on your iPhone, then use `./dev.sh mobile --tunnel`.

While the dev server runs, press `Shift + M` and pick `expo-drizzle-studio-plugin` to inspect the local SQLite cache.

### Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm check` | Lint, format check, typecheck and tests for everything |
| `pnpm fix` | Apply Biome's safe lint and format fixes |
| `pnpm typecheck` | Typecheck every package (TypeScript 7, cached by Turborepo) |
| `pnpm db:start` / `pnpm db:stop` | Start or stop local Supabase |
| `pnpm db:reset` | Re-apply migrations and `supabase/seed.sql` |
| `pnpm db:new <name>` | Create a migration in `supabase/migrations` |
| `pnpm db:types` | Regenerate `@ut-dining/supabase` from the local database |

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
│   └── scraper/           # Daily menu scraper (Node, runs on Render at 07:00 UTC)
├── packages/
│   ├── core/              # @ut-dining/core: shared hours, open/closed status and Central-time logic
│   ├── supabase/          # @ut-dining/supabase: generated database types shared by all apps
│   └── tsconfig/          # @ut-dining/tsconfig: shared TypeScript presets
├── supabase/              # Supabase config, migrations, seed data and edge functions
├── scripts/               # setup and environment helpers
├── setup.sh               # one-time setup
└── dev.sh                 # start an app or service
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
A: No, you can develop and test the app without running the scraper, but we highly recommend you do to be able to fully test all of the app's features. To work with real menu data, run `./dev.sh scrape` against your local Supabase.

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
2. Rebuild using `./dev.sh ios` or `./dev.sh android`
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
4. Run `pnpm check`, then push the branch (`git push origin feat-meal-reminders`)
5. Open a Pull Request

## Deployments

- **Mobile app**: EAS builds from `apps/mobile`.
- **Scraper**: Render cron job running `pnpm --filter @ut-dining/scraper start`.
- **Dashboard**: Vercel project with root directory `apps/dashboard`.
- **Website**: `.github/workflows/website-deploy.yml` builds `apps/website` and publishes it to the `gh-pages` branch of [Longhorn-Developers/ut-dining-website](https://github.com/Longhorn-Developers/ut-dining-website), which keeps the existing GitHub Pages URL (the App Store privacy-policy link points there).

## License

This project is licensed under the MIT License.

You are free to use, modify, and distribute this software under the terms of the MIT License. See the [LICENSE](https://github.com/Longhorn-Developers/UT-Dining/blob/main/LICENSE) file for more details.
