# Incident: Dev/Stage Auth Posture Drift Blocking Login/Signup

## Summary
- Incident ID: `INC-2026-02-28-auth-posture-drift`
- Start/End (UTC): `2026-02-28T05:30Z` to `2026-02-28T06:36Z`
- Environment(s): `dev`, `stage`

## Break-glass Runtime Changes
- Command category: Cloud Run IAM cleanup and access-posture updates
- Target resources:
  - `dev`: `frontend-app`, `support-portal`, `marketing-site`, `jualuma-backend`
  - `stage`: `jualuma-user-app-stage`, `jualuma-support-stage`, `jualuma-marketing-stage`, `jualuma-backend-stage`
- Reason:
  - Login/signup calls were blocked at Cloud Run edge (`401/403`) due invoker IAM gating on backend APIs while frontend shells used IAP.
  - A legacy personal Gmail principal had residual runtime invoker access that needed immediate removal.

### Runtime commands executed
- Remove legacy personal Gmail principals from `roles/run.invoker` across all Cloud Run services in `jualuma-dev`, `jualuma-stage`, `jualuma-prod`.
- Set backend invoker IAM disabled:
  - `gcloud run services update jualuma-backend --project=jualuma-dev --region=us-central1 --no-invoker-iam-check --ingress=all`
  - `gcloud run services update jualuma-backend-stage --project=jualuma-stage --region=us-central1 --no-invoker-iam-check --ingress=all`
- Patch Firebase Auth authorized domains via Identity Toolkit Admin API for `jualuma-dev` and `jualuma-stage` with current run.app hostnames.

## Repository Backfill
- Files changed:
  - `.github/workflows/deploy-dev.yml`
  - `.github/workflows/deploy-stage.yml`
  - `docs/compliance/access-allowlist/jualuma-dev.allowlist`
  - `docs/compliance/access-allowlist/jualuma-prod.allowlist`
  - `docs/PARITY_CONTRACT.md`
  - `docs/reports/cloud-run-runtime-audit-2026-02-28.md`
- Drift guards added/updated:
  - Workflow posture split to keep web shells IAP-protected while backend API uses app-layer auth path.
  - Removed residual legacy personal Gmail principal from allowlists/workflows.

## Validation
- `check_gcp_drift.sh`: PASS
- `check_run_parity.sh --prod-project jualuma-prod --stage-project jualuma-stage --region us-central1`: PASS
- `check_identity_key_drift.sh --env stage`: PASS
- `terraform_ci_plan.sh`: FAIL (local auth `invalid_rapt`; not a runtime config failure)

## Follow-up Actions
- [ ] Merge and promote workflow/doc backfill through `Dev -> stage -> main`.
- [ ] Re-run `scripts/terraform_ci_plan.sh` after refreshing local auth context.
- [ ] Confirm interactive browser login/signup in `dev` and `stage` with `ops@intellifide.com`.
