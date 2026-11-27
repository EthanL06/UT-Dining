#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/qa/ios-sim-app.sh [--out <dir>] [--shells <dir>] [--key] [--swap <app>]

Builds the release simulator app of com.ethanl06.ut-dining.dev (APP_VARIANT=development) into
<out> (default .context/app), arm64 only.

The native build is kept in <shells>/<native key>/ (default $IOS_SHELL_DIR, then
.context/ios-shell). The native key is the Expo fingerprint of apps/mobile plus the Xcode
version, so it changes only when native code, native dependencies or app.config.js change.
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
  local fingerprint xcode
  fingerprint="$(cd "$MOBILE" && npx fingerprint fingerprint:generate --platform ios | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hash))')"
  xcode="$(xcodebuild -version 2>/dev/null | tr '\n' ' ' | shasum | cut -c1-8)"
  [[ -n "$fingerprint" && -n "$xcode" ]] || fail "could not compute the native key."
  echo "v1-$xcode-$fingerprint"
}

find_hermesc() {
  local pods="$MOBILE/ios/Pods/hermes-engine/destroot/bin/hermesc"
  if [[ -x "$pods" ]]; then
    echo "$pods"
    return
  fi
  (cd "$MOBILE" && node -p "require('path').join(require('path').dirname(require.resolve('hermes-compiler/package.json', {paths: [require('path').dirname(require.resolve('react-native/package.json'))]})), 'hermesc', 'osx-bin', 'hermesc')")
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

  step "Bundling the JavaScript into $(basename "$app")"
  rm -rf "$app/assets" "$app/main.jsbundle"
  mkdir -p "$app/EXUpdates.bundle" "$app/EXConstants.bundle"
  npx expo export:embed --platform ios --dev false --minify false --reset-cache \
    --entry-file "$entry" --bundle-output "$tmp/main.jsbundle" --assets-dest "$app" > "$tmp/bundle.log" 2>&1 &
  local bundle_pid=$!
  node "$updates/utils/build/createUpdatesResources.js" ios "$PWD" "$app/EXUpdates.bundle" all "$entry" production > "$tmp/updates.log" 2>&1 &
  local updates_pid=$!
  node "$constants/scripts/getAppConfig.js" "$PWD" "$app/EXConstants.bundle" ios false production > "$tmp/constants.log" 2>&1 \
    || { cat "$tmp/constants.log"; fail "could not write EXConstants.bundle/app.config."; }
  wait "$bundle_pid" || { tail -50 "$tmp/bundle.log"; fail "the JavaScript bundle failed."; }
  wait "$updates_pid" || { tail -50 "$tmp/updates.log"; fail "could not write EXUpdates.bundle/app.manifest."; }

  "$hermesc" -emit-binary -max-diagnostic-width=80 -O -out "$app/main.jsbundle" "$tmp/main.jsbundle" > "$tmp/hermesc.log" 2>&1 \
    || { tail -50 "$tmp/hermesc.log"; fail "hermesc failed."; }
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
