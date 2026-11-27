#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

max_bytes="${MAX_BYTES:-1048576}"
failed=0

while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  name="${file##*/}"
  case "$name" in
    .env.example) ;;
    .env | .env.*) bad "$file is an env file; real values belong in .env.local, which is gitignored"; failed=1 ;;
    *.p8 | *.p12 | *.pem | *.key | *.jks | *.keystore | *.mobileprovision | *.cer)
      bad "$file is a key or certificate; keep it out of git (EAS credentials or an env var)"
      failed=1
      ;;
  esac
  size="$(git cat-file -s ":$file" 2>/dev/null || echo 0)"
  if [[ "$size" -gt "$max_bytes" ]]; then
    bad "$file is $((size / 1024)) KB (max $((max_bytes / 1024)) KB); compress it or host it outside the repo"
    failed=1
  fi
done < <(git diff --cached --name-only --diff-filter=ACMR)

secrets='sb_secret_[A-Za-z0-9_-]{20,}|sbp_[a-f0-9]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}'
hits="$(git diff --cached -U0 --no-color --diff-filter=ACMR | grep -E '^\+[^+]' | grep -oE "$secrets" | cut -c1-16 || true)"
if [[ -n "$hits" ]]; then
  while IFS= read -r hit; do
    bad "staged change adds what looks like a secret (${hit}...); use an env var instead"
  done <<<"$hits"
  failed=1
fi

if [[ $failed -ne 0 ]]; then
  exit 1
fi
ok "no env files, keys, secrets or files over $((max_bytes / 1024)) KB staged"
