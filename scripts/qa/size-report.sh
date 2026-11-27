#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/../dev/lib.sh"

REPORT_TS="$ROOT/scripts/qa/size-report.ts"
LHCI_VERSION="${LHCI_VERSION:-0.16.1}"
LHCI_RUNS="${LHCI_RUNS:-3}"
LHCI_PAGES="/ /changelog/ /privacy-policy/"

usage() {
  cat >&2 <<'USAGE'
usage: size-report.sh measure mobile|website <repo dir> <out json>
       size-report.sh local [base ref]
USAGE
  exit 2
}

measure_mobile() {
  local repo="$1" out="$2" work
  work="$(mktemp -d)"
  step "Exporting the iOS bundle from $repo"
  (
    cd "$repo/apps/mobile"
    APP_VARIANT=production npx expo export --platform ios --source-maps --output-dir "$work/bytecode" >/dev/null
    APP_VARIANT=production npx expo export --platform ios --no-bytecode --source-maps --output-dir "$work/js" >/dev/null
  )
  node "$REPORT_TS" mobile --bytecode "$work/bytecode" --js "$work/js" --out "$out"
  rm -rf "$work"
  ok "mobile report in $out"
}

measure_website() {
  local repo="$1" out="$2" lhci_dir urls=() page
  step "Building the static website from $repo"
  (
    cd "$repo/apps/website"
    rm -rf out .lighthouseci
    env -u WEBSITE_SUPABASE_URL -u WEBSITE_SUPABASE_ANON_KEY \
      WEBSITE_STATIC_EXPORT=1 WEBSITE_BASE_PATH='' WEBSITE_SITE_URL=https://utdining.app \
      pnpm build >/dev/null
  )
  lhci_dir="$repo/apps/website/.lighthouseci"
  if [[ "${SKIP_LIGHTHOUSE:-0}" == "1" ]]; then
    warn "SKIP_LIGHTHOUSE=1, no Lighthouse scores"
  else
    step "Running Lighthouse $LHCI_RUNS times per page"
    for page in $LHCI_PAGES; do urls+=("--url=http://localhost$page"); done
    (
      cd "$repo/apps/website"
      npx --yes "@lhci/cli@$LHCI_VERSION" collect \
        --staticDistDir=out \
        --numberOfRuns="$LHCI_RUNS" \
        --settings.chromeFlags="--headless=new --no-sandbox" \
        "${urls[@]}" >/dev/null
    )
  fi
  node "$REPORT_TS" website --dir "$repo/apps/website/out" --lighthouse "$lhci_dir" --out "$out"
  ok "website report in $out"
}

measure() {
  [[ $# -eq 3 ]] || usage
  case "$1" in
    mobile) measure_mobile "$2" "$3" ;;
    website) measure_website "$2" "$3" ;;
    *) usage ;;
  esac
}

local_report() {
  local base_ref="${1:-}" dir="$ROOT/.context/size-report" base_dir base_sha="" head_sha kind
  mkdir -p "$dir"
  rm -f "$dir"/*.json "$dir/report.md"
  head_sha="$(git -C "$ROOT" rev-parse HEAD)"
  for kind in mobile website; do measure "$kind" "$ROOT" "$dir/$kind-head.json"; done
  if [[ -n "$base_ref" ]]; then
    base_sha="$(git -C "$ROOT" rev-parse "$base_ref")"
    base_dir="$dir/base"
    step "Checking out $base_ref in $base_dir"
    git -C "$ROOT" worktree remove --force "$base_dir" >/dev/null 2>&1 || true
    git -C "$ROOT" worktree add --detach "$base_dir" "$base_sha" >/dev/null
    (cd "$base_dir" && pnpm install --frozen-lockfile --ignore-scripts >/dev/null)
    for kind in mobile website; do measure "$kind" "$base_dir" "$dir/$kind-base.json"; done
    git -C "$ROOT" worktree remove --force "$base_dir"
  fi
  for kind in mobile website; do
    node "$REPORT_TS" compare --base "$dir/$kind-base.json" --base-sha "$base_sha" \
      --head "$dir/$kind-head.json" --head-sha "$head_sha" --out "$dir/$kind.json"
  done
  node "$REPORT_TS" render --mobile "$dir/mobile.json" --website "$dir/website.json" \
    --budgets "$ROOT/.github/perf-budgets.json" --out "$dir/report.md"
  ok "report in $dir/report.md"
}

case "${1:-}" in
  measure) shift; measure "$@" ;;
  local) shift; local_report "$@" ;;
  *) usage ;;
esac
