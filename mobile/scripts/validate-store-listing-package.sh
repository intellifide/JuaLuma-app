#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <listing-package-dir>" >&2
  exit 1
fi

PACKAGE_DIR="$1"

if [[ ! -d "$PACKAGE_DIR" ]]; then
  echo "Missing package directory: $PACKAGE_DIR" >&2
  exit 1
fi

required_files=(
  "$PACKAGE_DIR/ios/metadata.en-US.json"
  "$PACKAGE_DIR/android/metadata.en-US.json"
  "$PACKAGE_DIR/shared/app-icon-1024.png"
  "$PACKAGE_DIR/submission-checklist.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

ios_screenshot_count="$(find "$PACKAGE_DIR/ios/screenshots/en-US/iphone-67" -type f -name '*.png' | wc -l | tr -d ' ')"
android_screenshot_count="$(find "$PACKAGE_DIR/android/screenshots/en-US/phone" -type f -name '*.png' | wc -l | tr -d ' ')"

if [[ "$ios_screenshot_count" -lt 3 ]]; then
  echo "Expected at least 3 iOS screenshots, found $ios_screenshot_count." >&2
  exit 1
fi

if [[ "$android_screenshot_count" -lt 3 ]]; then
  echo "Expected at least 3 Android screenshots, found $android_screenshot_count." >&2
  exit 1
fi

if ! rg -q '"privacy_policy_url"' "$PACKAGE_DIR/ios/metadata.en-US.json"; then
  echo "iOS metadata missing privacy_policy_url." >&2
  exit 1
fi

if ! rg -q '"privacy_policy_url"' "$PACKAGE_DIR/android/metadata.en-US.json"; then
  echo "Android metadata missing privacy_policy_url." >&2
  exit 1
fi

echo "Store listing package validation passed: $PACKAGE_DIR"
