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

python3 - "$DEPLOY_YML" <<'PYEOF'
import sys, re

deploy_yml_path = sys.argv[1]

# Services whose env vars are managed entirely on GCP.
# deploy.yml must NOT have an env_vars block for these.
GCP_MANAGED_SERVICES = ["jualuma-backend"]

with open(deploy_yml_path, "r") as f:
    lines = f.readlines()

violations = []

for service in GCP_MANAGED_SERVICES:
    in_service = False
    for line in lines:
        stripped = line.strip()
        if f'"{service}"' in line and "service:" in line:
            in_service = True
            continue
        if in_service:
            # Found an env_vars block under this service — violation
            if re.match(r"^\s+env_vars:\s*\|", line):
                violations.append(service)
                break
            # Reached the next step or section — safe
            if re.match(r"^\s+-\s+name:", line) or re.match(r"^\s+#", line):
                break

if not violations:
    print("\n✓ deploy.yml is clean — no env_vars blocks for GCP-managed services")
    sys.exit(0)

print()
print("╔══════════════════════════════════════════════════════════╗")
print("║  DEPLOY.YML CLOBBER GUARD — VIOLATION DETECTED          ║")
print("╚══════════════════════════════════════════════════════════╝")
print()
for svc in violations:
    print(f"  ✗ {svc} has an env_vars block in deploy.yml")
print()
print("─────────────────────────────────────────────────────────")
print("Env vars for these services are managed directly on GCP.")
print("Adding env_vars in deploy.yml will overwrite Secret Manager")
print("bindings and drop any vars not listed.")
print()
print("Remove the env_vars block and commit again.")
print("─────────────────────────────────────────────────────────")
sys.exit(1)
PYEOF
