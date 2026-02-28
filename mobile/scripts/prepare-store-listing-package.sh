#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 3 ]]; then
  echo "Usage: $0 <stage|prod> [env-file] [output-dir]" >&2
  exit 1
fi

TARGET_ENV="$1"
ENV_FILE="${2:-}"
OUTPUT_DIR="${3:-}"

case "$TARGET_ENV" in
  stage|prod) ;;
  *)
    echo "Invalid target environment '$TARGET_ENV'. Use stage|prod." >&2
    exit 1
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="$ROOT_DIR/mobile/release/listing/output/${TARGET_ENV}-${TIMESTAMP}"
fi

if [[ -n "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Env file not found: $ENV_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

APP_URL_DEFAULT="https://jualuma-user-app-stage-ripznron4a-uc.a.run.app"
if [[ "$TARGET_ENV" == "prod" ]]; then
  APP_URL_DEFAULT="https://app.jualuma.com"
fi

MARKETING_URL_DEFAULT="https://www.jualuma.com"
APP_URL="${VITE_API_BASE_URL:-$APP_URL_DEFAULT}"
MARKETING_URL="${VITE_MARKETING_URL:-$MARKETING_URL_DEFAULT}"
SUPPORT_EMAIL="${policy_contact_email:-support@jualuma.com}"

IOS_SCREENSHOT_DIR="$OUTPUT_DIR/ios/screenshots/en-US/iphone-67"
ANDROID_SCREENSHOT_DIR="$OUTPUT_DIR/android/screenshots/en-US/phone"
SHARED_ASSET_DIR="$OUTPUT_DIR/shared"

mkdir -p "$IOS_SCREENSHOT_DIR" "$ANDROID_SCREENSHOT_DIR" "$SHARED_ASSET_DIR" "$OUTPUT_DIR/ios" "$OUTPUT_DIR/android"

SOURCE_ICON="$ROOT_DIR/frontend-app/public/icons/icon-512x512.png"
if [[ ! -f "$SOURCE_ICON" ]]; then
  SOURCE_ICON="$ROOT_DIR/assets/branding/jualumaappicondark.png"
fi
if [[ ! -f "$SOURCE_ICON" ]]; then
  echo "Missing source icon at frontend-app/public/icons/icon-512x512.png or assets/branding/jualumaappicondark.png" >&2
  exit 1
fi

sips -s format png -z 1024 1024 "$SOURCE_ICON" --out "$SHARED_ASSET_DIR/app-icon-1024.png" >/dev/null

for index in 1 2 3; do
  sips -s format png -z 2796 1290 "$SOURCE_ICON" --out "$IOS_SCREENSHOT_DIR/ios-screen-${index}.png" >/dev/null
  sips -s format png -z 2400 1080 "$SOURCE_ICON" --out "$ANDROID_SCREENSHOT_DIR/android-screen-${index}.png" >/dev/null
done

cat > "$OUTPUT_DIR/ios/metadata.en-US.json" <<EOF
{
  "app_name": "JuaLuma",
  "subtitle": "Shared money clarity for households",
  "promotional_text": "Track accounts, automate categorization, and collaborate on budgets with secure shared access.",
  "description": "JuaLuma helps households and individuals unify financial accounts, track spending, and plan confidently. Link traditional and crypto accounts, review transaction trends, and collaborate with household members in one secure workspace. Security controls include passkeys, MFA, and release-grade encrypted storage for mobile sessions.",
  "keywords": [
    "budget",
    "finance",
    "expense tracker",
    "household money",
    "bank accounts",
    "crypto portfolio"
  ],
  "support_url": "${MARKETING_URL}/support",
  "marketing_url": "${MARKETING_URL}",
  "privacy_policy_url": "${MARKETING_URL}/legal/privacy",
  "copyright": "2026 JuaLuma",
  "review_notes": "Stage endpoint for verification: ${APP_URL}. Sign-in test account provisioned through internal QA matrix."
}
EOF

cat > "$OUTPUT_DIR/android/metadata.en-US.json" <<EOF
{
  "title": "JuaLuma",
  "short_description": "Shared money clarity for households and teams.",
  "full_description": "JuaLuma helps households and individuals unify financial accounts, track spending, and plan confidently. Link traditional and crypto accounts, review transaction trends, and collaborate with household members in one secure workspace. Security controls include passkeys, MFA, and release-grade encrypted storage for mobile sessions.",
  "release_notes": "Mobile native release with Plaid native linking, push lifecycle, deep-link verification, and hardened session controls.",
  "contact_email": "${SUPPORT_EMAIL}",
  "contact_website": "${MARKETING_URL}",
  "privacy_policy_url": "${MARKETING_URL}/legal/privacy"
}
EOF

cat > "$OUTPUT_DIR/submission-checklist.md" <<EOF
# Store Submission Checklist (${TARGET_ENV})

## Metadata
- [x] iOS metadata generated: \`ios/metadata.en-US.json\`
- [x] Android metadata generated: \`android/metadata.en-US.json\`
- [x] Privacy policy URL set to \`${MARKETING_URL}/legal/privacy\`
- [x] Support channel set to \`${SUPPORT_EMAIL}\`

## Assets
- [x] Shared icon generated: \`shared/app-icon-1024.png\`
- [x] iOS screenshots generated: \`ios/screenshots/en-US/iphone-67/*.png\` (3 files)
- [x] Android screenshots generated: \`android/screenshots/en-US/phone/*.png\` (3 files)

## Compliance review
- [ ] Confirm screenshot content reflects release UI (replace placeholders if required).
- [ ] Confirm App Store Connect age rating and privacy questionnaire.
- [ ] Confirm Google Play Data safety form and content rating.
- [ ] Confirm store listing text approved by policy/legal owner.
EOF

ZIP_PATH="$OUTPUT_DIR.zip"
rm -f "$ZIP_PATH"
(
  cd "$OUTPUT_DIR/.."
  zip -rq "$ZIP_PATH" "$(basename "$OUTPUT_DIR")"
)

echo "Store listing package prepared:"
echo "  Directory: $OUTPUT_DIR"
echo "  Zip: $ZIP_PATH"
