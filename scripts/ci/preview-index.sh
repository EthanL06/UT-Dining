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
    'With GH_TOKEN set, both also drop every PR that is no longer open.' \
    '' \
    'Each PR has its own entry file (entries/pr-<n>.json), so parallel jobs never overwrite each' \
    'other. previews.json is rebuilt from the entry files, then read back after a short wait and' \
    'rebuilt again until it matches them, so a concurrent rebuild cannot drop an entry.' \
    '' \
    'Needs SUPABASE_DEV_URL and SUPABASE_DEV_SERVICE_KEY. Refuses the production project.'
}

BUCKET="${PREVIEW_INDEX_BUCKET:-qa-previews}"
INDEX=previews.json
ENTRIES=entries
MAX_ATTEMPTS="${PREVIEW_INDEX_ATTEMPTS:-6}"
SETTLE_SECONDS="${PREVIEW_INDEX_SETTLE_SECONDS:-4}"
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
    -d "{\"id\":\"$BUCKET\",\"name\":\"$BUCKET\",\"public\":true}" 2>/dev/null ||
    api -o /dev/null "$url/storage/v1/bucket/$BUCKET" ||
    die "could not create the $BUCKET bucket"
fi

upload() {
  api -o /dev/null -X POST "$url/storage/v1/object/$BUCKET/$1" \
    -H "Content-Type: $2" -H 'x-upsert: true' -H 'cache-control: max-age=30' --data-binary "@$3"
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

fetch() {
  api -H 'cache-control: no-cache' -o "$2" "$url/storage/v1/object/$BUCKET/$1?t=$(date +%s%N)" 2>/dev/null
}

list_entries() {
  api -X POST "$url/storage/v1/object/list/$BUCKET" -H 'Content-Type: application/json' \
    -d "{\"prefix\":\"$ENTRIES/\",\"limit\":1000,\"offset\":0}" |
    jq -r '.[].name | select(test("^pr-[0-9]+\\.json$"))'
}

read_index() {
  if ! fetch "$INDEX" "$1" || ! jq -e '.previews | type == "array"' "$1" >/dev/null 2>&1; then
    echo '{"previews":[]}' >"$1"
  fi
}

if [[ -z "$(list_entries)" ]]; then
  read_index "$work/legacy.json"
  jq -c '.previews[]' "$work/legacy.json" | while IFS= read -r entry; do
    n="$(jq -r '.pr' <<<"$entry")"
    [[ "$n" == "$pr" ]] && continue
    printf '%s\n' "$entry" >"$work/legacy-$n.json"
    upload "$ENTRIES/pr-$n.json" application/json "$work/legacy-$n.json"
  done
fi

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
qr_url=""

if [[ "$mode" == add ]]; then
  qr_path="qr/pr-$pr.png"
  npx --yes qrcode@1.5.4 -o "$work/qr.png" -w 360 "ut-dining-dev://preview/$pr" >/dev/null
  upload "$qr_path" image/png "$work/qr.png"
  qr_url="$url/storage/v1/object/public/$BUCKET/$qr_path"

  jq -n --argjson pr "$pr" \
    --arg title "${PREVIEW_TITLE:-PR #$pr}" \
    --arg sha "${PREVIEW_SHA:-}" \
    --arg runtime "${PREVIEW_RUNTIME:-}" \
    --arg buildUrl "${PREVIEW_BUILD_URL:-}" \
    --arg updateUrl "${PREVIEW_UPDATE_URL:-}" \
    --arg now "$now" \
    '{pr: $pr, title: $title, channel: "pr-\($pr)", sha: $sha, runtime: $runtime,
      buildUrl: $buildUrl, updateUrl: $updateUrl, updatedAt: $now}' >"$work/entry.json"
  upload "$ENTRIES/pr-$pr.json" application/json "$work/entry.json"
else
  api -o /dev/null -X DELETE "$url/storage/v1/object/$BUCKET/$ENTRIES/pr-$pr.json" 2>/dev/null || true
  api -o /dev/null -X DELETE "$url/storage/v1/object/$BUCKET/qr/pr-$pr.png" 2>/dev/null || true
fi

repo="${GITHUB_REPOSITORY:-EthanL06/UT-Dining}"
if [[ -n "${GH_TOKEN:-}" ]] &&
  gh api --paginate "repos/$repo/pulls?state=open&per_page=100" --jq '.[].number' >"$work/open.txt" 2>/dev/null; then
  for name in $(list_entries); do
    n="${name#pr-}"
    n="${n%.json}"
    [[ "$mode" == add && "$n" == "$pr" ]] && continue
    grep -qx "$n" "$work/open.txt" && continue
    api -o /dev/null -X DELETE "$url/storage/v1/object/$BUCKET/$ENTRIES/$name" 2>/dev/null || true
    api -o /dev/null -X DELETE "$url/storage/v1/object/$BUCKET/qr/pr-$n.png" 2>/dev/null || true
    echo "preview-index: dropped closed PR #$n" >&2
  done
fi

build_index() {
  local out="$1" name
  : >"$work/entries.ndjson"
  for name in $(list_entries); do
    if fetch "$ENTRIES/$name" "$work/one.json" && jq -e '.pr | type == "number"' "$work/one.json" >/dev/null 2>&1; then
      jq -c . "$work/one.json" >>"$work/entries.ndjson"
    fi
  done
  jq -s --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{updatedAt: $now, previews: (unique_by(.pr) | sort_by(.updatedAt) | reverse)}' \
    "$work/entries.ndjson" >"$out"
}

same_prs() {
  [[ "$(jq -c '[.previews[] | [.pr, .sha]] | sort' "$1")" == "$(jq -c '[.previews[] | [.pr, .sha]] | sort' "$2")" ]]
}

attempt=1
while :; do
  build_index "$work/next.json"
  upload "$INDEX" application/json "$work/next.json"
  sleep "$((SETTLE_SECONDS + RANDOM % 3))"
  build_index "$work/expected.json"
  read_index "$work/live.json"
  if same_prs "$work/expected.json" "$work/live.json"; then
    break
  fi
  if ((attempt >= MAX_ATTEMPTS)); then
    die "previews.json still differs from the entry files after $attempt attempts"
  fi
  echo "preview-index: previews.json changed under us, rebuilding (attempt $((attempt + 1)))" >&2
  attempt=$((attempt + 1))
done

echo "preview-index: $mode PR #$pr ($(jq '.previews | length' "$work/live.json") previews listed)" >&2

if [[ -n "$qr_url" ]]; then
  printf '%s\n' "$qr_url"
fi
