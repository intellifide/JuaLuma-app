# Runtime Parity Contract (Prod vs Stage)

Last updated: 2026-02-22 (UTC)

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
- `BITQUERY_API_KEY` (secret ref)
- `BLOCKFROST_API_KEY` (secret ref)
- `JOB_RUNNER_SECRET` (secret ref)
- `LOCAL_ENCRYPTION_KEY` (secret ref)
- `GOOGLE_APPLICATION_CREDENTIALS` (secret ref)
- `STRIPE_WEBHOOK_SECRET` (secret ref)

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
