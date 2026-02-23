# Stage Ingress And Domain Policy

Last updated: 2026-02-22 (UTC)

## Policy

- Stage services use Cloud Run `*.run.app` endpoints only.
- No production domains are attached to stage services.
- Stage URLs must remain environment-specific and isolated from prod DNS.

## Stage Service Endpoints

- `jualuma-backend-stage` -> `https://jualuma-backend-stage-ripznron4a-uc.a.run.app`
- `jualuma-approvals-stage` -> `https://jualuma-approvals-stage-ripznron4a-uc.a.run.app`
- `jualuma-user-app-stage` -> `https://jualuma-user-app-stage-ripznron4a-uc.a.run.app`
- `jualuma-marketing-stage` -> `https://jualuma-marketing-stage-ripznron4a-uc.a.run.app`
- `jualuma-support-stage` -> `https://jualuma-support-stage-ripznron4a-uc.a.run.app`

## Mapping Status

- Stage custom domain mappings: none.
- Production custom domain mappings: none (at Cloud Run domain-mapping layer).
