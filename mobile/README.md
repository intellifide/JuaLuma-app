# Mobile Native No-Keychain Workflow

## Policy
- No local dev signing identities are required.
- No macOS keychain access is required for build/test.
- iOS Swift packages are vendored as local filesystem packages under `mobile/vendor`.
- Secrets are injected from local env files or GCP Secret Manager into env files.
- Session storage mode is dual-policy:
  - Debug/dev builds use local device storage mode (`local`).
  - Release/prod builds use device secure storage mode (`secure`: iOS Keychain / Android Keystore-backed encrypted prefs).

## iOS (no keychain)
Run:

```bash
./mobile/scripts/build-ios-nokeychain.sh
```

What it enforces:
- `CODE_SIGNING_ALLOWED=NO`
- `CODE_SIGNING_REQUIRED=NO`
- empty `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM`, `PROVISIONING_PROFILE_SPECIFIER`
- isolated local `DerivedData` and SwiftPM cache under `.codex-artifacts/`
- local-only Swift package resolution (`mobile/vendor/*`)

## Android (CLI only)
Run:

```bash
./mobile/scripts/build-android-nokeychain.sh
```

## Signed release artifacts (repository-driven)
Signed release packaging is supported with env/GCP-driven inputs only.

- Local development remains no-keychain by default.
- iOS signed builds are CI-first and use an ephemeral keychain file under `.codex-artifacts/` only.
- Android signed builds use a decoded upload keystore file under `.codex-artifacts/`.

Validate release readiness contract (`stage|prod`):

```bash
./mobile/scripts/validate-mobile-release-contract.sh .codex-artifacts/mobile.env stage all
```

Build Android signed release artifacts:

```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
MOBILE_TARGET_ENV=stage \
./mobile/scripts/build-android-release-signed.sh
```

Build iOS signed archive/export (CI recommended):

```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
MOBILE_TARGET_ENV=stage \
CI=true \
./mobile/scripts/build-ios-release-signed.sh
```

Validation-only (no local keychain import, no archive/export):

```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
MOBILE_TARGET_ENV=stage \
MOBILE_DRY_RUN=1 \
./mobile/scripts/build-ios-release-signed.sh
```

## Secrets without keychain
Generate an env file directly from GCP Secret Manager:

```bash
./mobile/scripts/materialize-mobile-env-from-gcp.sh \
  <gcp-project-id> \
  .codex-artifacts/mobile.env \
  VITE_GCP_API_KEY=<secret-name> \
  VITE_API_BASE_URL=<secret-name>
```

Then run builds with `MOBILE_ENV_FILE` (or use default `.codex-artifacts/mobile.env`):

```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env ./mobile/scripts/build-ios-nokeychain.sh
MOBILE_ENV_FILE=.codex-artifacts/mobile.env ./mobile/scripts/build-android-nokeychain.sh
```

Release secret keys can be materialized with the same command pattern. Example mappings:

```bash
./mobile/scripts/materialize-mobile-env-from-gcp.sh \
  <gcp-project-id> \
  .codex-artifacts/mobile.env \
  MOBILE_IOS_SIGNING_CERT_BASE64=<secret-name> \
  MOBILE_IOS_SIGNING_CERT_PASSWORD=<secret-name> \
  MOBILE_IOS_PROVISIONING_PROFILE_BASE64=<secret-name> \
  MOBILE_ANDROID_UPLOAD_KEYSTORE_BASE64=<secret-name> \
  MOBILE_ANDROID_RELEASE_STORE_PASSWORD=<secret-name> \
  MOBILE_ANDROID_RELEASE_KEY_ALIAS=<secret-name> \
  MOBILE_ANDROID_RELEASE_KEY_PASSWORD=<secret-name>
```

For stage/prod release automation, use the consolidated release materializer:

```bash
./mobile/scripts/materialize-mobile-release-env-from-gcp.sh stage .codex-artifacts/mobile-release.env
```

CI/CD workflow for internal/beta distribution:
- `.github/workflows/mobile-distribution.yml`

Store listing package generation:

```bash
./mobile/scripts/prepare-store-listing-package.sh stage .codex-artifacts/mobile-release-stage.env
./mobile/scripts/validate-store-listing-package.sh mobile/release/listing/output/<env-timestamp>
```

Stage release validation + rollback drill:

```bash
./mobile/scripts/run-stage-release-validation.sh .codex-artifacts/mobile.env .codex-artifacts/mobile-release-stage.env
```

Production launch gate:

```bash
./mobile/scripts/run-prod-launch-gate.sh .codex-artifacts/mobile.env .codex-artifacts/mobile-release-prod.env
```

Validate the env file contract:

```bash
./mobile/scripts/validate-mobile-env-contract.sh .codex-artifacts/mobile.env dev
```

## Deep-link Verification Assets
Render verification assets for Android App Links and iOS Universal Links from local or GCP-materialized env values:

```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
./mobile/scripts/render-deeplink-verification-assets.sh
```

Generated files:
- `frontend-app/public/.well-known/assetlinks.json`
- `frontend-app/public/.well-known/apple-app-site-association`
