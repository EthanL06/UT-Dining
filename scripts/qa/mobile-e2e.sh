#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/qa/mobile-e2e.sh [--sim <UDID>] [--release] [--port <metro port>] [maestro test args...]

Runs the Maestro flows in apps/mobile/e2e on an iOS Simulator against local Supabase.

  --sim <UDID>   Simulator to use. Defaults to $SIM, then to the only booted simulator.
  --release      The installed app is a release build of com.ethanl06.ut-dining.dev, so skip Metro.
  --port <port>  Metro port for the development client. Default 8081.

Anything else goes to `maestro test`, for example a single flow file or `--include-tags smoke`.
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT/apps/mobile/e2e"
APP_ID="com.ethanl06.ut-dining.dev"
DB_CONTAINER="supabase_db_ut-dining"
SIM="${SIM:-}"
DEV_CLIENT=true
METRO_PORT=8081
MAESTRO_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sim) SIM="$2"; shift 2 ;;
    --release) DEV_CLIENT=false; shift ;;
    --port) METRO_PORT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) MAESTRO_ARGS+=("$1"); shift ;;
  esac
done

fail() { echo "mobile-e2e: $*" >&2; exit 1; }
step() { echo "==> $*"; }

[[ "$(uname)" == "Darwin" ]] || fail "needs macOS with Xcode and the iOS Simulator."
command -v xcrun >/dev/null || fail "xcrun not found. Install Xcode."
command -v maestro >/dev/null || fail "maestro not found. Install it with: curl -fsSL https://get.maestro.mobile.dev | bash"
command -v docker >/dev/null || fail "docker not found. Local Supabase needs Docker."

step "Checking local Supabase"
STATUS="$(cd "$ROOT" && pnpm exec supabase status -o env 2>/dev/null)" || fail "local Supabase is not running. Run: pnpm db:start"
API_URL="$(sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$STATUS")"
[[ "$API_URL" == http://127.0.0.1:* ]] || fail "API_URL is '$API_URL', not a local address. Refusing to write fixtures."
docker inspect "$DB_CONTAINER" >/dev/null 2>&1 || fail "container $DB_CONTAINER is not running."

step "Loading fixture menus into J2 Dining"
docker exec -i "$DB_CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 < "$E2E_DIR/fixtures/menus.sql" >/dev/null

ENV_FILE="$ROOT/apps/mobile/.env.local"
if ! grep -q "^EXPO_PUBLIC_SUPABASE_URL=\"\{0,1\}$API_URL" "$ENV_FILE" 2>/dev/null; then
  step "Pointing apps/mobile/.env.local at $API_URL"
  (cd "$ROOT" && node scripts/env.ts --local)
fi

if [[ -z "$SIM" ]]; then
  BOOTED="$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' || true)"
  [[ "$(wc -w <<<"$BOOTED")" -eq 1 ]] || fail "pass --sim <UDID> or set SIM. Simulators: xcrun simctl list devices available"
  SIM="$BOOTED"
fi

step "Booting simulator $SIM"
WAS_BOOTED=false
if xcrun simctl list devices booted | grep -q "$SIM"; then WAS_BOOTED=true; fi
xcrun simctl boot "$SIM" 2>/dev/null || true
xcrun simctl bootstatus "$SIM" -b >/dev/null
xcrun simctl ui "$SIM" appearance light

APP_PATH="$(xcrun simctl get_app_container "$SIM" "$APP_ID" 2>/dev/null)" || fail "$APP_ID is not installed on $SIM. Build it with: pnpm --filter @ut-dining/mobile ios --device $SIM"
if [[ "$DEV_CLIENT" == true ]] && ! ls "$APP_PATH" | grep -q EXDevLauncher.bundle; then
  fail "the app on $SIM is a release build. Pass --release, or install a development client."
fi

STARTED_METRO=false
cleanup() {
  if [[ "$STARTED_METRO" == true ]]; then
    kill $(lsof -tiTCP:"$METRO_PORT" -sTCP:LISTEN) 2>/dev/null || true
  fi
  if [[ "$WAS_BOOTED" == false ]]; then
    xcrun simctl shutdown "$SIM" 2>/dev/null || true
  fi
}
trap cleanup EXIT

OUT="$ROOT/.context/maestro/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

if [[ "$DEV_CLIENT" == true ]]; then
  if curl -sf "http://localhost:$METRO_PORT/status" | grep -q packager-status:running; then
    step "Using the Metro already on port $METRO_PORT. Restart it if .env.local changed."
  else
    step "Starting Metro on port $METRO_PORT"
    (cd "$ROOT" && pnpm --filter @ut-dining/mobile start --port "$METRO_PORT" > "$OUT/metro.log" 2>&1 &)
    STARTED_METRO=true
    for _ in $(seq 1 60); do
      curl -sf "http://localhost:$METRO_PORT/status" | grep -q packager-status:running && break
      sleep 1
    done
    curl -sf "http://localhost:$METRO_PORT/status" | grep -q packager-status:running || fail "Metro did not start. See $OUT/metro.log"
  fi
fi

[[ ${#MAESTRO_ARGS[@]} -gt 0 ]] || MAESTRO_ARGS=("$E2E_DIR")

step "Running Maestro. Output: $OUT"
set +e
cd "$OUT"
maestro --device "$SIM" test \
  -e DEV_CLIENT="$DEV_CLIENT" \
  -e METRO_URL="http://localhost:$METRO_PORT" \
  --format junit --output "$OUT/report.xml" \
  --test-output-dir "$OUT" \
  "${MAESTRO_ARGS[@]}"
RESULT=$?
set -e

echo "Report: $OUT/report.xml"
echo "Screenshots and logs: $OUT"
exit "$RESULT"
