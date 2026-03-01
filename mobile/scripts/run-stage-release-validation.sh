#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <dev-env-file> [release-env-file]" >&2
  exit 1
fi

DEV_ENV_FILE="$1"
RELEASE_ENV_FILE="${2:-.codex-artifacts/mobile-release-stage.env}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.codex-artifacts/mobile-stage-validation/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
SUMMARY_FILE="$RUN_DIR/stage-validation-summary.md"

cd "$ROOT_DIR"

./mobile/scripts/run-mobile-qa-matrix.sh stage "$DEV_ENV_FILE" "$RELEASE_ENV_FILE"
LATEST_QA_REPORT="$(ls -td .codex-artifacts/mobile-qa/stage-* | head -n1)/qa-report.md"

PREP_OUTPUT="$(./mobile/scripts/prepare-store-listing-package.sh stage "$RELEASE_ENV_FILE")"
LISTING_DIR="$(printf '%s\n' "$PREP_OUTPUT" | rg '^  Directory:' | sed 's/^  Directory: //')"
LISTING_ZIP="$(printf '%s\n' "$PREP_OUTPUT" | rg '^  Zip:' | sed 's/^  Zip: //')"
./mobile/scripts/validate-store-listing-package.sh "$LISTING_DIR"

ANDROID_AAB="$ROOT_DIR/frontend-app/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$ANDROID_AAB" ]]; then
  MOBILE_ENV_FILE="$RELEASE_ENV_FILE" MOBILE_TARGET_ENV=stage ./mobile/scripts/build-android-release-signed.sh
fi

ROLLBACK_REPORT="$RUN_DIR/rollback-drill.md"
./mobile/scripts/run-mobile-rollback-drill.sh stage "$ANDROID_AAB" "$ANDROID_AAB" "" "" "$ROLLBACK_REPORT"

cat > "$SUMMARY_FILE" <<EOF
# Stage Release Validation Summary

Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Checks completed
- Automated QA matrix: PASS
- Store listing package generation + validation: PASS
- Rollback drill evidence generation: PASS

## Evidence
- QA report: \`$LATEST_QA_REPORT\`
- Listing package directory: \`$LISTING_DIR\`
- Listing package archive: \`$LISTING_ZIP\`
- Rollback drill report: \`$ROLLBACK_REPORT\`

## Gate result
Stage release validation gate: PASS (automated scope).
EOF

echo "Stage release validation summary: $SUMMARY_FILE"
