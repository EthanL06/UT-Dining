#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

zero=0000000000000000000000000000000000000000
if [[ ! -t 0 ]]; then
  while read -r _local_ref local_sha remote_ref _remote_sha; do
    [[ -n "${remote_ref:-}" && "$local_sha" != "$zero" ]] || continue
    case "$remote_ref" in
      refs/heads/main | refs/heads/staging)
        [[ "${ALLOW_PROTECTED_PUSH:-}" == "1" ]] || die "pushes to ${remote_ref#refs/heads/} go through a PR. Push a branch instead (ALLOW_PROTECTED_PUSH=1 only for a deliberate release step)"
        ;;
    esac
  done
fi

base="${BASE:-origin/staging}"
if ! git rev-parse --verify --quiet "$base^{commit}" >/dev/null; then
  warn "no ref $base; checking everything"
  base="$(git hash-object -t tree /dev/null)"
  merge_base="$base"
else
  merge_base="$(git merge-base "$base" HEAD)"
fi

changed="$( { git diff --name-only "$merge_base" HEAD; git diff --name-only HEAD; } | sort -u)"
if [[ -z "$changed" ]]; then
  ok "nothing changed since $base"
  exit 0
fi
if ! printf '%s\n' "$changed" | grep -qvE '\.md$|^\.agents/|^LICENSE$'; then
  ok "docs only, skipping pre-push checks"
  exit 0
fi
git diff --quiet HEAD || warn "uncommitted changes are checked too; commit or stash them for an exact result"

has() { printf '%s\n' "$changed" | grep -qE "$1"; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
names=()
pids=()
start="$(date +%s)"

run() {
  local name="$1"
  shift
  names+=("$name")
  ("$@" >"$tmp/$name.log" 2>&1) &
  pids+=("$!")
}

run biome pnpm exec biome ci --error-on-warnings --max-diagnostics=20
run comments scripts/dev/check-comments.sh --base "$merge_base"
run file-size scripts/dev/check-file-size.sh
run state scripts/dev/check-state-machines.sh
run typecheck-test env TURBO_SCM_BASE="$merge_base" pnpm exec turbo run typecheck test --affected --output-logs=errors-only
if has '(^|/)package\.json$|^pnpm-(lock|workspace)\.yaml$'; then
  run lockfile pnpm install --frozen-lockfile --lockfile-only --ignore-scripts --reporter=silent
fi
if has '^supabase/functions/'; then
  run edge-functions scripts/dev/functions-check.sh
fi
if has '^supabase/|^packages/supabase/'; then
  run migrations env STATIC=1 BASE="$base" scripts/dev/db-check.sh
fi

failed=0
i=0
for pid in "${pids[@]}"; do
  name="${names[$i]}"
  if wait "$pid"; then
    ok "$name"
  else
    bad "$name"
    sed 's/^/        /' "$tmp/$name.log" | tail -40
    failed=1
  fi
  i=$((i + 1))
done

elapsed=$(($(date +%s) - start))
if [[ $failed -ne 0 ]]; then
  bad "pre-push failed in ${elapsed}s. Fix it, or bypass once with git push --no-verify and say why in the PR"
  exit 1
fi
ok "pre-push passed in ${elapsed}s"
if has '^supabase/migrations/'; then
  note "CI also runs make db-check (Postgres, about a minute)"
fi
