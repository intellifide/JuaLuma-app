# Production Launch Gate Runbook

## Execute production launch gate
```bash
./mobile/scripts/run-prod-launch-gate.sh .codex-artifacts/mobile.env .codex-artifacts/mobile-release-prod.env
```

Outputs:
- QA report under `.codex-artifacts/mobile-qa/prod-*/qa-report.md`
- Launch summary under `.codex-artifacts/mobile-prod-launch/*/prod-launch-summary.md`
- Rollback drill evidence under `.codex-artifacts/mobile-prod-launch/*/rollback-drill.md`
- Controlled rollout plan under `.codex-artifacts/mobile-prod-launch/*/controlled-rollout-plan.md`

## Required prerequisites
- Valid prod release env file populated from GCP Secret Manager.
- Signed artifact build capability for Android and iOS.
- Store publishing credentials for Google Play and App Store Connect.

## Abort/rollback triggers
- Crash-free sessions below threshold in controlled rollout plan.
- Any Sev1 incident impacting authentication, account-linking, or payment-critical flows.
- Incident commander rollback declaration.
