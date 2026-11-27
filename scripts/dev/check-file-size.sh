#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

max="${MAX_LINES:-500}"
exempt='^(packages/supabase/src/database\.types\.ts|apps/mobile/drizzle/)'

too_long=0
while IFS= read -r file; do
  [[ -f "$file" ]] || continue
  printf '%s\n' "$file" | grep -qE "$exempt" && continue
  lines=$(wc -l <"$file" | tr -d ' ')
  if [[ "$lines" -gt "$max" ]]; then
    bad "$file has $lines lines (max $max). Split it by responsibility instead of growing it."
    too_long=1
  fi
done < <(git ls-files --cached --others --exclude-standard -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '*.css' '*.sh')

if [[ $too_long -ne 0 ]]; then
  exit 1
fi
ok "every source file is at most $max lines"
