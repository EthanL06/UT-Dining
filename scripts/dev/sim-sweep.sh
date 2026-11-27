#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
. "$(dirname "${BASH_SOURCE[0]}")/sim-lib.sh"

usage() {
  cat <<'EOF'
Usage: scripts/dev/sim-sweep.sh <command>

Keeps Ethan's Mac free of simulators and processes nobody is using.

  sweep [--dry-run] [--after <minutes>]
                     What the launchd sweeper runs every 5 minutes:
                     1. reclaims leases past their TTL and clones whose lease file is gone;
                     2. releases every lease whose PR is merged or closed (the PR comes from
                        the lease, or from the newest PR of its branch), or whose worktree
                        was removed;
                     3. idle --shutdown --after <minutes> (default $SIM_IDLE_MINUTES or 15);
                     4. stops orphans: Metro or fixture servers on a lease port no lease holds,
                        and Maestro, Expo, Metro or Xcode processes that target a simulator that
                        no longer exists, once two sweeps in a row see them.
                     --dry-run prints what it would do and changes nothing.
  idle [--shutdown] [--after <minutes>]
                     Booted simulators nobody is using, idle for <minutes> (default 0).
                     A leased clone is busy only while a Maestro, xcodebuild, simctl or XCTest
                     process names it or its lease was renewed in the last
                     $SIM_IDLE_MINUTES (default 15) minutes; a Metro server left running
                     (expo run:ios --device <UDID>) does not keep it alive, and releasing it
                     stops that Metro. Any other simulator stays busy while any of those
                     processes or Metro names it. --shutdown shuts them down (leases are
                     released) and quits Simulator.app once nothing is booted.
  sweeper [install|uninstall|status]
                     The launchd job that runs "sweep" every 5 minutes. install copies these
                     scripts out of the repo, so run it again after they change.
EOF
}

IDLE_MINUTES="${SIM_IDLE_MINUTES:-15}"
BUSY_RE='maestro|xcodebuild|simctl|xctest'
TARGET_RE='maestro|xcodebuild|run:ios|--device|--udid|-destination'
MARKS="$STATE/idle"
ORPHANS="$STATE/orphans"
LOG="$STATE/sweeper.log"
DRY=false

act() {
  if [[ "$DRY" == true ]]; then
    info "  dry   would $*"
    return 1
  fi
  return 0
}

pr_closed() {
  gh api "repos/$REPO/pulls/$1" \
    --jq 'if .merged then "merged" elif .state == "closed" then "closed" else "" end' 2>/dev/null || true
}

branch_pr_closed() {
  gh api "repos/$REPO/pulls?head=${REPO%%/*}:$1&state=all&per_page=1" \
    --jq '.[0] | if . == null then "" elif .merged_at then "merged #\(.number)" elif .state == "closed" then "closed #\(.number)" else "" end' \
    2>/dev/null || true
}

stale_reason() {
  local udid="$1" pr branch worktree state
  worktree="$(field "$udid" worktree)"
  if [[ -n "$worktree" && ! -d "$worktree" ]]; then
    echo "worktree $worktree was removed"
    return
  fi
  pr="$(lease_pr "$udid")"
  if [[ -n "$pr" ]]; then
    state="$(pr_closed "$pr")"
    [[ -n "$state" ]] && echo "PR #$pr is $state"
    return
  fi
  branch="$(field "$udid" branch)"
  case "$branch" in
    "" | HEAD | main | staging) return ;;
  esac
  state="$(branch_pr_closed "$branch")"
  [[ -n "$state" ]] && echo "the PR of $branch is $state"
  true
}

release_stale() {
  local udid reason owner
  for udid in $(lease_files); do
    reason="$(stale_reason "$udid")"
    [[ -n "$reason" ]] || continue
    owner="$(field "$udid" owner)"
    act "release $udid ($owner): $reason" || continue
    lock
    if [[ -f "$STATE/$udid" ]]; then
      drop "$udid"
    fi
    unlock
    info "  ok    released $udid ($owner): $reason"
  done
}

