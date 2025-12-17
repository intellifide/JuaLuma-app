
# Feature Preview Content Playbook

## Overview

This playbook defines how JuaLuma produces, governs, and deploys synthetic data and marketing copy for the FeaturePreview subsystem. The objective is to showcase premium workflows to Free Tier users without ever exposing Nonpublic Personal Information (NPPI) or violating the marketing guardrails outlined in `planning/business docs/Marketing-Content-Guidelines.md`.

## Guiding Principles

1. **Privacy by Design:** Preview payloads may never be derived from production datasets. Every record must be hand-authored or generated from deterministic scripts that have zero awareness of customer NPPI.
2. **Parity Over Novelty:** Preview UIs must look identical to the live feature screens shown to Pro/Ultimate users. Layouts, typography, and CTA placement may not diverge.
3. **Clear Disclaimers:** Each preview surface displays the translucent "Preview Mode" banner plus copy that clarifies data is illustrative only.
4. **Single Source of Truth:** All preview benefits, tier comparisons, and CTA copy originate from this playbook + `planning/business docs/Marketing-Content-Guidelines.md` to prevent mismatched claims.

## Synthetic Dataset Standards

| Requirement | Description |
| --- | --- |
| File Location | Store raw authoring files in `preview-data/<feature-key>.json`. Generated artifacts are written to `apps/frontend/src/utils/previewData.ts`. |
| Schema | Each entity includes `id`, `featureKey`, `payload`, `isPreview: true`, `updatedAt`. Additional attributes (e.g., `chartPoints`, `automationSteps`) must be documented in the JSON schema appendix below. |
| Volume | Minimum of 3 scenarios per feature to avoid repetition (e.g., conservative spender, crypto-heavy user, family household). |
| PII Hygiene | Use lorem-style names and city/state placeholders. Never combine real merchant names with real transactions; instead, use category-friendly placeholders (e.g., "Lone Star Grocer"). |
| Accessibility | Provide human-readable descriptions (`ariaLabel`) for charts and cards so screen readers can narrate the preview state without requiring live data. |

### JSON Schema Appendix

```json
{
  "// purpose": "Defines the generic structure persisted in preview-data/<feature-key>.json",
  "id": "string",
  "featureKey": "ai.cloud | automation.rules | insights.canvas | exports.audit",
  "tier": "free | pro | ultimate",
  "payload": {},
  "marketingCopy": {
    "headline": "string",
    "subhead": "string",
    "benefits": ["string"],
    "cta": "string"
  },
  "isPreview": true,
  "updatedAt": "ISO 8601"
}
```

## Authoring Workflow

1. **Intake:** Product owner submits a Preview Brief containing: feature key, success metric, UI entry point, and target tier.
2. **Dataset Drafting:** Content engineering team authors JSON scenarios in `preview-data/<feature-key>.json`. Use deterministic scripts (e.g., `scripts/preview/generate_budgeting.py`) for data-heavy features to keep sums internally consistent.
3. **Validation:** Run `pnpm run preview:validate` to lint schema, ensure totals align (budgets = inflow/outflow), and verify `isPreview` is true for every record.
4. **Generation:** Execute `pnpm run preview:seed` to regenerate `apps/frontend/src/utils/previewData.ts` and auto-populate `FEATURE_BENEFITS` + `TIER_COMPARISON`.
5. **Accessibility Review:** Run `pnpm run preview:a11y -- featureKey=<key>` which loads the preview panel in Storybook with axe-core scans.
6. **Sign-Off:** Marketing approves copy, Compliance confirms no regulatory conflicts, and Product signs the layout parity checklist before merging.

## Marketing Copy Pipeline

1. **Source Material:** Pull benefit statements, pricing, and disclosures from `planning/business docs/Marketing-Content-Guidelines.md` and `planning/business docs/Intellifide, LLC business plan.md` (Section 2.6/2.7).
2. **Template:** Every feature defines:
	- `title` (≤ 45 chars, action-oriented)
	- `description` (≤ 140 chars, factual, no implied guarantees)
	- `benefits[]` (3 bullets, start with verb)
	- `requiredTier` (Free/Essential/Pro/Ultimate)
	- `ctaText` (e.g., "Unlock Cloud AI")
3. **Texas SaaS Tax Disclosure:** Include a footnote in the modal (`*Texas SaaS tax applied to 80% of the subscription price.`) whenever price is mentioned.
4. **Localization Ready:** Copy must be stored in JSON/TS objects to simplify future localization. Avoid hard-coded text inside React components.
5. **Legal Review Trigger:** Any copy referencing AI capabilities, budgeting predictions, or compliance benefits requires legal review before release.

## Deployment & Storage

- **Version Control:** Preview JSON + TypeScript files live in the repo; generated assets must pass PR review.
- **Cloud Storage Mirror:** Upon deployment, CI uploads `preview-data.zip` to a dedicated `preview-content` bucket with public-read ACL for CDN caching. No PII is present, but the bucket is still versioned and logged.
- **Cache Strategy:** Frontend fetches preview datasets at build time. Runtime downloads are prohibited to avoid tampering.
- **Rollback:** CI retains the last 3 artifacts; `pnpm run preview:rollback --build=<id>` rehydrates a prior dataset in case of marketing issues.

## QA Checklist

1. Preview overlay renders with WCAG-compliant contrast.
2. Synthetic data passes numerical sanity checks (balances sum to zero, budgets align).
3. Paywall modal references the correct tier and CTA link.
4. Telemetry events fire with the intended `feature_key` labels.
5. Remote Config kill switch disables the preview without redeploying.

## Related Documents

- `Master App Dev Guide.md` (Feature Preview subsystem)
- `Local App Dev Guide.md` (Developer workflow + validation)
- `planning/business docs/Marketing-Content-Guidelines.md`
- `planning/business docs/Intellifide, LLC business plan.md`

**Last Updated:** December 07, 2025 at 08:39 PM
