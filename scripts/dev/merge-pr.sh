#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  cat <<'EOF'
Usage: scripts/dev/merge-pr.sh <PR number> --title "<conventional subject>" (--body "<text>" | --body-file <file>)

Squash-merges a PR into staging with a hand-written message, only after Ethan said yes to that PR.
Refuses a PR whose base is not staging, a draft, a PR that is not mergeable, and a message with
AI attribution (Co-authored-by, Claude-Session, Generated with). The merge is pinned to the head
commit you saw, so a push that lands meanwhile makes it fail instead of merging unreviewed code.
EOF
}

REPO="${REPO:-EthanL06/UT-Dining}"
PR=""
TITLE=""
BODY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) TITLE="$2"; shift 2 ;;
    --body) BODY="$2"; shift 2 ;;
    --body-file) BODY="$(cat "$2")"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) [[ -z "$PR" && "$1" =~ ^[0-9]+$ ]] || die "unexpected argument $1"; PR="$1"; shift ;;
  esac
done
[[ -n "$PR" && -n "$TITLE" && -n "$BODY" ]] || { usage >&2; exit 1; }
[[ "$TITLE" =~ ^(feat|fix|chore|docs|refactor|perf|test|build|ci|style|revert)(\([a-z0-9-]+\))?!?:\ .+ ]] \
  || die "the title must be a conventional commit subject, e.g. 'fix(mobile): ...'"
if grep -qiE 'co-authored-by|claude-session|generated with|claude\.ai/code' <<<"$TITLE
$BODY"; then
  die "the message has AI attribution. Write it without Co-authored-by, session or Generated with lines."
fi

pr_field() { node -e "const p=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(String($1))"; }
JSON="$(gh api "repos/$REPO/pulls/$PR")"
BASE="$(pr_field 'p.base.ref' <<<"$JSON")"
STATE="$(pr_field 'p.state' <<<"$JSON")"
DRAFT="$(pr_field 'p.draft' <<<"$JSON")"
MERGEABLE="$(pr_field 'p.mergeable_state' <<<"$JSON")"
HEAD="$(pr_field 'p.head.sha' <<<"$JSON")"

[[ "$BASE" == "staging" ]] || die "#$PR targets $BASE. Only PRs into staging merge this way; main is Ethan's promotion."
[[ "$STATE" == "open" ]] || die "#$PR is $STATE."
[[ "$DRAFT" == "false" ]] || die "#$PR is a draft."
case "$MERGEABLE" in
  clean | unstable | has_hooks) ;;
  dirty) die "#$PR has a merge conflict. Merge staging into it first." ;;
  *) die "#$PR is not ready to merge (mergeable_state: $MERGEABLE). Check its required checks." ;;
esac

step "Squash-merging #$PR (${HEAD:0:7}) into staging"
gh api -X PUT "repos/$REPO/pulls/$PR/merge" \
  -f merge_method=squash -f sha="$HEAD" \
  -f commit_title="$TITLE (#$PR)" -f commit_message="$BODY" --jq .sha
ok "merged #$PR"
