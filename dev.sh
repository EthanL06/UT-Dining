#!/usr/bin/env bash
# Start a UT Dining app or service.
#
#   ./dev.sh                 pick from a menu
#   ./dev.sh mobile          Expo dev server for the development build
#   ./dev.sh mobile --tunnel same, reachable from a phone on any network (ngrok)
#   ./dev.sh ios | android   build and install the development build on a simulator or device
#   ./dev.sh dashboard       admin dashboard on http://localhost:3000
#   ./dev.sh website         public website on http://localhost:3001/ut-dining-website
#   ./dev.sh scrape          run the menu scraper once
#   ./dev.sh db              start local Supabase and point the apps at it
set -euo pipefail
cd "$(dirname "$0")"

run() {
  local target="$1"
  shift || true
  case "$target" in
    mobile) exec pnpm --filter @ut-dining/mobile start "$@" ;;
    ios) exec pnpm --filter @ut-dining/mobile ios "$@" ;;
    android) exec pnpm --filter @ut-dining/mobile android "$@" ;;
    dashboard) exec pnpm --filter @ut-dining/dashboard dev "$@" ;;
    website) exec pnpm --filter @ut-dining/website dev --port 3001 "$@" ;;
    scrape | scraper) exec pnpm --filter @ut-dining/scraper start "$@" ;;
    db) pnpm db:start && exec node scripts/env.ts --local ;;
    *)
      echo "Unknown target: $target" >&2
      exit 1
      ;;
  esac
}

if [[ $# -gt 0 ]]; then
  run "$@"
fi

PS3=$'\nWhat do you want to run? '
options=("Mobile app (Expo dev server)" "Mobile app over a tunnel (phone on another network)" "Build and run on iOS" "Build and run on Android" "Dashboard" "Website" "Scraper (run once)" "Local Supabase")
select choice in "${options[@]}"; do
  case "$REPLY" in
    1) run mobile ;;
    2) run mobile --tunnel ;;
    3) run ios ;;
    4) run android ;;
    5) run dashboard ;;
    6) run website ;;
    7) run scrape ;;
    8) run db ;;
    *) echo "Pick 1-${#options[@]}." ;;
  esac
done
