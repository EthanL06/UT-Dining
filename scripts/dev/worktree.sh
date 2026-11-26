#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage: scripts/dev/worktree.sh <command>

  new <branch> [base]   Create .worktrees/<branch> on a new branch from origin/<base>
                        (default staging), copy env files, install dependencies
  rm <branch>           Remove .worktrees/<branch> (refuses with uncommitted changes
                        unless FORCE=1)
  list                  List worktrees
EOF
}

copy_env() {
  local target="$1" file
  for file in apps/*/.env.local supabase/.env; do
    [[ -f "$file" ]] || continue
    mkdir -p "$target/$(dirname "$file")"
    cp "$file" "$target/$file"
  done
}

cmd_new() {
  local branch="${1:-}" base="${2:-staging}"
  [[ -n "$branch" ]] || die "give a branch name, for example: make worktree NAME=feat-meal-notes"
  local path="$ROOT/.worktrees/$branch"
  if [[ -d "$path" ]]; then
    ok ".worktrees/$branch already exists"
  else
    step "Creating .worktrees/$branch"
    git fetch --quiet origin "$base" || warn "could not fetch origin/$base, using the local copy"
    if git show-ref --verify --quiet "refs/heads/$branch"; then
      git worktree add "$path" "$branch"
    else
      git worktree add --no-track -b "$branch" "$path" "origin/$base"
    fi
  fi
  copy_env "$path"
  ok "copied env files"
  step "Installing dependencies"
  (cd "$path" && pnpm install --frozen-lockfile --prefer-offline >/dev/null)
  ok "ready: $path"
  note "local Supabase is shared by every worktree of this repo"
}

cmd_rm() {
  local branch="${1:-}"
  [[ -n "$branch" ]] || die "give a branch name, for example: make worktree-rm NAME=feat-meal-notes"
  local path="$ROOT/.worktrees/$branch"
  [[ -d "$path" ]] || die ".worktrees/$branch does not exist"
  if [[ "${FORCE:-0}" != "1" && -n "$(git -C "$path" status --porcelain | head -1)" ]]; then
    die ".worktrees/$branch has uncommitted changes. Commit them, or re-run with FORCE=1."
  fi
  git worktree remove --force "$path"
  ok "removed .worktrees/$branch (branch $branch is kept)"
}

case "${1:-}" in
  new) shift; cmd_new "$@" ;;
  rm) shift; cmd_rm "$@" ;;
  list) git worktree list ;;
  -h | --help | help | "") usage ;;
  *) usage >&2; exit 1 ;;
esac