seen_before() {
  local mark="$ORPHANS/$1"
  mkdir -p "$ORPHANS"
  if [[ -f "$mark" ]] && (($(date +%s) - $(mtime "$mark") >= ${SIM_ORPHAN_SECONDS:-240})); then
    return 0
  fi
  [[ -f "$mark" ]] || touch "$mark"
  return 1
}

stop_orphans() {
  local slot used udid pids devices keep=" "
  for slot in $(seq 1 "${SIM_MAX_SLOTS:-4}"); do
    used=false
    for udid in $(lease_files); do
      [[ "$(field "$udid" slot)" == "$slot" ]] && used=true
    done
    [[ "$used" == false ]] || continue
    pids="$(slot_pids "$slot" | tr '\n' ' ')"
    [[ -n "${pids// /}" ]] || continue
    keep+="slot-$slot "
    seen_before "slot-$slot" || continue
    act "stop processes $pids on the ports of unleased slot $slot" || continue
    stop_pids "$pids"
    rm -f "$ORPHANS/slot-$slot"
  done
  devices="$(xcrun simctl list devices)"
  for udid in $(ps -axww -o command= 2>/dev/null | grep -E "$WORKER_RE" | grep -vE "$SELF_RE" | grep -E "$TARGET_RE" | grep -oE "$UDID_RE" | sort -u || true); do
    grep -qF "$udid" <<<"$devices" && continue
    keep+="$udid "
    seen_before "$udid" || continue
    act "stop processes naming deleted simulator $udid" || continue
    stop_pids "$(udid_pids "$udid")"
    rm -f "$ORPHANS/$udid"
  done
  for udid in $(ls "$ORPHANS" 2>/dev/null); do
    [[ "$keep" == *" $udid "* ]] || rm -f "$ORPHANS/$udid"
  done
}

busy() {
  local udid="$1" procs="$2" grace="$3"
  if [[ -f "$STATE/$udid" ]]; then
    (($(age "$udid") < grace * 60)) && return 0
    grep -F "$udid" <<<"$procs" | grep -qE "$BUSY_RE"
    return
  fi
  grep -qF "$udid" <<<"$procs"
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
  local procs now udid name since any=false booted
  local grace=$((after > IDLE_MINUTES ? after : IDLE_MINUTES))
  mkdir -p "$MARKS"
  procs="$(ps -axww -o command= 2>/dev/null | grep -E "$WORKER_RE" | grep -vE "$SELF_RE" || true)"
  now="$(date +%s)"
  booted="$(xcrun simctl list devices booted | grep -E "$UDID_RE" || true)"
  while IFS= read -r line; do
    udid="$(grep -oE "$UDID_RE" <<<"$line" || true)"
    [[ -n "$udid" ]] || continue
    if busy "$udid" "$procs" "$grace"; then
      rm -f "$MARKS/$udid"
      continue
    fi
    if [[ ! -f "$MARKS/$udid" && -f "$STATE/$udid" ]]; then
      touch -r "$STATE/$udid" "$MARKS/$udid"
    elif [[ ! -f "$MARKS/$udid" ]]; then
      touch "$MARKS/$udid"
    fi
    since=$((now - $(mtime "$MARKS/$udid")))
    ((since >= after * 60)) || continue
    name="$(sed -E 's/^ *(.*) \([0-9A-F-]{36}\).*/\1/' <<<"$line")"
    any=true
    if [[ "$shutdown" == false ]]; then
      echo "$udid  $name  idle $((since / 60)) min"
      continue
    fi
    if [[ -f "$STATE/$udid" ]]; then
      act "release idle lease $name ($udid)" || continue
      lock
      drop "$udid"
      unlock
      info "  ok    released idle lease $name ($udid)"
    else
      act "shut down idle simulator $name ($udid)" || continue
      xcrun simctl shutdown "$udid" 2>/dev/null || true
      info "  ok    shut down idle simulator $name ($udid)"
    fi
    rm -f "$MARKS/$udid"
  done <<<"$booted"
  for udid in $(ls "$MARKS" 2>/dev/null); do
    grep -qF "$udid" <<<"$booted" || rm -f "$MARKS/$udid"
  done
  [[ "$any" == true ]] || info "no idle booted simulators"
  if [[ "$shutdown" == true && "$DRY" == false ]] && ! xcrun simctl list devices booted | grep -qE "$UDID_RE"; then
    osascript -e 'quit app "Simulator"' >/dev/null 2>&1 || true
  fi
}

