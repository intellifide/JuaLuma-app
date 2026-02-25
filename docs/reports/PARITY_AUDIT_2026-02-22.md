# Dev/Prod Parity Audit (2026-02-22)

Safety: No writes to `jualuma-prod` were performed.

## Service Inventory

### Dev (jualuma-dev)
- jualuma-approvals
- jualuma-backend
- jualuma-marketing
- jualuma-support
- jualuma-user-app

### Prod (jualuma-prod)
- frontend-app
- jualuma-backend
- marketing-site
- support-portal

## Checklist Results

1. Service coverage parity by role: FAIL
- Dev has `jualuma-approvals`; prod has no equivalent service.

2. Service naming map documented: PASS
- See `PARITY_CONTRACT.md` mapping section.

3. Ingress policy follows environment intent: INTENTIONAL_DIFF
- Dev: `all`; Prod: `internal-and-cloud-load-balancing`.

4. Service account model follows environment intent: FAIL
- Dev uses dedicated service accounts (`cr-*`).
- Prod uses default compute service account for app services.

5. CPU/memory profile reviewed: INTENTIONAL_DIFF
- Frontend/marketing/support memory differs (dev 2Gi vs prod 512Mi).

6. Env var key parity per service: FAIL
- Frontend dev keys: `VITE_API_TARGET`, `VITE_MARKETING_URL`; prod uses `API_BASE_URL`.
- Support dev uses `VITE_API_BASE_URL`; prod uses `API_BASE_URL`.
- Prod backend has Stripe price ID keys missing in dev backend.

7. Secret reference parity pattern: PASS
- Backend secret refs use Secret Manager in both envs.

8. Backend network config parity pattern: INTENTIONAL_DIFF
- Cloud SQL bindings differ by env (expected).
- Dev backend has VPC connector; prod backend currently does not.

9. Domain strategy parity intent: PASS
- Dev uses `*.run.app`; prod uses custom domains.

10. Deployment workflow parity: REVIEW_REQUIRED
- Repo workflow files exist; current branch-history cleanup work is still in progress.

## Highest-Impact Gaps to Fix (Dev/Repo side only)

1. Define and standardize frontend/support env key contract across envs.
2. Decide whether prod should move off default compute service account (security hardening).
3. Decide whether approvals service should exist in prod or be dev-only by design.
4. Complete main branch recovery strategy (main is currently empty on remote).
