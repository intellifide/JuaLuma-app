# Cloud Run Runtime Audit (2026-02-27 UTC, Post-Remediation)

## Gate Results

- `scripts/check_gcp_drift.sh`: PASS
- `scripts/check_run_parity.sh --prod-project jualuma-prod --stage-project jualuma-stage --region us-central1`: PASS
- `scripts/check_identity_key_drift.sh --env all --fail-on-deprecated`: PASS
- `scripts/terraform_ci_plan.sh`: PASS

## Key Remediations Applied

1. Stage backend AI model keys moved to Secret Manager refs: `AI_FREE_MODEL`, `AI_PAID_FALLBACK_MODEL`.
2. Deprecated numeric browser key referrers removed from dev/prod API keys.
3. Identity drift policy apply script added for repeatable remediation.
4. Prod deploy workflow includes post-deploy smoke/IAP verification.

## Service Inventory

### Dev (jualuma-dev)
- `frontend-app` -> `https://frontend-app-77ybfmw7cq-uc.a.run.app` (ready=True)
- `jualuma-approvals` -> `https://jualuma-approvals-77ybfmw7cq-uc.a.run.app` (ready=True)
- `jualuma-backend` -> `https://jualuma-backend-77ybfmw7cq-uc.a.run.app` (ready=True)
- `marketing-site` -> `https://marketing-site-77ybfmw7cq-uc.a.run.app` (ready=True)
- `support-portal` -> `https://support-portal-77ybfmw7cq-uc.a.run.app` (ready=True)

### Stage (jualuma-stage)
- `jualuma-approvals-stage` -> `https://jualuma-approvals-stage-ripznron4a-uc.a.run.app` (ready=True)
- `jualuma-backend-stage` -> `https://jualuma-backend-stage-ripznron4a-uc.a.run.app` (ready=True)
- `jualuma-marketing-stage` -> `https://jualuma-marketing-stage-ripznron4a-uc.a.run.app` (ready=True)
- `jualuma-support-stage` -> `https://jualuma-support-stage-ripznron4a-uc.a.run.app` (ready=True)
- `jualuma-user-app-stage` -> `https://jualuma-user-app-stage-ripznron4a-uc.a.run.app` (ready=True)

### Prod (jualuma-prod)
- `frontend-app` -> `https://frontend-app-m5loacypwq-uc.a.run.app` (ready=True)
- `jualuma-backend` -> `https://jualuma-backend-m5loacypwq-uc.a.run.app` (ready=True)
- `marketing-site` -> `https://marketing-site-m5loacypwq-uc.a.run.app` (ready=True)
- `support-portal` -> `https://support-portal-m5loacypwq-uc.a.run.app` (ready=True)

## Pre-Prod Notes

- Canonical marketing URLs are healthy (dev/stage return 200 at `/pricing`).
- Legacy alias `https://jualuma-marketing-77ybfmw7cq-uc.a.run.app/` remains non-canonical and returns 404 by design.
- Stage service naming differs from prod by design; parity mapping now enforces canonical prod names only.
