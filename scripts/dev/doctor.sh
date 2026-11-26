#!/usr/bin/env bash
set -uo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

failures=0
fail_check() { bad "$*"; failures=$((failures + 1)); }

env_value() {
  sed -n "s/^$2=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p" "$1" 2>/dev/null | tail -1
}

describe_url() {
  local url="$1"
  case "$url" in
    "") echo "unset" ;;
    *"$PROD_REF"*) echo "PRODUCTION" ;;
    http://127.0.0.1:* | http://localhost:*) echo "local" ;;
    https://*.supabase.co*)
      local ref="${url#https://}"
      echo "hosted (${ref%%.*})"
      ;;
    *) echo "other ($url)" ;;
  esac
}

step "Toolchain"
if have node; then
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)'; then
    if [[ "$node_major" == "$(cat .node-version)" ]]; then ok "node $(node -v)"; else ok "node $(node -v) (CI uses $(cat .node-version))"; fi
  else
    fail_check "node $(node -v) is too old. Need 22.18+, ideally $(cat .node-version)."
  fi
else
  fail_check "node is not installed. Run: make setup"
fi
wanted_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]" 2>/dev/null || echo "?")"
if have pnpm; then
  if [[ "$(pnpm -v)" == "$wanted_pnpm" ]]; then ok "pnpm $(pnpm -v)"; else warn "pnpm $(pnpm -v), repo pins $wanted_pnpm"; fi
else
  fail_check "pnpm is not installed. Run: make setup"
fi
if [[ -f node_modules/.pnpm/lock.yaml ]] && cmp -s pnpm-lock.yaml node_modules/.pnpm/lock.yaml; then
  ok "dependencies match pnpm-lock.yaml"
elif [[ -d node_modules ]]; then
  warn "dependencies are out of date. Run: make install"
else
  fail_check "dependencies are not installed. Run: make setup"
fi
hooks_dir="$(git rev-parse --git-path hooks 2>/dev/null || echo .git/hooks)"
if [[ -f "$hooks_dir/pre-commit" && -f "$hooks_dir/commit-msg" ]]; then ok "git hooks installed"; else warn "git hooks missing. Run: make install"; fi

step "Database"
local_api=""
if ! have docker; then
  warn "Docker is not installed. Local Supabase needs Docker Desktop or OrbStack."
elif ! docker_ready; then
  warn "Docker is not running. make db-up starts it."
elif db_running && read_local_status; then
  local_api="$API_URL"
  ok "local Supabase running at $API_URL"
else
  warn "local Supabase is not running. Start it with: make db-up"
fi

step "App env files"
check_app() {
  local app="$1" key="$2" file="apps/$1/.env.local" url kind
  if [[ ! -f "$file" ]]; then
    fail_check "$file is missing. Run: make setup"
    return
  fi
  url="$(env_value "$file" "$key")"
  kind="$(describe_url "$url")"
  case "$kind" in
    PRODUCTION) fail_check "$app points at PRODUCTION Supabase. Run: make env-local" ;;
    unset) warn "$app has no $key. Run: make env-local" ;;
    local)
      if [[ -n "$local_api" && "$url" != "$local_api" ]]; then
        warn "$app points at $url but local Supabase is on $local_api. Run: make env-local"
      elif [[ -z "$local_api" ]]; then
        warn "$app points at local Supabase ($url), which is not running"
      else
        ok "$app -> local $url"
      fi
      ;;
    *) ok "$app -> $kind" ;;
  esac
}
check_app mobile EXPO_PUBLIC_SUPABASE_URL
check_app dashboard NEXT_PUBLIC_SUPABASE_URL
check_app scraper SUPABASE_URL
if [[ "$(env_value apps/scraper/.env.local ENABLE_SUPABASE)" == "true" ]]; then
  scraper_kind="$(describe_url "$(env_value apps/scraper/.env.local SUPABASE_URL)")"
  [[ "$scraper_kind" == "local" ]] || warn "the scraper uploads to $scraper_kind. Only upload to local Supabase."
fi

step "Running services"
for entry in "8081 Metro" "3000 dashboard" "3001 website"; do
  port="${entry%% *}"
  if port_in_use "$port"; then ok "${entry#* } on :$port"; else note "${entry#* } not running (:$port)"; fi
done

if is_mac; then
  step "iOS"
  if xcode-select -p >/dev/null 2>&1 && xcrun simctl help >/dev/null 2>&1; then
    ok "Xcode $(xcodebuild -version 2>/dev/null | head -1 | awk '{print $2}')"
  else
    warn "Xcode is not set up. Install it from the App Store, then: sudo xcode-select -s /Applications/Xcode.app"
  fi
  if have pod; then ok "CocoaPods $(pod --version 2>/dev/null)"; else warn "CocoaPods missing. Install: brew install cocoapods"; fi
  if have watchman; then ok "watchman"; else note "watchman missing (optional, faster Metro). Install: brew install watchman"; fi
  if have maestro; then ok "Maestro $(maestro --version 2>/dev/null | tail -1)"; else note "Maestro missing (needed for make e2e). Install: curl -fsSL https://get.maestro.mobile.dev | bash"; fi
  if xcrun simctl help >/dev/null 2>&1; then
    booted="$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' || true)"
    if [[ -z "$booted" ]]; then
      note "no simulator booted. Boot one with: make sim"
    else
      for udid in $booted; do
        name="$(xcrun simctl list devices booted | grep "$udid" | sed -E 's/^ *(.*) \([0-9A-F-]{36}\).*/\1/' | head -1)"
        if xcrun simctl get_app_container "$udid" com.ethanl06.ut-dining.dev >/dev/null 2>&1; then
          ok "$name has the UT Dining development build"
        else
          note "$name is booted without the development build. Install it with: make ios"
        fi
      done
    fi
    clones="$(xcrun simctl list devices 2>/dev/null | grep -c 'UT Dining e2e shard' || true)"
    [[ "$clones" -gt 0 ]] && warn "$clones leftover E2E simulator clone(s). Remove them with: make clean"
  fi
fi

echo
if [[ "$failures" -gt 0 ]]; then
  printf '%s%d problem(s) found.%s\n' "$C_RED" "$failures" "$C_RESET"
  exit 1
fi
printf '%sAll required checks passed.%s\n' "$C_GREEN" "$C_RESET"
