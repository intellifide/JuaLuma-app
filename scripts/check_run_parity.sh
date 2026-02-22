#!/usr/bin/env bash
set -euo pipefail

# Read-only Cloud Run parity check.
# This script never mutates GCP resources.

DEV_PROJECT="${DEV_PROJECT:-jualuma-dev}"
PROD_PROJECT="${PROD_PROJECT:-jualuma-prod}"
REGION="${REGION:-us-central1}"

DEV_SERVICES=(
  "jualuma-backend"
  "jualuma-user-app"
  "jualuma-marketing"
  "jualuma-support"
)

PROD_SERVICES=(
  "jualuma-backend"
  "frontend-app"
  "marketing-site"
  "support-portal"
)

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

need_cmd gcloud
need_cmd jq

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

fetch_json() {
  local project="$1"
  local service="$2"
  local out="$3"
  gcloud run services describe "$service" \
    --project "$project" \
    --region "$REGION" \
    --platform managed \
    --format json > "$out"
}

env_keys() {
  jq -r '.spec.template.spec.containers[0].env // [] | .[]?.name' "$1" | sort -u
}

env_val() {
  local file="$1"
  local key="$2"
  jq -r --arg k "$key" '
    .spec.template.spec.containers[0].env // []
    | map(select(.name == $k))[0]
    | if . == null then ""
      elif .valueFrom.secretKeyRef then ("SECRET:" + .valueFrom.secretKeyRef.name + ":" + .valueFrom.secretKeyRef.key)
      else (.value // "")
      end
  ' "$file"
}

echo "Parity audit (read-only)"
echo "dev=$DEV_PROJECT prod=$PROD_PROJECT region=$REGION"
echo

for i in "${!DEV_SERVICES[@]}"; do
  dev_service="${DEV_SERVICES[$i]}"
  prod_service="${PROD_SERVICES[$i]}"
  dev_json="$tmp_dir/$dev_service.dev.json"
  prod_json="$tmp_dir/$prod_service.prod.json"
  dev_keys="$tmp_dir/$dev_service.dev.keys"
  prod_keys="$tmp_dir/$prod_service.prod.keys"
  common_keys="$tmp_dir/$dev_service.common.keys"

  fetch_json "$DEV_PROJECT" "$dev_service" "$dev_json"
  fetch_json "$PROD_PROJECT" "$prod_service" "$prod_json"

  env_keys "$dev_json" > "$dev_keys"
  env_keys "$prod_json" > "$prod_keys"
  comm -12 "$dev_keys" "$prod_keys" > "$common_keys"

  echo "=== $dev_service (dev) -> $prod_service (prod)"
  echo "ingress:"
  echo "  dev:  $(jq -r '.metadata.annotations["run.googleapis.com/ingress"] // ""' "$dev_json")"
  echo "  prod: $(jq -r '.metadata.annotations["run.googleapis.com/ingress"] // ""' "$prod_json")"
  echo "service account:"
  echo "  dev:  $(jq -r '.spec.template.spec.serviceAccountName // ""' "$dev_json")"
  echo "  prod: $(jq -r '.spec.template.spec.serviceAccountName // ""' "$prod_json")"
  echo "memory:"
  echo "  dev:  $(jq -r '.spec.template.spec.containers[0].resources.limits.memory // ""' "$dev_json")"
  echo "  prod: $(jq -r '.spec.template.spec.containers[0].resources.limits.memory // ""' "$prod_json")"
  echo "dev-only env keys: $(comm -23 "$dev_keys" "$prod_keys" | paste -sd, - | sed 's/^$/<none>/')"
  echo "prod-only env keys: $(comm -13 "$dev_keys" "$prod_keys" | paste -sd, - | sed 's/^$/<none>/')"
  echo "common env value diffs:"
  if [[ -s "$common_keys" ]]; then
    while IFS= read -r key; do
      dval="$(env_val "$dev_json" "$key")"
      pval="$(env_val "$prod_json" "$key")"
      if [[ "$dval" != "$pval" ]]; then
        echo "  $key"
        echo "    dev:  $dval"
        echo "    prod: $pval"
      fi
    done < "$common_keys"
  else
    echo "  <none>"
  fi
  echo
done
