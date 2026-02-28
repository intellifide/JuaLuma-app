# MAP Output Contract For Mobile Engineering

This contract defines the MAP-provided outputs required before signing/release tasks execute.

## Required outputs
- `apple_team_id`: Apple Developer Team ID.
- `apple_bundle_id_primary`: iOS app bundle identifier for production.
- `apple_bundle_id_stage`: iOS app bundle identifier for stage/testing.
- `app_store_connect_app_id`: App Store Connect app ID.
- `app_store_connect_api_key_id`: ASC API key ID (if API automation is used).
- `app_store_connect_issuer_id`: ASC issuer ID (if API automation is used).
- `ios_signing_profile_owner`: system/account responsible for provisioning profile generation.

- `google_play_developer_account_id`: Play Console developer account identifier.
- `google_play_package_name_primary`: Android package name for production.
- `google_play_package_name_stage`: Android package name for internal/stage tracks.
- `google_play_app_id`: Play Console app identifier.
- `play_app_signing_enabled`: boolean; must be `true` before prod release.
- `android_keystore_owner`: system/account responsible for upload key custody.

- `tax_profile_complete`: boolean; must be `true`.
- `payout_profile_complete`: boolean; must be `true`.
- `policy_contact_email`: operational owner for store policy/security notices.

## Acceptance rules
- All required outputs are non-empty.
- `tax_profile_complete=true` and `payout_profile_complete=true`.
- `play_app_signing_enabled=true` for release tracks.
- Bundle/package identifiers match repository configuration values.
- Ownership fields identify a concrete team/system, not an individual local machine.

## Engineering consumption
- Store non-secret identifiers in repository config documents.
- Store secret values in GCP Secret Manager only.
- Materialize short-lived local env files via `mobile/scripts/materialize-mobile-env-from-gcp.sh`.
- Do not store signing or release credentials in macOS keychain for local development.
