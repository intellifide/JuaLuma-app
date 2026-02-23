# AI Assistant Revamp Policy Contract

## Scope

This document is the binding policy contract for the AI assistant revamp execution sequence.
Implementation tasks must conform to these rules before Build/Verify/Cutover work proceeds.

## Locked Runtime Policy

- Free tier default model: `gpt-oss-120b`.
- Paid tier default model: `gemini-2.5-flash`.
- If paid premium limit is exhausted, the backend must auto-fallback to `gpt-oss-120b`.
- Fallback must include explicit user-facing communication that the response used fallback capacity.

## Locked Quota UX Policy

- Primary user quota UI must be a simple progress bar.
- Primary user quota UI must show the reset date.
- Primary user quota UI must not show token counts.

## Execution Order Policy

- Infrastructure/config changes follow `GCP -> GitHub -> Local`.
- GCP runtime configuration is treated as source of truth.
- Repo and local updates are sync steps, not the first change target.

## Change Control

- Any proposed policy change requires an explicit update to this contract and matching task approval in the Notion `AI Assistant Revamp Implementation` database.
