# Stage Release Validation Runbook

## Execute full stage validation
```bash
./mobile/scripts/run-stage-release-validation.sh .codex-artifacts/mobile.env .codex-artifacts/mobile-release-stage.env
```

Outputs:
- QA matrix report under `.codex-artifacts/mobile-qa/stage-*/qa-report.md`
- Stage validation summary under `.codex-artifacts/mobile-stage-validation/*/stage-validation-summary.md`
- Rollback drill report under `.codex-artifacts/mobile-stage-validation/*/rollback-drill.md`

## Execute rollback drill directly
```bash
./mobile/scripts/run-mobile-rollback-drill.sh \
  stage \
  frontend-app/android/app/build/outputs/bundle/release/app-release.aab
```

## Rollback strategy
- Android: redeploy previous known-good AAB to internal/beta track via `.github/workflows/mobile-distribution.yml`.
- iOS: redeploy previous known-good IPA to TestFlight via `.github/workflows/mobile-distribution.yml`.
- Keep artifact checksums in rollback reports for traceability.
