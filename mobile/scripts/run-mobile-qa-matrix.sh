#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 3 ]]; then
  echo "Usage: $0 <stage|prod> [dev-env-file] [release-env-file]" >&2
  exit 1
fi

TARGET_ENV="$1"
DEV_ENV_FILE="${2:-.codex-artifacts/mobile.env}"
RELEASE_ENV_FILE="${3:-.codex-artifacts/mobile-release-${TARGET_ENV}.env}"

case "$TARGET_ENV" in
  stage|prod) ;;
  *)
    echo "Invalid target environment '$TARGET_ENV'. Use stage|prod." >&2
    exit 1
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_DIR="$ROOT_DIR/.codex-artifacts/mobile-qa/${TARGET_ENV}-$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="$REPORT_DIR/qa-report.md"
LOG_DIR="$REPORT_DIR/logs"
mkdir -p "$LOG_DIR"

run_check() {
  local name="$1"
  local command="$2"
  local log_file="$3"
  local status="PASS"

  if ! bash -lc "$command" >"$log_file" 2>&1; then
    status="FAIL"
  fi

  printf '| %s | %s | `%s` |\n' "$name" "$status" "$log_file" >> "$REPORT_FILE"
  if [[ "$status" == "FAIL" ]]; then
    FAILED_CHECKS=1
  fi
}

FAILED_CHECKS=0

cat > "$REPORT_FILE" <<EOF
# Mobile QA Matrix Report (${TARGET_ENV})

Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

| Check | Status | Log |
|---|---|---|
EOF

run_check "OpenAPI drift" \
  "cd '$ROOT_DIR' && ./mobile/scripts/check-openapi-drift.sh" \
  "$LOG_DIR/openapi-drift.log"

run_check "Frontend lint" \
  "cd '$ROOT_DIR' && npm --prefix frontend-app run lint" \
  "$LOG_DIR/frontend-lint.log"

run_check "Frontend targeted tests" \
  "cd '$ROOT_DIR' && npm --prefix frontend-app run test -- src/services/mobileDataResilience.test.ts --run && npm --prefix frontend-app run test -- src/services/clientObservability.test.ts --run" \
  "$LOG_DIR/frontend-tests.log"

run_check "Android no-keychain build" \
  "cd '$ROOT_DIR' && MOBILE_ENV_FILE='$DEV_ENV_FILE' MOBILE_TARGET_ENV=dev ./mobile/scripts/build-android-nokeychain.sh" \
  "$LOG_DIR/android-nokeychain.log"

run_check "Android shared-core test + lint" \
  "cd '$ROOT_DIR' && JAVA_HOME='/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home' ANDROID_HOME=\"\${ANDROID_HOME:-$HOME/Library/Android/sdk}\" ANDROID_SDK_ROOT=\"\${ANDROID_SDK_ROOT:-\${ANDROID_HOME:-$HOME/Library/Android/sdk}}\" PATH=\"/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home/bin:\${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}/platform-tools:/opt/homebrew/bin:\$PATH\" ./frontend-app/android/gradlew -p frontend-app/android :mobile-shared-core:test :app:lintDebug" \
  "$LOG_DIR/android-test-lint.log"

run_check "iOS no-keychain simulator build" \
  "cd '$ROOT_DIR' && MOBILE_ENV_FILE='$DEV_ENV_FILE' MOBILE_TARGET_ENV=dev ./mobile/scripts/build-ios-nokeychain.sh" \
  "$LOG_DIR/ios-nokeychain.log"

if [[ -f "$RELEASE_ENV_FILE" ]]; then
  run_check "Release contract validation" \
    "cd '$ROOT_DIR' && ./mobile/scripts/validate-mobile-release-contract.sh '$RELEASE_ENV_FILE' '$TARGET_ENV' all" \
    "$LOG_DIR/release-contract.log"

  run_check "Android signed release build" \
    "cd '$ROOT_DIR' && MOBILE_ENV_FILE='$RELEASE_ENV_FILE' MOBILE_TARGET_ENV='$TARGET_ENV' ./mobile/scripts/build-android-release-signed.sh" \
    "$LOG_DIR/android-release-signed.log"

  run_check "iOS signed release dry-run" \
    "cd '$ROOT_DIR' && MOBILE_ENV_FILE='$RELEASE_ENV_FILE' MOBILE_TARGET_ENV='$TARGET_ENV' MOBILE_DRY_RUN=1 ./mobile/scripts/build-ios-release-signed.sh" \
    "$LOG_DIR/ios-release-dry-run.log"
else
  printf '| Release contract validation | SKIPPED | `%s` |\n' "$LOG_DIR/release-contract.log" >> "$REPORT_FILE"
  printf '| Android signed release build | SKIPPED | `%s` |\n' "$LOG_DIR/android-release-signed.log" >> "$REPORT_FILE"
  printf '| iOS signed release dry-run | SKIPPED | `%s` |\n' "$LOG_DIR/ios-release-dry-run.log" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

## Manual Matrix (Release Sign-Off)
- iOS physical device smoke (login, account link, transaction sync, push receipt): Pending manual execution.
- Android physical device smoke (login, account link, transaction sync, push receipt): Pending manual execution.
- TestFlight internal tester install/upgrade: Pending manual execution.
- Google Play internal track install/upgrade: Pending manual execution.
EOF

if [[ "$FAILED_CHECKS" -eq 0 ]]; then
  echo "" >> "$REPORT_FILE"
  echo "## Gate Result" >> "$REPORT_FILE"
  echo "Automated QA gate: PASS" >> "$REPORT_FILE"
  echo "QA report generated at $REPORT_FILE"
  exit 0
fi

echo "" >> "$REPORT_FILE"
echo "## Gate Result" >> "$REPORT_FILE"
echo "Automated QA gate: FAIL" >> "$REPORT_FILE"
echo "QA report generated at $REPORT_FILE"
exit 1
