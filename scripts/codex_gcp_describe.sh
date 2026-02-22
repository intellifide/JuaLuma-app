#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/codex_gcp_describe.sh --project <id> --region <region> --service <name> [--service <name> ...] [--iam]

Read-only diagnostics for Cloud Run services:
- gcloud run services describe (url + ready condition)
- optionally gcloud run services get-iam-policy (bindings only)
USAGE
}

project=""
region=""
declare -a services=()
with_iam="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      project="${2:-}"; shift 2
      ;;
    --region)
      region="${2:-}"; shift 2
      ;;
    --service)
      services+=("${2:-}"); shift 2
      ;;
    --iam)
      with_iam="true"; shift
      ;;
    -h|--help)
      usage; exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage; exit 2
      ;;
  esac
done

if [[ -z "$project" || -z "$region" || ${#services[@]} -eq 0 ]]; then
  usage; exit 2
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found on PATH" >&2
  exit 127
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "jq not found on PATH" >&2
  exit 127
fi

for svc in "${services[@]}"; do
  echo "--- $svc describe"
  gcloud run services describe "$svc" \
    --project="$project" \
    --region="$region" \
    --format=json \
    | jq -r '{
        name: .metadata.name,
        url: (.status.url // null),
        ready: (.status.conditions[]? | select(.type=="Ready") | .status // null),
        reason: (.status.conditions[]? | select(.type=="Ready") | .reason // null)
      }'

  if [[ "$with_iam" == "true" ]]; then
    echo "--- $svc iam"
    gcloud run services get-iam-policy "$svc" \
      --project="$project" \
      --region="$region" \
      --format='json(bindings)' \
      | jq -r '.bindings[]? | {role, members}'
  fi
done
