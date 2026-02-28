# Mobile Release Signing Automation

This document defines the repository-driven release signing flow for iOS and Android.

## Security model
- Local development uses no-keychain build scripts only.
- Signed release tasks consume env values materialized from GCP Secret Manager.
- iOS signed builds run in CI by default and use an ephemeral keychain file under `.codex-artifacts/` only.
- Android signed builds decode the upload keystore under `.codex-artifacts/` only.
- No signing secrets are committed to the repository.

## Contract validation
Run before signed builds:

```bash
./mobile/scripts/validate-mobile-release-contract.sh .codex-artifacts/mobile.env stage all
```

## Android signed release
```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
MOBILE_TARGET_ENV=stage \
./mobile/scripts/build-android-release-signed.sh
```

Outputs:
- `frontend-app/android/app/build/outputs/bundle/release/app-release.aab`
- `frontend-app/android/app/build/outputs/apk/release/app-release.apk`

## iOS signed release
```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
MOBILE_TARGET_ENV=stage \
CI=true \
./mobile/scripts/build-ios-release-signed.sh
```

Validation-only:
```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
MOBILE_TARGET_ENV=stage \
MOBILE_DRY_RUN=1 \
./mobile/scripts/build-ios-release-signed.sh
```

Output:
- Exported `.ipa` and related files under `.codex-artifacts/ios-release/export`
