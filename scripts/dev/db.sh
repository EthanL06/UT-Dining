#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

EXCLUDE="${SUPABASE_EXCLUDE:-vector,logflare,imgproxy}"
[[ "$EXCLUDE" == "none" ]] && EXCLUDE=""

usage() {
  cat <<'EOF'
Usage: scripts/dev/db.sh <command>

  up              Start Docker if needed, start local Supabase, point every app at it
  down            Stop local Supabase (data is kept)
  status          URLs, ports and row counts of the local database
  reset           Re-create the local database from migrations and supabase/seed.sql
  migrate         Apply migrations that are not applied yet, keeping data
  new <name>      Create a new migration in supabase/migrations
  types           Regenerate packages/supabase from the local schema
  seed [days]     Scrape real UT menus into the local database (default 3 days)
  fixtures        Load the fixed E2E fixture menus into J2 Dining
  sample          Load sample menus and edge-case places (scripts/dev/sample/data.json)
  fresh           reset, then sample: a known local database in one command
  psql [args]     Open psql on the local database
  studio          Print (and on macOS open) Supabase Studio
EOF
}

ports_free() {
  local suffix
  for suffix in $PORT_SUFFIXES; do
    port_in_use "$1$suffix" && return 1
  done
  return 0
}

write_ports() {
  local prefix="$1" kept="" var suffix i=0
  if [[ -f "$SUPABASE_ENV" ]]; then
    kept="$(grep -vE '^SUPABASE_[A-Z_]+_PORT=' "$SUPABASE_ENV" || true)"
  fi
  {
    [[ -n "$kept" ]] && printf '%s\n' "$kept"
    set -- $PORT_SUFFIXES
    for var in $PORT_VARS; do
      printf '%s=%s%s\n' "$var" "$prefix" "$1"
      shift
    done
  } >"$SUPABASE_ENV"
  load_supabase_env
}

sync_running_ports() {
  local api prefix
  api="$(docker port supabase_kong_ut-dining 8000/tcp 2>/dev/null | head -1 | sed 's/.*://')"
  [[ "$api" =~ ^[0-9]{3}21$ ]] || return 0
  prefix="${api:0:3}"
  [[ "$api" == "${SUPABASE_API_PORT:-54321}" ]] && return 0
  note "the running UT Dining stack uses ${prefix}20-${prefix}29, saving that in supabase/.env"
  write_ports "$prefix"
}

choose_ports() {
  load_supabase_env
  if db_running; then
    sync_running_ports
    return 0
  fi
  if port_in_use 54324 && [[ ",$EXCLUDE," != *",mailpit,"* ]]; then
    warn "port 54324 is taken, so the local email inbox (Mailpit) is skipped"
    EXCLUDE="${EXCLUDE:+$EXCLUDE,}mailpit"
  fi
  local current="543" prefix
  [[ -n "${SUPABASE_API_PORT:-}" ]] && current="${SUPABASE_API_PORT:0:3}"
  if ports_free "$current"; then
    return 0
  fi
  for prefix in 543 563 565 567 569 573 575; do
    if ports_free "$prefix"; then
      warn "ports ${current}20-${current}29 are taken by something else, using ${prefix}20-${prefix}29"
      note "saved in supabase/.env (gitignored). Every supabase command reads it."
      write_ports "$prefix"
      return 0
    fi
  done
  die "no free port range for Supabase. Stop other Supabase stacks (supabase stop --all) and retry."
}

cmd_up() {
  step "Local Supabase"
  ensure_docker || die "Docker is not running. Install or start Docker Desktop or OrbStack, then re-run."
  choose_ports
  if db_running; then
    ok "already running"
  else
    mkdir -p .context
    note "starting containers. The first run pulls images and takes a few minutes."
    note "log: .context/supabase-start.log"
    if ! pnpm exec supabase start ${EXCLUDE:+-x "$EXCLUDE"} >.context/supabase-start.log 2>&1; then
      tail -20 .context/supabase-start.log >&2
      die "supabase start failed. Full log: .context/supabase-start.log"
    fi
  fi
  require_local_api
  ok "API $API_URL"
  ok "Studio ${STUDIO_URL:-not running}"
  node scripts/env.ts --local
}

