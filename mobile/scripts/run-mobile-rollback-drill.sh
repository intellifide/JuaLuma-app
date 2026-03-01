#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 6 ]]; then
  echo "Usage: $0 <stage|prod> <current-android-aab> [previous-android-aab] [current-ios-ipa] [previous-ios-ipa] [report-file]" >&2
  exit 1
fi

TARGET_ENV="$1"
CURRENT_ANDROID_AAB="$2"
PREVIOUS_ANDROID_AAB="${3:-}"
CURRENT_IOS_IPA="${4:-}"
PREVIOUS_IOS_IPA="${5:-}"
REPORT_FILE="${6:-}"

case "$TARGET_ENV" in
  stage|prod) ;;
  *)
    echo "Invalid target environment '$TARGET_ENV'. Use stage|prod." >&2
    exit 1
    ;;
esac

if [[ ! -f "$CURRENT_ANDROID_AAB" ]]; then
  echo "Missing current Android AAB: $CURRENT_ANDROID_AAB" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -z "$REPORT_FILE" ]]; then
  REPORT_DIR="$ROOT_DIR/.codex-artifacts/mobile-rollback/${TARGET_ENV}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$REPORT_DIR"
  REPORT_FILE="$REPORT_DIR/rollback-drill.md"
else
  mkdir -p "$(dirname "$REPORT_FILE")"
fi

if [[ -z "$PREVIOUS_ANDROID_AAB" ]]; then
  PREVIOUS_ANDROID_AAB="$CURRENT_ANDROID_AAB"
fi

if [[ ! -f "$PREVIOUS_ANDROID_AAB" ]]; then
  echo "Missing previous Android AAB: $PREVIOUS_ANDROID_AAB" >&2
  exit 1
fi

current_android_sha="$(shasum -a 256 "$CURRENT_ANDROID_AAB" | awk '{print $1}')"
previous_android_sha="$(shasum -a 256 "$PREVIOUS_ANDROID_AAB" | awk '{print $1}')"

ios_section='- iOS rollback drill skipped (no IPA artifacts provided).'
if [[ -n "$CURRENT_IOS_IPA" && -n "$PREVIOUS_IOS_IPA" ]]; then
  if [[ ! -f "$CURRENT_IOS_IPA" || ! -f "$PREVIOUS_IOS_IPA" ]]; then
    echo "Provided iOS IPA path does not exist." >&2
    exit 1
  fi
  current_ios_sha="$(shasum -a 256 "$CURRENT_IOS_IPA" | awk '{print $1}')"
  previous_ios_sha="$(shasum -a 256 "$PREVIOUS_IOS_IPA" | awk '{print $1}')"
  ios_section=$(cat <<EOF
- iOS current IPA: \`$CURRENT_IOS_IPA\` (sha256: \`$current_ios_sha\`)
- iOS rollback candidate IPA: \`$PREVIOUS_IOS_IPA\` (sha256: \`$previous_ios_sha\`)
- iOS rollback dry-run command (workflow): run \`.github/workflows/mobile-distribution.yml\` with \`target_env=$TARGET_ENV\`, \`publish_ios=true\`, and rollback IPA selected as release candidate.
EOF
)
fi

cat > "$REPORT_FILE" <<EOF
# Mobile Rollback Drill (${TARGET_ENV})

Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Android drill
- Current AAB: \`$CURRENT_ANDROID_AAB\` (sha256: \`$current_android_sha\`)
- Rollback candidate AAB: \`$PREVIOUS_ANDROID_AAB\` (sha256: \`$previous_android_sha\`)
- Android rollback dry-run command (workflow): run \`.github/workflows/mobile-distribution.yml\` with \`target_env=$TARGET_ENV\`, \`publish_android=true\`, and rollback AAB selected as release candidate.

## iOS drill
$ios_section

## Result
Rollback drill evidence generated successfully.
EOF

echo "Rollback drill report: $REPORT_FILE"
