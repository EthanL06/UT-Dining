#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/qa/pr-screenshots.sh <PR number> [screen ...] [--ci] [--wait <seconds>]
                                    [--fixture-server] [--keep]

Light and dark iOS screenshots of the current worktree, pushed to assets/pr-<n> and embedded
inline in the PR body (replacing the previous set). One command, safe to run from parallel threads.

  screen             A name from apps/mobile/e2e/screenshots.txt, or name=<deep link path>
                     for a one-off screen (j2=location/J2%20Dining). Default: every listed screen.
  --ci               Skip the Mac: add the "screenshots" label so CI takes them and embeds them.
  --wait <seconds>   How long to wait for a free simulator slot before falling back to CI.
                     Default 300.
  --fixture-server   Serve the fixture data instead of local Supabase (no Docker).
  --keep             Keep the leased simulator booted afterwards (release it with make sim-release).

On the Mac it leases its own simulator clone (scripts/dev/sim-lease.sh) and its own Metro and
fixture ports. It falls back to the CI screenshots workflow by itself when it is not on a Mac,
when every simulator slot stays busy, or when no simulator has the development build.
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO="${REPO:-EthanL06/UT-Dining}"
LIST="$ROOT/apps/mobile/e2e/screenshots.txt"
PR=""
SCREENS=()
FORCE_CI=false
WAIT=300
FIXTURES=false
KEEP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) FORCE_CI=true; shift ;;
    --wait) WAIT="$2"; shift 2 ;;
    --fixture-server) FIXTURES=true; shift ;;
    --keep) KEEP=true; shift ;;
    -h | --help) usage; exit 0 ;;
    *)
      if [[ -z "$PR" && "$1" =~ ^[0-9]+$ ]]; then PR="$1"; else SCREENS+=("$1"); fi
      shift
      ;;
  esac
done

fail() { echo "pr-screenshots: $*" >&2; exit 1; }
step() { echo "==> $*"; }
[[ -n "$PR" ]] || { usage >&2; exit 1; }
command -v gh >/dev/null || fail "gh is not installed."

ci_fallback() {
  step "Falling back to CI: $1"
  gh api -X POST "repos/$REPO/issues/$PR/labels" -f 'labels[]=screenshots' >/dev/null
  echo "Added the screenshots label to #$PR. The Mobile screenshots workflow takes both themes,"
  echo "pushes them to assets/pr-$PR and embeds them in the PR body (about 30 min for a JS-only change)."
  echo "The workflow runs only when the PR touches apps/mobile, packages/core, the lockfile or scripts/qa."
  exit 0
}

[[ "$FORCE_CI" == true ]] && ci_fallback "asked for with --ci"
[[ "$(uname)" == "Darwin" ]] || ci_fallback "no iOS Simulator on this machine"

PR_JSON="$(gh api "repos/$REPO/pulls/$PR")"
PR_HEAD="$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).head.sha)' <<<"$PR_JSON")"
LOCAL_HEAD="$(git -C "$ROOT" rev-parse HEAD)"
if [[ "$PR_HEAD" != "$LOCAL_HEAD" ]]; then
  echo "warn: this worktree is at ${LOCAL_HEAD:0:7}, PR #$PR is at ${PR_HEAD:0:7}. Screenshots show this worktree."
fi
git -C "$ROOT" diff --quiet HEAD || echo "warn: uncommitted changes are in the screenshots."

WORK="$(mktemp -d)"
SELECTED="$WORK/screens.txt"
if [[ ${#SCREENS[@]} -eq 0 ]]; then
  cp "$LIST" "$SELECTED"
else
  for screen in "${SCREENS[@]}"; do
    if [[ "$screen" == *=* ]]; then
      echo "${screen%%=*} ${screen#*=}" >>"$SELECTED"
    else
      line="$(awk -v n="$screen" '$1 == n' "$LIST")"
      [[ -n "$line" ]] || fail "no screen '$screen' in apps/mobile/e2e/screenshots.txt. Use name=<deep link path> for a new one."
      echo "$line" >>"$SELECTED"
    fi
  done
fi

set +e
LEASE="$("$ROOT/scripts/dev/sim-lease.sh" acquire --owner "pr-$PR" --wait "$WAIT")"
STATUS=$?
set -e
case "$STATUS" in
  0) ;;
  75) ci_fallback "every simulator slot stayed busy for $WAIT s" ;;
  *) ci_fallback "could not lease a simulator (see above)" ;;
esac
SIM="${LEASE% *}"
SLOT="${LEASE#* }"
release() {
  [[ "$KEEP" == true ]] || "$ROOT/scripts/dev/sim-lease.sh" release "$SIM" || true
  rm -rf "$WORK"
}
trap release EXIT

METRO_PORT=$((8090 + SLOT))
ARGS=(--sim "$SIM" --port "$METRO_PORT" --list "$SELECTED" --out "$WORK/shots")
if [[ "$FIXTURES" == true ]]; then
  FIXTURE_PORT=$((54340 + SLOT))
  export EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:$FIXTURE_PORT"
  export EXPO_PUBLIC_SUPABASE_ANON_KEY=fixture
  export EXPO_PUBLIC_STATUS_API_URL="http://127.0.0.1:$FIXTURE_PORT/api/status"
  ARGS+=(--fixture-server "$FIXTURE_PORT")
else
  step "Making sure local Supabase is up"
  "$ROOT/scripts/dev/db.sh" ensure
fi

step "Screenshots on slot $SLOT ($SIM), Metro on :$METRO_PORT"
"$ROOT/scripts/qa/mobile-screenshots.sh" "${ARGS[@]}"
ls "$WORK/shots/"*.png >/dev/null 2>&1 || fail "no screenshots were taken."

step "Pushing to assets/pr-$PR"
BRANCH="assets/pr-$PR"
export GIT_INDEX_FILE="$WORK/index"
PARENT=""
if git -C "$ROOT" fetch -q origin "refs/heads/$BRANCH" 2>/dev/null; then
  PARENT="$(git -C "$ROOT" rev-parse FETCH_HEAD)"
  git -C "$ROOT" read-tree "$PARENT"
else
  git -C "$ROOT" read-tree --empty
fi
add() { git -C "$ROOT" update-index --add --cacheinfo "100644,$(git -C "$ROOT" hash-object -w "$1"),$2"; }
for png in "$WORK/shots/"*.png; do add "$png" "$(basename "$png")"; done
printf '{ "git": { "deploymentEnabled": false } }\n' >"$WORK/vercel.json"
add "$WORK/vercel.json" apps/dashboard/vercel.json
add "$WORK/vercel.json" apps/website/vercel.json
TREE="$(git -C "$ROOT" write-tree)"
unset GIT_INDEX_FILE
COMMIT="$(git -C "$ROOT" commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "chore: iOS screenshots of ${LOCAL_HEAD:0:7}")"
git -C "$ROOT" push -q --no-verify origin "$COMMIT:refs/heads/$BRANCH"

step "Embedding them in the body of #$PR"
CAPTION="iOS Simulator, light and dark, of ${LOCAL_HEAD:0:7}$([[ "$FIXTURES" == true ]] && echo ' (fixture data)' || echo ' (local Supabase with fixture menus)')."
node "$ROOT/scripts/qa/pr-screenshots-body.ts" --repo "$REPO" --pr "$PR" --sha "$COMMIT" --dir "$WORK/shots" --caption "$CAPTION"
echo "Done: https://github.com/$REPO/pull/$PR"
