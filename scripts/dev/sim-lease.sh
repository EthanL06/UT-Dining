#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  cat <<'EOF'
Usage: scripts/dev/sim-lease.sh <command>

Gives each agent or session its own iOS Simulator, so parallel threads never share one.
Every lease is a clone of a "UT Dining golden" simulator that holds the development build
and is never booted by hand. Clones take seconds because APFS copies them lazily.

  acquire [--owner <name>] [--wait <seconds>]
                     Clone the golden simulator, boot it, and print "<UDID> <slot>".
                     Waits up to --wait seconds (default $SIM_WAIT or 0) for a free slot,
                     then exits 75 so callers can fall back to CI.
  release <UDID>     Shut down and delete a leased clone.
  renew <UDID>       Mark a lease as still in use (leases older than $SIM_LEASE_TTL seconds,
                     default 7200, are reclaimed).
  list               Active leases.
  golden [--from <UDID or .app>]
                     Create or rebuild the golden simulator from a simulator that has the
                     development build (default: the first one found) or from a .app.
  reap               Delete expired leases and clones whose lease file is gone.
  idle [--shutdown] [--after <minutes>]
                     Booted simulators nobody is using: no Maestro, Xcode, simctl or Metro process
                     names their UDID, idle for <minutes> (default 0). A leased one also needs
                     its lease unrenewed for at least 20 minutes, so another thread's lease
                     between steps is never taken. --shutdown shuts them down (leases are released) and
                     quits Simulator.app once nothing is booted.
  sweeper [install|uninstall|status]
                     A launchd job that runs "idle --shutdown --after 20" every 5 minutes, so a
                     session that crashed or went offline never leaves a simulator running.

Slots: $SIM_MAX (default: 1 per 8 GB of RAM, between 1 and 4). Each slot also gets its
own ports, so parallel runs never share Metro or the fixture server: Metro 8090+slot,
fixtures 54340+slot. State lives in $SIM_LEASE_DIR (default ~/Library/Caches/ut-dining/sim-leases).
EOF
}

APP_ID="com.ethanl06.ut-dining.dev"
UDID_RE='[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}'
GOLDEN="UT Dining golden"
PREFIX="UT Dining lease"
STATE="${SIM_LEASE_DIR:-$HOME/Library/Caches/ut-dining/sim-leases}"
LOCK="$STATE/.lock"
TTL="${SIM_LEASE_TTL:-7200}"
BUSY=75

info() { printf '%s\n' "$*" >&2; }

max_slots() {
  if [[ -n "${SIM_MAX:-}" ]]; then
    echo "$SIM_MAX"
    return
  fi
  local gb
  gb=$(($(sysctl -n hw.memsize) / 1073741824))
  local n=$((gb / 8))
  ((n < 1)) && n=1
  ((n > 4)) && n=4
  echo "$n"
}

lock() {
  local i
  mkdir -p "$STATE"
  for i in $(seq 1 120); do
    if mkdir "$LOCK" 2>/dev/null; then
      echo $$ >"$LOCK/pid"
      return 0
    fi
    local holder
    holder="$(cat "$LOCK/pid" 2>/dev/null || true)"
    if [[ -n "$holder" ]] && ! kill -0 "$holder" 2>/dev/null; then
      rm -rf "$LOCK"
      continue
    fi
    sleep 0.5
  done
  die "could not take $LOCK after 60 s. Remove it if no sim-lease command is running."
}

unlock() { rm -rf "$LOCK"; }

udid_of() { xcrun simctl list devices | grep -F "$1 (" | head -1 | grep -oE "$UDID_RE" || true; }

