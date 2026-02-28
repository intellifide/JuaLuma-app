#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 4 ]]; then
  echo "Usage: $0 <stage|prod> <output-env-file> [gcp-project-id] [secret-prefix]" >&2
  exit 1
fi

TARGET_ENV="$1"
OUTPUT_FILE="$2"
PROJECT_ID="${3:-}"
SECRET_PREFIX="${4:-}"

case "$TARGET_ENV" in
  stage|prod) ;;
  *)
    echo "Invalid target environment '$TARGET_ENV'. Use stage|prod." >&2
    exit 1
    ;;
esac

if [[ -z "$PROJECT_ID" ]]; then
  if [[ "$TARGET_ENV" == "prod" ]]; then
    PROJECT_ID="jualuma-prod"
  else
    PROJECT_ID="jualuma-stage"
  fi
fi

if [[ -z "$SECRET_PREFIX" ]]; then
  SECRET_PREFIX="mobile-${TARGET_ENV}"
fi

map_secret() {
  local key="$1"
  printf '%s=%s-%s' "$key" "$SECRET_PREFIX" "$2"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"$ROOT_DIR/mobile/scripts/materialize-mobile-env-from-gcp.sh" \
  "$PROJECT_ID" \
  "$OUTPUT_FILE" \
  "$(map_secret APP_ENV app-env)" \
  "$(map_secret VITE_API_BASE_URL api-base-url)" \
  "$(map_secret VITE_GCP_API_KEY gcp-api-key)" \
  "$(map_secret VITE_MARKETING_URL marketing-url)" \
  "$(map_secret VITE_MAINTENANCE_MODE maintenance-mode)" \
  "$(map_secret apple_team_id apple-team-id)" \
  "$(map_secret apple_bundle_id_primary apple-bundle-id-primary)" \
  "$(map_secret apple_bundle_id_stage apple-bundle-id-stage)" \
  "$(map_secret app_store_connect_app_id app-store-connect-app-id)" \
  "$(map_secret app_store_connect_api_key_id app-store-connect-api-key-id)" \
  "$(map_secret app_store_connect_issuer_id app-store-connect-issuer-id)" \
  "$(map_secret ios_signing_profile_owner ios-signing-profile-owner)" \
  "$(map_secret google_play_developer_account_id google-play-developer-account-id)" \
  "$(map_secret google_play_package_name_primary google-play-package-name-primary)" \
  "$(map_secret google_play_package_name_stage google-play-package-name-stage)" \
  "$(map_secret google_play_app_id google-play-app-id)" \
  "$(map_secret android_keystore_owner android-keystore-owner)" \
  "$(map_secret play_app_signing_enabled play-app-signing-enabled)" \
  "$(map_secret tax_profile_complete tax-profile-complete)" \
  "$(map_secret payout_profile_complete payout-profile-complete)" \
  "$(map_secret policy_contact_email policy-contact-email)" \
  "$(map_secret MOBILE_IOS_TEAM_ID mobile-ios-team-id)" \
  "$(map_secret MOBILE_IOS_BUNDLE_ID mobile-ios-bundle-id)" \
  "$(map_secret MOBILE_IOS_PROVISIONING_PROFILE_SPECIFIER mobile-ios-provisioning-profile-specifier)" \
  "$(map_secret MOBILE_IOS_SIGNING_IDENTITY mobile-ios-signing-identity)" \
  "$(map_secret MOBILE_IOS_SIGNING_CERT_BASE64 mobile-ios-signing-cert-base64)" \
  "$(map_secret MOBILE_IOS_SIGNING_CERT_PASSWORD mobile-ios-signing-cert-password)" \
  "$(map_secret MOBILE_IOS_PROVISIONING_PROFILE_BASE64 mobile-ios-provisioning-profile-base64)" \
  "$(map_secret MOBILE_ANDROID_PACKAGE_NAME mobile-android-package-name)" \
  "$(map_secret MOBILE_ANDROID_UPLOAD_KEYSTORE_BASE64 mobile-android-upload-keystore-base64)" \
  "$(map_secret MOBILE_ANDROID_RELEASE_STORE_PASSWORD mobile-android-release-store-password)" \
  "$(map_secret MOBILE_ANDROID_RELEASE_KEY_ALIAS mobile-android-release-key-alias)" \
  "$(map_secret MOBILE_ANDROID_RELEASE_KEY_PASSWORD mobile-android-release-key-password)"

echo "Release env materialized for '$TARGET_ENV' into $OUTPUT_FILE from project $PROJECT_ID"
