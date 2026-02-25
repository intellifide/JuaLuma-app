#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/check_run_parity.sh \
    [--prod-project jualuma-prod] \
    [--stage-project jualuma-stage] \
    [--region us-central1] \
    [--output /path/to/report.txt]

Checks Cloud Run runtime parity shape between prod and stage for equivalent services.
Service-role mapping supports naming drift (for example `frontend-app` vs
`jualuma-user-app`).

Parity enforces:
  - required stage keys exist
  - env key shape parity (plain vs secret ref) on common keys where prod pair exists
  - stage values do not reference prod identifiers/domains
USAGE
}

PROD_PROJECT="jualuma-prod"
STAGE_PROJECT="jualuma-stage"
REGION="us-central1"
OUTPUT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod-project)
      PROD_PROJECT="${2:-}"; shift 2
      ;;
    --stage-project)
      STAGE_PROJECT="${2:-}"; shift 2
      ;;
    --region)
      REGION="${2:-}"; shift 2
      ;;
    --output)
      OUTPUT="${2:-}"; shift 2
      ;;
    -h|--help)
      usage; exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found on PATH" >&2
  exit 127
fi

PY_OUT="$(mktemp)"
cleanup() {
  rm -f "$PY_OUT"
}
trap cleanup EXIT

python3 - "$PROD_PROJECT" "$STAGE_PROJECT" "$REGION" "$PY_OUT" <<'PY'
import json
import subprocess
import sys

prod_project = sys.argv[1]
stage_project = sys.argv[2]
region = sys.argv[3]
report_path = sys.argv[4]

required_stage_backend = {
    "APP_ENV",
    "FRONTEND_URL",
    "BACKEND_CORS_ORIGINS",
    "GCP_PROJECT_ID",
    "GMAIL_IMPERSONATE_USER",
    "PLAID_ENV",
    "PLAID_REDIRECT_URI",
    "STRIPE_PUBLISHABLE_KEY",
    "DATABASE_URL",
    "STRIPE_SECRET_KEY",
    "PLAID_CLIENT_ID",
    "PLAID_SECRET",
    "TATUM_API_KEY",
    "TATUM_BASE_URL",
    "JOB_RUNNER_SECRET",
    "LOCAL_ENCRYPTION_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "STRIPE_WEBHOOK_SECRET",
}
required_stage_approvals = {
    "APP_ENV",
    "GCP_PROJECT_ID",
    "GCP_LOCATION",
    "DISPATCH_ALLOWED_JOBS",
    "DISPATCH_ALLOWED_WORKFLOWS",
    "JOB_RUNNER_SECRET",
}


service_specs = [
    {
        "role": "backend",
        "stage": "jualuma-backend-stage",
        "prod_candidates": ["jualuma-backend"],
        "required_prod_pair": True,
        "required_stage_keys": required_stage_backend,
    },
    {
        "role": "user-app",
        "stage": "jualuma-user-app-stage",
        "prod_candidates": ["jualuma-user-app", "frontend-app"],
        "required_prod_pair": True,
        "required_stage_keys": set(),
    },
    {
        "role": "support",
        "stage": "jualuma-support-stage",
        "prod_candidates": ["jualuma-support", "support-portal"],
        "required_prod_pair": True,
        "required_stage_keys": set(),
    },
    {
        "role": "marketing",
        "stage": "jualuma-marketing-stage",
        "prod_candidates": ["jualuma-marketing", "marketing-site"],
        "required_prod_pair": True,
        "required_stage_keys": set(),
    },
    {
        "role": "approvals",
        "stage": "jualuma-approvals-stage",
        "prod_candidates": ["jualuma-approvals"],
        "required_prod_pair": False,
        "required_stage_keys": required_stage_approvals,
    },
]


def run_json(cmd: list[str]) -> dict:
    raw = subprocess.check_output(cmd, text=True)
    return json.loads(raw)


def list_services(project: str) -> set[str]:
    data = run_json(
        [
            "gcloud",
            "run",
            "services",
            "list",
            f"--project={project}",
            f"--region={region}",
            "--format=json",
        ]
    )
    return {item.get("metadata", {}).get("name", "") for item in data if item.get("metadata")}


def describe(project: str, service: str) -> dict:
    return run_json(
        [
            "gcloud",
            "run",
            "services",
            "describe",
            service,
            f"--project={project}",
            f"--region={region}",
            "--format=json",
        ]
    )


