#!/usr/bin/env bash

set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must be run inside the git repository." >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel)"
PRIMARY_BRANCH="${PRIMARY_BRANCH:-Dev}"
SKIP_WORKTREE_CHECK="${SKIP_WORKTREE_CHECK:-0}"

cd "$ROOT_DIR"

git config core.hooksPath .githooks
git config remote.origin.fetch "+refs/heads/$PRIMARY_BRANCH:refs/remotes/origin/$PRIMARY_BRANCH"
git config remote.origin.prune true
git config push.default simple
git config remote.pushDefault origin

git fetch --prune origin "$PRIMARY_BRANCH"

if git show-ref --verify --quiet "refs/heads/$PRIMARY_BRANCH"; then
  git switch "$PRIMARY_BRANCH"
else
  git switch -c "$PRIMARY_BRANCH" "origin/$PRIMARY_BRANCH"
fi

git branch --set-upstream-to="origin/$PRIMARY_BRANCH" "$PRIMARY_BRANCH" || true

if [[ "$SKIP_WORKTREE_CHECK" != "1" ]]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Working tree is dirty. Re-run with SKIP_WORKTREE_CHECK=1 to force sync."
    echo "Use a normal Git workflow to preserve uncommitted or staged changes."
    exit 1
  fi
fi

git reset --hard "origin/$PRIMARY_BRANCH"

cat <<'MSG'
Git branch workflow bootstrap complete.

- Push pre-hook is enabled via .githooks/pre-push (tracks main/stage protections).
- Dev branch is now aligned with origin/$PRIMARY_BRANCH.
- Override push guard only when explicitly promoting: ALLOW_NON_DEV_PUSH=1 git push ...
MSG
