#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/qa/perf/frames.sh --sim <UDID> [--runs 3] [--out <dir>] [--label <name>]

Measures dropped frames on the UI and JS threads while Maestro drives the scenarios in
apps/mobile/e2e/perf (Home scroll, tab switches, opening a place, menu scroll, the food sheet,
swipe to favorite). The simulator needs a release build of com.ethanl06.ut-dining.dev
(make ios-app) that reads the hosted dev project, so the menus are real sized.

Writes <out>/<label>.md (a table of medians) and the raw frame log next to it.
USAGE
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FLOWS="$ROOT/apps/mobile/e2e/perf"
SCENARIOS="home-scroll tabs open-place menu-scroll food-sheet favorite"
BUNDLE=com.ethanl06.ut-dining.dev
SIM=""
RUNS=3
OUT="$ROOT/.context/frames"
LABEL="$(git -C "$ROOT" rev-parse --short HEAD)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sim) SIM="$2"; shift 2 ;;
    --runs) RUNS="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "frames: unknown option $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -n "$SIM" ]] || { usage >&2; exit 2; }
command -v maestro >/dev/null || { echo "frames: maestro is not installed" >&2; exit 1; }

now_ms() { node -e 'console.log(Date.now())'; }
flow() { maestro --device "$SIM" test "$FLOWS/$1.yaml" > "$OUT/$LABEL-maestro.log" 2>&1; }

mkdir -p "$OUT"
WINDOWS="$OUT/$LABEL-windows.tsv"
: > "$WINDOWS"

echo "==> Launching with the frame recorder on"
flow setup || { tail -30 "$OUT/$LABEL-maestro.log"; exit 1; }
LOG="$(xcrun simctl get_app_container "$SIM" "$BUNDLE" data)/Documents/frame-log.jsonl"
: > "$LOG"

run=1
while [[ "$run" -le "$RUNS" ]]; do
  for scenario in $SCENARIOS; do
    echo "==> Run $run: $scenario"
    started="$(now_ms)"
    flow "$scenario" || { echo "fail $scenario"; tail -30 "$OUT/$LABEL-maestro.log"; exit 1; }
    sleep 1
    printf '%s\t%s\t%s\n' "$scenario" "$started" "$(now_ms)" >> "$WINDOWS"
  done
  run=$((run + 1))
done

cp "$LOG" "$OUT/$LABEL-frames.jsonl"
node "$ROOT/scripts/qa/perf/frames.ts" "$OUT/$LABEL-frames.jsonl" "$WINDOWS" "$OUT/$LABEL.json" | tee "$OUT/$LABEL.md"
echo "ok wrote $OUT/$LABEL.md"