def env_map(svc_json: dict):
    envs = (
        svc_json.get("spec", {})
        .get("template", {})
        .get("spec", {})
        .get("containers", [{}])[0]
        .get("env", [])
    )
    out = {}
    for e in envs:
        key = e.get("name")
        if not key:
            continue
        value_from = e.get("valueFrom", {})
        secret_ref = value_from.get("secretKeyRef")
        if secret_ref:
            out[key] = {
                "kind": "secret",
                "secret": secret_ref.get("name"),
                "version": secret_ref.get("key"),
            }
        else:
            out[key] = {"kind": "plain", "value": e.get("value", "")}
    return out


def service_url(svc_json: dict):
    return svc_json.get("status", {}).get("url", "")


checks = []


def ok(msg: str):
    checks.append(("PASS", msg))


def fail(msg: str):
    checks.append(("FAIL", msg))


def info(msg: str):
    checks.append(("INFO", msg))


def validate_required(label: str, stage_env: dict, required: set[str]):
    if not required:
        return
    missing = sorted(required - set(stage_env.keys()))
    if missing:
        fail(f"{label}: missing required stage keys: {', '.join(missing)}")
    else:
        ok(f"{label}: all required stage keys present ({len(required)})")


def validate_shape(label: str, prod_env: dict, stage_env: dict):
    common = sorted(set(prod_env.keys()) & set(stage_env.keys()))
    mismatched = []
    for key in common:
        if prod_env[key]["kind"] != stage_env[key]["kind"]:
            mismatched.append(
                f"{key} (prod={prod_env[key]['kind']}, stage={stage_env[key]['kind']})"
            )
    if mismatched:
        fail(f"{label}: shape mismatch on common keys: {', '.join(mismatched)}")
    else:
        ok(f"{label}: common-key shape parity passed ({len(common)} keys)")


def validate_stage_not_prod(label: str, stage_env: dict, prod_url: str):
    offenders = []
    prod_host = prod_url.split("://", 1)[-1] if prod_url else ""
    for key, spec in stage_env.items():
        if spec["kind"] != "plain":
            continue
        value = str(spec.get("value", ""))
        if prod_project in value:
            offenders.append(f"{key} contains prod project id")
        if "jualuma-prod" in value:
            offenders.append(f"{key} references jualuma-prod")
        if prod_host and prod_host in value:
            offenders.append(f"{key} references prod service host")
    if offenders:
        fail(f"{label}: prod-reference guard failed: {', '.join(sorted(set(offenders)))}")
    else:
        ok(f"{label}: prod-reference guard passed")


prod_services = list_services(prod_project)
stage_services = list_services(stage_project)

for spec in service_specs:
    role = spec["role"]
    stage_name = spec["stage"]
    prod_name = next((s for s in spec["prod_candidates"] if s in prod_services), None)

    if stage_name not in stage_services:
        fail(f"{role}: missing required stage service `{stage_name}`")
        continue

    stage_svc = describe(stage_project, stage_name)
    stage_env = env_map(stage_svc)
    validate_required(role, stage_env, spec["required_stage_keys"])

    if prod_name is None:
        if spec["required_prod_pair"]:
            fail(
                f"{role}: no prod service found from candidates {spec['prod_candidates']}"
            )
        else:
            info(
                f"{role}: no prod counterpart found ({spec['prod_candidates']}); "
                "skipping shape parity, stage-only service accepted"
            )
        continue

    prod_svc = describe(prod_project, prod_name)
    prod_env = env_map(prod_svc)
    validate_shape(role, prod_env, stage_env)
    validate_stage_not_prod(role, stage_env, service_url(prod_svc))

passed = not any(status == "FAIL" for status, _ in checks)

lines = []
for status, message in checks:
    lines.append(f"[{status}] {message}")

summary = f"PARITY_RESULT={'PASS' if passed else 'FAIL'}"
lines.append(summary)
report = "\n".join(lines) + "\n"
with open(report_path, "w", encoding="utf-8") as f:
    f.write(report)
print(report, end="")
sys.exit(0 if passed else 1)
PY

if [[ -n "$OUTPUT" ]]; then
  mkdir -p "$(dirname "$OUTPUT")"
  cp "$PY_OUT" "$OUTPUT"
fi
