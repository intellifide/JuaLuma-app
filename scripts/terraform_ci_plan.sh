#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_BIN="${TF_BIN:-}"

if [[ -z "$TF_BIN" ]]; then
  if command -v terraform >/dev/null 2>&1; then
    TF_BIN="terraform"
  elif command -v tofu >/dev/null 2>&1; then
    TF_BIN="tofu"
  else
    echo "Neither terraform nor tofu is available on PATH." >&2
    exit 127
  fi
fi

run_env() {
  local env="$1"
  echo "== terraform checks: $env =="
  "$TF_BIN" -chdir="$REPO_ROOT/infra/envs/$env" init -backend=false -input=false -no-color >/dev/null
  "$TF_BIN" -chdir="$REPO_ROOT/infra/envs/$env" validate -no-color
  "$TF_BIN" -chdir="$REPO_ROOT/infra/envs/$env" plan -refresh=false -lock=false -input=false -no-color \
    -var='enable_artifact_registry=false' \
    -var='enable_network=false' \
    -var='enable_nat=false' \
    -var='enable_serverless_connector=false' \
    -var='enable_cloud_sql=false' \
    -var='enable_service_accounts=false' \
    -var='enable_cloud_run=false' \
    -var='enable_log_export=false' \
    -var='enable_org_policies=false' \
    >/dev/null
}

"$TF_BIN" -chdir="$REPO_ROOT/infra" fmt -check -recursive
run_env dev
run_env stage
run_env prod

echo "Terraform formatting, validation, and speculative plans passed."
