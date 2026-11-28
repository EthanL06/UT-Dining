#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/qa/mobile-screenshots.sh [--out <dir>] [--list <file>] [--themes "light dark"]
                                        [mobile-e2e.sh options: --sim, --release, --fixture-server]

Screenshots every screen in apps/mobile/e2e/screenshots.txt, once per theme, on an iOS Simulator.
Each line of the list is "<name> [deep link path] [text to wait for]". The path is opened as
ut-dining://<path> once Home has mounted (the splash only hides then); no path means Home. The text is a Maestro regex that only that screen shows; the
screenshot waits for it, so a deep link that lands late never captures the previous screen. Files are <out>/<name>-<theme>.png. Default out: .context/screenshots.
The run fails when a screenshot shows only the launch splash or one flat color (make check-screenshots DIR=<dir>).
With --sim <UDID>,<UDID> each theme is its own flow, so the themes run on two simulators at once
(worth it on a Mac with spare cores; a 3-core CI runner gets slower).
System alerts are dismissed once per theme, after the first launch; permissions are granted at
launch and e2e-setup marks the rating prompt as shown, so later launches have none.
USAGE
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT/apps/mobile/e2e"
OUT="$ROOT/.context/screenshots"
LIST="$E2E_DIR/screenshots.txt"
THEMES="light dark"
PASS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --list) LIST="$2"; shift 2 ;;
    --themes) THEMES="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) PASS+=("$1"); shift ;;
  esac
done

[[ -f "$LIST" ]] || { echo "mobile-screenshots: no list at $LIST" >&2; exit 1; }
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
FLOWS="$OUT/flows"
ALERTS="$E2E_DIR/subflows/dismiss-alerts.yaml"
rm -rf "$FLOWS"
mkdir -p "$FLOWS"

open_app() {
  cat <<YAML
- launchApp:
    clearState: $1
    permissions:
      all: allow
- runFlow:
    when:
      true: \${DEV_CLIENT == 'true'}
    commands:
      - openLink: exp+ut-dining://expo-development-client/?url=\${encodeURIComponent(METRO_URL)}&disableOnboarding=1&__expo_disable_auto_launch=1&__expo_disable_fab=1
YAML
}

header() {
  cat <<YAML
appId: com.ethanl06.ut-dining.dev
name: Screenshots $1
env:
  DEV_CLIENT: \${DEV_CLIENT || 'true'}
  METRO_URL: \${METRO_URL || 'http://localhost:8081'}
---
YAML
  open_app true
  echo "- runFlow: $ALERTS"
}

theme_steps() {
  local theme="$1" name path wait
  cat <<YAML
- openLink: ut-dining://e2e-setup?theme=$theme
- runFlow: $ALERTS
- extendedWaitUntil:
    visible: 'Home(,.*)?'
    timeout: 60000
- waitForAnimationToEnd:
    timeout: 10000
YAML
  while read -r name path wait; do
    [[ -z "$name" || "$name" == \#* ]] && continue
    echo "- stopApp"
    open_app false
    cat <<YAML
- extendedWaitUntil:
    visible:
      id: home-scroll
    timeout: 60000
YAML
    if [[ -n "${path:-}" ]]; then
      echo "- openLink: ut-dining://$path"
    fi
    if [[ -n "${wait:-}" ]]; then
      cat <<YAML
- extendedWaitUntil:
    visible: '$wait'
    timeout: 20000
YAML
    fi
    cat <<YAML
- waitForAnimationToEnd:
    timeout: 8000
- takeScreenshot: $name-$theme
YAML
  done < "$LIST"
}

SPLIT=false
for i in "${!PASS[@]}"; do
  if [[ "${PASS[$i]}" == --sim && "${PASS[$((i + 1))]:-}" == *,* ]]; then SPLIT=true; fi
done

if [[ "$SPLIT" == true ]]; then
  for theme in $THEMES; do
    { header "$theme"; theme_steps "$theme"; } > "$FLOWS/screenshots-$theme.yaml"
  done
else
  {
    header "$THEMES"
    for theme in $THEMES; do theme_steps "$theme"; done
  } > "$FLOWS/screenshots.yaml"
fi

RUN_DIR="$ROOT/.context/maestro/screenshots-$(date +%Y%m%d-%H%M%S)-$$"
E2E_OUT="$RUN_DIR" "$ROOT/scripts/qa/mobile-e2e.sh" --status-bar ${PASS[@]+"${PASS[@]}"} "$FLOWS"
TAKEN="$RUN_DIR/taken.txt"
: >"$TAKEN"
find "$RUN_DIR" -name '*.png' | while read -r png; do
  base="$(basename "$png")"
  for theme in $THEMES; do
    case "$base" in *-"$theme".png) cp "$png" "$OUT/$base"; echo "$OUT/$base" >>"$TAKEN" ;; esac
  done
done
if [[ -s "$TAKEN" ]]; then
  xargs node "$ROOT/scripts/qa/screenshot-splash-check.ts" <"$TAKEN"
fi
echo "Screenshots: $OUT"
ls "$OUT"/*.png
