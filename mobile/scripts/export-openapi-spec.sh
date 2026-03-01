#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_FILE="${1:-$ROOT_DIR/mobile/openapi/jualuma.openapi.json}"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/venv/bin/python}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3)"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

"$PYTHON_BIN" - <<'PY' "$OUTPUT_FILE"
import json
import sys
from backend.main import app

output_path = sys.argv[1]
spec = app.openapi()
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(spec, f, indent=2, sort_keys=True)
    f.write("\n")
print(f"Wrote OpenAPI spec: {output_path}")
PY
