
## App Development Guide v2\.4 \(Master Technical Specification\)

### 1\.0 Core Principles & Governance

All engineering decisions must strictly adhere to these six non\-negotiable pillars\.

- __Privacy by Design & Default \(GDPR Art\. 25\):__ Data minimization is enforced at the schema level\. PII is never collected unless critical\. "Right to be Forgotten" is handled via cryptographic erasure and scheduled physical purging\.
- __Security by Design \(Zero Trust\):__ No internal service trusts another\. All access is authenticated and authorized\. Secrets are never stored in code, environment variables, or databases\.
- __Regulatory Compliance Alignment:__ GLBA Safeguards: Security program aligns with the Gramm\-Leach\-Bliley Act \(Encryption, Access Control, Audit\)\. Non\-Custodial Mandate: The platform never executes write\-access transfers or withdrawals\. All integrations are strictly Read\-Only to maintain non\-MSB \(Money Services Business\) status under FinCEN\.
- __Accessibility via Engineered Vibrancy:__ The platform utilizes an "Engineered Liquid Glass" framework\. The default UI uses advanced compositing \(blur, saturation, luminance clamping\) to ensure all text/interactive elements maintain WCAG 2\.1 AA \(4\.5:1\) contrast dynamically\.
- __Legal\-First Product Lifecycle:__ Legal is a mandatory stakeholder\. No features regarding "sending," "swapping," or "rebalancing" assets may be prototyped without specific counsel approval \(FinCEN MSB trigger\)\. All user\-facing disclaimers, Terms of Service, Privacy Policies, and legal documentation must be reviewed and approved by qualified legal counsel before publication\. All developer agreements, contractor agreements, and third\-party development contracts must be reviewed and approved by qualified legal counsel before execution\.
- __Intellectual Property Ownership:__ All property developed on, for, or in connection with the Finity application is the exclusive property of Intellifide, LLC\. This includes all source code, features, designs, algorithms, documentation, and derivative works\. All developer agreements must explicitly include intellectual property assignment clauses that assign all rights, title, and interest to Intellifide, LLC\. This provision is non\-negotiable\.
- __Operational Resilience \(Circuit Breakers\):__ The system must fail safely and cheaply\. Automated kill switches and hard budget caps are architected into the codebase to prevent "runaway" API costs or infinite loops\.
- __Developer Payout Integrity:__ Mandate the tracking of __Downloads__ and __Ratings__ must be __immutable__ \(written to the Cloud SQL log ledger plus Firestore `widget_engagement`\) to ensure accurate and auditable developer payouts\.

### 2\.0 Product Definition & Detailed Scope

#### 2\.0\.0 Unified Product Scope

The Finity application delivers a complete financial aggregation and AI-powered planning platform with the following full-scope features:

**Core Aggregation & Data:**
- Bank account aggregation via Plaid (traditional accounts)
- Investment account aggregation via Plaid Investments API
- Web3 wallet connections (token balances, NFTs)
- CEX account integration (Coinbase, Kraken, etc.)
- Manual asset tracking (house, car, collectibles)

**Unified Experience:**
- Unified transaction feed with search, filter, bulk edit, undo
- Smart categorization with ML-based auto-tagging and review queue
- Budget management with rollover logic and threshold alerts
- Recurring transaction detection (bills, income, subscriptions)
- Financial health dashboards (cash flow, net worth tracking)
- Dynamic infographics and reporting

**AI Assistant:**
- Cloud AI chat interface (Vertex AI Gemini models)
- RAG-powered financial context injection
- Tier-based quota management
- Privacy/user agreement workflows

**Marketplace & Developer Tools:**
- Third-party widget marketplace (curated catalog)
- Developer SDK with MCP server integration
- Synthetic test datasets for widget development
- Developer payout system (engagement-based revenue)

**Support & Operations:**
- Customer support portal (separate service for agents)
- GCP workflow automation integration
- Google Workspace (Google Chat) notifications

**Legal & Compliance:**
- Terms of Service, Privacy Policy, AI Assistant Disclaimer
- Legal acceptance tracking
- GLBA-compliant security program
- Non-custodial/read-only mandate enforcement

**Mobile & Distribution:**
- Progressive Web App (PWA) with service worker
- Native iOS and Android apps via Capacitor
- App Store and Google Play distribution

**Backlog Items (Post-Launch):**
- SnapTrade integration for additional brokerages
- DeFi protocol tracking (Aave, Compound)
- Automated alternative asset tracking (real estate, vehicles)
- Metered billing (pay-per-call API usage)
- Advanced support/ops features (manual invoice generation, GDPR export)
- User Generated Content (UGC) features (requires legal approval)

#### 2\.0\.1 Target Audience & Product Goal

The product goal is to abstract financial complexity and provide a simple, automated, and visual platform for the mass\-market consumer\. The engineering focus must be on simplicity, automation, and immediate value to serve a broad audience, not just financial experts\.

- __Primary Value:__ Automation of financial tracking to save users time and provide a clear, holistic view of their financial health\.
- __Target Personas:__
	- __The Beginner \(Free Tier\):__ This user \(1\-2 bank accounts\) requires an immediate "Aha\!" moment\. Engineering priority is on flawless automated categorization, budget visualization, and recurring subscription detection\. The system must provide value within minutes of linking one account\.
	- __The Overwhelmed \(Pro Tier\):__ This user \(multiple accounts, spreadsheets, crypto\) requires a robust aggregation engine\. Engineering priority is on reliable multi\-source data ingestion \(Plaid, CEX APIs, Web3\) and a unified feed that consolidates all activity into a single, clean interface\.

#### 2\.1 User Roles & Logic

- __Authentication:__ Managed via Firebase Auth \(Email/Password, Google\)\.
- __Role Taxonomy:__ Roles are separated into four categories: App Users, Marketplace Developers, Internal Staff, and Automation Identities\. App roles are distinct from GCP IAM roles \(which are used for infrastructure permissions only\)\.
- __users\.role \(App User Roles\):__
	- 'user': Standard customer access\.
	- 'support_agent': Customer service representative access \(separate support portal service\)\.
	- 'support_manager': Customer service manager access \(separate support portal service with additional permissions\)\.
	- Note: Support agents are managed separately in the `support_agents` table with Company IDs for tracking and accountability\.
- __Marketplace Developer Role:__
	- Users with `developer_payout_id` set are marketplace developers who can publish widgets and earn revenue\.
	- Developer status is determined by presence of a record in the `developers` table \(linked via `uid`\)\.
	- Developers must execute a Developer Agreement with IP assignment clauses before publishing\.
	- Marketplace access is tier-gated: Pro/Ultimate tiers can publish; Free/Essential tiers have preview-only access\.
- __Internal Staff Roles \(Not App-Facing\):__
	- Internal team members \(engineering, devops, security, compliance, finance, product, operations\) are managed via IdP/SSO and GCP IAM service accounts\.
	- Access follows least-privilege principles with role-based permissions for specific functions\.
	- Internal staff do not use app-facing roles; they access systems via service accounts and IAM policies\.
- __Automation & AI Identities:__
	- AI support agents and other automation services use dedicated service accounts with scoped permissions\.
	- AI support agents can read tickets, post responses, and access knowledge bases but cannot modify payouts, secrets, or user financial data\.
	- Service account identities are managed separately from app user roles\.
- __users \(Updated Schema Logic\):__
	- developer\_payout\_id \(FK to a new Payouts ledger\): Required to link users who are developers to the new payment system\. When set, indicates marketplace developer status\.
- __subscriptions\.plan:__
	- Managed by SubscriptionService\.
	- Determines feature gates \(account limits, AI models\)\.
- __Customer Support Portal:__ A separate frontend/service with its own authentication, designed for customer service representatives to manage support tickets, view user account status, and handle customer inquiries\. The portal integrates with Google Workspace \(Google Chat\) for team notifications and uses GCP workflow automation \(Cloud Workflows \+ Cloud Run\) for automated ticket management\. Designed for non\-technical users\. The user\-facing application does not contain any admin links or references; users access support through the standard support page\.

#### 2\.2 Tiers & Limits

- __Free Tier:__
	- __Aggregator:__ Link up to 2 Traditional accounts / 1 Investment account / 1 Web3 wallet / 1 CEX account\.
	- __AI Model:__ Cloud AI model: Vertex AI Gemini 2\.5 Flash (Production), limited to 20 queries/day. For local development, Google AI Studio Gemini 2.5 Flash is used via API key authentication (see Local App Dev Guide for configuration details).
	- __Features:__ Standard infographics, holistic balance sheet, notifications\.
	- __Data Retention:__ Rolling 45-day ledger stored in Cloud SQL table `ledger_hot_free`; the nightly `free-ledger-pruner` Cloud Run Job deletes data older than 45 days (no archive retained). AI chat history has no retention limits; all transactions remain fully visible.
	- __Sync Controls:__ Manual "Sync Now" available but throttled to 10 uses/day per user via Cloud Tasks; background sync relies on Plaid/CEX webhooks plus scheduled jobs.
- __Essential Tier ($12/month):__
	- __Aggregator:__ Link up to 3 Traditional accounts / 2 investment accounts / 1 Web3 wallet / 3 CEX accounts.
- __AI Model:__ Cloud AI model: Vertex AI Gemini 2.5 Flash (Production) with encrypted RAG prompts. For local development, Google AI Studio Gemini 2.5 Flash is used via API key authentication (see Local App Dev Guide for configuration details).
	- __Sync Cadence:__ Webhook-driven deltas plus guaranteed 24-hour Cloud Scheduler refresh (`essential-ledger-refresh`); manual "Sync Now" is disabled to keep aggregator/API costs predictable.
	- __Data Retention:__ 30-day Cloud SQL hot window (`ledger_hot_essential`). The `essential-ledger-archiver` job moves data older than 30 days to Coldline (`gs://finity-ledger-archive/essential/<uid>/<YYYY>/<MM>`) for read-only retrieval. AI chat history has no retention limits; all transactions remain fully visible.
	- __Quota:__ 30 Cloud AI queries/day (Metered, resets daily; shared with Pro tier via Firestore enforcement).
- __Pro Tier \($25/month or $20.83/month annual - $250/year\):__
	- __Aggregator:__ Link up to 5 Traditional accounts / 5 investment accounts \(via Plaid Investments API\) / 5 Web3 wallets\.
	- __CEX Support:__ Up to 10 CEX accounts \(API/OAuth support for Coinbase, Kraken, etc\.\)
- __AI Model:__ Access to Vertex AI Gemini 2.5 Flash (cloud AI) with encrypted RAG prompts.
	- __Quota:__ 40 Cloud AI queries/day \(Metered, resets daily\)\.
	- __Trial:__ 7\-day free trial with full Pro features\.
	- __Tax Compliance:__ Billing logic applies Texas SaaS Tax rules: Tax is applied to only 80% of the subscription fee \(20% exemption for data processing services\)\.
	- __Data Retention:__ AI chat history has no retention limits; all transactions remain fully visible.
	- __Note:__ Investment accounts count separately from traditional accounts\.
