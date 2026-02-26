# Incident: Dev OTP Delivery Failure (Gmail Invalid Signature)

## Summary

- Date (UTC): `2026-02-25`
- Environment: `jualuma-dev`
- Impact: Signup verification OTP emails were not delivered.
- User-visible behavior: signup flow proceeded, but no OTP email arrived.

## Detection

- Cloud Run logs (`jualuma-backend`) showed:
  - `Gmail API send failed: invalid_grant ... Invalid signature for token`
  - `Failed to send OTP: invalid_grant ... Invalid signature for token`

## Root Cause

- `GOOGLE_APPLICATION_CREDENTIALS` secret (`GMAIL_SA_KEY`) contained legacy JSON key material that no longer produced valid Gmail OAuth assertions.
- Org policy blocks new service-account key creation (`constraints/iam.disableServiceAccountKeyCreation`), so key rotation was not available.

## Mitigation (Break-Glass Runtime Changes)

1. Granted keyless impersonation permission:
   - Target SA: `jualuma-dev-sa@jualuma-dev.iam.gserviceaccount.com`
   - Runtime SA: `cr-backend@jualuma-dev.iam.gserviceaccount.com`
   - Role: `roles/iam.serviceAccountTokenCreator`
2. Updated secret payload:
   - Secret: `GMAIL_SA_KEY`
   - New value: `jualuma-dev-sa@jualuma-dev.iam.gserviceaccount.com`
3. Rolled backend revision to pick up latest secret.

## Verification

- Triggered `/api/auth/mfa/email/request-code` for affected account email.
- Cloud Run logs confirmed:
  - `Using GmailApiEmailClient (DWD via service account).`
  - `Sent OTP to ...`
  - No `Gmail API send failed` on new revision.

## Repository Backfill

- Added OTP failure hardening:
  - Backend now returns friendly `503` when OTP send fails.
  - Frontend now surfaces normalized friendly resend errors.
- Added parity contract note for keyless Gmail credential mode and required IAM binding.

## Follow-Ups

- Promote same keyless credential/IAM pattern to `stage` and `prod`.
- Remove dependence on JSON key payloads for Gmail send path across all environments.
