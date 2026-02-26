#!/usr/bin/env bash

set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

git fetch --prune origin +refs/heads/*:refs/remotes/origin/* >/dev/null

TARGET_BRANCH="${TARGET_BRANCH:-}"
if [[ -z "$TARGET_BRANCH" ]]; then
  TARGET_BRANCH="${GITHUB_REF_NAME:-${GITHUB_HEAD_REF:-$(git branch --show-current || true)}}"
fi
TARGET_BRANCH="${TARGET_BRANCH#refs/heads/}"

if ! target_conflict="$(
  TARGET_BRANCH_LOWER="$(printf '%s' "$TARGET_BRANCH" | tr '[:upper:]' '[:lower:]')"
  if [ -z "$TARGET_BRANCH" ]; then
    git for-each-ref --format='%(refname)' refs/remotes/origin |
      grep -v '^refs/remotes/origin/HEAD$' |
      sed 's#^refs/remotes/origin/##' |
      awk '
        {
          lower = tolower($0)
          if (seen[lower] && !printed[lower]++) {
            printf "Case-only duplicate branch names detected:\n"
            printf "  origin/%s\n", seen[lower]
            printf "  origin/%s\n", $0
            collision++
          } else if (!seen[lower]) {
            seen[lower] = $0
          }
        }
        END { if (collision) exit 1 }
      '
  else
    git for-each-ref --format='%(refname)' refs/remotes/origin |
      grep -v '^refs/remotes/origin/HEAD$' |
      sed 's#^refs/remotes/origin/##' |
      awk -v target="$TARGET_BRANCH" -v target_lower="$TARGET_BRANCH_LOWER" '
        {
          if (tolower($0) == target_lower && $0 != target) {
            printf "Case-only duplicate branch names detected:\n"
            printf "  origin/%s\n", target
            printf "  origin/%s\n", $0
            exit 1
          }
        }
      '
  fi
)"; then
  echo "$target_conflict"
  echo "Failing branch policy check: branch names must be unique case-insensitively."
  exit 1
fi

echo "Branch case policy passed."
