# Dev/Prod Parity Contract

## Safety Constraint
- `GCP prod (project: jualuma-prod)` is read-only during this process.
- No `gcloud run services update/deploy` commands against prod.

## Goal
- Keep `Dev` fast for iteration.
- Keep production release predictable by matching config **shape**.
- Do not route dev traffic to production domains/services.

## Parity Model
### Must Match (Shape)
- Service role coverage exists in both envs:
  - backend
  - frontend app
  - marketing site
  - support portal
  - approvals (if used in workflow)
- Environment variable **keys** are consistent for equivalent services.
- Secret delivery pattern is consistent (Secret Manager for sensitive values).
- Release/deploy workflow structure is consistent across branches.
- Security policy intent is consistent (least privilege SA model, controlled ingress policy per env profile).

### Must Differ (Values)
- Project IDs (`jualuma-dev` vs `jualuma-prod`).
- URLs and domains (`*.run.app` in dev; custom domains in prod).
- Database instances.
- Stripe mode and keys (test in dev, live in prod).
- CORS/domain allowlists by environment.
- Capacity/limits where intentionally different for cost control.

## Checklist
Use status values: `PASS`, `FAIL`, `INTENTIONAL_DIFF`.

1. Service coverage parity by role
2. Service naming map is documented (dev name -> prod name)
3. Ingress policy follows environment intent
4. Service account model follows environment intent
5. CPU/memory profile reviewed and documented
6. Env var key parity per service
7. Secret reference parity pattern per service
8. Backend network config parity pattern (VPC connector / Cloud SQL binding)
9. Domain strategy parity intent (dev run.app vs prod custom domain)
10. Deployment workflow parity (`Dev` and `main` release process)

## Current Service Mapping
- `jualuma-backend` -> `jualuma-backend`
- `jualuma-user-app` -> `frontend-app`
- `jualuma-marketing` -> `marketing-site`
- `jualuma-support` -> `support-portal`
- `jualuma-approvals` -> (no prod equivalent yet)