- __Ultimate Tier \($60/month or $600/year\):__
	- __All Pro Tier Features:__ Includes all Pro Tier aggregation and CEX support\.
	- __AI Model:__ Vertex AI Gemini 2.5 Pro (Production) with routing (Flash for simple, Pro for complex). For local development, Google AI Studio Gemini 2.5 Flash is used via API key authentication (see Local App Dev Guide for configuration details).
	- __Quota:__ 200 Cloud AI queries/day \(Metered, resets daily\)\.
	- __Account Limits:__ Up to 20 account connections \(Traditional, Investment, Web3 wallets, CEX\)\.
	- __Data Retention:__ AI chat history has no retention limits; all transactions remain fully visible.
	- __Family/Couple Features:__
		- Net worth tracking per individual \(assign accounts to specific family members\)\.
		- Individual account assignment and organization\.
		- Tab\-based interface to toggle between individual views or holistic family dashboard\.
		- Combined net worth calculation across all assigned accounts\.
	- __Target Users:__ Power users, married couples, families managing multiple accounts\.

#### 2\.3 Core Features

- __Unified Feed:__ Aggregated transactions from all sources\. Features: Search, Filter \(Date/Category/Account\), Bulk Edit, Undo\.
- __Smart Categorization:__ Auto\-categorization via ML\. "Review Queue" for low\-confidence tags\. System learns from user manual edits\.
- __Budgets:__ Set limits per category\. Rollover logic \(unused budget moves to next month\)\. Threshold alerts \(e\.g\., "You've hit 80% of Dining"\)\. Budget\-vs\-Actual visualization\.
- __Financial Health:__ Cash\-Flow: Inflow/Outflow summary \+ 30–90 day forecast\. Net Worth: Assets vs\. Liabilities delta tracking\.
- __Recurring Engine:__ Automated detection of bills, income, and subscriptions\. Flagging workflow for "forgotten" subscriptions\.
- __Investment Account Aggregation:__ Investment account aggregation via Plaid Investments API\. Holdings tracking, portfolio value, investment transactions\. Supports multiple brokerages via Plaid's aggregation service\.
- __Manual Asset Tracking:__ Manual Asset Tracking module for non\-API assets \(House, Car, Collectibles\)\.
- __Web3 Wallet Connections:__ Web3 wallet connections include token balances and NFTs\.
- __Reporting:__ Homepage holistic balance sheet; dynamic infographics\.
- __Dashboard Chart Sync:__ All charts automatically sync to the currently selected view period\. Users can select a custom date range \(start and end dates\) or use preset periods \(1W, 1M, 3M, 6M, 1Y, YTD\)\. When a period is selected, all charts and tables update automatically\. No manual "Sync all charts" toggle is provided\.
- __AI Assistant Access:__ All tiers can view the AI Assistant interface\. For subscribed users, a privacy/user agreement modal is shown immediately on page load\. Access is granted after acceptance; denying the agreement keeps the chat interface blocked\. The AI Assistant disclaimer remains visible, but AI chat retention notices are removed \(no retention limits apply to AI chat history\)\.

#### 2\.4 Third\-Party Widget Marketplace

This is a curated catalog where developers earn revenue based on user engagement and verified ratings \(1\-5 star system\)\. All developers must execute a Developer Agreement that has been reviewed and approved by qualified legal counsel\. The Developer Agreement must include intellectual property assignment clauses assigning all rights, title, and interest in any work product related to the Finity platform to Intellifide, LLC\.

**Marketplace Access by Tier:**
- **Free & Essential Tiers**: Preview-only access to widgets (interactions blocked, upgrade CTA shown). Cannot publish widgets.
- **Pro & Ultimate Tiers**: Full marketplace access including ability to publish and distribute widgets via the Developer Marketplace.

The static website template (`website_template/`) includes mock Developer Marketplace and Developer SDK pages demonstrating the submission workflow, SDK tools, and tier-based access controls\.

#### 2\.4\.1 MCP Server & Developer SDK

The Finity platform provides a Model Context Protocol \(MCP\) server as the single capability surface for marketplace widgets and the Developer SDK\. This architecture enhances security by preventing direct API access and provides a standardized, typed interface for all developer interactions\.

**MCP Server Architecture:**

- __Single Capability Surface:__ All marketplace widgets and SDK interactions route through the MCP server\. Read-only tools expose ledger slices, accounts/holdings, budgets/recurring, preview datasets keyed by feature, AI chat proxy, and metadata\.
- __Authentication & Access Control:__ Short-lived tokens scoped to widget/app ID + developer + tier\. Enforces feature/tier gating from `feature_requirements.yaml`, rate limits, and cost caps\. No secrets are exposed to client applications; the MCP server holds all provider credentials\.
- __Environment Parity:__ Identical tool contract for local \(emulators + synthetic data\), dev/stage, and prod\. SDK configuration switches endpoints via environment variables\.
- __Synthetic Test Datasets:__ Multiple deterministic customer profiles \(Beginner, Power User, Family, Crypto-heavy\) selectable via SDK for testing\. Each dataset includes realistic ledgers, holdings, budgets, and recurring transactions\. Preview datasets provided for every premium feature to enable comprehensive widget testing\.
- __Observability:__ Per-widget usage metrics and audit logs \(tool called, scope, latency, result code\) drive payouts, abuse detection, and support\. Strict input/output schemas and tool versioning with deprecation windows ensure API stability\.
- __Security Benefits:__ Developers cannot directly access internal APIs or provider credentials\. All access is authenticated, authorized, and logged\. Rate limiting and cost caps enforced at the MCP layer\. Non-custodial/read-only mandates enforced before requests reach core services\.

#### 2\.5 Visual Design & Branding

- __Default Theme:__ Engineered Liquid Glass\.
	- __Specs:__ backdrop\-filter: blur\(24px\) saturate\(150%\), background\-color: rgba\(255, 255, 255, 0\.65\)\.
	- __Contrast:__ Dynamic clamping to ensure >4\.5:1 ratio\.
- __Secondary Theme:__ High\-Contrast Opaque \(Opt\-in\)\.
- __Palette:__ Royal Purple, Deep Indigo, Aqua\.
- __Modes:__ System\-based Light/Dark\.
- __Intellifide Corporate Logo:__ Business logo naming matches the entity \("Intellifide"\). Deliver vector-first lockups \(primary horizontal, stacked, monochrome\), provide SVG + PNG exports, define clear-space/usage specs, and include trademark briefing notes for `Trademark-Filing-Strategy.md`\.
- __Finity Product Icon System:__ Refresh the Finity app logo/icon, produce a 1024x1024 master asset, and export platform-specific slices \(PWA manifest, iOS @1x/@3x, Android adaptive foreground/background\) while documenting gradient stops and elevation rules for the Engineered Liquid Glass aesthetic\.
- __App Store Creative Kit:__ Create six-screenshot storytelling sets for Apple and Google, hero/feature graphics \(Google Play 1024x500\) and App Store promotional artwork \(4320x1080\)\. Each frame must highlight budgeting, AI chat, and aggregation, with caption overlays driven by `Marketing-Content-Guidelines.md`\.

#### 2\.6 Notifications

- __Channels:__ In\-app \(Badge/List\), Email \(SendGrid\), SMS \(Twilio\)\.
- __Triggers:__ Low balance, Large transaction \(>$X\), Budget threshold hit, Recurring bill upcoming, Sync failure, New device login, Web3 large transfer\.
- __Controls:__ Per\-event toggles, Quiet Hours, Weekly Digest\.

### 3\.0 Technical Architecture \(GCP Polyglot\)

#### 3\.1 Frontend \(PWA\)

- __Framework:__ React \(Vite\) \+ TypeScript\.
- __Styling:__ Tailwind CSS with custom "Glass" utility classes defined in design\-tokens\.json\.
- __Viz:__ ECharts \(Financial charting\)\.
- __Mobile:__ Progressive Web App \(PWA\) with Service Worker and Manifest for installability, packaged via Capacitor for Apple App Store and Google Play distribution\.
- __Hosting:__ Cloud Storage \+ Cloud CDN \(HTTPS/HSTS\)\.

##### 3\.1\.1 Feature Preview Paywall Subsystem

- __Purpose:__ Give Free Tier users a pixel-identical preview of premium workflows while keeping inputs inert and guiding them toward upgrade flows\.
- __Core Components:__
	- `FeaturePreview.tsx`: Wraps any premium region \(`featureKey`, `previewContent`, `showPreviewBadge`, `onInteractionBlocked`\)\. Uses `useAuth\(\)` \+ `useSubscription\(\)` to derive the current `Tier` and consults the shared `featureRequirements` registry\.
	- `FeaturePreviewWrapper.tsx`: Adds overlay, focus trap, translucent blur, and intercepts pointer/keyboard events on actionable nodes \(`button`, `input`, `select`, `textarea`, `[role="button"]`, `.fc-event`, `.fc-daygrid-day`, `.fc-timegrid-slot`\)\. Emits `feature_preview.blocked_interaction` analytics\.
	- `PaywallModal.tsx`: Renders tier comparison cards using `FEATURE_BENEFITS` \+ `TIER_COMPARISON`, deep-links to `/userSettings?tab=subscription`, and exposes `onUpgrade`, `onContactSales`\.
	- `previewData.ts`: Houses synthetic ledger snapshots, AI transcripts, budgeting recommendations, automation templates; every record carries `isPreview: true`\.
- __Shared Tier Registry:__
	- `packages/shared/accessControl.ts` exports a single `enum Tier { FREE = 0, PRO = 1, ULTIMATE = 2 }`, `featureRequirements: Record<FeatureKey, Tier>`, and helpers `canUseFeature\(\)`, `isPremiumFeature\(\)`, `canPreviewFeature\(\)`\.
	- Frontend imports the module directly; FastAPI imports its Python equivalent from `services/access_control/registry.py`. Keep both files generated from the same YAML source \(`scripts/sync_feature_registry.py`\) to prevent drift\.

##### 3\.1\.1\.1 Feature Registry Generation & Enforcement

**Purpose:** Maintain a single source of truth for feature-to-tier mappings to prevent frontend/backend drift and ensure consistent access control enforcement\.

**Source File:** `feature_requirements.yaml` defines all feature keys and their required subscription tiers:

```yaml
features:
  ai.cloud:
    tier: essential
    preview_enabled: true
  budgets.advanced:
    tier: pro
    preview_enabled: true
  investment.aggregation:
    tier: pro
    preview_enabled: false
```

**Generation Script:** `scripts/sync_feature_registry.py` reads `feature_requirements.yaml` and generates:

1. **TypeScript Module** (`packages/shared/accessControl.ts`):
   - Exports `enum Tier`, `featureRequirements` map, and helper functions
   - Used by React components and frontend middleware

2. **Python Module** (`services/access_control/registry.py`):
   - Exports `Tier` enum, `feature_requirements` dict, and helper functions
   - Used by FastAPI dependencies and backend services

**Enforcement Points:**

- **Frontend Enforcement:** `FeaturePreview` component and `useFeatureAccess()` hook check `canUseFeature(featureKey, userTier)` before rendering premium content
- **Backend Enforcement:** FastAPI dependency `require_feature(feature_key)` validates tier before route execution, returns 403 if unauthorized
- **MCP Agent Enforcement:** `FeatureAccessService.assert(feature_key, user_tier)` called before workflow execution

