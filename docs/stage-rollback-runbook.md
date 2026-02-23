# Stage Promotion Rollback And Incident Runbook

Last updated: 2026-02-22 (UTC)

## Scope

This runbook covers:

- failed `Dev` -> `stage` promotions,
- failed `stage` -> `main` promotions,
- immediate containment and recovery steps.

## Owners

- Release owner: repository maintainer approving promotion PRs.
- Incident commander: on-call engineer for application platform.
- Communications owner: customer/support update owner.

## Trigger Conditions

Use this runbook when any of these occur after a promotion:

- critical user flow fails (auth, billing, dashboard, legal acceptance),
- sustained 5xx increase or latency regression,
- security/compliance regression,
- bad config rollout (wrong domain, wrong secret source, wrong DB target).

## Immediate Containment

1. Freeze promotion merges (`Dev` -> `stage`, `stage` -> `main`).
2. Capture failing revision IDs and workflow run URL.
3. Confirm blast radius: `stage` only vs production impact.
4. Start incident log with UTC timestamps.

## Rollback: Dev -> Stage

1. Identify merge commit on `stage` for failed promotion.
2. Revert merge commit on `stage` via PR.
3. Redeploy previous known-good `stage` revision if required.
4. Run stage smoke suite and confirm recovery.
5. Keep freeze until root cause and patch are verified.

## Rollback: Stage -> Main

1. Identify merge commit on `main` for failed release.
2. Revert merge commit on `main` via PR.
3. Redeploy previous known-good production revisions.
4. Execute production post-release validation checks.
5. Publish incident update and recovery confirmation.

## Required Evidence

Record and retain:

- merge commit SHAs,
- Cloud Run revision IDs (bad and rollback target),
- workflow run URLs,
- smoke/parity outputs,
- issue/incident tracking URL.

## Exit Criteria

Incident can be closed only when:

- rollback is complete and validated,
- metrics are back to baseline,
- root cause and corrective action are documented,
- branch protections/rulesets are confirmed restored.
