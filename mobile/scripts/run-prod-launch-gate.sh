#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 <dev-env-file> [prod-release-env-file]" >&2
  exit 1
fi

DEV_ENV_FILE="$1"
PROD_RELEASE_ENV_FILE="${2:-.codex-artifacts/mobile-release-prod.env}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_DIR="$ROOT_DIR/.codex-artifacts/mobile-prod-launch/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
SUMMARY_FILE="$RUN_DIR/prod-launch-summary.md"

if [[ ! -f "$PROD_RELEASE_ENV_FILE" ]]; then
  echo "Missing prod release env file: $PROD_RELEASE_ENV_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

./mobile/scripts/run-mobile-qa-matrix.sh prod "$DEV_ENV_FILE" "$PROD_RELEASE_ENV_FILE"
LATEST_QA_REPORT="$(ls -td .codex-artifacts/mobile-qa/prod-* | head -n1)/qa-report.md"

PREP_OUTPUT="$(./mobile/scripts/prepare-store-listing-package.sh prod "$PROD_RELEASE_ENV_FILE")"
LISTING_DIR="$(printf '%s\n' "$PREP_OUTPUT" | rg '^  Directory:' | sed 's/^  Directory: //')"
LISTING_ZIP="$(printf '%s\n' "$PREP_OUTPUT" | rg '^  Zip:' | sed 's/^  Zip: //')"
./mobile/scripts/validate-store-listing-package.sh "$LISTING_DIR"

ANDROID_AAB="$ROOT_DIR/frontend-app/android/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$ANDROID_AAB" ]]; then
  MOBILE_ENV_FILE="$PROD_RELEASE_ENV_FILE" MOBILE_TARGET_ENV=prod ./mobile/scripts/build-android-release-signed.sh
fi

ROLLBACK_REPORT="$RUN_DIR/rollback-drill.md"
./mobile/scripts/run-mobile-rollback-drill.sh prod "$ANDROID_AAB" "$ANDROID_AAB" "" "" "$ROLLBACK_REPORT"

cat > "$RUN_DIR/controlled-rollout-plan.md" <<'EOF'
# Controlled Rollout Plan (Prod)

## Phase 1: Internal confidence ring
- Channel: Google Play internal + TestFlight internal.
- Scope: 5% of internal tester cohort.
- Hold duration: 2 hours.
- Abort threshold: crash-free sessions < 99.5% OR auth failure rate > 1.0%.

## Phase 2: Beta ring
- Channel: Google Play beta + TestFlight external beta.
- Scope: 20% of approved beta cohort.
- Hold duration: 4 hours.
- Abort threshold: crash-free sessions < 99.0% OR payment/account-link error rate > 1.5%.

## Phase 3: Full rollout
- Channel: production tracks.
- Scope: 100%.
- Hold duration: monitored continuously for 24 hours post-release.
- Abort threshold: Sev1 incident OR rollback trigger from incident commander.
EOF

cat > "$SUMMARY_FILE" <<EOF
# Production Launch Gate Summary

Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Checks completed
- Production QA matrix: PASS
- Production listing package generation + validation: PASS
- Rollback drill evidence generation: PASS
- Controlled rollout plan generated: PASS

## Evidence
- QA report: \`$LATEST_QA_REPORT\`
- Listing package directory: \`$LISTING_DIR\`
- Listing package archive: \`$LISTING_ZIP\`
- Rollback drill report: \`$ROLLBACK_REPORT\`
- Controlled rollout plan: \`$RUN_DIR/controlled-rollout-plan.md\`

## Gate result
Production launch gate: PASS (automated scope).
EOF

echo "Production launch gate summary: $SUMMARY_FILE"