**Workflow:**
1. Developer adds/modifies feature in `feature_requirements.yaml`
2. Run `python scripts/sync_feature_registry.py` to regenerate TS/Python modules
3. Both frontend and backend automatically use updated mappings
4. CI pipeline validates that generated files match YAML source (prevents manual edits)

**Critical:** Never manually edit `accessControl.ts` or `registry.py`—always update `feature_requirements.yaml` and regenerate\. This ensures frontend and backend cannot drift out of sync\.
- __Usage Pattern \(Dashboard Example\):__

```tsx
// Wraps Cloud AI chat panel with FeaturePreview and preview transcript content
<FeaturePreview featureKey="ai.cloud" previewContent={<PreviewChatTranscript />}>
  <AIChatPanel />
</FeaturePreview>
```

- __MCP Agent Guard Rails:__ MCP orchestrators call `FeatureAccessService.assert\(feature_key, user_tier\)` before executing workflows. Agents that support preview mode \(e.g., Investment Storyboard\) must fetch preview payloads via `GET /preview/<feature_key>` endpoints instead of touching production ledgers\.
- __Interaction Handling:__
	- All click, keydown \(Enter/Space\), form submit, and drag events originating inside the wrapper are canceled and routed to `openPaywallModal\(featureKey\)`\.
	- Read-only behaviors \(scroll, select text, copy, tooltip hover\) remain enabled to preserve the discovery experience\.
- __Accessibility \+ Engineered Liquid Glass:__
	- Overlay uses `backdrop-filter: blur(14px)` capped to maintain 4\.5:1 contrast, `aria-live="polite"` for the upgrade banner, focus is moved into the modal with `aria-modal="true"`, and Esc closes without mutating original components\.
- __Telemetry & Flags:__
	- Log `feature_preview.blocked_interaction`, `feature_preview.preview_loaded`, and `feature_preview.cta_clicked` events via `LogLedgerService`, which writes to Cloud SQL (`audit.feature_preview`) and mirrors the rows into the Coldline archive \(see Monitoring & Evaluation KPIs\)\.
	- Expose Remote Config toggles: `feature_preview.enabled`, `feature_preview.<featureKey>.enabled`, and define a kill switch consumed by Support Ops\.
- __Preview Content Contract:__
	- Each premium widget accepts `previewEnabled` \+ `previewEntity` props. When `FeaturePreview` runs in preview mode it injects curated data via render props \(`previewContent`\) or via a context provider to keep layout parity without leaking NPPI\.
	- Authoring, validation, and marketing copy workflows are defined in `Preview-Content-Playbook.md`; engineering may not ship preview datasets that have not cleared that checklist\.

##### 3.1.2 Native Packaging & Store Distribution

- __Wrapper:__ Capacitor 6 wraps the PWA build output (`dist/pwa`) into native shells. `capacitor.config.ts` holds the shared app id `com.intellifide.finity` plus platform metadata; never fork the React codebase.
- __iOS Build:__ Generate the Xcode 16 project via `npx cap add ios`. Automatic signing uses the Intellifide Apple Developer Program team ID with App Store Connect API keys stored in Secret Manager. CI runs `xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -allowProvisioningUpdates` to create the `.ipa`.
- __Android Build:__ Generate the Android Studio/Gradle 8 project via `npx cap add android`. Produce Android App Bundles (`.aab`) with Play App Signing enabled, Play Integrity API configured, and Firebase Crashlytics wired through the Capacitor Firebase plugin.
- __CI/CD:__ Pipeline `mobile-release.yaml` executes after tagging `release/*`. Steps: install dependencies, `pnpm build:pwa`, `npx cap sync`, run Detox smoke tests, package iOS/Android artifacts, and upload to TestFlight/Play Console using service accounts. Artifacts are stored in Cloud Storage for audit.
- __Store Assets:__ Automatically pull the Finity icon system and App Store creative kit (Section 2.5) during build via `scripts/export_store_assets.ts`. Pipeline fails if required dimensions or counts (iOS 6 screenshots, Android 8, Play feature graphic) are missing.
- __Privacy Declarations:__ Generate App Store Privacy Nutrition Label metadata from `compliance/privacy_manifest.json`, configure ATT prompt messaging sourced from `Marketing-Content-Guidelines.md`, and maintain Google Play Data Safety + Permissions declarations in `android/play-data-safety.yaml`.
- __Testing Tracks:__ Maintain TestFlight Internal + Beta groups and Google Play Internal + Closed testing tracks. Build numbers map to Git commit SHAs to simplify rollback.
- __Release Gates:__ Store submissions require sign-off from Engineering, Compliance, and Marketing. App Store release remains Manual until launch readiness criteria are met; Google Play uses staged rollout (10% -> 100%) with automated rollback if crash-free sessions drop below 97%.
- __Documentation:__ Store listing copy, localized strings, and screenshot captions live in `Marketing-Content-Guidelines.md` to keep legal-approved messaging centralized.

#### 3.2 Backend

- __Runtime:__ Python 3\.11\+ \(FastAPI\)\.
- __Compute:__ Cloud Run \(Serverless Containers\)\.
- __Async Glue:__ Cloud Functions \(Gen2\) \+ Pub/Sub\.
- __Jobs:__ Cloud Run Jobs \+ Cloud Scheduler \(Sync tasks\)\.
- __Configuration:__ Firebase Remote Config \(for global Feature Flags\)\.

##### 3\.2\.1 Feature Access Enforcement & Preview Endpoints

- **Shared Registry:** `services/access_control/registry.py` is generated from `feature_requirements.yaml` (same source as the frontend TypeScript module). It exposes `Tier`, `feature_requirements`, `can_use_feature`, and `can_preview_feature` helpers.
- **FastAPI Dependency:** All premium routes depend on `require_feature(feature_key: str)` which loads the caller's tier from Cloud SQL (`subscriptions.plan`). Unauthorized calls raise `HTTPException(status_code=403, detail="feature_preview_required")` and emit `feature_preview.backend_blocked` telemetry.

```python
# Ensures Finity AI Cloud can't run unless the user tier meets the requirement
@router.post("/ai/chat")
async def chat(payload: ChatRequest, user=Depends(auth_ctx), _=Depends(require_feature("ai.cloud"))):
    return await ai_service.handle(payload, user)
```

- **Preview APIs:** Read-only endpoints live under `/preview/<feature_key>` and are backed by Cloud Storage JSON artifacts synced from `preview-data/`. Every response sets `Cache-Control: public, max-age=86400` and removes user identifiers.
- **Audit Logging:** Both successful and blocked feature calls write to Cloud SQL (`audit.feature_preview`) with columns `{uid, feature_key, tier, action, source}`. The append-only ledger powers anomaly dashboards and Longitudinal KPI queries.
- **Remote Config Overrides:** Support Ops can temporarily set `feature_preview.disable_backend["feature_key"] = true` to short-circuit preview requests at the dependency layer without redeploying.

#### 3\.3 Infrastructure Delivery & Networking Architecture

**Infrastructure as Code (IaC):** All GCP infrastructure is managed via Terraform using Google Cloud Foundation Toolkit (CFT) and Fabric modules. This ensures reproducible deployments, security guardrails, and full auditability.

**Infrastructure Repository Structure:**
- `infra/modules/` - Reusable Terraform modules (network, nat, psc, cloud-sql, cloud-run, lb-https, org-policies, log-export)
- `infra/envs/{prod,stage,dev}/` - Environment-specific configurations composing modules
- State backend: GCS bucket with versioning + KMS encryption
- CI/CD: Terraform fmt/validate/tflint/tfsec checks; manual approval required for applies

**Networking Architecture (Zero Trust):**

**VPC Design:**
- Per-environment VPCs (prod, stage, dev) with no peering between prod and non-prod
- Subnets: `app` (10.10.0.0/22), `data` (10.10.4.0/23), `ops` (10.10.6.0/24)
- Primary region: `us-central1`, Secondary/DR region: `us-east1`

**Private Service Connect (PSC):**
- Google APIs PSC endpoint forces all `googleapis.com` traffic to private paths
- Cloud SQL accessed via private IP only (no public IP)
- DNS policy enforces `googleapis.com` resolution to PSC endpoints

**Ingress Security:**
- Global HTTPS Load Balancer with Cloud Armor WAF (OWASP rules, bot management, rate limiting)
- TLS 1.3 required, HSTS enabled
- Cloud Run ingress restricted to `internal-and-cloud-load-balancing` only
- Serverless NEG connects LB to Cloud Run services
- Cloud CDN enabled for static assets/PWA

**Egress Governance:**
- Cloud NAT with logging for all internet egress
- Firewall default deny egress; allow-list for third-party APIs (Plaid, SendGrid, Twilio, Stripe, CEX APIs, Infura/Solana RPC)
- DNS policy blocks wildcard external resolution except allow-listed domains

**Service-to-Service Communication:**
- Cloud Run services use Serverless VPC Connector with `private-ranges-only` egress
- All Cloud Run invocations require authentication (no `--allow-unauthenticated` except explicit public assets)
- Per-service service accounts with least privilege IAM

**High Availability & Disaster Recovery:**
- Cloud Run: Regional multi-zone deployment; optional secondary-region standby with LB failover
- Cloud SQL: Regional HA with automatic failover; backups + PITR enabled
- Load Balancer: Health checks + failover backends; CDN provides static asset resilience
- Quarterly DR drills: Cloud SQL failover tests, backup restore validation

**Security Guardrails (Org Policies):**
- Disable external IPs on VM instances
- Disable service account key creation
- Restrict CMEK projects (enforce CMEK for Cloud SQL audit schema, critical buckets)
- Restrict allowed APIs/domains where feasible

**Observability:**
- Logging: LB/Armor logs, VPC Flow Logs, NAT logs, DNS logs, Admin/Data Access logs
- Log exports to restricted sinks (GCS/BigQuery/PubSub) via `terraform-google-log-export` module
- Security Command Center enabled
- Alerting: WAF hits surge, 4xx/5xx spikes, egress to non-allowlisted domains, Cloud SQL failover events

**Deployment Workflow:**
1. Infrastructure changes via Terraform PRs
2. CI runs: `terraform fmt`, `validate`, `tflint`, `tfsec/checkov`, `plan`
3. Manual approval required for applies
4. State locking via GCS prevents concurrent modifications
5. Policy checks block: public Cloud Run ingress, unauthenticated services, public Cloud SQL IP, org policy violations

**Related Documentation:**
- Infrastructure codebase: `infra/` directory with README
- Security architecture: `Security-Architecture.md`
- GCP setup: `getting started gcp.md`
- Local development: `Local App Dev Guide.md` (Terraform not used locally; Docker emulation only)

#### 3\.4 Permanent Data Storage Strategy (Rightsized Architecture)

Cloud SQL Enterprise Plus + Firestore Datastore Mode is the permanent, rightsized architecture for Intellifide's current stage. This architecture provides the necessary functionality without the complexity and cost overhead of Spanner/Bigtable. This is not a temporary solution or migration path—it is the chosen architecture for production.

