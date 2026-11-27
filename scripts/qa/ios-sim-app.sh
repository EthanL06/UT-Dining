#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/qa/ios-sim-app.sh [--out <dir>] [--shells <dir>] [--key] [--swap <app>]

Builds the release simulator app of com.ethanl06.ut-dining.dev (APP_VARIANT=development) into
<out> (default .context/app), arm64 only.

The native build is kept in <shells>/<native key>/ (default $IOS_SHELL_DIR, then
.context/ios-shell). The native key hashes the Xcode version, the lockfile, the package.json
files, app.config.js and the app icons, so JavaScript changes reuse the native build and a
dependency or config change builds it again.
When a native build with the same key exists, the script copies it and rebuilds only the
JavaScript bundle, its assets and the Expo config files inside it (a couple of minutes instead
of a full Xcode build).

  --key          Print the native key and exit.
  --swap <app>   Rebuild only the JavaScript of an existing release .app in place.

EXPO_PUBLIC_* variables are read when the bundle is built, so set them the same way for every run.
USAGE
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MOBILE="$ROOT/apps/mobile"
OUT="$ROOT/.context/app"
SHELLS="${IOS_SHELL_DIR:-$ROOT/.context/ios-shell}"
MODE=build
SWAP_APP=""
export APP_VARIANT="${APP_VARIANT:-development}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --shells) SHELLS="$2"; shift 2 ;;
    --key) MODE=key; shift ;;
    --swap) MODE=swap; SWAP_APP="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "ios-sim-app: unknown option $1" >&2; usage >&2; exit 2 ;;
  esac
done

fail() { echo "ios-sim-app: $*" >&2; exit 1; }
step() { echo "==> $*"; }

