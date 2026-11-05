#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/qa/mobile-e2e.sh [--sim <UDID>] [--release] [--port <metro port>]
                                [--fixture-server [port]] [--shards <n>] [--retry-failed]
                                [maestro test args...]

Runs the Maestro flows in apps/mobile/e2e on an iOS Simulator against local Supabase.

  --sim <UDID>             Simulator to use. Defaults to $SIM, then to the only booted simulator.
  --release                The installed app is a release build of com.ethanl06.ut-dining.dev,
                           so skip Metro.
  --port <port>            Metro port for the development client. Default 8081.
  --fixture-server [port]  Serve the fixtures from scripts/qa/e2e-fixture-server.ts instead of
                           local Supabase (no Docker). Default port 54331. The app must be built
                           or started with EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:<port>.
  --shards <n>             Split the flows across n simulators that run at the same time. The
                           extra simulators are clones of --sim (app included) and are deleted
                           afterwards. Each one needs about 2 GB of RAM.
  --retry-failed           Run the flows that failed once more, in a fresh Maestro session. The
                           exit code comes from the retry. Reports go to <output>/retry.

Anything else goes to `maestro test`, for example a single flow file or `--include-tags smoke`.
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT/apps/mobile/e2e"
APP_ID="com.ethanl06.ut-dining.dev"
SIM="${SIM:-}"
FIXTURE_PORT=""
DEV_CLIENT=true
METRO_PORT=8081
SHARDS=1
RETRIES=0
MAESTRO_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sim) SIM="$2"; shift 2 ;;
    --release) DEV_CLIENT=false; shift ;;
    --port) METRO_PORT="$2"; shift 2 ;;
    --shards) SHARDS="$2"; shift 2 ;;
    --retry-failed) RETRIES=1; shift ;;
    --fixture-server)
      if [[ "${2:-}" =~ ^[0-9]+$ ]]; then FIXTURE_PORT="$2"; shift 2; else FIXTURE_PORT=54331; shift; fi ;;
    -h|--help) usage; exit 0 ;;
    *) MAESTRO_ARGS+=("$1"); shift ;;
  esac
done

fail() { echo "mobile-e2e: $*" >&2; exit 1; }
[[ "$SHARDS" =~ ^[1-9][0-9]*$ ]] || { echo "mobile-e2e: --shards needs a whole number." >&2; exit 1; }
step() { echo "==> $*"; }

[[ "$(uname)" == "Darwin" ]] || fail "needs macOS with Xcode and the iOS Simulator."
command -v xcrun >/dev/null || fail "xcrun not found. Install Xcode."
command -v maestro >/dev/null || fail "maestro not found. Install it with: curl -fsSL https://get.maestro.mobile.dev | bash"

OUT="$ROOT/.context/maestro/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

STARTED_METRO=false
FIXTURE_PID=""
WAS_BOOTED=true
CLONES=()
cleanup() {
  for clone in ${CLONES[@]+"${CLONES[@]}"}; do
    xcrun simctl shutdown "$clone" 2>/dev/null || true
    xcrun simctl delete "$clone" 2>/dev/null || true
  done
  if [[ "$STARTED_METRO" == true ]]; then
    kill $(lsof -tiTCP:"$METRO_PORT" -sTCP:LISTEN) 2>/dev/null || true
  fi
  if [[ -n "$FIXTURE_PID" ]]; then
    kill "$FIXTURE_PID" 2>/dev/null || true
  fi
  if [[ "$WAS_BOOTED" == false ]]; then
    xcrun simctl shutdown "$SIM" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ -n "$FIXTURE_PORT" ]]; then
  step "Starting the fixture server on port $FIXTURE_PORT"
  node "$ROOT/scripts/qa/e2e-fixture-server.ts" "$FIXTURE_PORT" > "$OUT/fixture-server.log" 2>&1 &
  FIXTURE_PID=$!
  for _ in $(seq 1 20); do
    curl -sf "http://127.0.0.1:$FIXTURE_PORT/health" >/dev/null && break
    sleep 0.5
  done
  curl -sf "http://127.0.0.1:$FIXTURE_PORT/health" >/dev/null || fail "the fixture server did not start. See $OUT/fixture-server.log"
