#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT/supabase/functions"

if ! command -v deno >/dev/null 2>&1; then
  if [[ "${CI:-}" == "true" ]]; then
    die "deno is not installed"
  fi
  warn "deno is not installed, skipping edge function checks (brew install deno, or curl -fsSL https://deno.land/install.sh | sh)"
  exit 0
fi

entries=()
for dir in */; do
  [[ -f "$dir/index.ts" ]] && entries+=("$dir/index.ts")
done

step "Typecheck edge functions"
deno check --quiet --config deno.ci.json "${entries[@]}" _shared/*.ts
ok "deno check"

step "Test edge functions"
deno test --quiet --config deno.ci.json _shared/
ok "deno test"
