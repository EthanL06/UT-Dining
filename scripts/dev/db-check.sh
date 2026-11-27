#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

usage() {
  printf '%s\n' \
    'Usage: scripts/dev/db-check.sh' \
    '' \
    'Checks the migrations added since BASE (default origin/staging) in a throwaway Postgres:' \
    '  1. no migration that is already on BASE was edited, renamed or deleted' \
    '  2. new migrations sort after the newest one on BASE' \
    '  3. BASE migrations, then the new ones on top, apply cleanly (the production upgrade path)' \
    '  4. the upgrade drops, renames or narrows nothing that old clients use' \
    '  5. a fresh reset with supabase/seed.sql works' \
    '  6. packages/supabase/src/database.types.ts matches the migrations' \
    '' \
    'Never touches the shared local stack, hosted dev or production.' \
    'FORCE=1 runs even when nothing database related changed. ALLOW_BREAKING=1 turns breaking' \
    'changes into warnings (CI sets it from the breaking-migration label). STATIC=1 runs only the' \
    'file checks (1 and 2) without Docker, as the pre-push hook does.'
}

case "${1:-}" in
  -h | --help | help) usage; exit 0 ;;
esac

MIGRATIONS=supabase/migrations
TYPES=packages/supabase/src/database.types.ts
BASE_REF="${BASE:-origin/staging}"
PROJECT_ID="ut-dining-dbcheck"
CONTAINER="supabase_db_$PROJECT_ID"
failed=0

git rev-parse --verify --quiet "$BASE_REF^{commit}" >/dev/null || die "unknown BASE $BASE_REF; fetch it first"
base_sha="$(git merge-base HEAD "$BASE_REF")"

step "Comparing migrations with $BASE_REF ($(git rev-parse --short "$base_sha"))"
base_files="$(git ls-tree --name-only "$base_sha" "$MIGRATIONS/" | sed 's|.*/||' | grep '\.sql$' || true)"
head_files="$(ls "$MIGRATIONS" | grep '\.sql$' || true)"
newest_base="$(printf '%s\n' "$base_files" | sort | tail -1)"
new_files=""

for file in $base_files; do
  if [[ ! -f "$MIGRATIONS/$file" ]]; then
    bad "$file is on $BASE_REF but was deleted or renamed here"
    failed=1
  elif ! git show "$base_sha:$MIGRATIONS/$file" | cmp -s - "$MIGRATIONS/$file"; then
    bad "$file is on $BASE_REF but was edited here; add a new migration instead"
    failed=1
  fi
done

for file in $head_files; do
  if ! printf '%s\n' "$base_files" | grep -qx "$file"; then
    new_files="$new_files $file"
    if [[ -n "$newest_base" && ! "$file" > "$newest_base" ]]; then
      bad "$file sorts before $newest_base, which is already on $BASE_REF; rename it with make db-new"
      failed=1
    else
      ok "new migration $file"
    fi
  fi
done

types_changed=0
git diff --quiet "$base_sha" -- "$TYPES" supabase/seed.sql supabase/config.toml || types_changed=1

if [[ "${STATIC:-}" == "1" ]]; then
  if [[ -n "$new_files" ]] && git diff --quiet "$base_sha" -- "$TYPES"; then
    warn "new migrations but $TYPES is unchanged; run make db-types if the schema changed"
  fi
  [[ "$failed" -eq 0 ]] && ok "migration files are append-only and in order (STATIC=1 skips the Postgres checks)"
  exit "$failed"
fi

if [[ -z "$new_files" && "$failed" -eq 0 && "$types_changed" -eq 0 && "${FORCE:-}" != "1" ]]; then
  ok "no migration, seed or type changes since $BASE_REF; nothing to check"
  exit 0
fi
[[ -z "$new_files" ]] && note "no new migrations"

ensure_docker || die "Docker is not running"

work="$(mktemp -d)"
cleanup() {
  pnpm exec supabase stop --workdir "$work" --no-backup >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

prefix=""
for candidate in 553 563 573 583; do
  if ! port_in_use "${candidate}22" && ! port_in_use "${candidate}20"; then
    prefix="$candidate"
    break
  fi
done
[[ -n "$prefix" ]] || die "no free port range for the throwaway database"

mkdir -p "$work/supabase/migrations"
sed -e "s/^project_id = .*/project_id = \"$PROJECT_ID\"/" \
  -e "s/= 543\([0-9][0-9]\)$/= $prefix\1/" \
  supabase/config.toml >"$work/supabase/config.toml"
for file in $base_files; do
  git show "$base_sha:$MIGRATIONS/$file" >"$work/supabase/migrations/$file"
done

step "Starting a throwaway Postgres with the $BASE_REF migrations"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
pnpm exec supabase db start --workdir "$work" >"$work/start.log" 2>&1 || {
  tail -30 "$work/start.log"
  die "the $BASE_REF migrations do not apply"
}
ok "applied $(printf '%s\n' "$base_files" | grep -c . || true) migrations on 127.0.0.1:${prefix}22"
node scripts/dev/db-compat.ts snapshot "$CONTAINER" "$work/base.json"

if [[ -n "$new_files" ]]; then
  step "Applying the new migrations on top, like production will"
  for file in $new_files; do
    cp "$MIGRATIONS/$file" "$work/supabase/migrations/$file"
  done
  if pnpm exec supabase migration up --local --workdir "$work" >"$work/up.log" 2>&1; then
    ok "new migrations apply on top of $BASE_REF"
    node scripts/dev/db-compat.ts snapshot "$CONTAINER" "$work/head.json"
    step "Checking backwards compatibility"
    node scripts/dev/db-compat.ts compare "$work/base.json" "$work/head.json" \
      "${ALLOW_BREAKING:-0}" "${GITHUB_STEP_SUMMARY:-}" || failed=1
  else
    grep -v '^{' "$work/up.log" | tail -30
    bad "the new migrations fail on top of $BASE_REF"
    failed=1
  fi
fi

step "Resetting from scratch with every migration and supabase/seed.sql"
cp supabase/seed.sql "$work/supabase/seed.sql"
for file in $head_files; do
  cp "$MIGRATIONS/$file" "$work/supabase/migrations/$file"
done
if pnpm exec supabase db reset --local --workdir "$work" >"$work/reset.log" 2>&1; then
  ok "fresh reset and seed work"
else
  grep -v "^Applying migration" "$work/reset.log" | tail -15
  bad "a fresh reset fails"
  failed=1
fi

step "Checking $TYPES against the migrations"
if pnpm exec supabase gen types typescript --local --workdir "$work" 2>"$work/types.err" |
  pnpm exec biome format --stdin-file-path="$TYPES" >"$work/types.ts" 2>>"$work/types.err"; then
  if cmp -s "$work/types.ts" "$TYPES"; then
    ok "generated types match"
  else
    diff -u -L committed -L generated "$TYPES" "$work/types.ts" | head -80 || true
    bad "generated types are out of date; run make db-up db-reset db-types and commit the result"
    if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
      {
        printf '## Database types\n\n`%s` does not match the migrations. Run `make db-up db-reset db-types` and commit it.\n\n```diff\n' "$TYPES"
        diff -u -L committed -L generated "$TYPES" "$work/types.ts" | head -200 || true
        printf '```\n'
      } >>"$GITHUB_STEP_SUMMARY"
    fi
    failed=1
  fi
else
  tail -20 "$work/types.err"
  bad "could not generate types"
  failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  bad "database check failed"
  exit 1
fi
ok "database check passed"
