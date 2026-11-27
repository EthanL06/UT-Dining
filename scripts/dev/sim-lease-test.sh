#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

T="$(mktemp -d)"
BIN="$T/bin"
mkdir -p "$BIN" "$T/ports" "$T/gh" "$T/leases" "$T/home"
: >"$T/devices"
: >"$T/procs"
FAILED=0

cleanup() {
  local pid
  for pid in $(awk '{print $1}' "$T/procs" 2>/dev/null); do
    kill -9 "$pid" 2>/dev/null || true
  done
  rm -rf "$T"
}
trap cleanup EXIT

stub() {
  { printf '%s%s\n' '#' "!$(command -v bash)"; cat; } >"$BIN/$1"
  chmod +x "$BIN/$1"
}

stub uname <<'EOF'
echo Darwin
EOF
stub stat <<'EOF'
/usr/bin/stat -c %Y "$3" 2>/dev/null || /usr/bin/stat -f %m "$3"
EOF
stub sysctl <<'EOF'
case "$2" in
  hw.memsize) echo 34359738368 ;;
  hw.ncpu) echo 10 ;;
  vm.loadavg) echo '{ 1.00 1.00 1.00 }' ;;
esac
EOF
stub xcrun <<'EOF'
DB="$SIM_TEST_DIR/devices"
shift
cmd="$1"
shift || true
set_state() { awk -F'|' -v u="$1" -v s="$2" 'BEGIN{OFS="|"} $1==u{$3=s} {print}' "$DB" >"$DB.tmp" && mv "$DB.tmp" "$DB"; }
case "$cmd" in
  help) exit 0 ;;
  list)
    while IFS='|' read -r udid name state; do
      [[ -n "$udid" ]] || continue
      [[ "${2:-}" == booted && "$state" != Booted ]] && continue
      printf '    %s (%s) (%s)\n' "$name" "$udid" "$state"
    done <"$DB"
    ;;
  boot) set_state "$1" Booted ;;
  shutdown) set_state "$1" Shutdown ;;
  delete) grep -v "^$1|" "$DB" >"$DB.tmp" || true; mv "$DB.tmp" "$DB" ;;
  clone)
    udid="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
    udid="$(tr '[:lower:]' '[:upper:]' <<<"$udid")"
    echo "$udid|$2|Shutdown" >>"$DB"
    echo "$udid"
    ;;
  bootstatus | status_bar) exit 0 ;;
esac
EOF
stub ps <<'EOF'
while read -r pid command; do
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null || continue
  if [[ "$*" == *pid=* ]]; then echo "$pid $command"; else echo "$command"; fi