trim_log() {
  [[ -f "$LOG" ]] || return 0
  (($(wc -c <"$LOG") > 524288)) || return 0
  tail -n 2000 "$LOG" >"$LOG.tmp" && cat "$LOG.tmp" >"$LOG" && rm -f "$LOG.tmp"
}

sweep() {
  local after="$IDLE_MINUTES"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) DRY=true; shift ;;
      --after) after="$2"; shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done
  trim_log
  info "==> sweep $(date '+%Y-%m-%d %H:%M:%S')"
  if [[ "$DRY" == false ]]; then
    lock
    reap
    unlock
  fi
  release_stale
  idle --shutdown --after "$after"
  stop_orphans
}

SWEEPER_LABEL="com.ut-dining.sim-sweeper"
SWEEPER_PLIST="$HOME/Library/LaunchAgents/$SWEEPER_LABEL.plist"
SWEEPER_DIR="$HOME/Library/Application Support/ut-dining"

sweeper() {
  case "${1:-status}" in
    install)
      mkdir -p "$SWEEPER_DIR/scripts/dev" "$(dirname "$SWEEPER_PLIST")"
      cp "$ROOT/scripts/dev/lib.sh" "$ROOT/scripts/dev/sim-lib.sh" "$ROOT/scripts/dev/sim-lease.sh" \
        "$ROOT/scripts/dev/sim-sweep.sh" "$SWEEPER_DIR/scripts/dev/"
      cat >"$SWEEPER_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$SWEEPER_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SWEEPER_DIR/scripts/dev/sim-sweep.sh</string>
    <string>sweep</string>
    <string>--after</string>
    <string>$IDLE_MINUTES</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StartInterval</key><integer>300</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
      launchctl bootout "gui/$(id -u)/$SWEEPER_LABEL" 2>/dev/null || true
      launchctl bootstrap "gui/$(id -u)" "$SWEEPER_PLIST"
      info "  ok    sweeper installed: every 5 min it releases leases of merged or closed PRs and simulators idle for $IDLE_MINUTES min, and stops orphaned Metro and Maestro. Log: $LOG"
      ;;
    uninstall)
      launchctl bootout "gui/$(id -u)/$SWEEPER_LABEL" 2>/dev/null || true
      rm -f "$SWEEPER_PLIST"
      info "  ok    sweeper removed"
      ;;
    status)
      if ! launchctl print "gui/$(id -u)/$SWEEPER_LABEL" >/dev/null 2>&1; then
        info "  warn  sweeper not installed. Install it with: make sim-sweeper"
        return 1
      fi
      if ! grep -q 'sim-sweep.sh' "$SWEEPER_PLIST" 2>/dev/null \
        || ! cmp -s "$ROOT/scripts/dev/sim-sweep.sh" "$SWEEPER_DIR/scripts/dev/sim-sweep.sh"; then
        info "  warn  sweeper is running an older copy of the scripts. Update it with: make sim-sweeper"
        return 1
      fi
      info "  ok    sweeper running ($SWEEPER_PLIST). Last run:"
      tail -n 5 "$LOG" 2>/dev/null >&2 || true
      ;;
    *) die "usage: sim-sweep.sh sweeper [install|uninstall|status]" ;;
  esac
}

is_mac || die "simulator sweeping needs macOS with Xcode."
xcrun simctl help >/dev/null 2>&1 || die "xcrun simctl is not available. Install Xcode."
mkdir -p "$STATE"

cmd="${1:-}"
[[ $# -gt 0 ]] && shift
case "$cmd" in
  sweep) sweep "$@" ;;
  idle) idle "$@" ;;
  sweeper) sweeper "$@" ;;
  -h | --help | help | "") usage ;;
  *) usage >&2; exit 1 ;;
esac
