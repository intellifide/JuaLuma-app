#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_PROJECT_DIR="$ROOT_DIR/frontend-app/android"
MOBILE_ENV_FILE="${MOBILE_ENV_FILE:-$ROOT_DIR/.codex-artifacts/mobile.env}"
MOBILE_TARGET_ENV="${MOBILE_TARGET_ENV:-dev}"

if [[ -f "$MOBILE_ENV_FILE" ]]; then
  "$ROOT_DIR/mobile/scripts/validate-mobile-env-contract.sh" "$MOBILE_ENV_FILE" "$MOBILE_TARGET_ENV"
  set -a
  # shellcheck disable=SC1090
  source "$MOBILE_ENV_FILE"
  set +a
fi

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:/opt/homebrew/bin:$PATH"

"$ANDROID_PROJECT_DIR/gradlew" -p "$ANDROID_PROJECT_DIR" :mobile-shared-core:assemble :app:assembleDebug
