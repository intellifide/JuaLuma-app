# 2026-02-27 Prod Runtime Parity Break-Glass Backfill

## Context

Production deployment run `22471945914` initially failed due:

1. `PLAID_SECRET` mismatch in `jualuma-prod` relative to dev/stage.
2. Cloud Run web endpoints returning `404` during smoke checks because ingress/public posture drifted from expected release posture.
3. Backend runtime identity drift (`Compute Engine default service account` in prod vs dedicated backend service account in stage).

## Break-Glass Runtime Actions (Already Executed)

1. Secret parity remediation:
   - Updated `jualuma-prod` Secret Manager `PLAID_SECRET` with a new version to match stage/dev.
2. Runtime access posture remediation:
   - Updated prod services `frontend-app`, `support-portal`, `marketing-site`, `jualuma-backend` to `--ingress=all` and `--no-invoker-iam-check`.
   - Disabled IAP for prod web shell services where applicable via `gcloud beta run services update --no-iap`.
3. Runtime identity remediation:
   - Created `cr-backend@jualuma-prod.iam.gserviceaccount.com`.
   - Granted roles:
     - `roles/aiplatform.user`
     - `roles/cloudsql.client`
     - `roles/cloudsql.instanceUser`
     - `roles/datastore.user`
     - `roles/secretmanager.secretAccessor`
   - Updated `jualuma-backend` runtime service account to `cr-backend@jualuma-prod.iam.gserviceaccount.com`.

## Repo Backfill Implemented

1. `.github/workflows/deploy-prod.yml`
   - Backend deploy now pins service account: `cr-backend@${PROJECT_ID}.iam.gserviceaccount.com`.
   - Frontend/marketing/support/backend deploy posture now explicitly enforces public ingress:
     - `--ingress=all`
     - `--no-invoker-iam-check`
   - Added explicit post-deploy public posture enforcement step for prod, including `gcloud beta run ... --no-iap` for web shell services.
2. `scripts/check_run_parity.sh`
   - Added backend runtime identity parity gate:
     - stage required: `cr-backend@jualuma-stage.iam.gserviceaccount.com`
     - prod required: `cr-backend@jualuma-prod.iam.gserviceaccount.com`
3. Policy/runbook updates:
   - `docs/PARITY_CONTRACT.md`
   - `docs/runbooks/deploy-release-sop.md`
   - `docs/stage-promotion-gates.md`

## Verification

1. Workflow run:
   - `CD - Deploy to Prod (jualuma-prod)` run `22471945914`: `success`.
2. Runtime parity/drift commands:
   - `./scripts/check_gcp_drift.sh`: PASS
   - `./scripts/check_run_parity.sh --prod-project jualuma-prod --stage-project jualuma-stage --region us-central1`: PASS
   - `./scripts/check_identity_key_drift.sh --env all --fail-on-deprecated`: PASS
3. Production runtime checks:
   - `frontend-app`, `support-portal`, `marketing-site`, `jualuma-backend` root URLs: HTTP `200`
   - `jualuma-backend/api/health`: HTTP `200`
   - `jualuma-backend` service account: `cr-backend@jualuma-prod.iam.gserviceaccount.com`
