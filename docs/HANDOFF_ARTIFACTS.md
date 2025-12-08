# Development Handoff Artifacts

This document lists all artifacts required to transition from planning to development.

## 1. Unified Scope Statement

**Location:** `docs/Master App Dev Guide.md` Section 2.0.0

Complete product scope including:
- Core aggregation & data features
- Unified experience features
- AI Assistant capabilities
- Marketplace & developer tools
- Support & operations
- Legal & compliance
- Mobile & distribution
- Backlog items (post-launch)

## 2. Feature Requirements Registry

**Location:** `docs/feature_requirements.yaml`

Source of truth for feature-to-tier mappings. Includes:
- Feature keys and tier requirements
- Preview enablement flags
- Account limits per tier
- Description for each feature

**Generation:** Run `python scripts/sync_feature_registry.py` to generate:
- TypeScript: `packages/shared/accessControl.ts`
- Python: `services/access_control/registry.py`

**Critical:** Never manually edit generated files. Always update YAML and regenerate.

## 3. API Contracts & Data Schemas

**OpenAPI Stubs:** To be created in `api/openapi.yaml`

Endpoints to document:
- Auth & User (`/me`, `/me/settings`)
- Accounts & Sync (`/accounts`, `/accounts/link`, `/accounts/exchange`, `/sync/run`, `/sync/status`)
- Financial Data (`/transactions`, `/budgets`, `/cashflow/forecast`, `/networth`, `/reports`)
- Widget & Developer (`/widgets/{id}/stats`, `/widgets/{id}/rating`, `/dev/payouts`)
- AI & Intelligence (`/chat`)
- Billing (`/subscription`, `/subscription/checkout`, `/stripe/webhook`)
- Support Portal (`/api/users/{uid}`, `/api/accounts/{uid}`, `/api/support/*`)

**Database Schemas:** Documented in `docs/Master App Dev Guide.md` Section 4.0

- Cloud SQL (PostgreSQL) schema DDL
- Firestore (Datastore Mode) collections
- Migration/versioning approach

## 4. SLO/SLI & Performance Targets

**Location:** `docs/Master App Dev Guide.md` Section 7.3

**SLOs Defined:**
- API Availability: 99.9% monthly
- API Latency: p95 ≤ 350 ms, p99 ≤ 700 ms (reads)
- Error Rate: ≤ 0.2% 5xx over 30 days
- AI Chat E2E: p90 ≤ 1.8 s, p95 ≤ 3.0 s
- Webhook Freshness: p95 ≤ 5 min, p99 ≤ 15 min
- Core Web Vitals: LCP ≤ 2.5 s, INP ≤ 100 ms, CLS < 0.1
- RPO: ≤ 5 minutes
- RTO: ≤ 60 minutes
- MTTA: ≤ 15 minutes, MTTR: ≤ 60 minutes

**Alert Thresholds:** Error budget burn at 2%, 10%, 25%, 50%

## 5. Environment Matrix & Emulator Map

**Location:** `docs/Master App Dev Guide.md` Section 7.4

**Environments:**
- Local: Docker Compose with emulators
- Dev: GCP project `finity-dev`, region `us-central1`
- Stage: GCP project `finity-stage`, region `us-central1`
- Prod: GCP project `finity-prod`, regions `us-central1` (primary), `us-east1` (DR)

**Emulator Ports:**
- Postgres: 5433
- Firestore: 8080
- Pub/Sub: 8085
- MCP Server: 3000
- FastAPI: 8001
- Vite: 5175

## 6. Observability Baseline

**Location:** `docs/Master App Dev Guide.md` Section 7.4

**Stack:**
- Logging: OpenTelemetry → Cloud Logging
- Metrics: OpenTelemetry → Cloud Monitoring
- Traces: OpenTelemetry distributed tracing
- Sampling: 100% errors, 10% successful requests

**Log Taxonomy:** `{service, tier, feature, user_id, request_id}`

