#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_PROJECT_DIR="$ROOT_DIR/frontend-app/ios/App"
PROJECT_FILE="$IOS_PROJECT_DIR/App.xcodeproj"
MOBILE_ENV_FILE="${MOBILE_ENV_FILE:-$ROOT_DIR/.codex-artifacts/mobile.env}"
MOBILE_TARGET_ENV="${MOBILE_TARGET_ENV:-stage}"
MOBILE_DRY_RUN="${MOBILE_DRY_RUN:-0}"
MOBILE_ALLOW_LOCAL_SIGNING="${MOBILE_ALLOW_LOCAL_SIGNING:-0}"
MOBILE_PRESERVE_SIGNING_FILES="${MOBILE_PRESERVE_SIGNING_FILES:-0}"

DERIVED_DATA_DIR="$ROOT_DIR/.codex-artifacts/ios-release-derived-data"
SPM_STATE_DIR="$ROOT_DIR/.codex-artifacts/ios-release-swiftpm"
EPHEMERAL_HOME="$ROOT_DIR/.codex-artifacts/ios-release-home"
SIGNING_DIR="$ROOT_DIR/.codex-artifacts/ios-signing"
ARCHIVE_PATH="$ROOT_DIR/.codex-artifacts/ios-release/App.xcarchive"
EXPORT_PATH="$ROOT_DIR/.codex-artifacts/ios-release/export"
EXPORT_OPTIONS_FILE="$ROOT_DIR/.codex-artifacts/ios-release/exportOptions.plist"
SIGNING_CERT_PATH="$SIGNING_DIR/signing-cert.p12"
PROFILE_PATH="$SIGNING_DIR/profile.mobileprovision"
KEYCHAIN_PATH="$SIGNING_DIR/mobile-signing.keychain-db"

decode_base64_to_file() {
  local source_value="$1"
  local output_file="$2"
  if base64 --help >/dev/null 2>&1; then
    printf '%s' "$source_value" | base64 --decode > "$output_file"
  else
    printf '%s' "$source_value" | base64 -D > "$output_file"
  fi
}

cleanup() {
  security delete-keychain "$KEYCHAIN_PATH" >/dev/null 2>&1 || true
  if [[ "$MOBILE_PRESERVE_SIGNING_FILES" != "1" ]]; then
    rm -f "$SIGNING_CERT_PATH" "$PROFILE_PATH"
    rm -rf "$EPHEMERAL_HOME"
  fi
}
trap cleanup EXIT

if [[ "$MOBILE_DRY_RUN" != "1" && "${CI:-}" != "true" && "$MOBILE_ALLOW_LOCAL_SIGNING" != "1" ]]; then
  echo "Refusing signed iOS build outside CI. Set MOBILE_DRY_RUN=1 for validation-only or MOBILE_ALLOW_LOCAL_SIGNING=1 to override." >&2
  exit 1
fi

if [[ -f "$MOBILE_ENV_FILE" ]]; then
  "$ROOT_DIR/mobile/scripts/validate-mobile-env-contract.sh" "$MOBILE_ENV_FILE" "$MOBILE_TARGET_ENV"
  "$ROOT_DIR/mobile/scripts/validate-mobile-release-contract.sh" "$MOBILE_ENV_FILE" "$MOBILE_TARGET_ENV" ios
  set -a
  # shellcheck disable=SC1090
  source "$MOBILE_ENV_FILE"
  set +a
else
  echo "Missing MOBILE_ENV_FILE: $MOBILE_ENV_FILE" >&2
  exit 1
fi

MOBILE_IOS_SCHEME="${MOBILE_IOS_SCHEME:-App}"
MOBILE_IOS_SIGNING_IDENTITY="${MOBILE_IOS_SIGNING_IDENTITY:-Apple Distribution}"
MOBILE_IOS_EXPORT_METHOD="${MOBILE_IOS_EXPORT_METHOD:-app-store}"
MOBILE_IOS_EPHEMERAL_KEYCHAIN_PASSWORD="${MOBILE_IOS_EPHEMERAL_KEYCHAIN_PASSWORD:-mobile-signing-password}"

