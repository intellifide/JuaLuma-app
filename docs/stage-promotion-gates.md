# Stage Promotion Gates

Last updated: 2026-02-22 (UTC)

## Dev -> Stage PR Gate

A `Dev` -> `stage` PR is mergeable only when all conditions are met:

1. Required CI checks pass (backend/frontend/tests/security checks).
2. Terraform CI checks pass for changed IaC paths (`terraform-ci` workflow).
3. No unresolved PR conversations.
4. At least one approval from a maintainer.
5. `deploy-stage` workflow is green for the candidate commit.
6. Stage smoke checks pass against stage endpoints.

## Stage -> Main PR Gate

A `stage` -> `main` PR is mergeable only when all conditions are met:

1. Stage environment deployment is complete and healthy.
2. Terraform CI checks pass for changed IaC paths (`terraform-ci` workflow).
3. Stage parity audit against prod passes (shape parity with approved diffs).
4. Release notes are present in PR description.
5. Rollback plan is present in PR description.
6. Final reviewer approval is present and no unresolved conversations remain.

## Required PR Evidence

Every promotion PR must include:

- Workflow run URLs for required checks.
- Smoke/parity command output summary.
- Service revision IDs being promoted.
- Rollback target revision IDs.

## Blocking Conditions

Do not merge promotion PRs when any condition below exists:

- Required checks are missing or failing.
- Stage uses prod domain/secret/database references.
- Branch protections/rulesets were relaxed and not restored.
- Rollback target is unknown.
