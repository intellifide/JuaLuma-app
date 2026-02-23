# Stage Release Architecture And Promotion Gates

Last updated: 2026-02-22 (UTC)

## Branch Model

- `main`: production branch. Protected. No direct push.
- `Dev`: development integration branch. Protected. No direct push.
- `stage`: release-candidate branch. Protected. No direct push.
- `feature/*`: short-lived branches that merge into `Dev`.

## Promotion Flow

1. `feature/*` -> `Dev` (PR only).
2. `Dev` -> `stage` (PR only).
3. `stage` -> `main` (PR only).

No cross-jumps are allowed. `feature/*` must never target `stage` or `main`.

## Merge Strategy

- Use merge commits for `Dev` -> `stage` and `stage` -> `main`.
- Require up-to-date branch before merge.
- Disallow force-push and branch deletion on `Dev`, `stage`, and `main`.

## Required Checks By Promotion

### `feature/*` -> `Dev`

- Backend tests pass.
- Frontend build/tests pass.
- Static checks pass (`ruff`, `mypy`, lint checks where configured).

### `Dev` -> `stage`

- All `Dev` required checks pass.
- Stage deploy workflow completes successfully.
- Stage smoke suite passes.

### `stage` -> `main`

- All `stage` required checks pass.
- Stage parity audit vs prod passes (shape parity with approved diffs).
- Release notes and rollback plan attached in PR description.

## Release Freeze And Exception Rule

- Freeze window blocks `stage` -> `main` merges unless explicitly approved by release owner.
- Exception merges require:
  - incident or legal/regulatory reason,
  - rollback target recorded before merge,
  - post-merge validation checklist completed.

## Rollback Targets

- `Dev` -> `stage` failed release: revert merge commit on `stage`.
- `stage` -> `main` failed release: revert merge commit on `main` and redeploy previous known-good revision.
- Cloud Run rollback target is prior stable revision for each prod service.

## Environment Separation Rules

- Stage must use stage-only domains/subdomains, databases, service accounts, and Secret Manager entries.
- Stage must never reference production secrets.
- Runtime key names may match prod; values must remain environment-specific.

## Temporary Protection Relaxation

- Only release owner can temporarily relax branch protection/rulesets.
- Relaxation must be time-bounded and recorded in PR + runbook.
- Protection/rulesets must be restored immediately after the required operation.
