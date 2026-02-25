#!/usr/bin/env bash
# GCP Cloud Run Drift Guard — Pre-Commit Hook
#
# Strategy: runtime config must remain consistent with repository-managed
# deployment policy and Cloud Run bindings.
# deploy-dev.yml, deploy-stage.yml, and deploy-prod.yml must NOT declare env_vars for the
# backend — doing so would overwrite Secret Manager bindings and drop
# vars not listed.
#
# This hook fails if someone adds an env_vars block to the backend
# deploy step, preventing accidental clobbering of live GCP config.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
EXIT_CODE=0

for DEPLOY_YML in "$REPO_ROOT/.github/workflows/deploy-dev.yml" "$REPO_ROOT/.github/workflows/deploy-stage.yml" "$REPO_ROOT/.github/workflows/deploy-prod.yml"; do
  if [[ -f "$DEPLOY_YML" ]]; then
    python3 "$REPO_ROOT/scripts/guard_env_vars.py" "$DEPLOY_YML" || EXIT_CODE=1
  fi
done

exit $EXIT_CODE
