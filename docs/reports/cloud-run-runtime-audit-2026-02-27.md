# Cloud Run Runtime Audit (2026-02-27 UTC)

## Service Inventory

### Dev (jualuma-dev)
- `frontend-app` -> `https://frontend-app-77ybfmw7cq-uc.a.run.app` (ready=True, sa=298159098975-compute@developer.gserviceaccount.com, ingress=all)
- `jualuma-approvals` -> `https://jualuma-approvals-77ybfmw7cq-uc.a.run.app` (ready=True, sa=cr-approvals@jualuma-dev.iam.gserviceaccount.com, ingress=all)
- `jualuma-backend` -> `https://jualuma-backend-77ybfmw7cq-uc.a.run.app` (ready=True, sa=cr-backend@jualuma-dev.iam.gserviceaccount.com, ingress=all)
- `marketing-site` -> `https://marketing-site-77ybfmw7cq-uc.a.run.app` (ready=True, sa=298159098975-compute@developer.gserviceaccount.com, ingress=all)
- `support-portal` -> `https://support-portal-77ybfmw7cq-uc.a.run.app` (ready=True, sa=298159098975-compute@developer.gserviceaccount.com, ingress=all)

### Stage (jualuma-stage)
- `jualuma-approvals-stage` -> `https://jualuma-approvals-stage-ripznron4a-uc.a.run.app` (ready=True, sa=cr-approvals@jualuma-stage.iam.gserviceaccount.com, ingress=all)
- `jualuma-backend-stage` -> `https://jualuma-backend-stage-ripznron4a-uc.a.run.app` (ready=True, sa=cr-backend@jualuma-stage.iam.gserviceaccount.com, ingress=all)
- `jualuma-marketing-stage` -> `https://jualuma-marketing-stage-ripznron4a-uc.a.run.app` (ready=True, sa=cr-frontend@jualuma-stage.iam.gserviceaccount.com, ingress=all)
- `jualuma-support-stage` -> `https://jualuma-support-stage-ripznron4a-uc.a.run.app` (ready=True, sa=cr-frontend@jualuma-stage.iam.gserviceaccount.com, ingress=all)
- `jualuma-user-app-stage` -> `https://jualuma-user-app-stage-ripznron4a-uc.a.run.app` (ready=True, sa=cr-frontend@jualuma-stage.iam.gserviceaccount.com, ingress=all)

### Prod (jualuma-prod)
- `frontend-app` -> `https://frontend-app-m5loacypwq-uc.a.run.app` (ready=True, sa=678067977394-compute@developer.gserviceaccount.com, ingress=internal-and-cloud-load-balancing)
- `jualuma-backend` -> `https://jualuma-backend-m5loacypwq-uc.a.run.app` (ready=True, sa=678067977394-compute@developer.gserviceaccount.com, ingress=internal-and-cloud-load-balancing)
- `marketing-site` -> `https://marketing-site-m5loacypwq-uc.a.run.app` (ready=True, sa=678067977394-compute@developer.gserviceaccount.com, ingress=internal-and-cloud-load-balancing)
- `support-portal` -> `https://support-portal-m5loacypwq-uc.a.run.app` (ready=True, sa=678067977394-compute@developer.gserviceaccount.com, ingress=internal-and-cloud-load-balancing)

## Findings

1. Stage/Prod backend env shape drift: `AI_FREE_MODEL` and `AI_PAID_FALLBACK_MODEL` are secret refs in prod but plain values in stage.
2. Identity browser keys in dev/prod still include legacy numeric `us-central1.run.app` referrers for user/support aliases.
3. Canonical service naming is now enforced in parity script for prod role matching (`frontend-app`, `support-portal`, `marketing-site`).
4. Prod ingress policy intentionally differs (`internal-and-cloud-load-balancing`) vs dev/stage (`all`) and is not treated as drift by current gates.

## Gate Snapshot

- `scripts/check_gcp_drift.sh`: PASS
- `scripts/check_run_parity.sh --prod-project jualuma-prod --stage-project jualuma-stage --region us-central1`: FAIL (backend AI model shape mismatch)
- `scripts/check_identity_key_drift.sh --env all`: PASS with WARN (deprecated referrers in dev/prod)
- `scripts/terraform_ci_plan.sh`: BLOCKED (gcloud auth invalid_rapt)
