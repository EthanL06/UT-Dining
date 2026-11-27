#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
. "$(dirname "${BASH_SOURCE[0]}")/sim-lib.sh"

usage() {
  cat <<'EOF'
Usage: scripts/dev/sim-lease.sh <command>

Gives each agent or session its own iOS Simulator, so parallel threads never share one.
Every lease is a clone of a "UT Dining golden" simulator that holds the development build
and is never booted by hand. Clones take seconds because APFS copies them lazily.

  acquire [--owner <name>] [--pr <n>] [--wait <seconds>]
                     Clone the golden simulator, boot it, and print "<UDID> <slot>".
                     Waits up to --wait seconds (default $SIM_WAIT or 0) for a free slot,
                     then exits 75 so callers can fall back to CI. The lease records the
                     branch and worktree it was taken from, and the PR (--pr, $SIM_PR or an
                     owner named pr-<n>), so merging or closing that PR releases it.
  release <UDID>     Shut down and delete a leased clone, and stop the Metro, fixture server
                     and Maestro processes of its slot.
  release [--pr <n>] [--branch <name>] [--owner <name>] [--here]
                     The same for every lease of that PR, branch, owner or (--here) the
                     current worktree. merge-pr.sh runs it after every merge.
  renew <UDID>       Mark a lease as still in use (leases older than $SIM_LEASE_TTL seconds,
                     default 7200, are reclaimed).
  list               Active leases.
  golden [--from <UDID or .app>]
                     Create or rebuild the golden simulator from a simulator that has the
                     development build (default: the first one found) or from a .app.
  reap               Delete expired leases and clones whose lease file is gone.
  idle, sweep, sweeper
                     Handled by scripts/dev/sim-sweep.sh (see its --help).

Slots: $SIM_MAX (default: 1 per 8 GB of RAM, between 1 and 4), minus every other booted
simulator, and none while the 5-minute load average is over $SIM_LOAD_FACTOR (default 2) times
the core count, so a busy Mac sends callers to CI instead of starving every run. Each slot also gets its
own ports, so parallel runs never share Metro or the fixture server: Metro 8090+slot,
fixtures 54340+slot. State lives in $SIM_LEASE_DIR (default ~/Library/Caches/ut-dining/sim-leases).
EOF
}

BUSY=75

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

is_dev_client() { [[ -d "$1/EXDevLauncher.bundle" ]]; }

newest_iphone_type() {
  xcrun simctl list runtimes -j | node -e '
    const r = JSON.parse(require("fs").readFileSync(0, "utf8")).runtimes
      .filter((x) => x.platform === "iOS" && x.isAvailable).pop();
    const t = (r?.supportedDeviceTypes ?? []).filter((d) => /^iPhone \d+$/.test(d.name))
      .sort((a, b) => Number(a.name.slice(7)) - Number(b.name.slice(7))).pop();
    if (t) process.stdout.write(t.identifier);
  '
}

booted_others() {
  xcrun simctl list devices booted | grep -E "$UDID_RE" | grep -vcE "($GOLDEN|$PREFIX)" || true
}

overloaded() {
  local load cpus
  load="$(sysctl -n vm.loadavg | awk '{print int($2)}')"
  cpus="$(sysctl -n hw.ncpu)"
  ((load > cpus * ${SIM_LOAD_FACTOR:-2}))
}

device_plist() { echo "$HOME/Library/Developer/CoreSimulator/Devices/$1/device.plist"; }

source_device() {
  local udid
  for udid in $(xcrun simctl list devices available | grep -vE "($GOLDEN|$PREFIX|UT Dining e2e shard)" | grep -oE "$UDID_RE"); do
    local app
    if app="$(app_in_device "$udid")" && is_dev_client "$app"; then
      echo "$udid"
      return 0
    fi
  done
  return 1
}

