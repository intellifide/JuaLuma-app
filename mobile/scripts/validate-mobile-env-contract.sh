#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <env-file> <dev|stage|prod>" >&2
  exit 1
fi

ENV_FILE="$1"
TARGET_ENV="$2"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

case "$TARGET_ENV" in
  dev|stage|prod) ;;
  *)
    echo "Invalid environment '$TARGET_ENV'. Use dev|stage|prod." >&2
    exit 1
    ;;
esac

required_keys=(
  APP_ENV
  VITE_API_BASE_URL
  VITE_GCP_API_KEY
  VITE_MARKETING_URL
  VITE_MAINTENANCE_MODE
)

for key in "${required_keys[@]}"; do
  if ! rg -q "^${key}=" "$ENV_FILE"; then
    echo "Missing required key '$key' in $ENV_FILE" >&2
    exit 1
  fi
done

app_env_raw="$(rg '^APP_ENV=' "$ENV_FILE" | tail -n1 | cut -d'=' -f2- | tr -d '"')"
case "$TARGET_ENV" in
  dev)
    [[ "$app_env_raw" == "dev" || "$app_env_raw" == "development" ]] || {
      echo "APP_ENV must be dev/development for target env 'dev' (found '$app_env_raw')." >&2
      exit 1
    }
    ;;
  stage)
    [[ "$app_env_raw" == "stage" ]] || {
      echo "APP_ENV must be stage for target env 'stage' (found '$app_env_raw')." >&2
      exit 1
    }
    ;;
  prod)
    [[ "$app_env_raw" == "prod" || "$app_env_raw" == "production" ]] || {
      echo "APP_ENV must be prod/production for target env 'prod' (found '$app_env_raw')." >&2
      exit 1
    }
    ;;
esac

echo "Environment contract validation passed for $TARGET_ENV using $ENV_FILE"
