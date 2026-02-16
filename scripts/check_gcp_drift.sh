#!/usr/bin/env bash
# GCP Cloud Run Drift Guard — Pre-Commit Hook
#
# Strategy: env vars and secrets are managed directly on GCP (GCP-first).
# deploy.yml must NOT declare env_vars for the backend — doing so would
# overwrite Secret Manager bindings and drop vars not listed.
#
# This hook fails if someone adds an env_vars block to the backend
# deploy step, preventing accidental clobbering of live GCP config.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DEPLOY_YML="$REPO_ROOT/.github/workflows/deploy.yml"

if [[ ! -f "$DEPLOY_YML" ]]; then
  echo "⚠  $DEPLOY_YML not found — skipping GCP drift guard"
  exit 0
fi

python3 "$REPO_ROOT/scripts/guard_env_vars.py" "$DEPLOY_YML"
