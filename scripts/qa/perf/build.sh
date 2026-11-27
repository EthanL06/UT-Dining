#!/usr/bin/env bash
set -euo pipefail
usage="usage: build.sh <base release .app> <output dir> <name>=<git ref> [<name>=<git ref> ...]"
BASE_APP=$(cd "$(dirname "${1:?$usage}")" && pwd)/$(basename "$1")
OUT=$(mkdir -p "${2:?$usage}" && cd "$2" && pwd)
shift 2
[[ $# -gt 0 ]] || { echo "$usage" >&2; exit 2; }
ROOT=$(git rev-parse --show-toplevel)
QA="$ROOT/scripts/qa/perf"
ENV_FILE="$ROOT/apps/mobile/.env.local"
URL=$(grep '^EXPO_PUBLIC_SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
: "${PERF_DEV_REF:?set PERF_DEV_REF to the dev project ref}"
case "$URL" in *"$PERF_DEV_REF"*) ;; *) echo "apps/mobile/.env.local does not point at the dev project" >&2; exit 1 ;; esac
[[ -f "$BASE_APP/main.jsbundle" ]] || { echo "$BASE_APP is not a release .app" >&2; exit 1; }

TREES=()
cleanup() {
  for tree in "${TREES[@]:-}"; do
    [[ -n "$tree" ]] && git -C "$ROOT" worktree remove --force "$tree" 2>/dev/null || true
  done
}
trap cleanup EXIT

build() {
  local name=$1 ref=$2 tree="$OUT/src-$1" mobile app hermesc
  git -C "$ROOT" worktree remove --force "$tree" 2>/dev/null || true
  git -C "$ROOT" worktree add --detach "$tree" "$ref" >/dev/null
  TREES+=("$tree")
  git -C "$tree" rev-parse HEAD > "$OUT/$name.commit"
  mobile="$tree/apps/mobile"
  cp "$ENV_FILE" "$mobile/.env.local"
  (cd "$tree" && pnpm install --frozen-lockfile --prefer-offline >/dev/null)
  node "$QA/instrument.mjs" "$mobile"
  hermesc=$(ls -d "$tree"/node_modules/.pnpm/hermes-compiler@*/node_modules/hermes-compiler/hermesc/osx-bin/hermesc | head -1)
  app="$OUT/app-$name"
  rm -rf "$app"
  cp -R "$BASE_APP" "$app"
  rm -rf "$app/assets" "$app/main.jsbundle"
  local api=$URL
  [[ "${PERF_PROXY:-0}" == 1 ]] && api=http://localhost:9199/sb
  (cd "$mobile" && EXPO_PUBLIC_SUPABASE_URL=$api EXPO_PUBLIC_POSTHOG_API_KEY= APP_VARIANT=development NODE_ENV=production \
    npx expo export:embed --platform ios --dev false --minify false --reset-cache \
    --entry-file node_modules/expo-router/entry.js --bundle-output "$OUT/$name.js" --assets-dest "$app" | tail -1)
  grep -q "$api" "$OUT/$name.js"
  grep -q "syncStarted" "$OUT/$name.js"
  "$hermesc" -emit-binary -O -w -out "$app/main.jsbundle" "$OUT/$name.js"
  codesign -f -s - --deep "$app" 2>&1 | tail -1
  git -C "$ROOT" worktree remove --force "$tree"
  echo "built $app from $ref ($(cut -c1-8 "$OUT/$name.commit"))"
}

for pair in "$@"; do
  build "${pair%%=*}" "${pair#*=}"
done
