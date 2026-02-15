#!/usr/bin/env bash
# GCP Cloud Run Drift Detection — Pre-Commit Hook
# Compares live Cloud Run env vars against deploy.yml declarations.
# Exits non-zero if drift is detected, blocking the commit.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DEPLOY_YML="$REPO_ROOT/.github/workflows/deploy.yml"
PROJECT_ID="jualuma-dev"
REGION="us-central1"

# --- Preflight checks ---
if ! command -v gcloud &>/dev/null; then
  echo "⚠  gcloud CLI not found — skipping GCP drift check"
  exit 0
fi

if ! gcloud auth print-access-token &>/dev/null 2>&1; then
  echo "⚠  gcloud not authenticated — skipping GCP drift check"
  exit 0
fi

if [[ ! -f "$DEPLOY_YML" ]]; then
  echo "⚠  $DEPLOY_YML not found — skipping GCP drift check"
  exit 0
fi

# Fetch live env vars as JSON
LIVE_JSON=$(gcloud run services describe "jualuma-backend" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="json(spec.template.spec.containers[0].env)" 2>/dev/null || echo "")

if [[ -z "$LIVE_JSON" ]]; then
  echo "⚠  Could not fetch live config for jualuma-backend — skipping"
  exit 0
fi

# Delegate comparison to Python (works on macOS bash 3 + Python 3)
python3 - "$DEPLOY_YML" "$LIVE_JSON" <<'PYEOF'
import sys, json, re

deploy_yml_path = sys.argv[1]
live_json_str = sys.argv[2]

# Keys to skip (secrets, auto-injected by Cloud Run, transient)
SKIP_KEYS = {
    "DATABASE_URL", "SMTP_PASSWORD", "SMTP_APP_PASSWORD",
    "GOOGLE_CLOUD_PROJECT", "K_SERVICE", "K_REVISION",
    "K_CONFIGURATION", "PORT", "FORCE_REDEPLOY",
}

SERVICE = "jualuma-backend"

# --- Parse live env vars from gcloud JSON ---
live_data = json.loads(live_json_str)
live_envs = (
    live_data
    .get("spec", {})
    .get("template", {})
    .get("spec", {})
    .get("containers", [{}])[0]
    .get("env", [])
)
live_vars = {}
for e in live_envs:
    name = e.get("name", "")
    value = e.get("value", "")
    if name and value and name not in SKIP_KEYS:
        live_vars[name] = value

# --- Parse deploy.yml env_vars for the service ---
with open(deploy_yml_path, "r") as f:
    lines = f.readlines()

yml_vars = {}       # key -> literal value
yml_var_refs = set() # keys that use ${{ }} references (can't compare values)
in_service = False
in_env_vars = False

for line in lines:
    stripped = line.strip()
    if f'"{SERVICE}"' in line and "service:" in line:
        in_service = True
        continue
    if in_service:
        if re.match(r"^\s+env_vars:\s*\|", line):
            in_env_vars = True
            continue
        if in_env_vars:
            if re.match(r"^\s+[A-Z_]+=", line):
                kv = stripped
                key, val = kv.split("=", 1)
                if key in SKIP_KEYS:
                    continue
                if "${" in val:
                    # GitHub Actions variable ref — mark key as present but skip value comparison
                    yml_var_refs.add(key)
                else:
                    yml_vars[key] = val
            elif stripped and not re.match(r"^[A-Z_]", stripped):
                break

# --- Compare ---
missing = []
changed = []

for key, live_val in sorted(live_vars.items()):
    if key in yml_var_refs:
        # Present in deploy.yml via ${{ }} reference — skip (can't compare value)
        continue
    elif key not in yml_vars:
        missing.append((key, live_val))
    elif yml_vars[key] != live_val:
        changed.append((key, yml_vars[key], live_val))

if not missing and not changed:
    print(f"\n✓ All Cloud Run services in sync with deploy.yml")
    sys.exit(0)

# Drift found
print()
print("╔══════════════════════════════════════════════════════════╗")
print(f"║  GCP DRIFT DETECTED — {SERVICE}")
print("╚══════════════════════════════════════════════════════════╝")

if missing:
    print()
    print("  Env vars on GCP but MISSING from deploy.yml:")
    for key, val in missing:
        print(f"    + {key}={val}")

if changed:
    print()
    print("  Env vars with DIFFERENT values:")
    for key, yml_val, gcp_val in changed:
        print(f"    ~ {key}: deploy.yml='{yml_val}' vs GCP='{gcp_val}'")

print()
print("─────────────────────────────────────────────────────────")
print("Action required: Update deploy.yml to match GCP config.")
print("Re-stage the file and commit again.")
print("─────────────────────────────────────────────────────────")
sys.exit(1)
PYEOF
