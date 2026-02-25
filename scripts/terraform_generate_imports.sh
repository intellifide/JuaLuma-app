#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 --env dev|stage|prod [--region us-central1]

Prints terraform import commands for currently running Cloud Run services and
Artifact Registry based on this repository's env module addresses.
USAGE
}

ENV=""
REGION="us-central1"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
done

case "$ENV" in
  dev) PROJECT_ID="jualuma-dev" ;;
  stage) PROJECT_ID="jualuma-stage" ;;
  prod) PROJECT_ID="jualuma-prod" ;;
  *) echo "--env must be one of dev|stage|prod" >&2; exit 2 ;;
esac

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found on PATH" >&2
  exit 127
fi

echo "# Artifact Registry"
echo "terraform -chdir=infra/envs/$ENV import 'module.artifact_registry[0].google_artifact_registry_repository.repo' 'projects/${PROJECT_ID}/locations/${REGION}/repositories/jualuma-repo'"
echo

echo "# Cloud Run services"
gcloud run services list \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(metadata.name)' \
  | while read -r svc; do
      [[ -z "$svc" ]] && continue
      echo "terraform -chdir=infra/envs/$ENV import 'module.cloud_run_services[\"${svc}\"].google_cloud_run_v2_service.this' 'projects/${PROJECT_ID}/locations/${REGION}/services/${svc}'"
    done

echo
echo "# Optional service account imports (enable_service_accounts=true first)"
case "$ENV" in
  dev)
    echo "terraform -chdir=infra/envs/$ENV import 'google_service_account.runtime[\"backend\"]' 'projects/${PROJECT_ID}/serviceAccounts/cr-backend@${PROJECT_ID}.iam.gserviceaccount.com'"
    echo "terraform -chdir=infra/envs/$ENV import 'google_service_account.runtime[\"approvals\"]' 'projects/${PROJECT_ID}/serviceAccounts/cr-approvals@${PROJECT_ID}.iam.gserviceaccount.com'"
    ;;
  stage)
    echo "terraform -chdir=infra/envs/$ENV import 'google_service_account.runtime[\"backend\"]' 'projects/${PROJECT_ID}/serviceAccounts/cr-backend@${PROJECT_ID}.iam.gserviceaccount.com'"
    echo "terraform -chdir=infra/envs/$ENV import 'google_service_account.runtime[\"approvals\"]' 'projects/${PROJECT_ID}/serviceAccounts/cr-approvals@${PROJECT_ID}.iam.gserviceaccount.com'"
    echo "terraform -chdir=infra/envs/$ENV import 'google_service_account.runtime[\"frontend\"]' 'projects/${PROJECT_ID}/serviceAccounts/cr-frontend@${PROJECT_ID}.iam.gserviceaccount.com'"
    ;;
  prod)
    echo "# No dedicated runtime SAs configured by default in prod env stack"
    ;;
esac
