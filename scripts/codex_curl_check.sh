#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/codex_curl_check.sh <url> [<url> ...]

Fetches HTTP status + key headers only (no body) for each URL.
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl not found on PATH" >&2
  exit 127
fi

for u in "$@"; do
  echo "--- $u"
  # -sS: quiet but show errors; -D -: dump headers; -o /dev/null: no body; -L: follow redirects.
  # Keep output small by filtering to the most useful headers.
  curl -sS -L -D - -o /dev/null "$u" \
    | awk '
      BEGIN { IGNORECASE=1 }
      /^HTTP\// { print; next }
      /^date:/ { print; next }
      /^server:/ { print; next }
      /^content-type:/ { print; next }
      /^content-length:/ { print; next }
      /^location:/ { print; next }
      /^x-robots-tag:/ { print; next }
      /^strict-transport-security:/ { print; next }
      /^$/ { print; exit }
    '
done