app_in_device() {
  local plist
  for plist in "$HOME/Library/Developer/CoreSimulator/Devices/$1/data/Containers/Bundle/Application/"*/*.app/Info.plist; do
    [[ -f "$plist" ]] || continue
    if [[ "$(plutil -extract CFBundleIdentifier raw "$plist" 2>/dev/null)" == "$APP_ID" ]]; then
      dirname "$plist"
      return 0
    fi
  done
  return 1
}

device_plist() { echo "$HOME/Library/Developer/CoreSimulator/Devices/$1/device.plist"; }

source_device() {
  local udid
  for udid in $(xcrun simctl list devices available | grep -vE "($GOLDEN|$PREFIX|UT Dining e2e shard)" | grep -oE "$UDID_RE"); do
    if app_in_device "$udid" >/dev/null; then
      echo "$udid"
      return 0
    fi
  done
  return 1
}

build_golden() {
  local from="${1:-}" app device_type udid old
  if [[ -z "$from" ]]; then
    from="$(source_device)" || die "no simulator has the development build. Install one with: make ios SIM=<name>"
  fi
  if [[ -d "$from" ]]; then
    app="$from"
    device_type="$(xcrun simctl list devicetypes | grep -oE 'com\.apple\.CoreSimulator\.SimDeviceType\.iPhone-[0-9]+(-Pro)?\b' | tail -1)"
  else
    app="$(app_in_device "$from")" || die "$from has no $APP_ID installed."
    device_type="$(plutil -extract deviceType raw "$(device_plist "$from")")"
  fi
  local copy="$STATE/golden-app"
  rm -rf "$copy"
  mkdir -p "$copy"
  cp -R "$app" "$copy/"
  old="$(udid_of "$GOLDEN")"
  if [[ -n "$old" ]]; then
    xcrun simctl shutdown "$old" 2>/dev/null || true
    xcrun simctl delete "$old"
  fi
  info "==> Creating \"$GOLDEN\" ($device_type) with the development build from $from"
  udid="$(xcrun simctl create "$GOLDEN" "$device_type")"
  xcrun simctl boot "$udid"
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl install "$udid" "$copy/"*.app
  xcrun simctl shutdown "$udid"
  rm -rf "$copy"
  info "  ok    golden simulator $udid"
}

lease_files() { ls "$STATE" 2>/dev/null | grep -E "^$UDID_RE$" || true; }

field() { sed -n "s/^$2=//p" "$STATE/$1" 2>/dev/null; }

age() { echo $(($(date +%s) - $(stat -f %m "$STATE/$1"))); }

drop() {
  xcrun simctl shutdown "$1" 2>/dev/null || true
  xcrun simctl delete "$1" 2>/dev/null || true
  rm -f "$STATE/$1"
}

reap() {
  local udid
  for udid in $(lease_files); do
    if ! xcrun simctl list devices | grep -q "$udid"; then
      rm -f "$STATE/$udid"
    elif (($(age "$udid") > TTL)); then
      info "  reclaiming expired lease $udid ($(field "$udid" owner))"
      drop "$udid"
    fi
  done
  for udid in $(xcrun simctl list devices | grep -F "$PREFIX" | grep -oE "$UDID_RE" || true); do
    [[ -f "$STATE/$udid" ]] || drop "$udid"
  done
}

free_slot() {
  local max="$1" slot used udid
  for slot in $(seq 1 "$max"); do
    used=false
    for udid in $(lease_files); do
      [[ "$(field "$udid" slot)" == "$slot" ]] && used=true
    done
    if [[ "$used" == false ]]; then
      echo "$slot"
      return 0
    fi
  done
  return 1
}

acquire() {
  local owner="${USER:-agent}-$$" wait="${SIM_WAIT:-0}"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --owner) owner="$2"; shift 2 ;;
      --wait) wait="$2"; shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done
  local max deadline slot golden udid
  max="$(max_slots)"
  deadline=$(($(date +%s) + wait))
  while true; do
    lock
    reap
    if slot="$(free_slot "$max")"; then
      golden="$(udid_of "$GOLDEN")"
      if [[ -z "$golden" ]]; then
        build_golden || { unlock; exit 1; }
        golden="$(udid_of "$GOLDEN")"
      fi
      xcrun simctl shutdown "$golden" 2>/dev/null || true
      udid="$(xcrun simctl clone "$golden" "$PREFIX $slot ($owner)")" || { unlock; die "could not clone $golden."; }
      printf 'owner=%s\nslot=%s\ncreated=%s\n' "$owner" "$slot" "$(date +%s)" >"$STATE/$udid"
      unlock
      break
    fi
    unlock
    if (($(date +%s) >= deadline)); then
      info "all $max simulator slot(s) are leased:"
      list >&2
      exit "$BUSY"
    fi
    sleep 10
  done
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 2>/dev/null || true
  info "  ok    leased slot $slot: $udid ($owner). Release it with: make sim-release SIM=$udid"
  echo "$udid $slot"
}

idle() {
  local shutdown=false after=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --shutdown) shutdown=true; shift ;;
      --after) after="$2"; shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done
  local marks="$STATE/idle" procs now udid name since any=false
  local grace=$((after > 20 ? after : 20))
  mkdir -p "$marks"
  procs="$(ps -axww -o command 2>/dev/null | grep -E 'maestro|xcodebuild|simctl|expo|java|node' | grep -vE 'CoreSimulator/Devices/|Simulator\.app/|^(grep|ps) ' || true)"
  now="$(date +%s)"
  while IFS= read -r line; do
    udid="$(grep -oE "$UDID_RE" <<<"$line" || true)"
    [[ -n "$udid" ]] || continue
    if grep -qF "$udid" <<<"$procs" || { [[ -f "$STATE/$udid" ]] && (($(age "$udid") < grace * 60)); }; then
      rm -f "$marks/$udid"
      continue
    fi
    [[ -f "$marks/$udid" ]] || touch "$marks/$udid"
    since=$((now - $(stat -f %m "$marks/$udid")))
    ((since >= after * 60)) || continue
    name="$(sed -E 's/^ *(.*) \([0-9A-F-]{36}\).*/\1/' <<<"$line")"
    any=true
    if [[ "$shutdown" == false ]]; then
      echo "$udid  $name  idle $((since / 60)) min"
    elif [[ -f "$STATE/$udid" ]]; then
      lock
      drop "$udid"
      unlock
      info "  ok    released idle lease $name ($udid)"
    else
      xcrun simctl shutdown "$udid" 2>/dev/null || true
      info "  ok    shut down idle simulator $name ($udid)"
    fi
    rm -f "$marks/$udid"
  done < <(xcrun simctl list devices booted | grep -E "$UDID_RE")
  for udid in $(ls "$marks" 2>/dev/null); do
    xcrun simctl list devices booted | grep -q "$udid" || rm -f "$marks/$udid"
  done
  [[ "$any" == true || "$shutdown" == true ]] || info "no idle booted simulators"
  if [[ "$shutdown" == true ]] && ! xcrun simctl list devices booted | grep -qE "$UDID_RE"; then
    osascript -e 'quit app "Simulator"' >/dev/null 2>&1 || true
  fi
}

