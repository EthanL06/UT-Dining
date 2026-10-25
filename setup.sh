#!/usr/bin/env bash
# One-time setup for the UT Dining monorepo.
#
#   ./setup.sh           install everything and point apps at a Supabase instance
#   ./setup.sh --no-db   skip Supabase (apps get .env.local copied from .env.example)
#
# Picks the database automatically: the hosted dev project when SUPABASE_DEV_URL is
# set (cloud sessions), otherwise a local Supabase in Docker.
set -euo pipefail
cd "$(dirname "$0")"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

use_db=true
[[ "${1:-}" == "--no-db" ]] && use_db=false

wanted_node="$(cat .node-version)"
wanted_pnpm="$(node -p "require('./package.json').packageManager.split('@')[1]" 2>/dev/null || echo 10)"

bold "1/4 Node.js"
node_ok() { command -v node >/dev/null && node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=18)?0:1)'; }
if ! node_ok; then
  if command -v fnm >/dev/null; then fnm install "$wanted_node" && eval "$(fnm env)" && fnm use "$wanted_node"
  elif command -v mise >/dev/null; then mise install "node@$wanted_node" && eval "$(mise activate bash)" && mise use "node@$wanted_node"
  elif [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm install "$wanted_node"
  else fail "Node $wanted_node is required (22.18+ works). Install it from https://nodejs.org or with fnm, then re-run."
  fi
fi
echo "  node $(node -v)"

bold "2/4 pnpm"
if ! command -v pnpm >/dev/null; then
  if command -v corepack >/dev/null; then corepack enable pnpm
  else npm install --global "pnpm@$wanted_pnpm"
  fi
fi
echo "  pnpm $(pnpm -v)"

bold "3/4 Dependencies"
pnpm install

bold "4/4 Environment"
for app in apps/*/; do
  if [[ -f "$app.env.example" && ! -f "$app.env.local" ]]; then
    cp "$app.env.example" "$app.env.local"
    echo "  created $app.env.local from .env.example"
  fi
done

if $use_db; then
  if [[ -n "${SUPABASE_DEV_URL:-}" ]]; then
    node scripts/env.ts --dev
  elif command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    pnpm db:start
    node scripts/env.ts --local
  else
    warn "  No SUPABASE_DEV_URL and Docker isn't running, so no database was configured."
    warn "  Start Docker and run: pnpm db:start && pnpm env:local"
  fi
fi

echo
bold "Done. Start something with ./dev.sh (or pnpm dev)."
