#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

usage() {
  printf '%s\n' \
    'Usage: scripts/dev/check-comments.sh [--staged | --base <ref> | --all]' \
    '' \
    'Fails when added lines are code comments. The repo rule is no code comments.' \
    '  --staged      check the staged diff (default, used by the pre-commit hook)' \
    '  --base <ref>  check everything added since <ref>, e.g. origin/staging' \
    '  --all         check every tracked file (TypeScript, JavaScript and CSS through the parser)'
}

mode=staged
base=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged) mode=staged ;;
    --all) mode=all ;;
    --base) mode=base; base="${2:-}"; [[ -n "$base" ]] || die "--base needs a ref"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; exit 2 ;;
  esac
  shift
done

paths=(
  '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.css' '*.sh' '*.yml' '*.yaml' 'Makefile' '*.toml'
  ':!packages/supabase/src/database.types.ts'
  ':!apps/mobile/drizzle/**'
  ':!pnpm-lock.yaml'
  ':!**/*.patch'
)

if [[ "$mode" == all ]]; then
  failed=0
  node scripts/dev/comments.ts || failed=1
  hashy="$(git ls-files '*.sh' '*.yml' '*.yaml' '*.toml' 'Makefile' '**/Makefile' ':!supabase/config.toml' | xargs grep -nE '^[[:space:]]*#' 2>/dev/null | grep -vE ':1:#!|# yaml-language-server:' || true)"
  if [[ -n "$hashy" ]]; then
    printf '%s\n' "$hashy"
    failed=1
  fi
  if [[ $failed -ne 0 ]]; then
    bad "code comments found (repo rule: no code comments). node scripts/dev/comments.ts --write removes the TypeScript, JavaScript and CSS ones"
    exit 1
  fi
  ok "no code comments in tracked files"
  exit 0
fi

if [[ "$mode" == staged ]]; then
  diff_cmd=(git diff --cached -U0 --no-color --diff-filter=AM --)
else
  merge_base="$(git merge-base "$base" HEAD)" || die "cannot find a merge base with $base"
  diff_cmd=(git diff -U0 --no-color --diff-filter=AM "$merge_base" --)
fi

found="$("${diff_cmd[@]}" "${paths[@]}" | awk '
  /^\+\+\+ / { file = substr($0, 7); next }
  /^@@/ {
    split($3, range, ",")
    line = substr(range[1], 2) + 0
    next
  }
  /^\+/ {
    text = substr($0, 2)
    trimmed = text
    sub(/^[ \t]+/, "", trimmed)
    hashy = (file ~ /\.(sh|ya?ml|toml)$/ || file ~ /(^|\/)Makefile$/)
    flagged = 0
    if (trimmed ~ /^\/\/|^\/\*/) flagged = 1
    if (trimmed ~ /^\{\/\*/) flagged = 1
    if (hashy && trimmed ~ /^#/) flagged = 1
    if (trimmed ~ /^\/\/\/ <reference/) flagged = 0
    if (trimmed ~ /^(\/\/|\/\*|\{\/\*) *(biome-ignore|@ts-expect-error|@ts-ignore|@jsx|eslint-)/) flagged = 0
    if (trimmed ~ /^#!/) flagged = 0
    if (trimmed ~ /^# yaml-language-server:/) flagged = 0
    if (flagged) printf "%s:%d: %s\n", file, line, trimmed
    line++
  }
')"

if [[ -n "$found" ]]; then
  bad "added code comments (repo rule: no code comments; put the context in AGENTS.md, a README or the PR description)"
  printf '%s\n' "$found" | sed 's/^/        /'
  note "allowed: biome-ignore, @ts-expect-error, shebangs and triple-slash references"
  exit 1
fi
ok "no added code comments"
