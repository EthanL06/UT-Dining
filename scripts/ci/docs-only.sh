#!/usr/bin/env bash
set -euo pipefail

files="$(grep -v '^$' || true)"
[[ -n "$files" ]] || exit 0
code="$(printf '%s\n' "$files" | grep -vE '\.md$|^\.agents/|^LICENSE$' || true)"
content="$(printf '%s\n' "$files" | grep -E '^apps/website/content/' || true)"
[[ -z "$code" && -z "$content" ]]
