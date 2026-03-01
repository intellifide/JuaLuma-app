#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_PROJECT_DIR="$ROOT_DIR/frontend-app/android"
MOBILE_ENV_FILE="${MOBILE_ENV_FILE:-$ROOT_DIR/.codex-artifacts/mobile.env}"
MOBILE_TARGET_ENV="${MOBILE_TARGET_ENV:-stage}"
MOBILE_DRY_RUN="${MOBILE_DRY_RUN:-0}"
MOBILE_PRESERVE_SIGNING_FILES="${MOBILE_PRESERVE_SIGNING_FILES:-0}"
SIGNING_DIR="$ROOT_DIR/.codex-artifacts/android-signing"
KEYSTORE_PATH="$SIGNING_DIR/upload-release.jks"

cleanup() {
  if [[ "$MOBILE_PRESERVE_SIGNING_FILES" != "1" ]]; then
    rm -f "$KEYSTORE_PATH"
  fi
}
trap cleanup EXIT

decode_base64_to_file() {
  local source_value="$1"
  local output_file="$2"
  if base64 --help >/dev/null 2>&1; then
    printf '%s' "$source_value" | base64 --decode > "$output_file"
  else
    printf '%s' "$source_value" | base64 -D > "$output_file"
  fi
}

if [[ -f "$MOBILE_ENV_FILE" ]]; then
  "$ROOT_DIR/mobile/scripts/validate-mobile-env-contract.sh" "$MOBILE_ENV_FILE" "$MOBILE_TARGET_ENV"
  "$ROOT_DIR/mobile/scripts/validate-mobile-release-contract.sh" "$MOBILE_ENV_FILE" "$MOBILE_TARGET_ENV" android
  set -a
  # shellcheck disable=SC1090
  source "$MOBILE_ENV_FILE"
  set +a
else
  echo "Missing MOBILE_ENV_FILE: $MOBILE_ENV_FILE" >&2
  exit 1
fi

mkdir -p "$SIGNING_DIR"
decode_base64_to_file "$MOBILE_ANDROID_UPLOAD_KEYSTORE_BASE64" "$KEYSTORE_PATH"

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:/opt/homebrew/bin:$PATH"

export MOBILE_ANDROID_RELEASE_STORE_FILE="$KEYSTORE_PATH"
export MOBILE_ANDROID_RELEASE_STORE_PASSWORD="$MOBILE_ANDROID_RELEASE_STORE_PASSWORD"
export MOBILE_ANDROID_RELEASE_KEY_ALIAS="$MOBILE_ANDROID_RELEASE_KEY_ALIAS"
export MOBILE_ANDROID_RELEASE_KEY_PASSWORD="$MOBILE_ANDROID_RELEASE_KEY_PASSWORD"

if [[ "$MOBILE_DRY_RUN" == "1" ]]; then
  echo "Dry run enabled. Skipping Gradle release build."
  echo "Validated release contract and prepared keystore at: $KEYSTORE_PATH"
  exit 0
fi

"$ANDROID_PROJECT_DIR/gradlew" -p "$ANDROID_PROJECT_DIR" :app:bundleRelease :app:assembleRelease

echo "Signed Android artifacts created:"
echo "  $ANDROID_PROJECT_DIR/app/build/outputs/bundle/release/app-release.aab"
echo "  $ANDROID_PROJECT_DIR/app/build/outputs/apk/release/app-release.apk"
