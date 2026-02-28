# Deep Link Verification Assets

## Scope
- Android App Links: `assetlinks.json`
- iOS Universal Links: `apple-app-site-association`

## Repository Paths
- `frontend-app/public/.well-known/assetlinks.json`
- `frontend-app/public/.well-known/apple-app-site-association`

## Render Command
```bash
MOBILE_ENV_FILE=.codex-artifacts/mobile.env \
./mobile/scripts/render-deeplink-verification-assets.sh
```

## Required release inputs
- `MOBILE_IOS_TEAM_ID`
- `MOBILE_IOS_BUNDLE_ID`
- `MOBILE_ANDROID_PACKAGE_NAME`
- `MOBILE_ANDROID_SHA256_CERT_FINGERPRINTS`

## Source of release inputs
- Consume MAP outputs for team/signing identities.
- Store sensitive values in GCP Secret Manager.
- Materialize to local env files using `mobile/scripts/materialize-mobile-env-from-gcp.sh`.

## Host serving requirement
Serve both files at `/.well-known/` on each deep-link host:
- `https://app.jualuma.com`
- stage/prod aliases used by rollout environments.