The "One\-Size\-Fits\-All" DB is prohibited\.

__Store__

__Technology__

__Workload__

__Rationale__

__Unified Ledger & Metadata__

Cloud SQL (PostgreSQL + pgvector)

Transactions, Balances, Users, Subscriptions, **Vector Embeddings**.

Relational integrity, RAG support via `pgvector`. Cost-optimized for batch sync.

__Metering & Cache__

Firestore (Datastore Mode)

API Usage, Market Ticks, Caches, **Widget Engagement**.

Serverless, scales to zero, cost-effective for bursty sync jobs.

__Logs__

Cloud SQL (`audit` schema) + Coldline archive

Audit events, encrypted LLM logs, widget download/rating ledger.

Append-only tables keep costs predictable while nightly `log-ledger-archiver` exports Parquet copies to `gs://finity-log-vault/<table>/<YYYY>/<MM>/<DD>/` for 7-year retention without introducing a separate analytics warehouse.

__Secrets__

Secret Manager

API Keys, OAuth Tokens\.

Zero secrets in DB\.

**Tier Retention Summary**

- **Free Tier:** Cloud SQL table `ledger_hot_free` stores 45 days of transactions; the nightly `free-ledger-pruner` Cloud Run Job (02:00 CT) deletes rows older than 45 days, and no archive copy exists.
- **Essential Tier:** Cloud SQL table `ledger_hot_essential` stores 30 days of transactions; the `essential-ledger-archiver` job writes older rows to Coldline (`gs://finity-ledger-archive/essential/<uid>/<YYYY>/<MM>`) before pruning the hot table.
- **Pro / Ultimate:** Cloud SQL `ledger_pro` retains full history; pruning occurs only during "Right to be Forgotten" workflows.

#### 3\.4 Machine Learning Pipeline (Categorization & Vertex AI)

1\. **Feature Extraction (Dataflow):** `categorization-feature-builder` reads transactions from Cloud SQL. Features are written to Cloud Storage (`gs://finity-ml-features/dt=<YYYY-MM-DD>/features.parquet`).
2\. **Training (Vertex AI Pipelines):** Nightly pipeline (`ml/pipelines/categorization_pipeline.py`) performs data validation, trains a TensorFlow multi-class classifier, evaluates precision/recall, and registers the model in Vertex AI Model Registry.
3\. **Serving (Vertex AI Prediction):** Production endpoint `categorization-prod` (us-central1) exposes the latest model. CategorizationService calls the endpoint with a 300 ms latency budget; traffic splitting enables blue/green deploys.
4\. **RAG Pipeline (New):**
   - **Embeddings:** `Vertex AI Embeddings` (text-embedding-004) converts transactions/budgets to vectors.
   - **Store:** Vectors stored in Cloud SQL `transactions` table (column `embedding vector(768)`).
   - **Retrieval:** Queries use `pgvector` cosine similarity (`<=>`) to fetch relevant financial context for the AI Assistant.
5\. **Monitoring & Retraining:** Vertex AI Model Monitoring tracks per-category precision; alerts trigger when precision < 90% or review queue volume doubles week over week, automatically launching a new training run.
6\. **Rollback:** If degradation persists, reroute endpoint traffic to the previous model version via `ml/pipelines/promote_model.py --rollback`.
7\. **Feedback Loop:** Human-reviewed category corrections flow into Cloud SQL (`categorization_feedback`) and are incorporated into subsequent training cycles.

**AI Model Development vs Production Pathways:**

- **Local Development:** The codebase uses Google AI Studio Gemini 2.5 Flash API for local development. Configuration includes:
  - Base URL: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  - Authentication: API key via `AI_STUDIO_API_KEY` environment variable
  - Model: `gemini-2.5-flash` (configurable via `GEMINI_MODEL` environment variable)
  - Rate Limiting: Client-side rate limiting and exponential backoff to respect free-tier limits (~10 RPM, 250k TPM, 250 RPD)
  - Data Logging: Disabled in API requests (prompts/responses not stored or used for training)
  - RAG Context: Uses local pgvector search for RAG injection (Vertex AI Vector Search not available in local dev)

- **Production Deployment:** The codebase switches to Vertex AI Gemini endpoints for production:
  - Base URL: `https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent`
  - Authentication: Service account credentials (Application Default Credentials or workload identity)
  - Model: Same model identifiers (`gemini-2.5-flash`, `gemini-2.5-pro`) but accessed via Vertex AI publisher endpoints
  - RAG Context: Uses Vertex AI Vector Search indexes (per-user namespaces) for Essential/Pro/Ultimate tiers
  - Data Logging: Explicitly disabled on all Gemini endpoints to prevent prompts/responses from being stored or used for training
  - Encryption: All raw prompts/responses encrypted with User DEK before storage in Cloud SQL (`audit.llm_logs`)

- **Migration Strategy:** The client implementation uses a configurable transport layer that allows swapping base URLs and authentication methods without refactoring call sites. Environment variables (`APP_ENV=local|cloud`) control which pathway is used. This ensures minimal code changes when moving from development to production.
-
### 4\.0 Detailed Database Schema \(Polyglot\)

#### A\. Cloud SQL \(PostgreSQL\) \- Unified Ledger & Metadata

- __users__
	- uid \(PK, VARCHAR\): Firebase UID\.
	- email \(VARCHAR\)\.
	- role \(ENUM\): \{user, support_agent, support_manager\} DEFAULT user\.
	- theme\_pref \(VARCHAR\): Defaults to 'glass'\.
	- currency\_pref \(VARCHAR\): ISO 4217 currency code \(e\.g\., 'USD', 'EUR', 'GBP'\)\. Defaults to 'USD'\. Used by CurrencyConversionService for display conversion\.
	- created\_at \(TIMESTAMP\)\.
- __developers \(New/Updated Table\)__
	- uid \(PK, FK \-> users\.uid\): Links to users table\. Presence of this record indicates marketplace developer status\.
	- payout\_method \(JSON\): Tracks developer payment preferences\.
	- payout\_frequency \(ENUM\): \{monthly, quarterly\}\.
	- link\_to\_payouts\_ledger \(FK \-> developer\_payouts\.month/dev\_uid\)\.
	- Note: Developer status is determined by presence of a record in this table\. The `users.developer_payout_id` field links to the payout system\.
- __developer\_payouts \(New Table\)__
	- month \(PK, DATE\): Payout period\.
	- dev\_uid \(PK, FK \-> users\.uid\): Developer UID\.
	- gross\_revenue \(NUMERIC\): Total calculated earnings before fees\.
	- payout\_status \(VARCHAR\): e\.g\., 'pending', 'paid', 'failed'\.
- __subscriptions__
	- id \(PK, UUID\)\.
	- uid \(FK \-> users\.uid\)\.
	- plan \(ENUM\): \{free, essential, pro, ultimate\}\.
	- status \(VARCHAR\): Stripe status \(active, past\_due\)\.
	- renew\_at \(TIMESTAMP\)\.
	- ai\_quota\_used \(INT\): DEFAULT 0\. Resets on webhook\.
- __ai\_settings__
	- id \(PK, UUID\)\.
	- uid \(FK\)\.
	- provider \(VARCHAR\): 'vertex\-ai' \(cloud\), 'local'\. \('vertex\-ai' primary for cloud AI; local used for Free tier and development\)\.
	- model\_id \(VARCHAR\): 'gemini\-2\.5\-flash' \(primary cloud model\), 'gemini\-2\.5\-pro' \(Ultimate tier\), 'gemini\-3\-\*' \(future models\)\.
	- user\_dek\_ref \(VARCHAR\): Crucial\. Reference to KMS Key Version for crypto\-erasure\.
- __notification\_preferences__
	- uid \(FK\)\.
	- event\_key \(VARCHAR\)\.
	- channel\_email \(BOOL\)\.
	- channel\_sms \(BOOL\)\.
	- quiet\_hours\_start \(TIME\)\.
	- quiet\_hours\_end \(TIME\)\.
- __payments__
	- id \(PK\)\.
	- uid \(FK\)\.
	- stripe\_customer\_id \(VARCHAR\)\.
	- stripe\_sub\_id \(VARCHAR\)\.
- __manual\_assets__
	- id \(PK, UUID\)\.
	- uid \(FK \-> users\.uid\)\.
	- asset\_type \(VARCHAR\): \{house, car, collectible\}\.
	- name \(VARCHAR\)\.
	- value \(NUMERIC\)\.
	- purchase\_date \(DATE, NULLABLE\)\.
	- notes \(TEXT, NULLABLE\)\.
	- created\_at \(TIMESTAMP\)\.
	- updated\_at \(TIMESTAMP\)\.
- __support\_agents__
	- id \(PK, UUID\)\.
	- company\_id \(VARCHAR, UNIQUE\): Format `INT-AGENT-YYYY-###` \(e\.g\., `INT-AGENT-2024-001`\)\.
	- name \(VARCHAR\): Agent's full name\.
	- email \(VARCHAR, UNIQUE\): Agent's email address \(for authentication\)\.
	- role \(ENUM\): \{support_agent, support_manager\}\.
	- active \(BOOLEAN\): Whether the agent is currently active\.
	- created\_at \(TIMESTAMP\)\.
	- updated\_at \(TIMESTAMP\)\.

#### A\.1 Cloud SQL \- Tier Hot Windows \(Free & Essential\)

- __ledger\_hot\_free__
	- id \(PK, UUID\)
	- uid \(INDEX\)
	- account\_id \(UUID\): mirrors `accounts.id` from Cloud SQL
	- ts \(TIMESTAMP\)
	- amount \(NUMERIC(18,2)\)
	- currency \(STRING(3)\)
	- category \(STRING\)
	- raw\_json \(JSONB\)
	- indexes: `idx_ledger_hot_free_uid_ts`, `idx_ledger_hot_free_account`
	- retention: nightly `free-ledger-pruner` job deletes rows older than 45 days; no archive copy is retained
- __ledger\_hot\_essential__
	- id \(PK, UUID\)
	- uid \(INDEX\)
	- account\_id \(UUID\)
	- ts \(TIMESTAMP\)
	- amount \(NUMERIC(18,2)\)
	- currency \(STRING(3)\)
	- category \(STRING\)
	- raw\_json \(JSONB\)
	- indexes: `idx_ledger_hot_ess_uid_ts`, `idx_ledger_hot_ess_account`
	- retention: `essential-ledger-archiver` streams rows older than 30 days to Coldline (`gs://finity-ledger-archive/essential/<uid>/<YYYY>/<MM>`) before pruning the hot table
	- archive format: partitioned Parquet files with per-user manifests

#### B\. Firestore \(Datastore Mode\) \- High\-Velocity Metering

- __api\_usage__
	- __Key:__ uid\#YYYYMM \(e\.g\., user123\#202511\)\.
	- __Properties:__ request\_count \(int\), ai\_tokens \(int\), endpoint\_hits \(map\)\.
- __enrich\_cache__
	- __Key:__ merchant\_hash \(SHA256 of Normalized Name\)\.
	- __Properties:__ logo\_url, clean\_name, category\_hint\.
	- __Note:__ Normalization \(stripping store IDs\) is critical for cache hit rate\.
