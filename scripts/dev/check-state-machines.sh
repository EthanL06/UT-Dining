#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

if node scripts/dev/state-machines.ts "$@"; then
  ok "no implicit state machines"
  exit 0
fi
bad "implicit state machines found (AGENTS.md, Conventions: State machines are explicit). Use one union or string-literal status, or put // state-machine-ok: <reason> on the line above a real exception"
exit 1
