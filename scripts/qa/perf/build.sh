#!/usr/bin/env bash
set -euo pipefail
BASE_APP=${1:?usage: build.sh <base release .app> <output dir>}
OUT=${2:?usage: build.sh <base release .app> <output dir>}
ROOT=$(git rev-parse --show-toplevel)
QA="$ROOT/scripts/qa/perf"
MOBILE="$ROOT/apps/mobile"
HERMESC=$(ls -d "$ROOT"/node_modules/.pnpm/hermes-compiler@*/node_modules/hermes-compiler/hermesc/osx-bin/hermesc | head -1)
URL=$(grep '^EXPO_PUBLIC_SUPABASE_URL=' "$MOBILE/.env.local" | cut -d= -f2-)
KEY=$(grep '^EXPO_PUBLIC_SUPABASE_ANON_KEY=' "$MOBILE/.env.local" | cut -d= -f2-)
: "${PERF_DEV_REF:?set PERF_DEV_REF to the dev project ref}"
case "$URL" in *"$PERF_DEV_REF"*) ;; *) echo "apps/mobile/.env.local does not point at the dev project" >&2; exit 1 ;; esac

mkdir -p "$OUT"
cleanup() {
  git -C "$ROOT" apply -R "$QA/harness.patch"
  rm -f "$MOBILE/utils/perf.ts"
}
git -C "$ROOT" apply "$QA/harness.patch"
cp "$QA/perf.ts" "$MOBILE/utils/perf.ts"
trap cleanup EXIT

build() {
  local name=$1 api=$2
  (cd "$MOBILE" && EXPO_PUBLIC_SUPABASE_URL=$api EXPO_PUBLIC_SUPABASE_ANON_KEY=$KEY EXPO_PUBLIC_POSTHOG_API_KEY= \
    APP_VARIANT=development NODE_ENV=production npx expo export:embed --platform ios --dev false \
    --entry-file node_modules/expo-router/entry.js --bundle-output "$OUT/$name.js" --assets-dest "$OUT/assets" | tail -1)
  grep -q "$api" "$OUT/$name.js"
  "$HERMESC" -emit-binary -O -w -out "$OUT/$name.hbc" "$OUT/$name.js"
  rm -rf "$OUT/app-$name"
  cp -R "$BASE_APP" "$OUT/app-$name"
  cp "$OUT/$name.hbc" "$OUT/app-$name/main.jsbundle"
  codesign -f -s - --deep "$OUT/app-$name" 2>&1 | tail -1
}

build proxied http://localhost:9199/sb
build direct "$URL"