- __widget\_engagement \(New Collection\)__
	- __Key:__ widget\_id\#uid \(for individual ratings\) __AND__ widget\_id\#daily\_summary \(for aggregate stats\)\.
	- __Properties:__ downloads\_count, avg\_rating\_score\.

#### C. Cloud SQL Log Ledger & Coldline Archive

- __audit.audit_log__
	- id (UUID, PK).
	- ts (TIMESTAMPTZ DEFAULT now()).
	- actor_uid (STRING).
	- target_uid (STRING, nullable).
	- action (STRING).
	- source (STRING): `frontend`, `backend`, `workflow`.
	- metadata_json (JSONB). PII scrubbed.
	- **Constraints:** Insert-only via Row Level Security; UPDATE/DELETE allowed only by `log-ledger-shredder` during legal erasure events.
- __audit.llm_logs__
	- id (UUID, PK).
	- ts (TIMESTAMPTZ).
	- uid (STRING).
	- model (STRING).
	- encrypted_prompt (BYTEA). Encrypted with User DEK.
	- encrypted_response (BYTEA). Encrypted with User DEK.
	- tokens (INT).
	- user_dek_ref (STRING). Required for cryptographic erasure workflows.
- __audit.support_portal_actions__
	- id (UUID, PK).
	- ts (TIMESTAMPTZ DEFAULT now()).
	- agent_id (UUID, FK -> support_agents.id).
	- agent_company_id (VARCHAR): Agent's Company ID for quick reference.
	- agent_name (VARCHAR): Agent's name at time of action.
	- ticket_id (VARCHAR): Ticket identifier.
	- customer_uid (VARCHAR, nullable): Customer UID (masked in logs).
	- action_type (VARCHAR): Action type (view_ticket, respond, reassign, escalate, resolve, add_note, etc.).
	- action_details (JSONB): Action-specific details (response text, status changes, etc.).
	- ip_address (VARCHAR, nullable): IP address for security audit.
	- archived (BOOL DEFAULT FALSE).
	- **Constraints:** Insert-only via Row Level Security; UPDATE/DELETE allowed only by `log-ledger-shredder` during legal erasure events.
- __support_ticket_ratings__
	- id (UUID, PK).
	- ticket_id (VARCHAR, UNIQUE).
	- agent_id (UUID, FK -> support_agents.id).
	- customer_uid (VARCHAR): Customer who provided the rating.
	- rating (INT): 1-5 star rating.
	- feedback_text (TEXT, nullable): Optional customer feedback.
	- created_at (TIMESTAMPTZ DEFAULT now()).
- __Export & Retention__
	- Cloud Run Job `log-ledger-archiver` runs daily to export the previous 24 hours of `audit_log`, `feature_preview`, `developer_payout_events`, `llm_logs`, and `support_portal_actions` rows to Parquet files in `gs://finity-log-vault/<table>/<YYYY>/<MM>/<DD>/`.
	- Each export is encrypted with CMEK, emits a manifest + checksum, and marks the corresponding Cloud SQL rows as archived.
	- After a successful export, Cloud SQL rows older than 90 days are pruned; Coldline objects store the encrypted 7-year retention copy (GLBA).
	- Cryptographic erasure destroys a user’s DEK, making encrypted payloads unreadable instantly. `log-ledger-shredder` deletes impacted rows from Cloud SQL and issues lifecycle delete markers for corresponding Parquet files within 24 hours.

##### Log Ledger DDL (Migration Snippet)

```sql
CREATE SCHEMA IF NOT EXISTS audit;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_uid TEXT NOT NULL,
  target_uid TEXT,
  action TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('frontend','backend','workflow')),
  metadata_json JSONB NOT NULL,
  archived BOOL NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit.feature_preview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  uid TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  tier TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata_json JSONB NOT NULL,
  archived BOOL NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit.llm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  uid TEXT NOT NULL,
  model TEXT NOT NULL,
  encrypted_prompt BYTEA NOT NULL,
  encrypted_response BYTEA NOT NULL,
  tokens INT NOT NULL,
  user_dek_ref TEXT NOT NULL,
  archived BOOL NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit.support_portal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_id UUID NOT NULL,
  agent_company_id VARCHAR NOT NULL,
  agent_name VARCHAR NOT NULL,
  ticket_id VARCHAR NOT NULL,
  customer_uid VARCHAR,
  action_type VARCHAR NOT NULL,
  action_details JSONB NOT NULL,
  ip_address VARCHAR,
  archived BOOL NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS support_ticket_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR UNIQUE NOT NULL,
  agent_id UUID NOT NULL,
  customer_uid VARCHAR NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.feature_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.llm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.support_portal_actions ENABLE ROW LEVEL SECURITY;
```


### 5\.0 API Surface

#### Auth & User

- GET /me: Return user profile, tier, theme prefs, and currency preference\.
- PATCH /me/settings: Update notification/theme settings, currency preference\.

#### Accounts & Sync

- GET /accounts: List all linked accounts/wallets\.
- POST /accounts/link: Initiate Plaid/CEX link \(returns Link Token\)\.
- POST /accounts/exchange: Exchange public token for access token \(stored in Secret Manager\)\.
- DELETE /accounts/\{id\}: Remove account and keys\.
- POST /sync/run: Trigger manual sync job\.
- GET /sync/status: Check job status\.

#### Financial Data

- GET /transactions: Search, filter, sort transactions\. \(Utilizes Idx\_Transactions\_Uid\_Ts\_Desc\)\.
- PATCH /transactions/\{id\}: Update category/notes\.
- GET /budgets: Get current budget status vs actuals\.
- POST /budgets: Set/Update category limits\.
- GET /cashflow/forecast: Get 30\-90 day projection\.
- GET /networth: Get historical net worth points\.
- GET /reports: Get aggregated infographic data\.

#### Widget & Developer Endpoints \(New\)

- GET /widgets/\{id\}/stats: Retrieve average rating, total downloads \(For display in the App Store UI\)\.
- POST /widgets/\{id\}/rating: User submits score \(1\-5\) and feedback\_text \(Required for the rating system\)\.
- GET /dev/payouts: Developer retrieves their payment history and current earnings \(Required for the developer portal interface\)\.

#### AI & Intelligence

- POST /chat: Send prompt\.
- __Middleware:__ Checks quota $\\rightarrow$ Checks Feature Flag $\\rightarrow$ Injects RAG Context $\\rightarrow$ Encrypts $\\rightarrow$ Calls LLM $\\rightarrow$ Streams response\.

#### Billing

- GET /subscription: Current plan status\.
- POST /subscription/checkout: Create Stripe Checkout session\.
- POST /stripe/webhook: Handle invoice\.paid, subscription\.updated\.

#### Support Portal & Workflow Automation Integration

- GET /api/users/{uid}: User information for workflow automation system \(read\-only, masked PII\)
- GET /api/accounts/{uid}: Account status for support tickets \(read\-only\)
- POST /api/support/tickets: Create ticket \(if needed by workflow automation system\)
- GET /api/support/tickets/{id}: Ticket status for workflow automation system
- GET /api/support/agent/me: Get current agent information \(name, company_id, role\)
- POST /api/support/tickets/{id}/respond: Agent responds to ticket \(logs action with agent_id, company_id, timestamp\)
- POST /api/support/tickets/{id}/reassign: Reassign ticket to another agent \(logs action\)
- POST /api/support/tickets/{id}/escalate: Escalate ticket \(logs action\)
- POST /api/support/tickets/{id}/resolve: Mark ticket as resolved \(logs action\)
- POST /api/support/tickets/{id}/rating: Customer submits quality rating \(1\-5 stars, optional feedback\)
- GET /api/support/agent/{agent_id}/metrics: Get agent performance metrics \(response time, satisfaction score, tickets resolved\)

### 6\.0 Services Layer \(Business Logic\)

- __SubscriptionService:__ Enforces Free vs\. Pro limits\. Resets quotas on billing cycle\. Applies Texas Tax Logic \(80% taxable basis\) on invoice generation via Stripe API\.
- __DataSyncService:__ Orchestrates Plaid/CCXT/Ethers\.js fetchers\. Validates "Read\-Only" scopes \(FinCEN\)\. Publishes raw data to Pub/Sub\. Adds Plaid Investments API integration for investment account sync\. Handles holdings and positions data via Plaid\. Adds Manual Asset Tracking service for non\-API assets\.
- __CategorizationService:__ Consumes Pub/Sub events\. Applies ML rules\. Writes to Cloud SQL transactions\.
- __EnrichmentService:__ Checks Firestore enrich\_cache for logos/names\. Updates cache on miss using normalized keys\.
- __RecurringService:__ Analyzes transaction history to identify patterns \(Series ID\)\.
- __NotificationService:__ Checks notification\_preferences\. Dispatches to Twilio/SendGrid\.
- __LogLedgerService (New):__ Accepts append-only events from API/services, writes to Cloud SQL `audit.*` tables, enforces row-level security, runs `log-ledger-archiver` to push encrypted Parquet copies to Coldline, and handles cryptographic-erasure purge tickets.
- __CurrencyConversionService:__ Converts transaction amounts to user's preferred display currency\. Uses ExchangeRate\-API or similar service for real\-time rates\. Caches rates in Firestore (collection: `fx_rates`) with a 1\-hour TTL so the caching layer aligns with the metering stack\. Base currency is USD for all calculations; conversion is display\-only\. User preference stored in users\.currency\_pref \(ISO 4217 code\)\. Handles multi\-currency transactions from CEX and Web3 sources\. Note: Full international compliance \(GDPR, country\-specific regulations\) is a backlog item for future implementation\.
- __AI Orchestrator Service:__ Flag Check: Must check ENABLE\_AI\_CHAT before processing\. RAG Engine: Pre\-fetches user financial context \(Sum of Spend, Budget Status\) via `pgvector` search to prepend to system prompt\. Note: No sanitization or content filtering is applied\. The service is a direct pass\-through to the configured LLM provider\.
- __Payout Calculation Service \(New\):__ Executes monthly \(or subject to change\) to calculate the Engagement Score \($\\text\{Engagement Score\} = \\text\{Downloads\} \\times \\text\{Average Rating Score\}$\), determines the revenue share, and creates a ledger entry in the developer\_payouts table\.
- __Support Ticket Service:__ Orchestrates support ticket automation using Cloud Workflows and Cloud Run\. Handles ticket creation, categorization, routing, and auto-responses\. Integrates with FastAPI backend for user data lookup\.
- __Agent Tracking Service:__ Logs all agent actions to `audit.support_portal_actions` table with agent_id, company_id, name, action type, ticket_id, and action details\. Ensures immutable audit trail for accountability and quality assurance\.
- __Quality Metrics Service:__ Aggregates customer ratings and internal management reviews to calculate agent performance metrics \(average response time, customer satisfaction score, tickets resolved, escalation rate\)\. Provides dashboard data for management review\.

#### 6.0.1 Log-Ledger-Archiver Cloud Run Job

