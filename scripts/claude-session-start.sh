#!/usr/bin/env bash
set -euo pipefail
[[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]] || exit 0
cd "$CLAUDE_PROJECT_DIR"

pnpm install --frozen-lockfile >/dev/null

if [[ -n "${SUPABASE_DEV_URL:-}" ]]; then
  node scripts/env.ts --dev >/dev/null
fi
