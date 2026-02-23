# AI Assistant Verification And Rollback Gate Matrix

## Release Gates

| Gate ID | Validation focus | Pass condition | Linked task(s) |
| --- | --- | --- | --- |
| `GATE-01` | Quota reset anchor correctness | Reset uses billing-cycle anniversary anchor for all tiers and reported reset date matches backend period calculation. | `AIR-022` |
| `GATE-02` | Tier-change carry-forward correctness | Upgrade/downgrade recalculates immediately and used amount carries forward without reset-to-zero. | `AIR-023` |
| `GATE-03` | Paid fallback routing correctness | Free routes to `gpt-oss-120b`, paid routes to `gemini-2.5-flash`, paid exhausted routes to `gpt-oss-120b`. | `AIR-024` |
| `GATE-04` | Fallback messaging correctness | Fallback message is explicit, non-ambiguous, and visible on intended user/support surfaces. | `AIR-024` |
| `GATE-05` | File allow/reject correctness | Supported allowlist accepted, unsupported files blocked client-side when possible and server-rejected when bypassed. | `AIR-025` |
| `GATE-06` | HEIC path correctness | HEIC success path normalizes + injects; failure path returns explicit message and excludes failed file from context. | `AIR-026` |
| `GATE-07` | Multimodal context correctness | Parsed file content is injected without breaking account-context thesis behavior. | `AIR-026` |
| `GATE-08` | Composer/storage UX correctness | Attachment chip contract and storage icon taxonomy match standardized spec. | `AIR-027` |
| `GATE-09` | Cross-surface copy consistency | Docs/support/legal/marketing use period-usage framing and contain no legacy daily-query phrasing. | `AIR-028` |
| `GATE-10` | Rollback readiness | Rollback checklist exists, trigger thresholds are defined, and owners are assigned/on-call mapped. | `AIR-029`,`AIR-030` |

## Gate Sequence

1. Execute `GATE-01` through `GATE-08` in dev validation.
2. Execute `GATE-09` before production cutover approval.
3. Execute `GATE-10` during cutover and post-cutover smoke closure.

## Rollback Trigger Conditions

- Any failed `P0` gate blocks cutover.
- Any mismatch in routing model IDs (`gpt-oss-120b`, `gemini-2.5-flash`) triggers rollback hold.
- Any quota reset anchor regression or usage reset-to-zero regression triggers rollback hold.
- Any unsupported upload acceptance regression triggers rollback hold.
- Any unresolved `P0` or `P1` release blocker at smoke-close blocks release completion.

## Rollback Checkpoints

- Checkpoint 1: Pre-cutover validation completion (`GATE-01`..`GATE-09`).
- Checkpoint 2: Post-cutover smoke completion (`GATE-10` + production route/quota/upload sanity).
- Checkpoint 3: Communication confirmation (support + incident channel notified of release state).

## Post-Cutover Smoke Checklist

- Routing smoke: verify free -> `gpt-oss-120b`, paid -> `gemini-2.5-flash`, paid exhausted -> `gpt-oss-120b` (`backend/tests/test_ai.py` routing tests).
- Quota smoke: verify anniversary reset date + tier-change carry-forward (`backend/tests/test_ai.py` quota tests).
- Upload smoke: verify allowlist accept/reject and HEIC success/failure handling (`backend/tests/test_documents.py`).
- Assistant response path smoke: verify context assembly and response UI path (`backend/tests/test_financial_context_documents.py`, `frontend-app/src/tests/integration/ai.test.tsx`).
- Record command outputs in AIR-030 execution notes and block release if any smoke item fails.

## Rollback Ownership And On-Call Mapping

- Release owner: Platform Engineering on-call (primary rollback decision authority).
- Technical executor: Backend/API on-call engineer (runtime rollback execution and verification).
- Communications owner: Support on-call lead (customer-facing and internal status updates).
- Escalation: if rollback trigger is met and unresolved for 15 minutes, escalate to engineering manager on-call and incident channel.
