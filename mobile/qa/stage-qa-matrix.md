# Stage QA Matrix

## Scope
- Authentication/session lifecycle.
- Plaid native linking and backend account sync.
- Transactions/accounts CRUD and resilience fallback.
- Push token registration lifecycle.
- Deep-link routing and verification assets.
- Signed artifact generation and distribution workflow integrity.

## Automated checks
Run:

```bash
./mobile/scripts/run-mobile-qa-matrix.sh stage .codex-artifacts/mobile.env .codex-artifacts/mobile-release-stage.env
```

Automated outputs:
- OpenAPI drift check
- Frontend lint + targeted tests
- Android no-keychain build + shared-core test/lint
- iOS no-keychain simulator build
- Release contract validation
- Android signed release build
- iOS signed release dry-run

## Manual sign-off checks
- iOS physical device: onboarding, auth, plaid link, transaction sync, push notification receipt.
- Android physical device: onboarding, auth, plaid link, transaction sync, push notification receipt.
- Install/upgrade from TestFlight internal group.
- Install/upgrade from Google Play internal track.
- Rollback rehearsal for previous stable binary.