done <"$SIM_TEST_DIR/procs"
EOF
stub lsof <<'EOF'
port="${1#-tiTCP:}"
f="$SIM_TEST_DIR/ports/$port"
[[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null && cat "$f"
true
EOF
stub gh <<'EOF'
url=""
for arg in "$@"; do
  [[ "$arg" == repos/* ]] && url="$arg" && break
done
key="$(tr '/?&=:' '_____' <<<"$url")"
[[ " $* " == *" -X PUT "* ]] && key="$key.put"
[[ -f "$SIM_TEST_DIR/gh/$key" ]] && cat "$SIM_TEST_DIR/gh/$key"
true
EOF
for tool in osascript launchctl; do
  stub "$tool" <<<'true'
done

export PATH="$BIN:$PATH" SIM_TEST_DIR="$T" SIM_LEASE_DIR="$T/leases" HOME="$T/home" SIM_KILL_WAIT=0 SIM_ORPHAN_SECONDS=0
LEASE="$ROOT/scripts/dev/sim-lease.sh"
SWEEP="$ROOT/scripts/dev/sim-sweep.sh"
GOLDEN_UDID="00000000-0000-0000-0000-00000000000A"
echo "$GOLDEN_UDID|UT Dining golden|Shutdown" >>"$T/devices"

spawn() {
  local pid
  pid="$(sleep 300 </dev/null >/dev/null 2>&1 & echo $!)"
  echo "$pid $1" >>"$T/procs"
  echo "$pid"
}

listen() {
  local pid
  pid="$(spawn "node metro --port $1")"
  echo "$pid" >"$T/ports/$1"
  echo "$pid"
}

alive() { kill -0 "$1" 2>/dev/null && ! grep -q '^Z' <<<"$(/bin/ps -o stat= -p "$1" 2>/dev/null)"; }

backdate() { perl -e '$t = time - $ARGV[0] * 60; utime $t, $t, $ARGV[1]' "$2" "$1"; }

check() {
  if eval "$2"; then
    ok "$1"
  else
    bad "$1"
    FAILED=1
  fi
}

leased() { [[ -f "$T/leases/$1" ]]; }

lease() {
  local dir="$1" owner="$2" out
  shift 2
  out="$(cd "$dir" && "$LEASE" acquire --owner "$owner" "$@" 2>/dev/null)"
  echo "${out%% *}"
}

repo() {
  local dir="$T/$1"
  git init -q -b "$2" "$dir"
  git -C "$dir" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
  echo "$dir"
}

sweep() {
  bash -x "$SWEEP" sweep "$@" >"$T/sweep.log" 2>&1 || { tail -n 60 "$T/sweep.log" >&2; die "sweep failed"; }
}

gh_answer() { printf '%s\n' "$2" >"$T/gh/$(tr '/?&=:' '_____' <<<"$1")"; }

step "Leases record their PR, branch and worktree"
WT_A="$(repo a fix-hours-spacing)"
WT_B="$(repo b feat-open-pr)"
WT_C="$(repo c feat-removed)"
A="$(lease "$WT_A" hours-thread --pr 158)"
B="$(lease "$WT_B" open-thread)"
C="$(lease "$WT_C" pr-171)"
check "acquire wrote the PR" "grep -qx 'pr=158' '$T/leases/$A'"
check "acquire wrote the branch" "grep -qx 'branch=fix-hours-spacing' '$T/leases/$A'"
check "acquire wrote the worktree" "grep -qx 'worktree=$WT_A' '$T/leases/$A'"
check "list shows the branch and PR" "'$LEASE' list | grep '$A' | grep -q 'fix-hours-spacing  #158'"

step "release --pr and --branch stop the slot's Metro and Maestro"
SLOT_A="$(sed -n 's/^slot=//p' "$T/leases/$A")"
METRO_A="$(listen $((8090 + SLOT_A)))"
MAESTRO_A="$(spawn "java -jar maestro.jar test --udid $A flow.yaml")"
"$LEASE" release --pr 158 2>/dev/null
check "lease of #158 released" "! leased '$A'"
check "its simulator deleted" "! grep -q '$A' '$T/devices'"
check "its Metro stopped" "! alive '$METRO_A'"
check "its Maestro stopped" "! alive '$MAESTRO_A'"
check "other leases kept" "leased '$B' && leased '$C'"
D="$(lease "$WT_A" again)"
"$LEASE" release --branch fix-hours-spacing 2>/dev/null
check "release --branch released the lease of that branch" "! leased '$D'"
E="$(lease "$WT_A" here-thread)"
(cd "$WT_A" && "$LEASE" release --here 2>/dev/null)
check "release --here released the lease of this worktree" "! leased '$E'"
check "release with no match succeeds" "'$LEASE' release --pr 999 2>/dev/null"

step "sweep releases leases of merged or closed PRs and removed worktrees"
gh_answer "repos/EthanL06/UT-Dining/pulls/171" "merged"
gh_answer "repos/EthanL06/UT-Dining/pulls?head=EthanL06:feat-open-pr&state=all&per_page=1" ""
sweep --dry-run
check "--dry-run changes nothing" "leased '$C'"
sweep
check "lease of merged #171 (owner pr-171) released" "! leased '$C'"
check "lease of a branch with an open PR kept" "leased '$B'"
F="$(lease "$WT_B" closed-branch)"
gh_answer "repos/EthanL06/UT-Dining/pulls?head=EthanL06:feat-open-pr&state=all&per_page=1" "closed #172"
sweep
check "leases of a branch whose newest PR is closed released" "! leased '$B' && ! leased '$F'"
WT_G="$(repo g feat-gone)"
G="$(lease "$WT_G" gone-thread)"
rm -rf "$WT_G"
sweep
check "lease of a removed worktree released" "! leased '$G'"

step "idle leases go after 15 minutes even with Metro still running"
WT_H="$(repo h feat-idle)"
H="$(lease "$WT_H" idle-thread)"
I="$(lease "$WT_H" busy-thread)"
METRO_H="$(spawn "node expo run:ios --device $H")"
spawn "java maestro test --udid $I flow.yaml" >/dev/null
backdate "$T/leases/$H" 16
backdate "$T/leases/$I" 16
OWN="00000000-0000-0000-0000-00000000000B"
echo "$OWN|iPhone 17 Pro|Booted" >>"$T/devices"
spawn "node expo run:ios --device $OWN" >/dev/null
sweep
check "idle lease with only Metro released" "! leased '$H'"
check "its Metro stopped" "! alive '$METRO_H'"
check "lease with Maestro running kept" "leased '$I'"
check "Ethan's own simulator with Metro kept booted" "grep -q '$OWN|iPhone 17 Pro|Booted' '$T/devices'"
"$LEASE" release "$I" 2>/dev/null
P="$(lease "$WT_H" perf-bench)"
spawn "python3 scripts/qa/perf/drive.py .context/perf3 $P" >/dev/null
backdate "$T/leases/$P" 30
sweep
check "lease driven by a Python script kept" "leased '$P'"
"$LEASE" release "$P" 2>/dev/null
J="$(lease "$WT_H" fresh-thread)"
backdate "$T/leases/$J" 5
sweep
check "lease renewed 5 minutes ago kept" "leased '$J'"

step "orphans stop on the second sweep that sees them"
GONE="11111111-2222-3333-4444-555555555555"
ORPHAN="$(spawn "java maestro test --udid $GONE flow.yaml")"
PORT_ORPHAN="$(listen 8094)"
sweep
check "first sweep leaves them" "alive '$ORPHAN' && alive '$PORT_ORPHAN'"
sweep
check "Maestro naming a deleted simulator stopped" "! alive '$ORPHAN'"
check "Metro on an unleased slot port stopped" "! alive '$PORT_ORPHAN'"

step "merge-pr releases the leases of the PR it merged"
"$LEASE" release "$J" 2>/dev/null
WT_K="$(repo k fix-merged-here)"
K="$(lease "$WT_K" merge-thread)"
WT_L="$(repo l feat-other)"
L="$(lease "$WT_L" other-thread --pr 300)"
gh_answer "repos/EthanL06/UT-Dining/pulls/201" \
  '{"base":{"ref":"staging"},"state":"open","draft":false,"mergeable_state":"clean","head":{"sha":"abc1234def","ref":"fix-merged-here"}}'
gh_answer "repos/EthanL06/UT-Dining/pulls/201/merge.put" "abc1234def"
"$ROOT/scripts/dev/merge-pr.sh" 201 --title "fix(mobile): keep hours spaced" --body "Spacing." >/dev/null 2>&1
check "lease of the merged branch released" "! leased '$K'"
check "lease of another PR kept" "leased '$L'"

[[ $FAILED -eq 0 ]] || die "sim lease tests failed"
ok "sim lease and sweeper tests passed"
