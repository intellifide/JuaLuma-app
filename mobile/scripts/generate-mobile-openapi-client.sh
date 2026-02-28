#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEC_FILE="$ROOT_DIR/mobile/openapi/jualuma.openapi.json"
CLIENT_OUTPUT_DIR="$ROOT_DIR/mobile/shared-core/generated/openapi-kotlin-client"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export PATH="$JAVA_HOME/bin:/opt/homebrew/bin:$PATH"

"$ROOT_DIR/mobile/scripts/export-openapi-spec.sh" "$SPEC_FILE"

rm -rf "$CLIENT_OUTPUT_DIR"

npx --yes @openapitools/openapi-generator-cli generate \
  -i "$SPEC_FILE" \
  -g kotlin \
  -o "$CLIENT_OUTPUT_DIR" \
  --package-name com.intellifide.jualuma.sharedcore.api \
  --skip-validate-spec

echo "Generated Kotlin OpenAPI client: $CLIENT_OUTPUT_DIR"
