#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

base="${BASE:-origin/staging}"
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || die "no ref $base. Run git fetch origin staging, or pass BASE=<ref>"
merge_base="$(git merge-base "$base" HEAD)"

changed="$( { git diff --name-only --diff-filter=ACMR "$merge_base"; git ls-files --others --exclude-standard; } | sort -u)"
if [[ -z "$changed" ]]; then
  ok "nothing changed since $base"
  exit 0
fi

step "Changed since $base: $(printf '%s\n' "$changed" | wc -l | tr -d ' ') files"

failed=0

step "Biome on changed files"
files=()
while IFS= read -r f; do [[ -f "$f" ]] && files+=("$f"); done <<<"$changed"
if [[ ${#files[@]} -gt 0 ]] && pnpm exec biome check --no-errors-on-unmatched --files-ignore-unknown=true "${files[@]}"; then
  ok "biome"
else
  bad "biome (make fix applies the safe fixes)"
  failed=1
fi

step "No added code comments"
scripts/dev/check-comments.sh --base "$base" || failed=1

step "Typecheck and tests of affected packages"
if TURBO_SCM_BASE="$merge_base" pnpm exec turbo run typecheck test --affected --output-logs=errors-only; then
  ok "typecheck and tests"
else
  bad "typecheck or tests (rerun one package: pnpm --filter @ut-dining/<name> typecheck|test)"
  failed=1
fi

step "Also verify"
has() { printf '%s\n' "$changed" | grep -vE '\.md$' | grep -qE "$1"; }
hinted=0
hint() { note "$1"; hinted=1; }
has '^supabase/migrations/' && hint "migration changed: verifier-data skill, then make db-types and commit packages/supabase"
has '^apps/scraper/' && hint "scraper changed: verifier-data skill step 5 (one day against local Supabase)"
has '^(apps/dashboard|apps/website|packages/)|^pnpm-lock.yaml$' && hint "web app or package changed: make build, then the verifier-browser skill for UI changes"
has '^apps/mobile/(app|components)/' && hint "mobile UI changed: verifier-mobile skill (macOS) or the screenshots described in apps/mobile/AGENTS.md"
has '^apps/mobile/(app\.config\.js|eas\.json|package\.json)$' && hint "native config changed: needs a new development build before it can be verified"
[[ $hinted -eq 1 ]] || note "nothing else for this diff"

if [[ $failed -ne 0 ]]; then
  bad "verify failed"
  exit 1
fi
ok "verify passed"