else
  step "Checking local Supabase"
  STATUS="$(cd "$ROOT" && pnpm exec supabase status -o env 2>/dev/null)" || fail "local Supabase is not running. Run: pnpm db:start"
  API_URL="$(sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' <<<"$STATUS")"
  [[ "$API_URL" == http://127.0.0.1:* ]] || fail "API_URL is '$API_URL', not a local address. Refusing to write fixtures."

  step "Loading fixture menus into J2 Dining"
  (cd "$ROOT" && node scripts/qa/e2e-load-fixtures.ts)

  ENV_FILE="$ROOT/apps/mobile/.env.local"
  if ! grep -q "^EXPO_PUBLIC_SUPABASE_URL=\"\{0,1\}$API_URL" "$ENV_FILE" 2>/dev/null; then
    step "Pointing apps/mobile/.env.local at $API_URL"
    (cd "$ROOT" && node scripts/env.ts --local)
  fi
fi

if [[ -z "$SIM" ]]; then
  BOOTED="$(xcrun simctl list devices booted | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' || true)"
  [[ "$(wc -w <<<"$BOOTED")" -eq 1 ]] || fail "pass --sim <UDID> or set SIM. Simulators: xcrun simctl list devices available"
  SIM="$BOOTED"
fi

if ! xcrun simctl list devices booted | grep -q "$SIM"; then WAS_BOOTED=false; fi

if [[ "$SHARDS" -gt 1 ]]; then
  xcrun simctl get_app_container "$SIM" "$APP_ID" >/dev/null 2>&1 || fail "$APP_ID is not installed on $SIM."
  step "Cloning $SIM into $((SHARDS - 1)) more simulators"
  xcrun simctl shutdown "$SIM" 2>/dev/null || true
  for i in $(seq 2 "$SHARDS"); do
    CLONE="$(xcrun simctl clone "$SIM" "UT Dining e2e shard $i")" || fail "could not clone $SIM."
    CLONES+=("$CLONE")
  done
fi

DEVICES=("$SIM" ${CLONES[@]+"${CLONES[@]}"})
for device in "${DEVICES[@]}"; do
  step "Booting simulator $device"
  xcrun simctl boot "$device" 2>/dev/null || true
done
for device in "${DEVICES[@]}"; do
  xcrun simctl bootstatus "$device" -b >/dev/null
  xcrun simctl ui "$device" appearance light
done

APP_PATH="$(xcrun simctl get_app_container "$SIM" "$APP_ID" 2>/dev/null)" || fail "$APP_ID is not installed on $SIM. Build it with: pnpm --filter @ut-dining/mobile ios --device $SIM"
if [[ "$DEV_CLIENT" == true ]] && ! ls "$APP_PATH" | grep -q EXDevLauncher.bundle; then
  fail "the app on $SIM is a release build. Pass --release, or install a development client."
fi

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

DEVICE_LIST="$(IFS=,; echo "${DEVICES[*]}")"

run_maestro() {
  local dir="$1" shards="$2"
  shift 2
  local shard_args=()
  [[ "$shards" -gt 1 ]] && shard_args=(--shard-split "$shards")
  mkdir -p "$dir"
  (cd "$dir" && maestro --device "$DEVICE_LIST" test \
    ${shard_args[@]+"${shard_args[@]}"} \
    -e DEV_CLIENT="$DEV_CLIENT" \
    -e METRO_URL="http://localhost:$METRO_PORT" \
    --format junit --output "$dir/report.xml" \
    --test-output-dir "$dir" \
    "$@")
}

step "Running Maestro. Output: $OUT"
set +e
run_maestro "$OUT" "$SHARDS" "${MAESTRO_ARGS[@]}"
RESULT=$?
set -e
REPORT="$OUT/report.xml"

if [[ "$RESULT" -ne 0 && "$RETRIES" -gt 0 && -f "$REPORT" ]]; then
  FAILED=()
  while IFS= read -r flow; do
    [[ -n "$flow" ]] && FAILED+=("$flow")
  done < <(grep -o '<testcase [^>]*status="[A-Z]*"' "$REPORT" | grep -v 'status="SUCCESS"' | sed -E 's/.* file="([^"]*)".*/\1/')
  if [[ ${#FAILED[@]} -gt 0 ]]; then
    RETRY_SHARDS=$(( ${#FAILED[@]} < SHARDS ? ${#FAILED[@]} : SHARDS ))
    step "Retrying ${#FAILED[@]} failed flow(s) once. Output: $OUT/retry"
    set +e
    run_maestro "$OUT/retry" "$RETRY_SHARDS" "${FAILED[@]}"
    RESULT=$?
    set -e
    REPORT="$OUT/retry/report.xml"
  fi
fi

echo "Report: $REPORT"
echo "Screenshots and logs: $OUT"
exit "$RESULT"
