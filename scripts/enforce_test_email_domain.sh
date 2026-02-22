#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TARGETS=(
  "backend/tests"
  "frontend-app/src/tests"
  "tests"
  "scripts"
)

PATTERN='[A-Za-z0-9._%+-]+@(example\.com|gmail\.com)'

if matches=$(rg -n --pcre2 "$PATTERN" "${TARGETS[@]}" --glob '!**/.next*' --glob '!**/node_modules/**' 2>/dev/null); then
  if [[ -n "$matches" ]]; then
    echo "ERROR: Test email policy violation. Use @testmail.app for all testing addresses."
    echo
    echo "$matches"
    exit 1
  fi
fi

exit 0
