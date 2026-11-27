#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

METRO_PORT="${METRO_PORT:-8081}"

usage() {
  cat <<'EOF'
Usage: scripts/dev/clean.sh <command>

  metro       Stop the Metro server on $METRO_PORT (default 8081)
  sims        Delete leftover E2E simulator clones
  sims-all    Also shut down every booted simulator
  worktrees   Remove worktrees in .worktrees/ and .claude/worktrees/ that have no
              uncommitted changes and no unpushed commits, then prune stale entries
  caches      Remove Turborepo, Next.js and scraper output caches
  deps        Remove every node_modules folder (run make install afterwards)
  all         metro, sims, worktrees and caches
  stop        metro, sims-all and stop local Supabase
EOF
}

clean_metro() {
  step "Metro"
  local pids=""
  if have lsof; then
    pids="$(lsof -tiTCP:"$METRO_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  elif have fuser; then
    pids="$(fuser "$METRO_PORT/tcp" 2>/dev/null || true)"
  fi
  if [[ -z "$pids" ]]; then
    ok "nothing listening on :$METRO_PORT"
    return
  fi
  kill $pids 2>/dev/null || true
  ok "stopped Metro on :$METRO_PORT (pid $(echo $pids))"
}

simctl_ok() { is_mac && xcrun simctl help >/dev/null 2>&1; }

clean_sims() {
  step "Simulators"
  if ! simctl_ok; then
    note "no iOS Simulator on this machine"
    return
  fi
  local clones udid removed=0
  clones="$(xcrun simctl list devices | grep 'UT Dining e2e shard' | grep -oE '[0-9A-F]{8}-([0-9A-F]{4}-){3}[0-9A-F]{12}' || true)"
  for udid in $clones; do
    xcrun simctl shutdown "$udid" 2>/dev/null || true
    xcrun simctl delete "$udid" && removed=$((removed + 1))
  done
  ok "deleted $removed E2E simulator clone(s)"
  if [[ "${1:-}" == "all" ]]; then
    local booted
    booted="$(xcrun simctl list devices booted | grep -cE '\(Booted\)' || true)"
    xcrun simctl shutdown all 2>/dev/null || true
    ok "shut down $booted booted simulator(s)"
  fi
}

clean_worktrees() {
  step "Worktrees"
  git worktree prune
  local path dirty unpushed kept=0 removed=0
  while IFS= read -r path; do
    case "$path" in
      "$ROOT/.worktrees/"* | "$ROOT/.claude/worktrees/"*) ;;
      *) continue ;;
    esac
    dirty="$(git -C "$path" status --porcelain 2>/dev/null | head -1)"
    unpushed="$(git -C "$path" rev-list --count HEAD --not --remotes 2>/dev/null || echo 1)"
    if [[ -n "$dirty" || "$unpushed" != "0" ]]; then
      warn "kept ${path#"$ROOT"/}: $([[ -n "$dirty" ]] && echo "uncommitted changes" || echo "$unpushed unpushed commit(s)")"
      kept=$((kept + 1))
    else
      git worktree remove --force "$path"
      ok "removed ${path#"$ROOT"/}"
      removed=$((removed + 1))
    fi
  done < <(git worktree list --porcelain | sed -n 's/^worktree //p')
  ok "$removed removed, $kept kept"
}

clean_caches() {
  step "Caches"
  rm -rf .turbo apps/*/.turbo packages/*/.turbo apps/dashboard/.next apps/website/.next apps/website/out apps/scraper/data
  ok "removed .turbo, .next, website out/ and scraper data/"
}

clean_deps() {
  step "node_modules"
  find . -name node_modules -type d -prune -not -path './.worktrees/*' -not -path './.claude/*' -exec rm -rf {} +
  ok "removed. Reinstall with: make install"
}

case "${1:-}" in
  metro) clean_metro ;;
  sims) clean_sims ;;
  sims-all) clean_sims all ;;
  worktrees) clean_worktrees ;;
  caches) clean_caches ;;
  deps) clean_deps ;;
  all) clean_metro; clean_sims; clean_worktrees; clean_caches ;;
  stop) clean_metro; clean_sims all; "$ROOT/scripts/dev/db.sh" down ;;
  -h | --help | help | "") usage ;;
  *) usage >&2; exit 1 ;;
esac
