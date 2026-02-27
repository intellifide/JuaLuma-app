# Runtime Parity Contract (Prod vs Stage)

Last updated: 2026-02-27 (UTC)

## Rule

- Parity is enforced on key shape for equivalent services.
- Values are environment-specific by design.
- Stage must never reference prod-only domains, prod DB endpoints, or prod secrets.

## Backend Required Keys (Stage)

- `APP_ENV`
- `FRONTEND_URL`
- `BACKEND_CORS_ORIGINS`
- `GCP_PROJECT_ID`
- `GMAIL_IMPERSONATE_USER`
- `PLAID_ENV`
- `STRIPE_PUBLISHABLE_KEY`
- `DATABASE_URL` (secret ref)
- `STRIPE_SECRET_KEY` (secret ref)
- `PLAID_CLIENT_ID` (secret ref)
- `PLAID_SECRET` (secret ref)
- `TATUM_API_KEY` (secret ref)
- `TATUM_BASE_URL` (secret ref)
- `JOB_RUNNER_SECRET` (secret ref)
- `LOCAL_ENCRYPTION_KEY` (secret ref)
- `GOOGLE_APPLICATION_CREDENTIALS` (secret ref)
- `STRIPE_WEBHOOK_SECRET` (secret ref)
- `AI_FREE_MODEL` (secret ref)
- `AI_PAID_FALLBACK_MODEL` (secret ref)

## Approvals Required Keys (Stage)

- `APP_ENV`
- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `DISPATCH_ALLOWED_JOBS`
- `DISPATCH_ALLOWED_WORKFLOWS`
- `JOB_RUNNER_SECRET` (secret ref)

## Approved Value Differences

- Project ID: `jualuma-stage` vs `jualuma-prod`
- Domain and CORS values: stage `*.run.app` URLs
- Stripe mode/keys: stage test values
- Secret payload values: stage-scoped, stored in `jualuma-stage` Secret Manager

## Gmail Credential Contract

- `GOOGLE_APPLICATION_CREDENTIALS` may be either:
  - Service-account JSON payload (legacy), or
  - Service-account email principal for keyless impersonation (preferred).
- For keyless mode, runtime service account must have:
  - `roles/iam.serviceAccountTokenCreator` on the delegated Gmail sender service account.

## Backend Runtime Identity Contract

- Stage backend must run as: `cr-backend@jualuma-stage.iam.gserviceaccount.com`.
- Prod backend must run as: `cr-backend@jualuma-prod.iam.gserviceaccount.com`.
- Use `scripts/check_run_parity.sh` to enforce this identity parity.

## Runtime Access Posture Contract

- Dev and stage services must remain authenticated-only:
  - `run.googleapis.com/ingress=all`
  - `run.googleapis.com/invoker-iam-disabled=false`
  - `allUsers` must not hold `roles/run.invoker`
  - `user:ops@intellifide.com` must hold `roles/run.invoker`
- Prod services must remain public:
  - `run.googleapis.com/ingress=all`
  - `run.googleapis.com/invoker-iam-disabled=true`
  - Shell web endpoints (`frontend-app`, `support-portal`, `marketing-site`) keep `IAP disabled`