"$ROOT_DIR/mobile/scripts/sync-ios-vendored-spm-packages.sh"
"$ROOT_DIR/mobile/scripts/fetch_capacitor_binary_artifacts.sh"

mkdir -p \
  "$DERIVED_DATA_DIR" \
  "$SPM_STATE_DIR/cloned" \
  "$SPM_STATE_DIR/cache" \
  "$EPHEMERAL_HOME/Library/MobileDevice/Provisioning Profiles" \
  "$SIGNING_DIR" \
  "$(dirname "$ARCHIVE_PATH")" \
  "$EXPORT_PATH"

decode_base64_to_file "$MOBILE_IOS_SIGNING_CERT_BASE64" "$SIGNING_CERT_PATH"
decode_base64_to_file "$MOBILE_IOS_PROVISIONING_PROFILE_BASE64" "$PROFILE_PATH"
cp "$PROFILE_PATH" "$EPHEMERAL_HOME/Library/MobileDevice/Provisioning Profiles/${MOBILE_IOS_PROVISIONING_PROFILE_SPECIFIER}.mobileprovision"

cat > "$EXPORT_OPTIONS_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>${MOBILE_IOS_EXPORT_METHOD}</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>teamID</key>
  <string>${MOBILE_IOS_TEAM_ID}</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>${MOBILE_IOS_BUNDLE_ID}</key>
    <string>${MOBILE_IOS_PROVISIONING_PROFILE_SPECIFIER}</string>
  </dict>
</dict>
</plist>
EOF

if [[ "$MOBILE_DRY_RUN" == "1" ]]; then
  echo "Dry run enabled. Skipping keychain import and xcodebuild archive/export."
  echo "Validated release contract and prepared export options at: $EXPORT_OPTIONS_FILE"
  exit 0
fi

security create-keychain -p "$MOBILE_IOS_EPHEMERAL_KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 7200 "$KEYCHAIN_PATH"
security unlock-keychain -p "$MOBILE_IOS_EPHEMERAL_KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychains -d user -s "$KEYCHAIN_PATH"
security default-keychain -d user -s "$KEYCHAIN_PATH"
security import "$SIGNING_CERT_PATH" -k "$KEYCHAIN_PATH" -P "$MOBILE_IOS_SIGNING_CERT_PASSWORD" -A
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$MOBILE_IOS_EPHEMERAL_KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

export HOME="$EPHEMERAL_HOME"
export GIT_TERMINAL_PROMPT=0
export SSH_ASKPASS=/usr/bin/false
export SPM_LOG_LEVEL=debug
export XDG_CACHE_HOME="$EPHEMERAL_HOME/.cache"
export SPM_DISABLE_KEYCHAIN=1

rm -rf "$IOS_PROJECT_DIR/CapApp-SPM/.build" "$IOS_PROJECT_DIR/CapApp-SPM/.swiftpm"
rm -rf "$IOS_PROJECT_DIR/App.xcodeproj/project.xcworkspace/xcuserdata"
rm -rf "$DERIVED_DATA_DIR"/* "$SPM_STATE_DIR/cloned"/* "$SPM_STATE_DIR/cache"/*

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
  -scheme "$MOBILE_IOS_SCHEME" \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -derivedDataPath "$DERIVED_DATA_DIR" \
  -clonedSourcePackagesDirPath "$SPM_STATE_DIR/cloned" \
  -packageCachePath "$SPM_STATE_DIR/cache" \
  -destination "generic/platform=iOS" \
  clean archive \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="$MOBILE_IOS_SIGNING_IDENTITY" \
  DEVELOPMENT_TEAM="$MOBILE_IOS_TEAM_ID" \
  PROVISIONING_PROFILE_SPECIFIER="$MOBILE_IOS_PROVISIONING_PROFILE_SPECIFIER" \
  PRODUCT_BUNDLE_IDENTIFIER="$MOBILE_IOS_BUNDLE_ID" \
  OTHER_CODE_SIGN_FLAGS="--keychain $KEYCHAIN_PATH"

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS_FILE"

echo "Signed iOS artifact created:"
echo "  $EXPORT_PATH"