build_golden() {
  local from="${1:-}" app device_type udid old
  if [[ -z "$from" ]]; then
    from="$(source_device)" || die "no simulator has a development client of $APP_ID (release builds don't count). Build one on a lease: make sim-lease, then make ios SIM=<that UDID>, then sim-lease.sh golden --from <that UDID>"
  fi
  if [[ -d "$from" ]]; then
    app="$from"
    device_type="$(newest_iphone_type)"
  else
    app="$(app_in_device "$from")" || die "$from has no $APP_ID installed."
    device_type="$(plutil -extract deviceType raw "$(device_plist "$from")")"
  fi
  is_dev_client "$app" || die "$app is a release build (no EXDevLauncher.bundle). The golden simulator needs a development client."
  [[ -n "$device_type" ]] || die "could not pick a device type for the golden simulator."
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
  udid="$(xcrun simctl create "$GOLDEN" "$device_type")" || die "simctl create $device_type failed."
  [[ -n "$udid" ]] || die "simctl create returned no UDID."
  xcrun simctl boot "$udid" || die "could not boot $udid."
  xcrun simctl bootstatus "$udid" -b >/dev/null || die "$udid did not finish booting."
  xcrun simctl install "$udid" "$copy/"*.app || die "could not install the app on $udid."
  xcrun simctl shutdown "$udid" || die "could not shut down $udid."
  rm -rf "$copy"
  info "  ok    golden simulator $udid"
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
  local owner="${USER:-agent}-$$" wait="${SIM_WAIT:-0}" pr="${SIM_PR:-}" branch worktree
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --owner) owner="$2"; shift 2 ;;
      --pr) pr="$2"; shift 2 ;;
      --wait) wait="$2"; shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done
  [[ -z "$pr" || "$pr" =~ ^[0-9]+$ ]] || die "--pr needs a PR number"
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  worktree="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  local max deadline slot golden udid others room
  max="$(max_slots)"
  deadline=$(($(date +%s) + wait))
  while true; do
    lock
    reap
    others="$(booted_others)"
    room=$((max - others))
    ((room < 0)) && room=0
    if overloaded; then
      info "  busy  load average is over ${SIM_LOAD_FACTOR:-2}x the $(sysctl -n hw.ncpu) cores"
    elif ((room > 0)) && slot="$(free_slot "$room")"; then
      golden="$(udid_of "$GOLDEN")"
      if [[ -z "$golden" ]]; then
        build_golden || { unlock; exit 1; }
        golden="$(udid_of "$GOLDEN")"
      fi
      xcrun simctl shutdown "$golden" 2>/dev/null || true
      udid="$(xcrun simctl clone "$golden" "$PREFIX $slot ($owner)")" || { unlock; die "could not clone $golden."; }
      printf 'owner=%s\nslot=%s\ncreated=%s\npr=%s\nbranch=%s\nworktree=%s\n' \
        "$owner" "$slot" "$(date +%s)" "$pr" "$branch" "$worktree" >"$STATE/$udid"
      unlock
      break
    fi
    unlock
    if (($(date +%s) >= deadline)); then
      info "no simulator slot free: $max slot(s), $others other booted simulator(s), load $(sysctl -n vm.loadavg)"
      list >&2
      exit "$BUSY"
    fi
    sleep 10
  done
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 2>/dev/null || true
  info "  ok    leased slot $slot: $udid ($owner). Release it with: make sim-release SIM=$udid (merging the PR releases it too)"
  echo "$udid $slot"
}

pr_label() { [[ -n "$1" ]] && echo "  #$1"; true; }

release_matching() {
  local pr="" branch="" owner="" here="" udid hit any=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --pr) pr="$2"; shift 2 ;;
      --branch) branch="$2"; shift 2 ;;
      --owner) owner="$2"; shift 2 ;;
      --here) here="$(git rev-parse --show-toplevel 2>/dev/null)" || die "--here must run inside a git worktree"; shift ;;
      *) die "unknown option $1" ;;
    esac
  done
  [[ -n "$pr$branch$owner$here" ]] || die "usage: sim-lease.sh release <UDID> | --pr <n> | --branch <name> | --owner <name> | --here"
  lock
  for udid in $(lease_files); do
    hit=false
    [[ -n "$pr" && "$(lease_pr "$udid")" == "$pr" ]] && hit=true
    [[ -n "$branch" && "$(field "$udid" branch)" == "$branch" ]] && hit=true
    [[ -n "$owner" && "$(field "$udid" owner)" == "$owner" ]] && hit=true
    [[ -n "$here" && "$(field "$udid" worktree)" == "$here" ]] && hit=true
    [[ "$hit" == true ]] || continue
    any=true
    info "  ok    releasing $udid ($(field "$udid" owner))"
    drop "$udid"
  done
  unlock
  [[ "$any" == true ]] || info "  ok    no leases to release"
}

list() {
  local udid any=false
  for udid in $(lease_files); do
    any=true
    printf '%s  slot %s  %s  %s min  %s%s\n' "$udid" "$(field "$udid" slot)" "$(field "$udid" owner)" \
      $(($(age "$udid") / 60)) "$(field "$udid" branch)" "$(pr_label "$(lease_pr "$udid")")"
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
    if [[ "${1:-}" == --* ]]; then
      release_matching "$@"
      exit 0
    fi
    [[ "${1:-}" =~ ^$UDID_RE$ ]] || die "usage: sim-lease.sh release <UDID> | --pr <n> | --branch <name> | --owner <name> | --here"
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
    if [[ "${1:-}" == "--from" ]]; then
      build_golden "${2:?--from needs a UDID or .app}"
    else
      build_golden
    fi
    ;;
  reap)
    lock
    reap
    unlock
    ;;
  idle | sweep | sweeper) exec "$(dirname "${BASH_SOURCE[0]}")/sim-sweep.sh" "$cmd" "$@" ;;
  -h | --help | help | "") usage ;;
  *) usage >&2; exit 1 ;;
esac
