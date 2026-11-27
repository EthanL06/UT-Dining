#!/usr/bin/env bash

APP_ID="com.ethanl06.ut-dining.dev"
UDID_RE='[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}'
GOLDEN="UT Dining golden"
PREFIX="UT Dining lease"
STATE="${SIM_LEASE_DIR:-$HOME/Library/Caches/ut-dining/sim-leases}"
LOCK="$STATE/.lock"
TTL="${SIM_LEASE_TTL:-7200}"
REPO="${REPO:-EthanL06/UT-Dining}"
METRO_BASE=8090
FIXTURE_BASE=54340
WORKER_RE='maestro|xcodebuild|simctl|expo|java|node|xctest'
SELF_RE='sim-lease\.sh|sim-sweep\.sh|merge-pr\.sh|CoreSimulator/Devices/|Simulator\.app/|^ *([0-9]+ +)?([^ ]*/)?(grep|ps|lsof|awk|sed) '

info() { printf '%s\n' "$*" >&2; }

lock() {
  local i holder
  mkdir -p "$STATE"
  for i in $(seq 1 120); do
    if mkdir "$LOCK" 2>/dev/null; then
      echo $$ >"$LOCK/pid"
      return 0
    fi
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

mtime() { stat -f %m "$1"; }

lease_files() { ls "$STATE" 2>/dev/null | grep -E "^$UDID_RE$" || true; }

field() { sed -n "s/^$2=//p" "$STATE/$1" 2>/dev/null || true; }

age() { echo $(($(date +%s) - $(mtime "$STATE/$1"))); }

lease_pr() {
  local pr owner
  pr="$(field "$1" pr)"
  if [[ -z "$pr" ]]; then
    owner="$(field "$1" owner)"
    [[ "$owner" =~ ^pr-([0-9]+)$ ]] && pr="${BASH_REMATCH[1]}"
  fi
  echo "$pr"
}

udid_pids() {
  ps -axww -o pid=,command= 2>/dev/null | grep -F "$1" | grep -E "$WORKER_RE" | grep -vE "$SELF_RE" \
    | awk -v self=$$ '$1 != self {print $1}' || true
}

port_pids() { lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null || true; }

slot_pids() {
  local slot="$1"
  [[ "$slot" =~ ^[0-9]+$ ]] || return 0
  port_pids $((METRO_BASE + slot))
  port_pids $((FIXTURE_BASE + slot))
}

stop_pids() {
  local pids
  pids="$(tr ' ' '\n' <<<"$*" | grep -E '^[0-9]+$' | sort -u | tr '\n' ' ' || true)"
  [[ -n "${pids// /}" ]] || return 0
  kill $pids 2>/dev/null || true
  sleep "${SIM_KILL_WAIT:-2}"
  kill -9 $pids 2>/dev/null || true
  info "  ok    stopped processes $pids"
}

drop() {
  local udid="$1" slot
  slot="$(field "$udid" slot)"
  stop_pids "$(udid_pids "$udid") $(slot_pids "$slot")"
  xcrun simctl shutdown "$udid" 2>/dev/null || true
  xcrun simctl delete "$udid" 2>/dev/null || true
  rm -f "$STATE/$udid"
}

reap() {
  local udid devices
  devices="$(xcrun simctl list devices)"
  for udid in $(lease_files); do
    if ! grep -qF "$udid" <<<"$devices"; then
      stop_pids "$(udid_pids "$udid") $(slot_pids "$(field "$udid" slot)")"
      rm -f "$STATE/$udid"
    elif (($(age "$udid") > TTL)); then
      info "  reclaiming expired lease $udid ($(field "$udid" owner))"
      drop "$udid"
    fi
  done
  for udid in $(grep -F "$PREFIX" <<<"$devices" | grep -oE "$UDID_RE" || true); do
    [[ -f "$STATE/$udid" ]] || drop "$udid"
  done
}
