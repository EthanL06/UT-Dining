#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

APP_ID="com.ethanl06.ut-dining.dev"
UDID_RE='[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}'

is_mac || die "the iOS Simulator needs macOS with Xcode."
xcrun simctl help >/dev/null 2>&1 || die "xcrun simctl is not available. Install Xcode and run: sudo xcode-select -s /Applications/Xcode.app"

has_app() {
  xcrun simctl get_app_container "$1" "$APP_ID" >/dev/null 2>&1 && return 0
  local plist
  for plist in "$HOME/Library/Developer/CoreSimulator/Devices/$1/data/Containers/Bundle/Application/"*/*.app/Info.plist; do
    [[ -f "$plist" ]] || continue
    [[ "$(plutil -extract CFBundleIdentifier raw "$plist" 2>/dev/null)" == "$APP_ID" ]] && return 0
  done
  return 1
}

device_name() { xcrun simctl list devices | grep "$1" | head -1 | sed -E 's/^ *(.*) \([0-9A-F-]{36}\).*/\1/'; }

ios_devices() {
  xcrun simctl list devices available | awk '/^-- /{ios = ($0 ~ /-- iOS /)} ios && /\([0-9A-F-]{36}\)/' | grep -vE 'UT Dining (golden|lease)' || true
}

list() {
  local line udid mark
  ios_devices | while IFS= read -r line; do
    udid="$(grep -oE "$UDID_RE" <<<"$line" || true)"
    [[ -n "$udid" ]] || continue
    mark=""
    has_app "$udid" && mark="  [dev build]"
    printf '%s%s\n' "$(sed -E 's/^ +//' <<<"$line")" "$mark"
  done
}

pick() {
  local wanted="${SIM:-}" udid
  if [[ -n "$wanted" ]]; then
    if grep -qE "^$UDID_RE$" <<<"$wanted"; then
      echo "$wanted"
      return
    fi
    udid="$(xcrun simctl list devices available | grep -F "$wanted (" | head -1 | grep -oE "$UDID_RE" || true)"
    [[ -n "$udid" ]] || die "no available simulator named '$wanted'. See: make sims"
    echo "$udid"
    return
  fi
  udid="$(xcrun simctl list devices booted | grep -vE 'UT Dining (golden|lease)' | grep -oE "$UDID_RE" | head -1 || true)"
  if [[ -n "$udid" ]]; then
    echo "$udid"
    return
  fi
  for udid in $(ios_devices | grep -oE "$UDID_RE"); do
    if has_app "$udid"; then
      echo "$udid"
      return
    fi
  done
  ios_devices | grep iPhone | tail -1 | grep -oE "$UDID_RE" || die "no iPhone simulator. Add one in Xcode > Window > Devices and Simulators."
}

boot() {
  local udid
  udid="$(pick)"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  open -a Simulator --args -CurrentDeviceUDID "$udid"
  ok "$(device_name "$udid") booted ($udid)"
  if has_app "$udid"; then
    note "UT Dining development build is installed. Start Metro with: make mobile"
  else
    note "no development build on it yet. Build and install it with: make ios SIM=$udid"
  fi
}

case "${1:-boot}" in
  boot) boot ;;
  list) list ;;
  pick) pick ;;
  *) die "usage: scripts/dev/sim.sh [boot|list|pick]" ;;
esac
