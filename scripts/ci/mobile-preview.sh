#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/ci/mobile-preview.sh staging | pr <number>' \
    '' \
    'Ships the dev app (UT Dining (Dev), dev Supabase) from CI with EAS.' \
    'If no preview build matches the iOS fingerprint, it starts one (unless MOBILE_PREVIEW_BUILDS=0).' \
    'Then it publishes the JS as an EAS Update: to the staging channel, or to pr-<number> for a PR.' \
    'With a PR number and GH_TOKEN set, it posts or edits one PR comment with the links.' \
    '' \
    'Needs EXPO_TOKEN. Production builds and the production channel are never touched.'
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ACCOUNT_URL="https://expo.dev/accounts/ethanl06/projects/ut-dining"
PROFILE=preview
ENVIRONMENT=preview
MARKER='<!-- mobile-preview -->'

die() {
  printf 'mobile-preview: %s\n' "$*" >&2
  exit 1
}

mode="${1:-}"
pr=""
case "$mode" in
  staging) channel=staging ;;
  pr)
    pr="${2:-}"
    [[ "$pr" =~ ^[0-9]+$ ]] || die "pr needs a PR number"
    channel="pr-$pr"
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

[[ "$channel" != production ]] || die "refusing to publish to the production channel"
[[ -n "${EXPO_TOKEN:-}" ]] || die "EXPO_TOKEN is not set"
command -v eas >/dev/null || die "eas-cli is not installed"
command -v jq >/dev/null || die "jq is not installed"

cd "$ROOT/apps/mobile"
export APP_VARIANT=preview
export DEV_UPDATES=1

config="$(npx expo config --json --type public)"
bundle="$(jq -r '.ios.bundleIdentifier' <<<"$config")"
policy="$(jq -r '.runtimeVersion.policy // empty' <<<"$config")"
[[ "$bundle" == com.ethanl06.ut-dining.dev ]] || die "preview resolved to bundle $bundle, expected the dev bundle"
[[ "$policy" == fingerprint ]] || die "preview runtime policy is '$policy', expected fingerprint"
[[ "$(jq -r '.updates.enabled' <<<"$config")" == true ]] || die "preview resolved with updates off"

sha="$(git rev-parse --short HEAD)"
fingerprint="$(npx expo-updates fingerprint:generate --platform ios | jq -r '.hash')"
[[ -n "$fingerprint" && "$fingerprint" != null ]] || die "could not compute the iOS fingerprint"
echo "iOS fingerprint: $fingerprint"

builds="$(eas build:list --platform ios --build-profile "$PROFILE" --fingerprint-hash "$fingerprint" --limit 20 --json --non-interactive)"
build="$(jq -c '[.[] | select(.status == "FINISHED" or .status == "IN_PROGRESS" or .status == "IN_QUEUE" or .status == "NEW")] | sort_by(.status != "FINISHED") | first // empty' <<<"$builds")"

build_state=existing
if [[ -z "$build" ]]; then
  if [[ "${MOBILE_PREVIEW_BUILDS:-1}" == 0 ]]; then
    build_state=skipped
  else
    message="${pr:+PR #$pr }${sha} ${channel}"
    build="$(eas build --platform ios --profile "$PROFILE" --non-interactive --no-wait --json --message "$message" | jq -c 'first')"
    build_state=started
  fi
fi

build_id="$(jq -r '.id // empty' <<<"${build:-{\}}")"
build_status="$(jq -r '.status // empty' <<<"${build:-{\}}")"
build_url="${build_id:+$ACCOUNT_URL/builds/$build_id}"

if ! eas channel:view "$channel" --json --non-interactive >/dev/null 2>&1; then
  eas channel:create "$channel" --json --non-interactive >/dev/null
fi

update_message="${pr:+PR #$pr: }$(git log -1 --format=%s | cut -c1-80) ($sha)"
updates="$(eas update --channel "$channel" --environment "$ENVIRONMENT" --platform ios --message "$update_message" --non-interactive --json)"
group="$(jq -r 'first.group' <<<"$updates")"
runtime="$(jq -r 'first.runtimeVersion' <<<"$updates")"
[[ "$runtime" == "$fingerprint" ]] || die "update runtime $runtime does not match fingerprint $fingerprint"
update_url="$ACCOUNT_URL/updates/$group"

case "$build_state" in
  existing)
    if [[ "$build_status" == FINISHED ]]; then
      build_line="Native code matches an existing dev build ([install page]($build_url)), so this change ships as an OTA update."
    else
      build_line="A dev build for this native code is already running ([build page]($build_url)). Install it once it finishes."
    fi
    ;;
  started) build_line="Native code changed, so a new dev build started ([build page]($build_url)). It takes about 20 to 40 minutes on the free plan. Open that page on your iPhone to install it, then the OTA update below applies." ;;
  skipped) build_line="Native code changed, but builds are off for this run, so nothing new is installable until someone builds it." ;;
esac

if [[ "$mode" == pr ]]; then
  howto="In **UT Dining (Dev)**, open Settings > Developer > QA Menu > **Load PR Preview** and enter **$pr**. **Back to Staging** returns to the staging channel."
else
  howto="UT Dining (Dev) on the staging channel downloads it at the next launch and runs it on the launch after that, or right away from QA Menu > **Check for Update**."
fi

body="$MARKER
**Mobile preview**

$build_line

OTA update for \`$sha\` on channel \`$channel\`: [update page]($update_url)
$howto

Fingerprint \`${fingerprint:0:12}\` · dev Supabase · iOS only"

printf '%s\n' "$body"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '%s\n' "$body" >>"$GITHUB_STEP_SUMMARY"
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "fingerprint=$fingerprint"
    echo "build-state=$build_state"
    echo "build-url=$build_url"
    echo "update-url=$update_url"
    echo "channel=$channel"
  } >>"$GITHUB_OUTPUT"
fi

if [[ "$mode" == pr && -n "${GH_TOKEN:-}" && -n "${GITHUB_REPOSITORY:-}" ]]; then
  existing="$(gh api "repos/$GITHUB_REPOSITORY/issues/$pr/comments" --paginate --jq ".[] | select(.body | startswith(\"$MARKER\")) | .id" | head -1)"
  if [[ -n "$existing" ]]; then
    gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$existing" -f body="$body" >/dev/null
  else
    gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$pr/comments" -f body="$body" >/dev/null
  fi
fi