SWEEPER_LABEL="com.ut-dining.sim-sweeper"
SWEEPER_PLIST="$HOME/Library/LaunchAgents/$SWEEPER_LABEL.plist"
SWEEPER_DIR="$HOME/Library/Application Support/ut-dining"

sweeper() {
  case "${1:-status}" in
    install)
      mkdir -p "$SWEEPER_DIR" "$(dirname "$SWEEPER_PLIST")"
      mkdir -p "$SWEEPER_DIR/scripts/dev"
      cp "$ROOT/scripts/dev/sim-lease.sh" "$ROOT/scripts/dev/lib.sh" "$SWEEPER_DIR/scripts/dev/"
      cat >"$SWEEPER_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$SWEEPER_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SWEEPER_DIR/scripts/dev/sim-lease.sh</string>
    <string>idle</string>
    <string>--shutdown</string>
    <string>--after</string>
    <string>${SIM_IDLE_MINUTES:-20}</string>
  </array>
  <key>StartInterval</key><integer>300</integer>
  <key>StandardOutPath</key><string>$STATE/sweeper.log</string>
  <key>StandardErrorPath</key><string>$STATE/sweeper.log</string>
</dict>
</plist>
PLIST
      launchctl bootout "gui/$(id -u)/$SWEEPER_LABEL" 2>/dev/null || true
      launchctl bootstrap "gui/$(id -u)" "$SWEEPER_PLIST"
      info "  ok    sweeper installed: every 5 min it shuts down simulators idle for ${SIM_IDLE_MINUTES:-20} min. Log: $STATE/sweeper.log"
      ;;
    uninstall)
      launchctl bootout "gui/$(id -u)/$SWEEPER_LABEL" 2>/dev/null || true
      rm -f "$SWEEPER_PLIST"
      info "  ok    sweeper removed"
      ;;
    status)
      if launchctl print "gui/$(id -u)/$SWEEPER_LABEL" >/dev/null 2>&1; then
        info "  ok    sweeper running ($SWEEPER_PLIST)"
      else
        info "  warn  sweeper not installed. Install it with: make sim-sweeper"
        return 1
      fi
      ;;
    *) die "usage: sim-lease.sh sweeper [install|uninstall|status]" ;;
  esac
}

list() {
  local udid any=false
  for udid in $(lease_files); do
    any=true
    printf '%s  slot %s  %s  %s min\n' "$udid" "$(field "$udid" slot)" "$(field "$udid" owner)" $(($(age "$udid") / 60))
  done
  [[ "$any" == true ]] || echo "no active leases ($(max_slots) slot(s))"
}

is_mac || die "simulator leases need macOS with Xcode."
xcrun simctl help >/dev/null 2>&1 || die "xcrun simctl is not available. Install Xcode."
mkdir -p "$STATE"

cmd="${1:-}"
[[ $# -gt 0 ]] && shift
case "$cmd" in
  acquire) acquire "$@" ;;
  release)
    [[ "${1:-}" =~ ^$UDID_RE$ ]] || die "usage: sim-lease.sh release <UDID>"
    [[ -f "$STATE/$1" ]] || die "$1 is not a leased simulator."
    lock
    drop "$1"
    unlock
    info "  ok    released $1"
    ;;
  renew)
    [[ -f "$STATE/${1:-none}" ]] || die "$1 is not a leased simulator."
    touch "$STATE/$1"
    ;;
  list) list ;;
  golden)
    lock
    trap unlock EXIT
    [[ "${1:-}" == "--from" ]] && build_golden "$2" || build_golden
    ;;
  reap)
    lock
    reap
    unlock
    ;;
  idle) idle "$@" ;;
  sweeper) sweeper "$@" ;;
  -h | --help | help | "") usage ;;
  *) usage >&2; exit 1 ;;
esac
