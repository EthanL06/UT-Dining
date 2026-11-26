#!/usr/bin/env bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROD_REF="yrmylgizphirqqkzgbth"
DB_CONTAINER="supabase_db_ut-dining"
SUPABASE_ENV="$ROOT/supabase/.env"
PORT_VARS="SUPABASE_API_PORT SUPABASE_DB_PORT SUPABASE_DB_SHADOW_PORT SUPABASE_DB_POOLER_PORT SUPABASE_STUDIO_PORT SUPABASE_ANALYTICS_PORT"
PORT_SUFFIXES="21 22 20 29 23 27"

if [[ -t 1 && -z "${NO_COLOR:-}" && "${TERM:-}" != "dumb" ]]; then
  C_BOLD=$'\033[1m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'; C_DIM=$'\033[2m'; C_RESET=$'\033[0m'
else
  C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_DIM=""; C_RESET=""
fi

step() { printf '%s==> %s%s\n' "$C_BOLD" "$*" "$C_RESET"; }
ok() { printf '  %sok%s    %s\n' "$C_GREEN" "$C_RESET" "$*"; }
note() { printf '  %s%s%s\n' "$C_DIM" "$*" "$C_RESET"; }
warn() { printf '  %swarn%s  %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
bad() { printf '  %sfail%s  %s\n' "$C_RED" "$C_RESET" "$*"; }
die() { printf '%serror:%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

is_mac() { [[ "$(uname)" == "Darwin" ]]; }
have() { command -v "$1" >/dev/null 2>&1; }

load_supabase_env() {
  if [[ -f "$SUPABASE_ENV" ]]; then
    set -a
    . "$SUPABASE_ENV"
    set +a
  fi
}

port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

docker_ready() { have docker && docker info >/dev/null 2>&1; }

db_running() { docker_ready && docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$DB_CONTAINER"; }

ensure_docker() {
  docker_ready && return 0
  have docker || return 1
  if is_mac; then
    if have orb; then
      orb start >/dev/null 2>&1 || true
    else
      open -ga Docker >/dev/null 2>&1 || return 1
    fi
  elif [[ "$(id -u)" -eq 0 ]] && have dockerd; then
    mkdir -p "$ROOT/.context"
    nohup dockerd >"$ROOT/.context/dockerd.log" 2>&1 &
  else
    return 1
  fi
  note "waiting for Docker to start"
  local i
  for i in $(seq 1 90); do
    docker_ready && return 0
    sleep 2
  done
  return 1
}

supabase_status_env() { (cd "$ROOT" && pnpm exec supabase status -o env 2>/dev/null); }

read_local_status() {
  local status
  status="$(supabase_status_env)" || return 1
  API_URL="$(sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$status")"
  DB_URL="$(sed -n 's/^DB_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$status")"
  STUDIO_URL="$(sed -n 's/^STUDIO_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$status")"
  SERVICE_ROLE_KEY="$(sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$status")"
  [[ -n "$API_URL" ]]
}

require_local_api() {
  read_local_status || die "local Supabase is not running. Run: make db-up"
  [[ "$API_URL" == http://127.0.0.1:* ]] || die "API_URL is '$API_URL', not a local address. Refusing."
}

psql_local() { docker exec -i "$DB_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -At "$@"; }