- **Purpose:** Nightly export + purge cycle for all append-only audit tables.
- **Schedule:** Cloud Scheduler cron `0 7 * * *` (01:00 CT) invoking `log-ledger-archiver` via HTTPS (signed token).
- **Runtime:** Cloud Run Job (`us-central1`, 512 MiB, 1 vCPU, timeout 900s, concurrency 1).
- **Entrypoint:** `python jobs/log_ledger_archiver.py --since=${YESTERDAY} --until=${TODAY}`.
- **Environment:**
	- `DATABASE_URL` (Cloud SQL Auth Proxy)
	- `GCS_BUCKET=gs://finity-log-vault`
	- `CMEK_KEY=projects/finity/locations/us/keyRings/ledger/cryptoKeys/log-ledger`
	- `AUDIT_TABLES=audit.audit_log,audit.feature_preview,audit.developer_payout_events,audit.llm_logs,audit.support_portal_actions`
- **Workflow:**
	1. Query each table for `ts >= since AND ts < until`, stream chunked Parquet files to `gs://finity-log-vault/<table>/<YYYY>/<MM>/<DD>/<chunk>.parquet`.
	2. Emit a manifest JSON + SHA256 checksum per table, store alongside exports, and set object state to Coldline after 90 days via lifecycle rules.
	3. Update the exported rows with `archived = TRUE`, then delete any `archived` rows older than 90 days.
	4. Process `log_purge_queue` events (Right-to-Be-Forgotten) by deleting matching rows and pushing delete markers to `coldline_delete_queue` for downstream storage cleanup.
	5. Write a run summary to `audit.log_ledger_archiver_runs` for Compliance.
- **Testing:** Pytest harness spins up Postgres + the GCS emulator to validate chunking, manifest integrity, and purge handling. CI fails if checksum mismatches or archive deletes exceed 1% of daily volume.


### 6\.1 Future Enhancement Services \(Backlog\)

**SnapTrade Integration \(Backlog\):**

- SnapTrade API integration for brokerages not supported by Plaid

- OAuth flow implementation

- Data normalization for SnapTrade brokerages

**DeFi Protocol Tracking Service \(Backlog\):**

- Aave, Compound staking/lending pools tracking

**Automated Alternative Asset Tracking \(Backlog\):**

- Real Estate via Zillow API

- Vehicle via VIN lookup

### 7\.0 Operational Resilience & Cost Control \(Safety Layer\)

#### 7\.1 Kill Switches \(Feature Flags\)

- __Mechanism:__ All services must query Firebase Remote Config \(cached for 60s\) at runtime\.
- __Mandatory Flags:__
	- ENABLE\_GLOBAL\_SYNC: Master switch to stop all Plaid/CEX polling\.
	- ENABLE\_AI\_GATEWAY: Instantly reject all /chat requests with 503 Service Unavailable\.
	- MAINTENANCE\_MODE: Puts the entire API into Read\-Only mode\.

#### 7\.2 Runaway Cost Circuit Breakers

- __Internal Rate Limiting:__ Sync Jobs: Hard limit of 10 sync attempts per user/day\. AI Chat: Hard limit of 5 requests per minute \(burst protection\) even for Pro users\.
- __LLM Token Caps:__ Every outgoing LLM request (local or Vertex AI Gemini) must explicitly set max\_tokens \(e\.g\., 1024\) to prevent infinite generation loops\.
- __GCP Budget Automations:__ Budget Alert: Set daily budget alert at $50\. Action: If budget > 150% forecast, trigger Pub/Sub topic emergency\-shutdown\. Reaction: Cloud Function consumes topic \-> Sets ENABLE\_GLOBAL\_SYNC = False via Remote Config \-> API stops expensive calls\.

### 7\.3 Service Level Objectives \(SLO\) & Performance Targets

**API Availability & Latency:**

- __Availability SLO:__ 99\.9% monthly \(error budget: ~43 minutes/month\)\. SLI: successful requests / total requests\.
- __Latency SLO:__ p95 ≤ 350 ms, p99 ≤ 700 ms for reads; writes ~20\-30% higher\. SLI: per\-endpoint latency percentiles\.
- __Error Rate SLO:__ ≤ 0\.2% 5xx over 30 days\. SLI: 5xx / total requests\.

**AI Chat Performance:**

- __End\-to\-End Latency:__ p90 ≤ 1\.8 s, p95 ≤ 3\.0 s \(request to first token\)\. SLI: measured at edge, not just model time\.
- __Availability:__ 99\.5\-99\.9% \(model vendors dominate tails; track per\-provider SLI\)\. SLI: successful chats / total per provider\.

**Data Freshness:**

- __Webhook/Stream Deltas:__ p95 freshness ≤ 5 minutes, p99 ≤ 15 minutes \(event to ledger availability\)\. SLI: freshness histogram per provider\.
- __Scheduled Backfill:__ ≥ 99% jobs finish within schedule + 10 minutes daily\. SLI: on\-time job completion ratio\.

**Frontend Performance \(Core Web Vitals\):**

- __LCP:__ ≤ 2\.5 s \(p75 on 4G/mid\-tier mobile\)\.
- __INP:__ ≤ 100 ms \(p75\)\.
- __CLS:__ < 0\.1\.
- __Bundle Budget:__ Initial JS ≤ 250\-300 KB gzip; CSS ≤ 80 KB; strict code\-splitting\.

**Data Integrity & Durability:**

- __RPO:__ ≤ 5 minutes for transactional/ledger data\. SLI: replication lag\.
- __RTO:__ ≤ 60 minutes regional failover\. SLI: DR exercise recovery time\.

**Operational Responsiveness:**

- __P1 Incident Response:__ MTTA ≤ 15 minutes, MTTR ≤ 60 minutes\. SLI: time\-to\-ack/time\-to\-mitigate from alert fire\.

**Cost Guardrails:**

- __AI Cost Per Call:__ Set budget ceiling per provider; alert on forecast breaches\. SLI: rolling cost per call, per model\.

**Error Budgets & Alert Thresholds:**

- Error budget burn alerts at 2%, 10%, 25%, 50% of monthly budget\.
- >25% budget consumed → canary\-only deployments; >50% → freeze non\-urgent changes\.

### 7\.4 Environments & Observability

**Environment Matrix:**

- __Local:__ Docker Compose with emulators \(Postgres, Firestore Emulator, Pub/Sub Emulator\)\. Ports: Postgres 5433, Firestore 8080, Pub/Sub 8085, MCP Server 3000\.
- __Dev:__ GCP project `finity-dev`, region `us-central1`, Cloud Run services with `-dev` suffix\.
- __Stage:__ GCP project `finity-stage`, region `us-central1`, Cloud Run services with `-stage` suffix\.
- __Prod:__ GCP project `finity-prod`, regions `us-central1` \(primary\), `us-east1` \(DR\)\.

**Emulator Map:**

- Cloud SQL → Local Postgres \(port 5433\)
- Firestore → Firestore Emulator \(port 8080\)
- Pub/Sub → Pub/Sub Emulator \(port 8085\)
- Secret Manager → Local `.env` file
- Cloud Run → FastAPI server \(port 8001\)
- Frontend PWA → Vite dev server \(port 5175\)
- AI Models → Google AI Studio \(local dev\), Vertex AI \(cloud\)

**Observability Baseline:**

- __Logging:__ OpenTelemetry logs to Cloud Logging\. Log taxonomy: `{service, tier, feature, user_id, request_id}`\. Structured JSON format\.
- __Metrics:__ OpenTelemetry metrics to Cloud Monitoring\. Per\-provider SLIs \(Plaid, CEX, LLM\), per\-widget metrics via MCP\. Custom metrics for error budgets\.
- __Traces:__ OpenTelemetry traces for distributed request tracking\. Sampling: 100% errors, 10% successful requests\.
- __Alerting:__ Error budget burn alerts, latency p95/p99 breaches, availability drops, cost threshold breaches\. Alert owners assigned per service\.

### 8\.0 Security, Privacy & Encryption

#### 8\.1 Secrets Management

- __Flow:__ User submits Key $\\rightarrow$ API \(Memory Only\) $\\rightarrow$ Secret Manager\.
- __DB:__ Cloud SQL stores reference `projects/my-project/secrets/uid-coinbase/versions/1`.
- __Rotation:__ Automated rotation policies via Secret Manager\.

#### 8\.2 Privacy Pipeline \(The "Red Team" Standard\)

- __GLBA Compliance:__ Implementation of a formal Information Security Program \(ISP\)\.
- __Cryptographic Erasure \(RTBF\):__ On Signup: Create DEK\_UID in Cloud KMS\. On Log: Encrypt raw payload with DEK\_UID\. On Delete: Destroy DEK\_UID\. Physical Purge: A scheduled job hard\-deletes encrypted rows 24 hours after key destruction to ensure compliance with strict "Right to Erasure" interpretations\.

### 8\.3 Legal Acceptance Tracking

**Legal Document Acceptance:**

- __TOS/Privacy/AI Disclaimer:__ Acceptance tracked in Cloud SQL `users.legal_acceptances` JSONB column\. Fields: `{tos_version, privacy_version, ai_disclaimer_version, accepted_at, ip_address}`\.
- __UI Requirements:__ Click\-wrap mechanism with version display\. Acceptance required before access granted\. Denial blocks feature access\.
- __Counsel Approval Status:__ All legal documents require attorney review and approval before publication\. Approval status tracked in `legal/` directory metadata\.

### 9\.0 CI/CD & Infrastructure

#### 9\.0 Delivery & Quality Gates

**Branching & Release Policy:**

- __Branch Strategy:__ `main` branch for production releases\. Feature branches → PRs → `main`\. Release branches \(`release/*`\) for hotfixes\.
- __Merge Criteria:__ All PRs require: passing lint/format/typecheck, passing tests \(unit + integration\), contract validation \(OpenAPI\), code review approval, no error budget burn >25%\.

**CI/CD Pipeline Stages:**

1. __Lint & Format:__ Ruff \(Python\), ESLint/Prettier \(React\), Terraform fmt/validate\.
2. __Typecheck:__ mypy \(Python\), TypeScript compiler \(React\)\.
3. __Tests:__ Unit tests \(pytest, vitest\), contract tests \(OpenAPI validation\), integration tests \(emulators\)\.
4. __Build:__ Backend Docker → Artifact Registry, Frontend React Build → GCS Bucket\.
5. __Deploy:__ Dev environment auto\-deploys on merge to `main`\. Stage/Prod require manual approval\.
6. __Smoke Tests:__ E2E smoke tests \(dashboard + AI chat happy path\) post\-deploy\.
7. __Perf Sanity:__ Lighthouse CI for frontend, API latency checks for backend\.

**Testing Strategy:**

- __Unit Tests:__ >80% code coverage for business logic\. Mock external dependencies\.
- __Contract Tests:__ OpenAPI schema validation, request/response shape validation\.
- __Integration Tests:__ Real database \(local Postgres\), service\-to\-service communication \(FastAPI → Cloud SQL, FastAPI → Firestore Emulator\)\.
- __E2E Tests:__ Complete user workflows \(signup → link account → view transactions\), feature preview/paywall interactions, tier\-based access control\.
- __Perf Tests:__ Dashboard load time, AI chat round\-trip latency, transaction feed pagination\.

