#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <env-file> <stage|prod> <ios|android|all>" >&2
  exit 1
fi

ENV_FILE="$1"
TARGET_ENV="$2"
TARGET_PLATFORM="$3"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

case "$TARGET_ENV" in
  stage|prod) ;;
  *)
    echo "Invalid environment '$TARGET_ENV'. Use stage|prod." >&2
    exit 1
    ;;
esac

case "$TARGET_PLATFORM" in
  ios|android|all) ;;
  *)
    echo "Invalid platform '$TARGET_PLATFORM'. Use ios|android|all." >&2
    exit 1
    ;;
esac

read_env_value() {
  local key="$1"
  local line
  line="$(rg "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

require_key() {
  local key="$1"
  if ! rg -q "^${key}=" "$ENV_FILE"; then
    echo "Missing required key '$key' in $ENV_FILE" >&2
    exit 1
  fi
}

require_bool_true() {
  local key="$1"
  require_key "$key"
  local value
  value="$(read_env_value "$key" || true)"
  case "$value" in
    true|TRUE|1|yes|YES) ;;
    *)
      echo "Expected '$key' to be true-like, found '$value'." >&2
      exit 1
      ;;
  esac
}

if [[ "$TARGET_PLATFORM" == "ios" || "$TARGET_PLATFORM" == "all" ]]; then
  require_key apple_team_id
  require_key app_store_connect_app_id
  require_key app_store_connect_api_key_id
  require_key app_store_connect_issuer_id
  require_key ios_signing_profile_owner
  require_key MOBILE_IOS_TEAM_ID
  require_key MOBILE_IOS_BUNDLE_ID
  require_key MOBILE_IOS_PROVISIONING_PROFILE_SPECIFIER
  require_key MOBILE_IOS_SIGNING_IDENTITY
  require_key MOBILE_IOS_SIGNING_CERT_BASE64
  require_key MOBILE_IOS_SIGNING_CERT_PASSWORD
  require_key MOBILE_IOS_PROVISIONING_PROFILE_BASE64

  expected_ios_bundle_key="apple_bundle_id_stage"
  if [[ "$TARGET_ENV" == "prod" ]]; then
    expected_ios_bundle_key="apple_bundle_id_primary"
  fi
  require_key "$expected_ios_bundle_key"

  apple_team_id_value="$(read_env_value apple_team_id)"
  mobile_ios_team_id_value="$(read_env_value MOBILE_IOS_TEAM_ID)"
  if [[ "$apple_team_id_value" != "$mobile_ios_team_id_value" ]]; then
    echo "Mismatch: apple_team_id ('$apple_team_id_value') != MOBILE_IOS_TEAM_ID ('$mobile_ios_team_id_value')." >&2
    exit 1
  fi

  expected_ios_bundle_id="$(read_env_value "$expected_ios_bundle_key")"
  mobile_ios_bundle_id="$(read_env_value MOBILE_IOS_BUNDLE_ID)"
  if [[ "$expected_ios_bundle_id" != "$mobile_ios_bundle_id" ]]; then
    echo "Mismatch: $expected_ios_bundle_key ('$expected_ios_bundle_id') != MOBILE_IOS_BUNDLE_ID ('$mobile_ios_bundle_id')." >&2
    exit 1
  fi
fi

if [[ "$TARGET_PLATFORM" == "android" || "$TARGET_PLATFORM" == "all" ]]; then
  require_key google_play_developer_account_id
  require_key google_play_app_id
  require_key android_keystore_owner
  require_key MOBILE_ANDROID_PACKAGE_NAME
  require_key MOBILE_ANDROID_UPLOAD_KEYSTORE_BASE64
  require_key MOBILE_ANDROID_RELEASE_STORE_PASSWORD
  require_key MOBILE_ANDROID_RELEASE_KEY_ALIAS
  require_key MOBILE_ANDROID_RELEASE_KEY_PASSWORD

  expected_android_package_key="google_play_package_name_stage"
  if [[ "$TARGET_ENV" == "prod" ]]; then
    expected_android_package_key="google_play_package_name_primary"
  fi
  require_key "$expected_android_package_key"

  expected_android_package="$(read_env_value "$expected_android_package_key")"
  mobile_android_package="$(read_env_value MOBILE_ANDROID_PACKAGE_NAME)"
  if [[ "$expected_android_package" != "$mobile_android_package" ]]; then
    echo "Mismatch: $expected_android_package_key ('$expected_android_package') != MOBILE_ANDROID_PACKAGE_NAME ('$mobile_android_package')." >&2
    exit 1
  fi

  if [[ "$TARGET_ENV" == "prod" ]]; then
    require_bool_true play_app_signing_enabled
  fi
fi

require_bool_true tax_profile_complete
require_bool_true payout_profile_complete
require_key policy_contact_email

echo "Release contract validation passed for $TARGET_PLATFORM ($TARGET_ENV) using $ENV_FILE"
