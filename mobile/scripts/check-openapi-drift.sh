#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMMITTED_SPEC="$ROOT_DIR/mobile/openapi/jualuma.openapi.json"
TMP_SPEC="$ROOT_DIR/.codex-artifacts/openapi.current.json"

mkdir -p "$ROOT_DIR/.codex-artifacts"
"$ROOT_DIR/mobile/scripts/export-openapi-spec.sh" "$TMP_SPEC"

if [[ ! -f "$COMMITTED_SPEC" ]]; then
  echo "Missing committed OpenAPI spec: $COMMITTED_SPEC" >&2
  echo "Run ./mobile/scripts/generate-mobile-openapi-client.sh" >&2
  exit 1
fi

if ! cmp -s "$COMMITTED_SPEC" "$TMP_SPEC"; then
  echo "OpenAPI drift detected between committed spec and backend routes." >&2
  echo "Run ./mobile/scripts/generate-mobile-openapi-client.sh and commit updated artifacts." >&2
  diff -u "$COMMITTED_SPEC" "$TMP_SPEC" || true
  exit 1
fi

echo "OpenAPI drift check passed."
