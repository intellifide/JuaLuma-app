#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/mobile/vendor/capacitor-swift-pm-local/artifacts"
TMP_DIR="$ROOT_DIR/mobile/vendor/capacitor-swift-pm-local/.tmp"

CAP_URL="https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.1.0/Capacitor.xcframework.zip"
CAP_SHA256="876ec9b674efcf06d566bebf0c01482b1e4ae1b5fbe83e43f8ffd5f2eebb4884"
CORDOVA_URL="https://github.com/ionic-team/capacitor-swift-pm/releases/download/8.1.0/Cordova.xcframework.zip"
CORDOVA_SHA256="fc7edd2feb10f2952ec74ddca842492b190b5d8d01eb0162270191bb279375c0"

mkdir -p "$ARTIFACT_DIR" "$TMP_DIR"

download_and_extract() {
  local name="$1"
  local url="$2"
  local expected_sha="$3"
  local zip_path="$TMP_DIR/${name}.zip"
  local extract_dir="$TMP_DIR/${name}.extract"
  local output_dir="$ARTIFACT_DIR/${name}.xcframework"

  if [[ -d "$output_dir" ]]; then
    echo "$name already present at $output_dir"
    return 0
  fi

  echo "Downloading $name binary artifact..."
  curl -fsSL "$url" -o "$zip_path"

  local actual_sha
  actual_sha="$(shasum -a 256 "$zip_path" | awk '{print $1}')"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    echo "Checksum mismatch for $name: expected $expected_sha got $actual_sha" >&2
    exit 1
  fi

  rm -rf "$extract_dir"
  mkdir -p "$extract_dir"
  unzip -q "$zip_path" -d "$extract_dir"

  local extracted
  extracted="$(find "$extract_dir" -maxdepth 2 -type d -name "${name}.xcframework" | head -n 1)"
  if [[ -z "$extracted" ]]; then
    echo "Unable to locate extracted ${name}.xcframework in $extract_dir" >&2
    exit 1
  fi

  rm -rf "$output_dir"
  mv "$extracted" "$output_dir"
  echo "Prepared $output_dir"
}

download_and_extract "Capacitor" "$CAP_URL" "$CAP_SHA256"
download_and_extract "Cordova" "$CORDOVA_URL" "$CORDOVA_SHA256"

echo "Capacitor binary artifacts ready."
