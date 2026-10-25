#!/usr/bin/env bash
# Claude Code SessionStart hook: make cloud sessions ready to work without manual setup.
# Local sessions are left alone; run ./setup.sh yourself there.
set -euo pipefail
[[ "${CLAUDE_CODE_REMOTE:-}" == "true" ]] || exit 0
cd "$CLAUDE_PROJECT_DIR"

pnpm install --frozen-lockfile >/dev/null

# Cloud sessions use the hosted dev Supabase project when its keys are in the environment.
if [[ -n "${SUPABASE_DEV_URL:-}" ]]; then
  node scripts/env.ts --dev >/dev/null
fi