native_key() {
  local inputs xcode
  inputs="$(cd "$ROOT" && {
    find apps/mobile/assets/icons -type f
    ls pnpm-lock.yaml pnpm-workspace.yaml package.json apps/mobile/package.json apps/mobile/app.config.js
    ls -d patches/* 2>/dev/null || true
  } | LC_ALL=C sort | while read -r file; do shasum "$file"; done | shasum | cut -c1-16)"
  xcode="$(xcodebuild -version 2>/dev/null | tr '\n' ' ' | shasum | cut -c1-8)"
  [[ -n "$inputs" && -n "$xcode" ]] || fail "could not compute the native key."
  echo "v2-$xcode-$inputs"
}

find_hermesc() {
  local pods="$MOBILE/ios/Pods/hermes-engine/destroot/bin/hermesc"
  if [[ -x "$pods" ]]; then
    echo "$pods"
    return
  fi
  (cd "$MOBILE" && node -p "require('path').join(require('path').dirname(require.resolve('hermes-compiler/package.json', {paths: [require('path').dirname(require.resolve('react-native/package.json'))]})), 'hermesc', 'osx-bin', 'hermesc')")
}

run_logged() {
  local label="$1" log="$2" limit="$3" pid started elapsed
  shift 3
  started="$(date +%s)"
  step "$label"
  "$@" > "$log" 2>&1 &
  pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    elapsed=$(( $(date +%s) - started ))
    if [[ "$elapsed" -ge "$limit" ]]; then
      kill "$pid" 2>/dev/null || true
      tail -50 "$log"
      fail "$label took over $limit s and was stopped."
    fi
    sleep 2
  done
  wait "$pid" || { tail -50 "$log"; fail "$label failed."; }
  echo "    done in $(( $(date +%s) - started )) s"
}

swap_bundle() {
  local app="$1" hermesc="$2" tmp entry updates constants
  [[ -f "$app/main.jsbundle" ]] || fail "$app has no main.jsbundle, so it is not a release build."
  [[ -x "$hermesc" ]] || fail "no hermesc at $hermesc."
  tmp="$(mktemp -d)"
  cd "$MOBILE"
  entry="$(node -e "require('expo/scripts/resolveAppEntry')" "$PWD" ios absolute)"
  updates="$(dirname "$(node -p "require.resolve('expo-updates/package.json')")")"
  constants="$(dirname "$(node -p "require.resolve('expo-constants/package.json')")")"

  rm -rf "$app/assets" "$app/main.jsbundle"
  mkdir -p "$app/EXUpdates.bundle" "$app/EXConstants.bundle"
  run_logged "Bundling the JavaScript" "$tmp/bundle.log" 600 \
    npx expo export:embed --platform ios --dev false --minify false --reset-cache \
    --entry-file "$entry" --bundle-output "$tmp/main.jsbundle" --assets-dest "$app"
  run_logged "Compiling it with hermesc" "$tmp/hermesc.log" 300 \
    "$hermesc" -emit-binary -max-diagnostic-width=80 -O -out "$app/main.jsbundle" "$tmp/main.jsbundle"
  run_logged "Writing EXUpdates.bundle/app.manifest" "$tmp/updates.log" 600 \
    node "$updates/utils/build/createUpdatesResources.js" ios "$PWD" "$app/EXUpdates.bundle" all "$entry" production
  run_logged "Writing EXConstants.bundle/app.config" "$tmp/constants.log" 120 \
    node "$constants/scripts/getAppConfig.js" "$PWD" "$app/EXConstants.bundle" ios false production
  if [[ -d "$app/_CodeSignature" ]]; then
    codesign --force --sign - --timestamp=none "$app" >/dev/null
  fi
  rm -rf "$tmp"
  cd "$ROOT"
}

build_native() {
  local shell="$1" workspace scheme app
  step "Generating the iOS project"
  (cd "$MOBILE" && npx expo prebuild --platform ios)
  cd "$MOBILE/ios"
  workspace="$(ls -d ./*.xcworkspace | head -1)"
  workspace="${workspace#./}"
  scheme="${workspace%.xcworkspace}"
  step "Building $scheme for the simulator (arm64). Log: apps/mobile/ios/build.log"
  xcodebuild \
    -workspace "$workspace" \
    -scheme "$scheme" \
    -configuration Release \
    -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath build \
    ARCHS=arm64 \
    ONLY_ACTIVE_ARCH=YES \
    CODE_SIGNING_ALLOWED=NO \
    CLANG_ENABLE_EXPLICIT_MODULES=NO \
    > build.log 2>&1 || {
      grep -nE "error:|Error:|@build-script-error|BUILD FAILED" -A8 build.log | head -150
      fail "xcodebuild failed. See apps/mobile/ios/build.log"
    }
  tail -3 build.log
  app="$(ls -d build/Build/Products/Release-iphonesimulator/*.app | head -1)"
  rm -rf "$shell"
  mkdir -p "$shell"
  cp -R "$app" "$shell/"
  cp "$(find_hermesc)" "$shell/hermesc"
  cd "$ROOT"
}

[[ "$(uname)" == "Darwin" ]] || fail "needs macOS with Xcode."

case "$MODE" in
  key)
    native_key
    exit 0
    ;;
  swap)
    [[ -d "$SWAP_APP" ]] || fail "no app at $SWAP_APP."
    swap_bundle "$(cd "$SWAP_APP" && pwd)" "$(find_hermesc)"
    exit 0
    ;;
esac

KEY="$(native_key)"
SHELL_DIR="$SHELLS/$KEY"
FRESH=false
if ! ls -d "$SHELL_DIR"/*.app >/dev/null 2>&1 || [[ ! -x "$SHELL_DIR/hermesc" ]]; then
  step "No native build for $KEY. Building one."
  build_native "$SHELL_DIR"
  FRESH=true
else
  step "Reusing the native build $KEY"
fi

rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$SHELL_DIR"/*.app "$OUT/"
APP="$(ls -d "$OUT"/*.app | head -1)"
if [[ "$FRESH" == false ]]; then
  swap_bundle "$APP" "$SHELL_DIR/hermesc"
fi
echo "App: $APP"
