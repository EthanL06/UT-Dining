#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

DB_MODE="${DB:-auto}"
SEED="${SEED:-1}"
SEED_DAYS="${DAYS:-3}"

case "$DB_MODE" in
  auto | local | dev | none) ;;
  *) die "DB must be auto, local, dev or none (got '$DB_MODE')." ;;
esac

wanted_node="$(cat .node-version)"

node_ok() {
  have node && node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)'
}

step "1/6 Node.js"
if ! node_ok; then
  if have fnm; then
    fnm install "$wanted_node" && eval "$(fnm env)" && fnm use "$wanted_node"
  elif have mise; then
    mise install "node@$wanted_node" && eval "$(mise activate bash)" && mise use "node@$wanted_node"
  elif [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    set +u
    . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    nvm install "$wanted_node"
    set -u
  elif is_mac && have brew; then
    brew install "node@$wanted_node" && export PATH="$(brew --prefix "node@$wanted_node")/bin:$PATH"
  fi
fi
node_ok || die "Node $wanted_node is required (22.18+ works). Install it from https://nodejs.org or with fnm, then re-run."
ok "node $(node -v)"

step "2/6 pnpm"
wanted_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]")"
if ! have pnpm; then
  if have corepack; then
    corepack enable pnpm 2>/dev/null || npm install --global "pnpm@$wanted_pnpm"
  else
    npm install --global "pnpm@$wanted_pnpm"
  fi
fi
have pnpm || die "pnpm could not be installed. Run: npm install --global pnpm@$wanted_pnpm"
ok "pnpm $(pnpm -v)"

step "3/6 Dependencies"
mkdir -p .context
if ! pnpm install --frozen-lockfile >.context/pnpm-install.log 2>&1; then
  tail -30 .context/pnpm-install.log >&2
  die "pnpm install failed. Full log: .context/pnpm-install.log"
fi
ok "workspace installed, git hooks set up by Lefthook"

step "4/6 Env files"
for example in apps/*/.env.example; do
  local_file="${example%.example}.local"
  if [[ -f "$local_file" ]]; then
    ok "$local_file exists, kept"
  else
    cp "$example" "$local_file"
    ok "created $local_file"
  fi
done

if [[ "$DB_MODE" == "auto" ]]; then
  current_url="$(sed -n 's/^EXPO_PUBLIC_SUPABASE_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' apps/mobile/.env.local 2>/dev/null || true)"
  if [[ "$current_url" == *"$PROD_REF"* ]]; then
    warn "apps/mobile/.env.local points at PRODUCTION Supabase. Switching it to a safe database."
    if have docker; then DB_MODE="local"; elif [[ -n "${SUPABASE_DEV_URL:-}" ]]; then DB_MODE="dev"; else die "install Docker for local Supabase, or set SUPABASE_DEV_* for the dev project, then re-run."; fi
  elif [[ "$current_url" == https://* ]]; then
    DB_MODE="keep"
  elif have docker; then
    DB_MODE="local"
  elif [[ -n "${SUPABASE_DEV_URL:-}" ]]; then
    DB_MODE="dev"
  else
    DB_MODE="none"
  fi
fi

step "5/6 Database ($DB_MODE)"
case "$DB_MODE" in
  local)
    "$ROOT/scripts/dev/db.sh" up
    ;;
  dev)
    node scripts/env.ts --dev
    ;;
  keep)
    ok "apps already point at $current_url, kept. Switch with: make env-local"
    ;;
  none)
    if [[ "${DB:-auto}" == "none" ]]; then
      note "skipped (DB=none)"
    else
      warn "no database configured: Docker is not installed and SUPABASE_DEV_URL is not set."
      note "Install Docker Desktop or OrbStack, then run: make db-up"
    fi
    ;;
esac

step "6/6 Menu data"
if [[ "$DB_MODE" != "local" ]]; then
  note "skipped, only seeded for local Supabase"
elif [[ "$SEED" == "0" ]]; then
  note "skipped (SEED=0). Add menus later with: make db-seed"
else
  menus="$(psql_local -c "select count(*) from public.menu" 2>/dev/null || echo 0)"
  if [[ "$menus" -gt 0 ]]; then
    ok "$menus menus already in the local database, kept"
  elif ! "$ROOT/scripts/dev/db.sh" seed "$SEED_DAYS" >.context/seed.log 2>&1; then
    warn "scraping UT menus failed (offline?). See .context/seed.log. Retry with: make db-seed"
    note "or load sample menus with: make db-sample"
  else
    menus="$(psql_local -c "select count(*) from public.menu" 2>/dev/null || echo 0)"
    if [[ "$menus" -gt 0 ]]; then
      ok "scraped $SEED_DAYS day(s) of UT menus: $menus menus"
    else
      warn "UT published no menus for the next $SEED_DAYS day(s). Load sample menus with: make db-sample"
    fi
  fi
fi

if is_mac; then
  missing=""
  xcrun simctl help >/dev/null 2>&1 || missing="$missing Xcode"
  have maestro || missing="$missing Maestro"
  have watchman || missing="$missing watchman"
  if [[ -n "$missing" ]]; then
    echo
    warn "optional for mobile work, not installed:$missing. Run make doctor for install hints."
  fi
fi

echo
printf '%sReady.%s Next:\n' "$C_BOLD" "$C_RESET"
echo "  make dev        dashboard, website and Metro together"
echo "  make ios        build the development build and open it in the iOS Simulator"
echo "  make doctor     check the setup"
echo "  make help       every command"
