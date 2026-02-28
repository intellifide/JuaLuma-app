# Cloud Run + Firebase Runtime Audit - 2026-02-28

## Scope
- Projects: `jualuma-dev`, `jualuma-stage`, `jualuma-prod`
- Region: `us-central1`
- Focus: Cloud Run access posture (`IAP`, invoker IAM, ingress), principal hygiene, Firebase auth domain alignment

## Critical Findings (Resolved)
1. `dev` and `stage` backend API endpoints were blocked at Cloud Run edge IAM (`401/403`) before app auth, preventing login/signup flows.
2. A legacy personal Gmail principal remained bound as `roles/run.invoker` on multiple `dev` services.
3. `dev` Firebase authorized domains were stale and did not match current active `run.app` hostnames.

## Runtime State (Post-Fix)

### Dev (`jualuma-dev`)
- `frontend-app`: IAP=`true`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://frontend-app-77ybfmw7cq-uc.a.run.app`
- `support-portal`: IAP=`true`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://support-portal-77ybfmw7cq-uc.a.run.app`
- `marketing-site`: IAP=`true`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://marketing-site-77ybfmw7cq-uc.a.run.app`
- `jualuma-backend`: IAP=`false`, invoker_iam_disabled=`true`, ingress=`all`, url=`https://jualuma-backend-77ybfmw7cq-uc.a.run.app`
- `jualuma-approvals`: IAP=`false`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://jualuma-approvals-77ybfmw7cq-uc.a.run.app`

### Stage (`jualuma-stage`)
- `jualuma-user-app-stage`: IAP=`true`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://jualuma-user-app-stage-ripznron4a-uc.a.run.app`
- `jualuma-support-stage`: IAP=`true`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://jualuma-support-stage-ripznron4a-uc.a.run.app`
- `jualuma-marketing-stage`: IAP=`true`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://jualuma-marketing-stage-ripznron4a-uc.a.run.app`
- `jualuma-backend-stage`: IAP=`false`, invoker_iam_disabled=`true`, ingress=`all`, url=`https://jualuma-backend-stage-ripznron4a-uc.a.run.app`
- `jualuma-approvals-stage`: IAP=`false`, invoker_iam_disabled=`false`, ingress=`all`, url=`https://jualuma-approvals-stage-ripznron4a-uc.a.run.app`

### Prod (`jualuma-prod`) - unchanged by this remediation
- `frontend-app`: IAP=`false`, invoker_iam_disabled=`true`, ingress=`internal-and-cloud-load-balancing`, url=`https://frontend-app-m5loacypwq-uc.a.run.app`
- `support-portal`: IAP=`false`, invoker_iam_disabled=`true`, ingress=`internal-and-cloud-load-balancing`, url=`https://support-portal-m5loacypwq-uc.a.run.app`
- `marketing-site`: IAP=`false`, invoker_iam_disabled=`true`, ingress=`internal-and-cloud-load-balancing`, url=`https://marketing-site-m5loacypwq-uc.a.run.app`
- `jualuma-backend`: IAP=`false`, invoker_iam_disabled=`true`, ingress=`internal-and-cloud-load-balancing`, url=`https://jualuma-backend-m5loacypwq-uc.a.run.app`

## Principal Hygiene
- Verified: no remaining Cloud Run `roles/run.invoker` binding for legacy personal Gmail principals across `dev`/`stage`/`prod`.

## Firebase Auth Authorized Domains (Post-Fix)

### Dev
- `jualuma-dev.firebaseapp.com`
- `jualuma-dev.web.app`
- `localhost`
- `frontend-app-77ybfmw7cq-uc.a.run.app`
- `support-portal-77ybfmw7cq-uc.a.run.app`
- `marketing-site-77ybfmw7cq-uc.a.run.app`
- `jualuma-backend-77ybfmw7cq-uc.a.run.app`

### Stage
- `jualuma-stage.firebaseapp.com`
- `jualuma-stage.web.app`
- `localhost`
- `jualuma-user-app-stage-ripznron4a-uc.a.run.app`
- `jualuma-support-stage-ripznron4a-uc.a.run.app`
- `jualuma-marketing-stage-ripznron4a-uc.a.run.app`
- `jualuma-backend-stage-ripznron4a-uc.a.run.app`

### Prod
- `jualuma-prod.firebaseapp.com`
- `jualuma-prod.web.app`
- `jualuma.com`
- `www.jualuma.com`
- `app.jualuma.com`
- `support.jualuma.com`
- `localhost`

## Validation Evidence
- `curl` unauthenticated to `dev/stage` backend `/api/auth/profile`: now returns app JSON `401` instead of Cloud Run HTML `403`.
- `curl` unauthenticated to `dev/stage` backend `/api/auth/signup/pending`: now returns app JSON `401` instead of Cloud Run HTML `403`.
- `curl` unauthenticated to `dev/stage` web shell `/manifest.json`: still IAP redirect behavior (`302` with `x-goog-iap-generated-response: true`) as expected.
