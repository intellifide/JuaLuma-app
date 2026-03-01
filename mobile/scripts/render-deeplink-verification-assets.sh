#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/frontend-app/public/.well-known"
MOBILE_ENV_FILE="${MOBILE_ENV_FILE:-$ROOT_DIR/.codex-artifacts/mobile.env}"

MOBILE_DEEP_LINK_HOSTS="${MOBILE_DEEP_LINK_HOSTS:-app.jualuma.com,jualuma-user-app-stage-ripznron4a-uc.a.run.app,frontend-app-77ybfmw7cq-uc.a.run.app}"
MOBILE_IOS_TEAM_ID="${MOBILE_IOS_TEAM_ID:-}"
MOBILE_IOS_BUNDLE_ID="${MOBILE_IOS_BUNDLE_ID:-com.intellifide.jualuma}"
MOBILE_ANDROID_PACKAGE_NAME="${MOBILE_ANDROID_PACKAGE_NAME:-com.intellifide.jualuma}"
MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS="${MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS:-}"

if [[ -f "$MOBILE_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$MOBILE_ENV_FILE"
  set +a
fi

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

default_debug_fingerprint() {
  local keystore="${HOME}/.android/debug.keystore"
  if ! command -v keytool >/dev/null 2>&1; then
    return 0
  fi
  if [[ ! -f "$keystore" ]]; then
    return 0
  fi
  keytool -list -v \
    -keystore "$keystore" \
    -alias androiddebugkey \
    -storepass android \
    -keypass android 2>/dev/null | awk -F': ' '/SHA256:/{print $2; exit}'
}

if [[ -z "$(trim "$MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS")" ]]; then
  fingerprint="$(trim "$(default_debug_fingerprint || true)")"
  if [[ -n "$fingerprint" ]]; then
    MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS="$fingerprint"
  fi
fi

mkdir -p "$OUTPUT_DIR"

assetlinks_file="$OUTPUT_DIR/assetlinks.json"
aasa_file="$OUTPUT_DIR/apple-app-site-association"

has_android_fingerprints=false
fingerprints_json=""
IFS=',' read -r -a fingerprints <<< "$MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS"
for fingerprint in "${fingerprints[@]-}"; do
  trimmed="$(trim "$fingerprint")"
  if [[ -z "$trimmed" ]]; then
    continue
  fi
  has_android_fingerprints=true
  if [[ -n "$fingerprints_json" ]]; then
    fingerprints_json+=$',\n        '
  fi
  fingerprints_json+="\"$trimmed\""
done

if [[ "$has_android_fingerprints" == true ]]; then
  cat >"$assetlinks_file" <<EOF
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "$MOBILE_ANDROID_PACKAGE_NAME",
      "sha256_cert_fingerprints": [
        $fingerprints_json
      ]
    }
  }
]
EOF
else
  cat >"$assetlinks_file" <<'EOF'
[]
EOF
fi

has_ios_appid=false
ios_app_id="$(trim "$MOBILE_IOS_TEAM_ID").$(trim "$MOBILE_IOS_BUNDLE_ID")"
if [[ -n "$(trim "$MOBILE_IOS_TEAM_ID")" ]]; then
  has_ios_appid=true
fi

if [[ "$has_ios_appid" == true ]]; then
  cat >"$aasa_file" <<EOF
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "$ios_app_id",
        "paths": [
          "/verify-email/*",
          "/reset-password/*",
          "/household/accept-invite/*",
          "/checkout/*",
          "/login/*",
          "/signup/*",
          "/plan-selection/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": [
      "$ios_app_id"
    ]
  }
}
EOF
else
  cat >"$aasa_file" <<'EOF'
{
  "applinks": {
    "apps": [],
    "details": []
  }
}
EOF
fi

printf 'Rendered deep-link verification assets:\n'
printf '  - %s\n' "$assetlinks_file"
printf '  - %s\n' "$aasa_file"
printf 'Deep-link hosts (serve both files on each host):\n'
IFS=',' read -r -a hosts <<< "$MOBILE_DEEP_LINK_HOSTS"
for host in "${hosts[@]-}"; do
  trimmed_host="$(trim "$host")"
  if [[ -n "$trimmed_host" ]]; then
    printf '  - https://%s/.well-known/{assetlinks.json,apple-app-site-association}\n' "$trimmed_host"
  fi
done

if [[ "$has_android_fingerprints" == false ]]; then
  printf 'WARNING: MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS is empty; assetlinks.json rendered as []\n'
fi
if [[ "$has_ios_appid" == false ]]; then
  printf 'WARNING: MOBILE_IOS_TEAM_ID is empty; apple-app-site-association rendered with empty details\n'
fi
