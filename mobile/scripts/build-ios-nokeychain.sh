#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_PROJECT_DIR="$ROOT_DIR/frontend-app/ios/App"
PROJECT_FILE="$IOS_PROJECT_DIR/App.xcodeproj"
DERIVED_DATA_DIR="$ROOT_DIR/.codex-artifacts/ios-derived-data"
SPM_STATE_DIR="$ROOT_DIR/.codex-artifacts/ios-swiftpm"
EPHEMERAL_HOME="$ROOT_DIR/.codex-artifacts/ios-home"
MOBILE_ENV_FILE="${MOBILE_ENV_FILE:-$ROOT_DIR/.codex-artifacts/mobile.env}"
MOBILE_TARGET_ENV="${MOBILE_TARGET_ENV:-dev}"

"$ROOT_DIR/mobile/scripts/sync-ios-vendored-spm-packages.sh"
"$ROOT_DIR/mobile/scripts/fetch_capacitor_binary_artifacts.sh"

if [[ -f "$MOBILE_ENV_FILE" ]]; then
  "$ROOT_DIR/mobile/scripts/validate-mobile-env-contract.sh" "$MOBILE_ENV_FILE" "$MOBILE_TARGET_ENV"
  set -a
  # shellcheck disable=SC1090
  source "$MOBILE_ENV_FILE"
  set +a
fi

export GIT_TERMINAL_PROMPT=0
export SSH_ASKPASS=/usr/bin/false
export SPM_LOG_LEVEL=debug
export HOME="$EPHEMERAL_HOME"
export XDG_CACHE_HOME="$EPHEMERAL_HOME/.cache"
export SPM_DISABLE_KEYCHAIN=1

mkdir -p "$DERIVED_DATA_DIR" "$SPM_STATE_DIR/cloned" "$SPM_STATE_DIR/cache" "$EPHEMERAL_HOME"

# Purge local workspace state so package identity resolution is deterministic and local-path-only.
rm -rf "$IOS_PROJECT_DIR/CapApp-SPM/.build" "$IOS_PROJECT_DIR/CapApp-SPM/.swiftpm"
rm -rf "$IOS_PROJECT_DIR/App.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$DERIVED_DATA_DIR"/*
rm -rf "$SPM_STATE_DIR/cloned"/*
rm -rf "$SPM_STATE_DIR/cache"/*

cd "$IOS_PROJECT_DIR"

xcodebuild -resolvePackageDependencies \
  -project "$PROJECT_FILE" \
  -scmProvider system \
  -clonedSourcePackagesDirPath "$SPM_STATE_DIR/cloned" \
  -packageCachePath "$SPM_STATE_DIR/cache" \
  -disableAutomaticPackageResolution \
  -disablePackageRepositoryCache \
  -skipPackageUpdates

xcodebuild \
  -project "$PROJECT_FILE" \
  -scheme App \
  -configuration Debug \
  -scmProvider system \
  -derivedDataPath "$DERIVED_DATA_DIR" \
  -clonedSourcePackagesDirPath "$SPM_STATE_DIR/cloned" \
  -packageCachePath "$SPM_STATE_DIR/cache" \
  -sdk iphonesimulator \
  -destination "generic/platform=iOS Simulator" \
  build \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  PROVISIONING_PROFILE_SPECIFIER=""