### 9\.1 Development Milestones

**M0: Foundation & Scaffolding**

- Repository structure \(frontend Vite/TS, backend FastAPI, shared types\)
- Toolchain setup \(Docker Compose, CI skeleton, env templates\)
- Feature registry YAML source + generation script
- Database schema migrations \(Cloud SQL, Firestore\)

**M1: Authentication & Base Infrastructure**

- Auth/session \(Firebase Auth, JWT validation\)
- Base UI shell \(React router, theme system, navigation\)
- Feature registry wired \(TS/Python modules, enforcement middleware\)
- Observability plumbed \(OpenTelemetry logging/metrics/traces\)

**M2: Aggregation & Unified Feed**

- Aggregation ingest \(bank/investment/Web3/CEX\) with freshness tracking
- Unified feed \(transactions, search, filter, pagination\)
- Audit logging \(Cloud SQL audit tables, log\-ledger\-archiver job\)

**M3: Budgets, Recurring & Notifications**

- Budget management \(limits, rollover, threshold alerts\)
- Recurring engine \(detection, flagging workflow\)
- Notification preferences \(per\-event toggles, quiet hours\)

**M4: AI Chat End\-to\-End**

- AI chat interface \(UI, streaming, error handling\)
- Policy enforcement \(quota checks, feature flags, cost caps\)
- Logging & encryption \(LLM logs with User DEK, audit trail\)
- Disclaimers & acceptance \(modal, tracking, access control\)

**M5: Marketplace & Developer Tools**

- Marketplace preview \(widget catalog, tier\-based access\)
- Developer SDK mock \(MCP tools, synthetic datasets\)
- Support portal mock \(ticket management interface\)
- MCP server implementation \(auth, tools, observability\)

**M6: Hardening & Launch Readiness**

- Performance optimization \(latency, bundle size, Core Web Vitals\)
- Security review \(penetration testing, vulnerability scanning\)
- SLO validation \(error budgets healthy, alerts configured\)
- Documentation complete \(API docs, deployment guides, runbooks\)

#### 9\.1 Pipeline \(Cloud Build\)

- __Lint & Format:__ Ruff \(Python\), ESLint/Prettier \(React\)\.
- __Security Scan:__ trivy fs \. \(Fail on secrets/vulns\)\.
- __Accessibility Scan:__ axe\-core on composite glass UI\. \(Fail on contrast < 4\.5:1\)\.
- __Test:__ Pytest \(Unit\) plus Postgres integration tests using the local Cloud SQL mirror container\.
- __Build:__ Backend: Docker $\\rightarrow$ Artifact Registry\. Frontend: React Build $\\rightarrow$ GCS Bucket\.
- __Deploy:__ gcloud run deploy \(Backend\)\. Invalidate Cloud CDN \(Frontend\)\.

#### 9\.1\.1 CI/CD & IaC Instantiation Requirements

**Before Development Begins:** The following infrastructure and automation must be instantiated \(created and configured\) to enable development workflows:

**CI/CD Pipeline Setup:**
- **Cloud Build Configuration:** Create `cloudbuild.yaml` in repository root with stages for lint, test, build, and deploy
- **GitHub Actions / Cloud Build Triggers:** Configure webhook triggers on `push` to `main` and `pull_request` events
- **Service Accounts:** Create dedicated service accounts for Cloud Build with minimal required permissions \(Cloud Run Deployer, Storage Admin, Artifact Registry Writer\)
- **Secrets Management:** Store API keys, database credentials, and OAuth tokens in Secret Manager; reference via `secretEnv` in Cloud Build config
- **Remote Config Flags:** Create Firebase Remote Config project and initialize required feature flags \(`ENABLE_GLOBAL_SYNC`, `ENABLE_AI_GATEWAY`, `MAINTENANCE_MODE`, `feature_preview.enabled`\)

**Infrastructure as Code \(IaC\) Instantiation:**
- **Terraform State Backend:** Create GCS bucket for Terraform state with versioning and KMS encryption enabled
- **State Locking:** Configure Cloud Storage backend with DynamoDB\-style locking \(via `terraform-state-lock` GCS bucket object or Cloud SQL table\)
- **Environment Scaffolding:** Run `terraform init` and `terraform workspace new dev/stage/prod` for each environment
- **Initial Infrastructure:** Apply base Terraform modules \(network, Cloud SQL, Cloud Run, load balancer\) to `dev` environment only
- **State Management:** Never commit `.tfstate` files; ensure `.gitignore` excludes all Terraform state and lock files

**Pre\-Development Checklist:**
- [ ] Cloud Build pipeline runs successfully on test commit
- [ ] Terraform state backend created and accessible
- [ ] Dev environment infrastructure provisioned \(VPC, Cloud SQL, Cloud Run services\)
- [ ] Secret Manager populated with required API keys
- [ ] Remote Config flags created and accessible via Firebase SDK
- [ ] CI pipeline validates feature registry YAML → TS/Python generation

**Note:** Production infrastructure should NOT be instantiated until security/compliance reviews are passed\. Dev environment instantiation is sufficient to begin development\.

#### 9\.2 Acceptance Criteria & Test Planning

**Purpose:** Define measurable "done" criteria and test coverage for each development slice to ensure features meet specifications before moving to the next slice\.

**Acceptance Criteria Format:** Each feature ticket must include:
- **Functional Requirements:** What the feature must do \(e\.g\., "GET /transactions returns paginated results filtered by date range"\)
- **Non\-Functional Requirements:** Performance, security, accessibility constraints \(e\.g\., "Response time < 200ms for 1000 transactions"\)
- **Edge Cases:** Error handling, boundary conditions \(e\.g\., "Returns 401 for unauthenticated requests, 403 for Free tier accessing Pro feature"\)
- **Integration Points:** Dependencies on other services/modules \(e\.g\., "Requires SubscriptionService to validate tier"\)
- **Definition of Done:** All criteria must pass before ticket is marked complete

**Test Plan Structure:**

**Unit Tests:**
- Test individual functions/services in isolation
- Mock external dependencies \(database, APIs, services\)
- Target: >80% code coverage for business logic

**Integration Tests:**
- Test API endpoints with real database \(local Postgres container\)
- Test service\-to\-service communication \(FastAPI → Cloud SQL, FastAPI → Firestore Emulator\)
- Test authentication/authorization flows

**End\-to\-End Tests:**
- Test complete user workflows \(signup → link account → view transactions\)
- Test feature preview/paywall interactions
- Test tier\-based access control

**First Development Slice Acceptance Criteria:**

**Slice 1: Authentication & Basic Account Management**

**Acceptance Criteria:**
1. User can sign up with email/password via Firebase Auth
2. User can log in and receive JWT token
3. `GET /me` returns user profile, tier \(defaults to 'free'\), and preferences
4. `PATCH /me/settings` updates theme/currency preferences
5. Unauthenticated requests to protected routes return 401
6. Invalid tokens return 401

**Test Plan:**
- **Unit:** Test `AuthService.validate_token()`, `UserService.get_profile()`
- **Integration:** Test `POST /auth/signup`, `POST /auth/login`, `GET /me` with valid/invalid tokens
- **E2E:** Complete signup → login → profile view flow

**Slice 2: Account Linking \(Read\-Only\)**

**Acceptance Criteria:**
1. `POST /accounts/link` initiates Plaid Link flow \(returns Link Token\)
2. `POST /accounts/exchange` stores access token in Secret Manager \(not database\)
3. `GET /accounts` returns list of linked accounts with masked account numbers
4. `DELETE /accounts/{id}` removes account and deletes Secret Manager secret
5. Free tier limited to 2 traditional accounts \(returns 403 if exceeded\)

**Test Plan:**
- **Unit:** Test `AccountService.link_account()`, `SecretManagerService.store_token()`
- **Integration:** Test account CRUD operations with tier enforcement
- **E2E:** Link account → view accounts → delete account flow

**Slice 3: Transactions Feed with Feature Preview**

**Acceptance Criteria:**
1. `GET /transactions` returns paginated transactions \(default 50 per page\)
2. Supports filtering by date range, category, account
3. Free tier sees transactions; Pro features \(advanced filters\) show preview overlay
4. `FeaturePreview` component blocks interactions, shows upgrade modal
5. Backend `require_feature()` dependency enforces tier requirements

**Test Plan:**
- **Unit:** Test `TransactionService.get_transactions()` with various filters
- **Integration:** Test `GET /transactions` with tier\-based feature gating
- **E2E:** Free user views transactions → clicks Pro feature → sees paywall modal

**Initial Development Tickets:**

1. **Setup:** Repository structure, Docker Compose local environment, CI pipeline scaffold
2. **Feature Registry:** YAML source, generator script, TS/Python modules, enforcement middleware
3. **Authentication:** Firebase Auth integration, JWT validation, user profile endpoints
4. **Account Linking:** Plaid integration \(sandbox\), Secret Manager storage, account CRUD
5. **Transactions Feed:** Transaction retrieval, filtering, pagination, tier enforcement
6. **Feature Preview UI:** React components, paywall modal, interaction blocking
7. **Database Schema:** Cloud SQL migrations, Firestore collections, seed data

**Ticket Format:** Each ticket should include title, description, acceptance criteria \(as above\), test plan outline, and estimated complexity \(story points\)\.

__Acronym__

__Definition__

__GDPR__

General Data Protection Regulation

__PII__

Personally Identifiable Information

__RTBF__

Right to Be Forgotten

__GLBA__

Gramm\-Leach\-Bliley Act

__WCAG__

Web Content Accessibility Guidelines

__FinCEN__

Financial Crimes Enforcement Network

__MSB__

Money Services Business


__CEX__

Centralized Exchange

__API__

Application Programming Interface

__LLM__

Large Language Model

__PWA__

Progressive Web App

__CDN__

Content Delivery Network

__HSTS__

HTTP Strict Transport Security

__GCP__

Google Cloud Platform

__QPS__

Queries Per Second

__ACID__

Atomicity, Consistency, Isolation, Durability

__PG__

PostgreSQL

__PK__

Primary Key

__FK__

Foreign Key

__UUID__

Universally Unique Identifier

__UID__

User Identifier


__RAG__

Retrieval\-Augmented Generation

__DEK__

Data Encryption Key

__KMS__

Key Management Service

__ISP__

Information Security Program

__CI/CD__

Continuous Integration / Continuous Deployment

### 11\.0 GCP Workflow Automation Architecture

Workflow automation for support tickets and operations is implemented using Google Cloud services rather than a separate workflow engine\.

**Deployment:**
- Platform: Google Cloud Run
- Orchestration: Cloud Workflows
- Database: Cloud SQL PostgreSQL \(same instance or separate\)
- Secrets: Google Secret Manager
- Integration: REST API calls to FastAPI backend

**Integration Method:**
- Cloud Workflows → FastAPI/Cloud Run: REST API calls \(GET /api/users/{uid}, GET /api/accounts/{uid}, etc\.\)
- FastAPI/Cloud Run → Cloud Workflows: Pub/Sub events or HTTP triggers from app events
- External Services → Cloud Run: Webhooks/APIs \(email via Gmail API/Google Workspace, Google Chat webhooks, etc\.\)

