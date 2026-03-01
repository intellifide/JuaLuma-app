# Mobile Environment Contract

## Environments
- `dev` -> GCP project `jualuma-dev`
- `stage` -> GCP project `jualuma-stage`
- `prod` -> GCP project `jualuma-prod`

## Required keys
- `APP_ENV`
- `VITE_API_BASE_URL`
- `VITE_GCP_API_KEY`
- `VITE_MARKETING_URL`
- `VITE_MAINTENANCE_MODE`

## Recommended keys
- `VITE_LOCAL_AUTH_BYPASS` (dev only)
- `VITE_API_TARGET` (local proxy override)
- `VITE_MOBILE_SESSION_STORE_MODE` (`local` for dev, `secure` for prod)
- `VITE_DEEP_LINK_SCHEME` (default `jualuma`)
- `VITE_DEEP_LINK_HOSTS` (comma-separated allowed universal-link hosts in JS route bridge)
- `MOBILE_IOS_TEAM_ID` (required to render production AASA `appID`)
- `MOBILE_IOS_BUNDLE_ID` (default `com.intellifide.jualuma`)
- `MOBILE_ANDROID_PACKAGE_NAME` (default `com.intellifide.jualuma`)
- `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS` (comma-separated; required for production Android App Links verification)

## Release signing keys (stage/prod)
These keys are required by `mobile/scripts/validate-mobile-release-contract.sh`.

### MAP output keys (non-secret)
- `apple_team_id`
- `apple_bundle_id_primary`
- `apple_bundle_id_stage`
- `app_store_connect_app_id`
- `ios_signing_profile_owner`
- `google_play_developer_account_id`
- `google_play_package_name_primary`
- `google_play_package_name_stage`
- `google_play_app_id`
- `android_keystore_owner`
- `play_app_signing_enabled` (must be true for `prod`)
- `tax_profile_complete` (must be true)
- `payout_profile_complete` (must be true)
- `policy_contact_email`

### iOS signing keys
- `MOBILE_IOS_TEAM_ID`
- `MOBILE_IOS_BUNDLE_ID`
- `MOBILE_IOS_PROVISIONING_PROFILE_SPECIFIER`
- `MOBILE_IOS_SIGNING_IDENTITY` (default `Apple Distribution`)
- `MOBILE_IOS_SIGNING_CERT_BASE64` (GCP secret materialized to env)
- `MOBILE_IOS_SIGNING_CERT_PASSWORD` (GCP secret materialized to env)
- `MOBILE_IOS_PROVISIONING_PROFILE_BASE64` (GCP secret materialized to env)

### Android signing keys
- `MOBILE_ANDROID_PACKAGE_NAME`
- `MOBILE_ANDROID_UPLOAD_KEYSTORE_BASE64` (GCP secret materialized to env)
- `MOBILE_ANDROID_RELEASE_STORE_PASSWORD` (GCP secret materialized to env)
- `MOBILE_ANDROID_RELEASE_KEY_ALIAS` (GCP secret materialized to env)
- `MOBILE_ANDROID_RELEASE_KEY_PASSWORD` (GCP secret materialized to env)

## Session storage mode policy
- `dev` local builds: native store uses `local` mode (no macOS keychain usage in local workflow).
- `prod` release builds: native store uses `secure` mode (iOS Keychain / Android Keystore-backed encrypted storage).

## Secret source
- Use GCP Secret Manager, not macOS keychain.
- Materialize `.env` files via `mobile/scripts/materialize-mobile-env-from-gcp.sh`.
- Load env files via `MOBILE_ENV_FILE` in mobile build scripts.
- Signed build scripts:
  - `mobile/scripts/build-ios-release-signed.sh`
  - `mobile/scripts/build-android-release-signed.sh`

## Deep-link verification assets
- Render `.well-known` verification files from env-driven values:
```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
./mobile/scripts/render-deeplink-verification-assets.sh
```
- Generated files:
  - `frontend-app/public/.well-known/assetlinks.json`
  - `frontend-app/public/.well-known/apple-app-site-association`

## Example materialization
```bash
./mobile/scripts/materialize-mobile-env-from-gcp.sh \
  jualuma-dev \
  .codex-artifacts/mobile.env \
  APP_ENV=mobile-dev-app-env \
  VITE_API_BASE_URL=mobile-dev-api-base-url \
  VITE_GCP_API_KEY=mobile-dev-gcp-api-key \
  VITE_MARKETING_URL=mobile-dev-marketing-url \
  VITE_MAINTENANCE_MODE=mobile-dev-maintenance-mode
```
