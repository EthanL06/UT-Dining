#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: scripts/ci/preview-index.sh add <pr> | remove <pr>' \
    '' \
    'Keeps the list of PR previews that the dev app QA menu shows, in the public dev Supabase' \
    'storage bucket qa-previews (previews.json), plus one QR code per PR (qr/pr-<n>.png).' \
    '' \
    'add reads PREVIEW_TITLE, PREVIEW_SHA, PREVIEW_RUNTIME, PREVIEW_BUILD_URL and PREVIEW_UPDATE_URL,' \
    'and prints the public URL of the QR code. remove drops the PR from the list.' \
    'With GH_TOKEN set, both also drop every PR that is no longer open, so a lost write heals itself.' \
    '' \
    'Needs SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_KEY. Refuses the production project.'
}

BUCKET=qa-previews
INDEX=previews.json
PROD_REF=yrmylgizphirqqkzgbth

die() {
  printf 'preview-index: %s\n' "$*" >&2
  exit 1
}

mode="${1:-}"
pr="${2:-}"
case "$mode" in
  add | remove) [[ "$pr" =~ ^[0-9]+$ ]] || die "$mode needs a PR number" ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

url="${SUPABASE_DEV_URL:-}"
key="${SUPABASE_DEV_SERVICE_KEY:-}"
[[ -n "$url" && -n "$key" ]] || die "SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_KEY are required"
[[ "$url" != *"$PROD_REF"* ]] || die "refusing to write to the production Supabase project"
url="${url%/}"

auth=(-H "apikey: $key")
if [[ "$key" != sb_secret_* ]]; then
  auth+=(-H "Authorization: Bearer $key")
fi

api() {
  curl -sS --fail-with-body "${auth[@]}" "$@"
}

if ! api -o /dev/null "$url/storage/v1/bucket/$BUCKET" 2>/dev/null; then
  api -o /dev/null -X POST "$url/storage/v1/bucket" -H 'Content-Type: application/json' \
    -d "{\"id\":\"$BUCKET\",\"name\":\"$BUCKET\",\"public\":true}"
fi

upload() {
  api -o /dev/null -X POST "$url/storage/v1/object/$BUCKET/$1" \
    -H "Content-Type: $2" -H 'x-upsert: true' -H 'cache-control: max-age=30' --data-binary "@$3"
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if ! api -o "$work/current.json" "$url/storage/v1/object/$BUCKET/$INDEX" 2>/dev/null ||
  ! jq -e '.previews | type == "array"' "$work/current.json" >/dev/null 2>&1; then
  echo '{"previews":[]}' >"$work/current.json"
fi

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
qr_url=""

if [[ "$mode" == add ]]; then
  qr_path="qr/pr-$pr.png"
  npx --yes qrcode@1.5.4 -o "$work/qr.png" -w 360 "ut-dining-dev://preview/$pr" >/dev/null
  upload "$qr_path" image/png "$work/qr.png"
  qr_url="$url/storage/v1/object/public/$BUCKET/$qr_path"

  jq --argjson pr "$pr" \
    --arg title "${PREVIEW_TITLE:-PR #$pr}" \
    --arg sha "${PREVIEW_SHA:-}" \
    --arg runtime "${PREVIEW_RUNTIME:-}" \
    --arg buildUrl "${PREVIEW_BUILD_URL:-}" \
    --arg updateUrl "${PREVIEW_UPDATE_URL:-}" \
    --arg now "$now" \
    '.updatedAt = $now
     | .previews = ([.previews[] | select(.pr != $pr)] + [{
         pr: $pr, title: $title, channel: "pr-\($pr)", sha: $sha, runtime: $runtime,
         buildUrl: $buildUrl, updateUrl: $updateUrl, updatedAt: $now
       }] | sort_by(.updatedAt) | reverse)' \
    "$work/current.json" >"$work/next.json"
else
  jq --argjson pr "$pr" --arg now "$now" \
    '.updatedAt = $now | .previews = [.previews[] | select(.pr != $pr)]' \
    "$work/current.json" >"$work/next.json"
  api -o /dev/null -X DELETE "$url/storage/v1/object/$BUCKET/qr/pr-$pr.png" 2>/dev/null || true
fi

repo="${GITHUB_REPOSITORY:-EthanL06/UT-Dining}"
if [[ -n "${GH_TOKEN:-}" ]] &&
  gh api --paginate "repos/$repo/pulls?state=open&per_page=100" --jq '.[].number' >"$work/open.txt" 2>/dev/null; then
  jq --slurpfile open <(jq -s . "$work/open.txt") --argjson pr "$pr" --arg mode "$mode" \
    '.previews as $all
     | .previews = [$all[] | select((.pr as $n | $open[0] | index($n)) or ($mode == "add" and .pr == $pr))]
     | ([$all[].pr] - [.previews[].pr]) as $gone
     | if ($gone | length) > 0 then .pruned = $gone else . end' \
    "$work/next.json" >"$work/pruned.json"
  for gone in $(jq -r '.pruned // [] | .[]' "$work/pruned.json"); do
    [[ "$gone" == "$pr" ]] && continue
    api -o /dev/null -X DELETE "$url/storage/v1/object/$BUCKET/qr/pr-$gone.png" 2>/dev/null || true
    echo "preview-index: dropped closed PR #$gone" >&2
  done
  jq 'del(.pruned)' "$work/pruned.json" >"$work/next.json"
fi

upload "$INDEX" application/json "$work/next.json"
echo "preview-index: $mode PR #$pr ($(jq '.previews | length' "$work/next.json") previews listed)" >&2

if [[ -n "$qr_url" ]]; then
  printf '%s\n' "$qr_url"
fi