**Use Cases:**
- Support ticket automation \(email/app → ticket creation, categorization, routing\)
- Auto-responses for common issues
- Customer service workflows \(onboarding emails, account recovery\)
- SLA tracking and escalation
- Business operations automation \(backlog\)

**Google Workspace Integration:**
- Google Chat integration for team notifications to customer service representatives
- Customer Support Portal integration for non-technical customer service staff
- Workflow alerts routed to Google Chat channels
- Integration with Customer Support Portal for streamlined customer service operations

#### 11\.1 Access Request & Token Data Model

For the planning website and documentation access, Cloud SQL \(PostgreSQL\) stores access requests and issued tokens.

- **Table `access_requests`:**
	- `id` \(UUID, PK\)\.
	- `email` \(VARCHAR\(320\), indexed\)\.
	- `name` \(VARCHAR\(200\)\)\.
	- `role` \(VARCHAR\(32\)\) \(`lawyer`, `cpa`, `consultant`, `technical`, `other`\)\.
	- `requested_pages` \(JSONB\)\.
	- `status` \(VARCHAR\(32\)\) \(`pending`, `needs_review`, `approved`, `denied`, `expired`\)\.
	- `decision_reason` \(TEXT\)\.
	- `created_at`, `updated_at`, `decided_at` \(TIMESTAMPTZ\)\.
	- `token_jti` \(UUID, nullable\) → FK to `access_tokens.jti`\.
- **Table `access_tokens`:**
	- `jti` \(UUID, PK\)\.
	- `email` \(VARCHAR\(320\), indexed\)\.
	- `role` \(VARCHAR\(32\)\)\.
	- `allowed_pages` \(JSONB\)\.
	- `issued_at`, `expires_at` \(TIMESTAMPTZ\)\.
	- `superseded_by` \(UUID, nullable\)\.
	- `revoked` \(BOOLEAN\)\.
	- `revoked_reason` \(TEXT\)\.

JWTs are signed with `JWT_SECRET` from Secret Manager and include the `jti`, `sub`, `role`, `allowed_pages`, and `exp` claims\.

#### 11\.2 Access Request Workflow \(`/api/access/request`\)

The website Cloud Run backend exposes `POST /api/access/request` for external users to request access\.

- Validates input \(email, name, role, requested\_pages for `role = 'other'`\)\.
- Inserts a row into `access_requests` with `status = 'pending'`\.
- Publishes a Pub/Sub message to `access-requests` containing `{ "request_id", "email", "role" }`\.

Cloud Workflows `access-request-workflow`:

- Triggered by Eventarc on `access-requests`\.
- Calls `GET /approvals/requests/{id}` on the Approvals Service \(Cloud Run\)\.
- Auto\-approves trusted roles \(`lawyer`, `cpa`, `consultant`, `technical`\) via `POST /approvals/requests/{id}/approve` with a decision reason\.
- Marks others as `needs_review` and can notify via Google Chat webhooks\.

Approvals Service \(Cloud Run\):

- `GET /approvals/requests/{id}` – returns the `access_requests` row\.
- `POST /approvals/requests/{id}/approve` – creates an `access_tokens` row, updates `access_requests`, generates a JWT, and sends an approval email via Gmail API\.
- `POST /approvals/requests/{id}/deny` – updates `access_requests` to `denied` and optionally emails the requester\.

#### 11\.3 Token Refresh Workflow \(`/api/access/refresh`\)

The website backend exposes `GET /api/access/refresh` for short\-lived token refresh\.

- Validates the incoming JWT and extracts `jti`, `email`, `role`\.
- Publishes a message to `access-refresh-requests`\.

Cloud Workflows `token-refresh-workflow`:

- Triggered on `access-refresh-requests`\.
- Calls `POST /approvals/tokens/{jti}/refresh` on the Approvals Service\.
- The Approvals Service:
	- Validates the existing token row\.
	- Creates a new `access_tokens` row with a new `jti` and extended `expires_at`\.
	- Marks the old token as superseded\.
	- Generates a new JWT and sends email via Gmail API\.

### 12\.0 Customer Support Portal

The Customer Support Portal is a separate frontend/service with its own authentication, designed for customer service representatives who may or may not be technically inclined\. Hiring for customer service positions will not be based on coding skills\. The user\-facing application does not contain any admin links or references; users access support through the standard support page\.

**Purpose:**
- Support ticket management and resolution
- User account status viewing and management \(read\-only, minimal PII exposure\)
- Customer inquiry handling
- Integration with GCP workflow automation \(Cloud Workflows \+ Cloud Run\) for automated ticket processing
- Google Workspace \(Google Chat\) notifications for team alerts

**Key Features:**
- Simple, intuitive interface for non\-technical users
- Support ticket queue and assignment
- User account lookup and status \(masked PII, read\-only views\)
- Integration with GCP workflow automation \(Cloud Workflows \+ Cloud Run\)
- Google Chat notifications for new tickets and escalations
- Customer service workflow tools
- Canned response templates
- Ticket reassignment and escalation controls

**Security Requirements \(CIA Triad\):**

**Confidentiality:**
- Role\-based access control \(RBAC\): `support_agent` and `support_manager` roles only
- Minimal PII exposure: Only display necessary customer information; mask sensitive data \(e\.g\., partial email, masked account numbers\)
- Service\-to\-service authentication: mTLS or JWT tokens for backend API calls
- Private networking: VPC peering or Private Service Connect to backend services
- No access to user PII/AI logs beyond what is necessary for ticket resolution

**Integrity:**
- Append\-only audit logs: All actions logged to Cloud SQL `audit.support_portal_actions` table
- Dual\-control for destructive actions: Critical operations \(e\.g\., account suspension\) require manager approval
- CSRF protection: All state\-changing operations protected with CSRF tokens
- Signed event IDs: All ticket events include cryptographic signatures to prevent tampering
- Transaction integrity: Database transactions ensure atomic operations

**Availability:**
- Cloud Run autoscaling: Service scales based on request volume
- Health checks: Automated health monitoring and automatic restart on failure
- Per\-agent rate limiting: Prevent abuse and ensure fair resource allocation
- Circuit breakers: Automatic fallback when backend services are unavailable
- Redundant deployments: Multi\-region deployment for high availability

**Technical Requirements:**
- Separate frontend/service with its own authentication \(Workforce Identity Federation or Firebase Auth\)
- Integration with FastAPI backend for user data \(read\-only, scoped queries\)
- Integration with GCP workflow automation \(Cloud Workflows \+ Cloud Run\) for workflow automation
- Google Workspace \(Google Chat\) integration for team notifications
- Data storage: Firestore \(Datastore mode\) for tickets/comments, Cloud SQL for audit logs
- Audit/telemetry: Cloud Logging \+ log\-based metrics/alerts; selected logs exported to Cloud Storage for retention

**GCP Implementation:**

**Frontend:**
- Cloud Storage \+ Cloud CDN for static assets \(or small Cloud Run service for SSR\)
- Identity\-Aware Proxy \(IAP\) or Cloud Endpoints for authentication

**Backend:**
- Cloud Run service \(`support\-portal\-api`\) behind IAP/Endpoints
- RBAC enforcement at API layer
- Rate limiting per agent via Cloud Endpoints or Cloud Armor

**Identity:**
- Workforce Identity Federation or Firebase Auth for agent authentication
- IAP for console access
- Short\-lived tokens \(JWT with 1\-hour expiration\)

**Data Storage:**
- Firestore \(Datastore mode\) for tickets, comments, assignments
- Cloud SQL \(PostgreSQL\) for structured audit logs \(append\-only tables\)
- Cloud Storage \(CMEK encryption\) for ticket attachments \(signed URLs\)

**Agent Tracking & Accountability:**
- Agent identification: Each agent has a unique Company ID \(format: `INT-AGENT-YYYY-###`\) displayed in the portal UI
- All agent actions are logged to Cloud SQL `audit.support_portal_actions` table with:
	- Agent name and Company ID
	- Timestamp and action type \(view ticket, respond, reassign, escalate, etc\.\)
	- Ticket ID and customer reference \(masked\)
	- Action details \(response text, status changes, etc\.\)
- Customer quality ratings: After ticket resolution, customers can rate the agent's service \(1\-5 stars\) with optional feedback
- Internal management reviews: Managers can review agent performance, response times, and customer ratings
- Quality metrics dashboard: Aggregated metrics per agent \(average response time, customer satisfaction score, tickets resolved, escalation rate\)
- Audit trail: Complete immutable log of all agent actions for compliance and accountability

**Audit & Telemetry:**
- Cloud Logging \+ log\-based metrics/alerts for real\-time monitoring
- Selected logs exported to Cloud Storage \(lifecycle rules for retention\)
- Structured audit rows in Firestore/Cloud SQL \(append\-only, immutable\)

**Integrations:**
- Pub/Sub events for ticket state changes \(triggers workflows\)
- Optional Vertex AI triage with strict scoping \(no PII exposure\)
- Google Chat/Email webhooks for escalation notifications
- Secret Manager for API keys and credentials
- Private Service Connect or VPC peering for backend access

**User Experience:**
- Designed for customer service representatives without technical background
- Clear, simple interface with minimal technical jargon
- Workflow\-driven ticket management
- Automated routing and categorization driven by GCP workflow automation \(Cloud Workflows \+ Cloud Run\)

---

## Related Documents

This master technical specification relates to the following planning documents:

**Business Documents:**
- `Intellifide, LLC business plan.md` - Master business plan (product definition, compliance requirements)
- `Product-Roadmap.md` - Development timeline and milestones
- `Vendor-Relationships.md` - Vendor setup (GCP, Plaid, Stripe, etc.)
- `Budget-Financial-Planning.md` - Financial planning and GCP cost estimates
- `Developer-Payout-Structure.md` - Developer program payout structure (Section 2.4)

**Legal Documents:**
- `Terms-of-Service.md` - User terms (legal-first lifecycle requirement)
- `Privacy-Policy.md` - Privacy policy (privacy by design requirement)
- `AI-Assistant-Disclaimer.md` - AI disclaimer (Section 2.2, 2.3)
- `Developer-Agreement-Template.md` - Developer agreements (IP ownership requirement)
- `Compliance-Checklist.md` - Compliance requirements (GLBA, FinCEN, SEC)
- `WISP-Framework.md` - Security program framework (GLBA compliance)
- `IRP-Framework.md` - Incident response framework (GLBA compliance)

**App Development Guides:**
- `Local App Dev Guide.md` - Local development environment setup
- `AI Agent Framework.md` - AI agent implementation details (Section 2.2, 2.3)
- `Model Context Protocol Framework.md` - MCP framework implementation

**Technical Documentation:**
- `Security-Architecture.md` - Detailed security architecture (Section 1.0, 3.0)
- `Data-Flow-Diagrams.md` - Data flow architecture (Section 3.3, 3.4)
- `getting started gcp.md` - GCP infrastructure setup (Section 3.0)

**Last Updated:** December 07, 2025 at 08:39 PM
