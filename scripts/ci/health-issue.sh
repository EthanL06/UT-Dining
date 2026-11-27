#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/ci/health-issue.sh' \
    '' \
    'Opens, updates or closes one GitHub issue from a scraper health report.' \
    'REPORT is a JSON file with a boolean "healthy"; BODY is the Markdown for the issue.' \
    'A healthy report closes the open issue. An unhealthy one opens an issue, or comments on' \
    'the open one when the body changed since the last comment (the "- Run:" line is ignored).' \
    '' \
    'Env: GH_TOKEN, REPO, ASSIGNEE, RUN_URL, LABEL, LABEL_COLOR, LABEL_DESCRIPTION, TITLE,' \
    'REPORT, BODY, MISSING_TEXT (body when REPORT is missing), FAIL_ON_PROBLEMS (default 1).'
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

: "${REPO:?}" "${LABEL:?}" "${TITLE:?}" "${REPORT:?}" "${BODY:?}"
FAIL_ON_PROBLEMS=${FAIL_ON_PROBLEMS:-1}

if [ -f "$REPORT" ]; then
  healthy=$(jq -r .healthy "$REPORT")
else
  healthy=false
  mkdir -p "$(dirname "$BODY")"
  printf '%s\n\n- Run: %s\n' "${MISSING_TEXT:-The scraper stopped before it wrote a report.}" "${RUN_URL:-}" > "$BODY"
fi

open=$(gh api "repos/$REPO/issues?labels=$LABEL&state=open&per_page=1" --jq '.[0].number // empty')

if [ "$healthy" = "true" ]; then
  echo "$LABEL: healthy"
  if [ -n "$open" ]; then
    gh api -X POST "repos/$REPO/issues/$open/comments" -f body="Everything looked right again in $RUN_URL, so this is closed." > /dev/null
    gh api -X PATCH "repos/$REPO/issues/$open" -f state=closed -f state_reason=completed > /dev/null
    echo "Closed #$open"
  fi
  exit 0
fi

cat "$BODY"
strip_run() { grep -v '^- Run: ' || true; }

if [ -n "$open" ]; then
  last=$(gh api "repos/$REPO/issues/$open/comments?per_page=100" --jq 'last | .body // empty')
  if [ -z "$last" ]; then
    last=$(gh api "repos/$REPO/issues/$open" --jq '.body // empty')
  fi
  if [ "$(printf '%s\n' "$last" | strip_run)" = "$(strip_run < "$BODY")" ]; then
    echo "#$open already says this"
  else
    gh api -X POST "repos/$REPO/issues/$open/comments" -F body=@"$BODY" > /dev/null
    echo "Updated #$open"
  fi
else
  gh api -X POST "repos/$REPO/labels" -f name="$LABEL" -f color="${LABEL_COLOR:-d93f0b}" -f description="${LABEL_DESCRIPTION:-}" > /dev/null 2>&1 || true
  args=(-f title="$TITLE" -F body=@"$BODY" -f "labels[]=$LABEL")
  if [ -n "${ASSIGNEE:-}" ]; then
    args+=(-f "assignees[]=$ASSIGNEE")
  fi
  open=$(gh api -X POST "repos/$REPO/issues" "${args[@]}" --jq .number)
  echo "Opened #$open"
fi

if [ "$FAIL_ON_PROBLEMS" = "1" ]; then
  echo "::error::$TITLE (#$open)"
  exit 1
fi
echo "::warning::$TITLE (#$open)"
