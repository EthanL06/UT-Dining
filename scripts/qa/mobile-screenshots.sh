#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/qa/mobile-screenshots.sh [--out <dir>] [--list <file>] [--themes "light dark"]
                                        [mobile-e2e.sh options: --sim, --release, --fixture-server]

Screenshots every screen in apps/mobile/e2e/screenshots.txt, once per theme, on an iOS Simulator.
Each line of the list is "<name> [deep link path]". The path is opened as ut-dining://<path>;
no path means Home. Files are <out>/<name>-<theme>.png. Default out: .context/screenshots.
Each theme is its own flow, so --sim <UDID>,<UDID> takes the themes on two simulators at once.
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
      - openLink: exp+ut-dining://expo-development-client/?url=\${encodeURIComponent(METRO_URL)}&disableOnboarding=1
YAML
}

for theme in $THEMES; do
  {
    cat <<YAML
appId: com.ethanl06.ut-dining.dev
name: Screenshots $theme
env:
  DEV_CLIENT: \${DEV_CLIENT || 'true'}
  METRO_URL: \${METRO_URL || 'http://localhost:8081'}
---
YAML
    open_app true
    cat <<YAML
- runFlow: $ALERTS
- openLink: ut-dining://e2e-setup?theme=$theme
- runFlow: $ALERTS
- extendedWaitUntil:
    visible: 'Home(,.*)?'
    timeout: 60000
- waitForAnimationToEnd:
    timeout: 10000
YAML
    while read -r name path; do
      [[ -z "$name" || "$name" == \#* ]] && continue
      echo "- stopApp"
      open_app false
      if [[ -n "${path:-}" ]]; then
        echo "- openLink: ut-dining://$path"
      fi
      cat <<YAML
- waitForAnimationToEnd:
    timeout: 8000
- takeScreenshot: $name-$theme
YAML
    done < "$LIST"
  } > "$FLOWS/screenshots-$theme.yaml"
done

RUN_DIR="$ROOT/.context/maestro/screenshots-$(date +%Y%m%d-%H%M%S)"
E2E_OUT="$RUN_DIR" "$ROOT/scripts/qa/mobile-e2e.sh" --status-bar ${PASS[@]+"${PASS[@]}"} "$FLOWS"
find "$RUN_DIR" -name '*.png' | while read -r png; do
  base="$(basename "$png")"
  for theme in $THEMES; do
    case "$base" in *-"$theme".png) cp "$png" "$OUT/$base" ;; esac
  done
done
echo "Screenshots: $OUT"
ls "$OUT"/*.png
