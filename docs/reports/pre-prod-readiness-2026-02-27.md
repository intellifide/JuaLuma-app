# Pre-Prod Readiness (2026-02-27 UTC)

## Ready Checks

- `scripts/check_gcp_drift.sh`: PASS
- `scripts/check_run_parity.sh --prod-project jualuma-prod --stage-project jualuma-stage --region us-central1`: PASS
- `scripts/check_identity_key_drift.sh --env all --fail-on-deprecated`: PASS
- `scripts/terraform_ci_plan.sh`: PASS
- Stage service URL checks:
  - `https://jualuma-user-app-stage-ripznron4a-uc.a.run.app/` -> 200
  - `https://jualuma-support-stage-ripznron4a-uc.a.run.app/` -> 200
  - `https://jualuma-marketing-stage-ripznron4a-uc.a.run.app/pricing` -> 200
  - `https://jualuma-backend-stage-ripznron4a-uc.a.run.app/` -> 200
- Stage Cloud Run error scan (last 2h): 0 errors across backend/user/support/marketing/approvals services.

## Remediated Drift

1. Stage backend now uses Secret Manager refs for `AI_FREE_MODEL` and `AI_PAID_FALLBACK_MODEL`.
2. Dev/prod browser API keys no longer allow deprecated numeric alias referrers.
3. Deploy workflows now enforce AI secret refs during runtime alignment to prevent recurrence.
4. Identity drift CI now fails if deprecated referrers reappear.
5. Prod deploy workflow now includes post-deploy smoke/IAP gateway verification.

## Remaining Blockers Before Stage -> Prod Push

1. Local git branch is divergent from remote (`Dev...origin/Dev [ahead 27, behind 2]`), so promotion work must reconcile remote history before protected-branch push.

## Non-Blocker Observations

- Legacy alias URL `https://jualuma-marketing-77ybfmw7cq-uc.a.run.app/` returns 404 and is non-canonical.
- Approvals endpoints return 403 by design (not public web shell).
