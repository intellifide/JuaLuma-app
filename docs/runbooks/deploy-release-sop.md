# Deploy & Release SOP

**Effective:** 2026-02-27  
**Owner:** Engineering Lead

## Environments

| Environment | GCP Project | Branch | Workflow | Approval |
|---|---|---|---|---|
| Development | `jualuma-dev` | `Dev` | `deploy-dev.yml` | None |
| Stage | `jualuma-stage` | `stage` | `deploy-stage.yml` | Required by branch protection |
| Production | `jualuma-prod` | `main` | `deploy-prod.yml` | Required (GitHub environment gate) |

## Promotion Path

1. `feature/*` -> `Dev` (PR only)
2. `Dev` -> `stage` (PR only)
3. `stage` -> `main` (PR only)

No promotion skips are allowed.

## Release Process

### 1. Development Iteration (`Dev`)

1. Merge code via PR into `Dev`.
2. CI checks pass (lint/test/type/security).
3. `deploy-dev.yml` deploys to `jualuma-dev`.
4. Verify on dev Cloud Run URLs.

### 2. Stage Promotion (`Dev` -> `stage`)

1. Open PR: `Dev` -> `stage`.
2. Run promotion gates:
   - `bash scripts/check_gcp_drift.sh`
   - `bash scripts/check_run_parity.sh --prod-project jualuma-prod --stage-project jualuma-stage --region us-central1`
   - `bash scripts/check_identity_key_drift.sh --env stage`
3. Merge PR with linear-history strategy (`rebase` or `squash`).
4. `deploy-stage.yml` deploys to `jualuma-stage`.
5. Run stage smoke verification.

### 3. Production Promotion (`stage` -> `main`)

1. Open PR: `stage` -> `main`.
2. Verify stage checks and release evidence are attached.
3. Merge PR with linear-history strategy (`rebase` or `squash`).
4. `deploy-prod.yml` triggers and waits for manual approval.
5. Approve and verify production post-deploy checks.

## Configuration Policy

- Source of truth is repository workflows, scripts, and IaC.
- Do not directly change Cloud Run runtime config for normal work.
- Break-glass runtime edits are incident-only and require immediate repo backfill.

## Rollback Procedure

1. Revert promotion commit(s) via PR on the affected branch (`stage` or `main`).
2. Route Cloud Run traffic to prior stable revision if immediate containment is required.
3. Re-run smoke checks and attach evidence to incident/release record.