cmd_ensure() {
  local url
  url="$(sed -n 's/^EXPO_PUBLIC_SUPABASE_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' apps/mobile/.env.local 2>/dev/null | tail -1)"
  case "$url" in
    *"$PROD_REF"*) die "apps/mobile/.env.local points at PRODUCTION Supabase. Run: make env-local" ;;
    https://*) step "Database"; ok "apps use $url, not starting local Supabase" ;;
    *) cmd_up ;;
  esac
}

cmd_down() {
  step "Stopping local Supabase"
  if db_running; then
    pnpm exec supabase stop
  else
    ok "not running"
  fi
}

menu_count() { psql_local -c "select count(*) from public.menu" 2>/dev/null || echo "?"; }

cmd_status() {
  load_supabase_env
  if ! db_running; then
    warn "local Supabase is not running. Start it with: make db-up"
    return 1
  fi
  sync_running_ports
  require_local_api
  ok "API      $API_URL"
  ok "Postgres $DB_URL"
  ok "Studio   ${STUDIO_URL:-not running}"
  local locations menus latest
  locations="$(psql_local -c "select count(*) from public.location" 2>/dev/null || echo "?")"
  menus="$(menu_count)"
  latest="$(psql_local -c "select coalesce(max(date)::text, 'none') from public.menu" 2>/dev/null || echo "?")"
  ok "$locations locations, $menus menus, latest menu day $latest"
}

cmd_reset() {
  require_local_api
  step "Resetting the local database"
  pnpm exec supabase db reset --local
  ok "migrations and supabase/seed.sql applied. Add menus with: make db-seed"
}

cmd_migrate() {
  require_local_api
  step "Applying new migrations"
  pnpm exec supabase migration up --local
}

cmd_new() {
  [[ -n "${1:-}" ]] || die "give the migration a name, for example: make db-new NAME=add_meal_notes"
  pnpm exec supabase migration new "$1"
}

cmd_types() {
  require_local_api
  step "Regenerating packages/supabase/src/database.types.ts"
  pnpm db:types
}

cmd_seed() {
  require_local_api
  local days="${1:-${DAYS:-3}}"
  step "Scraping $days day(s) of UT menus into $API_URL"
  DAYS_TO_SCRAPE="$days" SUPABASE_URL="$API_URL" SUPABASE_KEY="$SERVICE_ROLE_KEY" ENABLE_SUPABASE=true \
    pnpm --filter @ut-dining/scraper start
  ok "$(menu_count) menus in the local database"
}

cmd_fixtures() {
  require_local_api
  step "Loading E2E fixture menus"
  node scripts/qa/e2e-load-fixtures.ts
  ok "fixtures loaded"
}

cmd_sample() {
  require_local_api
  step "Loading sample data"
  node scripts/dev/sample/load.ts
}

cmd_fresh() {
  cmd_reset
  cmd_sample
  ok "fresh local database: $(menu_count) menus. Scenarios: scripts/dev/sample/README.md"
}

cmd_psql() {
  db_running || die "local Supabase is not running. Run: make db-up"
  if [[ -t 0 && -t 1 ]]; then
    exec docker exec -it "$DB_CONTAINER" psql -U postgres "$@"
  fi
  exec docker exec -i "$DB_CONTAINER" psql -U postgres "$@"
}

cmd_studio() {
  require_local_api
  [[ -n "${STUDIO_URL:-}" ]] || die "Studio is not running. Start Supabase without excluding it."
  echo "$STUDIO_URL"
  if is_mac && [[ -t 1 ]]; then open "$STUDIO_URL"; fi
}

command="${1:-}"
shift || true
case "$command" in
  up) cmd_up ;;
  ensure) cmd_ensure ;;
  down) cmd_down ;;
  status) cmd_status ;;
  reset) cmd_reset ;;
  migrate) cmd_migrate ;;
  new) cmd_new "$@" ;;
  types) cmd_types ;;
  seed) cmd_seed "$@" ;;
  fixtures) cmd_fixtures ;;
  sample) cmd_sample ;;
  fresh) cmd_fresh ;;
  psql) cmd_psql "$@" ;;
  studio) cmd_studio ;;
  ports) choose_ports ;;
  -h | --help | help | "") usage ;;
  *) usage >&2; exit 1 ;;
esac