**Per-Provider SLIs:** Plaid, CEX, LLM vendors tracked separately

**Per-Widget Metrics:** Via MCP server observability

## 7. MCP Server Catalog

**Location:** `docs/Master App Dev Guide.md` Section 2.4.1

**MCP Tools:**
- `getLedgerSlice` (filters: date, account, category)
- `getAccountsAndHoldings` (bank/investment/Web3/CEX, balances/positions)
- `getBudgetsAndRecurring` (budgets, progress, recurring items)
- `getPreviewDataset(featureKey)` (synthetic payloads keyed to feature registry)
- `invokeAIChat` (proxy with model routing, spend caps, logging)
- `getMetadata` (tiers, feature flags, limits for the widget)

**Auth Model:**
- Short-lived tokens scoped to widget/app ID + developer + tier
- Feature/tier gating from `feature_requirements.yaml`
- Rate limits and cost caps enforced

**Synthetic Datasets:**
- Beginner profile
- Power User profile
- Family profile
- Crypto-heavy profile
- Preview datasets per premium feature

**Versioning:** Explicit tool versions with deprecation windows

## 8. Security & Compliance

**Location:** `docs/Master App Dev Guide.md` Sections 1.0, 8.0, 8.3

**Non-Custodial Mandate:** Read-only operations enforced at all layers

**Secrets Management:** Secret Manager refs only, no secrets in code/env/DB

**Kill Switches:**
- `ENABLE_GLOBAL_SYNC`: Master switch for all sync operations
- `ENABLE_AI_GATEWAY`: Instantly reject all `/chat` requests
- `MAINTENANCE_MODE`: Read-only API mode

**Legal Acceptance Tracking:** Documented in Section 8.3

## 9. Delivery & Quality Gates

**Location:** `docs/Master App Dev Guide.md` Section 9.0

**Branching:** `main` + PRs, release branches for hotfixes

**CI/CD Stages:**
1. Lint & Format
2. Typecheck
3. Tests (unit, contract, integration)
4. Build
5. Deploy (dev auto, stage/prod manual)
6. Smoke Tests
7. Perf Sanity

**Testing Strategy:**
- Unit: >80% coverage
- Contract: OpenAPI validation
- Integration: Real DB, service-to-service
- E2E: Complete workflows
- Perf: Dashboard load, AI chat latency

## 10. Development Milestones

**Location:** `docs/Master App Dev Guide.md` Section 9.1

**M0: Foundation & Scaffolding**
- Repository structure
- Toolchain setup
- Feature registry
- Database schemas

**M1: Authentication & Base Infrastructure**
- Auth/session
- Base UI shell
- Feature registry wired
- Observability plumbed

**M2: Aggregation & Unified Feed**
- Aggregation ingest
- Unified feed
- Audit logging

**M3: Budgets, Recurring & Notifications**
- Budget management
- Recurring engine
- Notification preferences

**M4: AI Chat End-to-End**
- AI chat interface
- Policy enforcement
- Logging & encryption
- Disclaimers & acceptance

**M5: Marketplace & Developer Tools**
- Marketplace preview
- Developer SDK mock
- Support portal mock
- MCP server implementation

**M6: Hardening & Launch Readiness**
- Performance optimization
- Security review
- SLO validation
- Documentation complete

## 11. Related Documentation

**Primary Guides:**
- `docs/Master App Dev Guide.md` - Complete technical specification
- `docs/local-development-setup.md` - Local development setup
- `docs/gcp-deployment-setup.md` - GCP deployment setup

**Legal Documents:**
- `docs/legal/Terms-of-Service.md`
- `docs/legal/Privacy-Policy.md`
- `docs/legal/AI-Assistant-Disclaimer.md`

**Technical Documentation:**
- `docs/Security-Architecture.md`
- `docs/Data-Flow-Diagrams.md`

---

**Last Updated:** December 07, 2025 at 08:39 PM
