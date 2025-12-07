
## Updated Local Development Strategy \(v2\.4\)

### 1\. Architecture Mapping & Ports

The strategy is __Containerized Emulation__, replicating the GCP stack locally for zero cost\.

__Component__

__Production \(GCP\)__

__Local Mirror \(Docker\)__

Unified Ledger & Metadata

Cloud SQL \(PostgreSQL + pgvector\)

Standard PostgreSQL Image \(__Port 5433__\)

Metering/Cache

Firestore \(Datastore Mode\)

Firebase Emulator Suite \(Firestore\) \(__Port 8080__\)

Messaging

Pub/Sub

Google Pub/Sub Emulator \(__Port 8085__\)

Secrets

Secret Manager

Local \.env File

Backend API

Cloud Run \(FastAPI\)

Local FastAPI Server \(__Port 8001__\)

Frontend PWA

Cloud Storage \+ CDN

Local Vite Server \(__Port 5175__\)

AI Intelligence

Cloud Models (Vertex AI Gemini - Production)

Google AI Studio (Gemini 2.5 Flash - Local Development)

Workflow Automation

Cloud Run \(GCP workflow automation services, see Master App Dev Guide Section 11.0\)

Note: Ports 5173, 5174, 8000, and 9000 are explicitly avoided\.

### 2\. Setup Process

#### Step 1: Container Orchestration

Use Docker Compose to start the services that mirror the production stack:

- PostgreSQL 16 container (Cloud SQL mirror) with pgvector enabled.
- Firebase Emulator Suite (Firestore + Auth) on the documented ports.
- Pub/Sub Emulator.
- Local mock services (e.g., Approvals Service, Workflow HTTP stubs) to emulate Cloud Run/Workflows callbacks.

All containers must run on the same bridge network so the backend can connect via service names.

#### Step 2: Schema Bootstrapping

An Initialization Script \(Python\) must run automatically when containers start\.

This script must create the necessary Instances, Databases, Tables, and Indexes defined in the schema\.

The script must include:

- All PostgreSQL tables in the Standard PostgreSQL Image \(Port 5433\):
	- users \(including developer\_payout\_id field\)
	- developers \(New/Updated Table\)
	- developer\_payouts
	- subscriptions
	- ai\_settings
	- notification\_preferences
	- payments
	- accounts
	- transactions \(including embedding column for pgvector\)
	- positions
	- wallets
	- recurring
	- account\_assignments
	- manual\_assets
	- ledger\_hot\_free \(Free Tier hot window\)
	- ledger\_hot\_essential \(Essential Tier hot window\)
	- audit schema tables:
		- audit_log (append-only ledger for support/ops + notification events)
		- llm_logs (encrypted prompt/response columns + user_dek_ref)
		- feature_preview (blocked interaction telemetry written by `LogLedgerService`)
- The Idx\_Transactions\_Uid\_Ts\_Desc and Idx\_Transactions\_Uid\_Category Secondary Indexes in PostgreSQL\.
- The api\_usage, enrich\_cache, and widget\_engagement collections in Firestore Emulator \(Port 8080\)\.
- Seed "Dummy Data" \(e\.g\., a test user, mock subscription, test developer account\)\.
	- Test developer account should include: `users` record with `developer_payout_id` set, corresponding `developers` table record, and mock `developer_payouts` entries for testing payout flows\.
	- Test support accounts: `users` records with `role='support_agent'` or `role='support_manager'` for testing support portal workflows\.

### 3\. Development Workflow

#### Backend \(FastAPI\)

The app uses environment variables to toggle between "Cloud Mode" and "Local Mode"\.

Local Mode Logic must:

- Redirect Cloud SQL/Firestore clients to localhost ports\.
- Bypass Google IAM authentication\.
- Use the local \.env file for secrets instead of Secret Manager\.
- The /chat endpoint middleware must: check quota, check the ENABLE\_AI\_GATEWAY Feature Flag, inject RAG context via pgvector search, __encrypt the raw prompt/response__ with a mock __DEK\_UID__, and call Google AI Studio Gemini 2.5 Flash API (via API key authentication) for local development. The codebase must be structured to allow seamless switching to Vertex AI Gemini endpoints for production deployment with minimal code changes (primarily base URL and authentication method).
- **AI Studio Configuration (Local Development):**
	- **Base URL:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
	- **Model:** `gemini-2.5-flash` (set via `GEMINI_MODEL` environment variable)
	- **Authentication:** API key via `AI_STUDIO_API_KEY` environment variable (stored in local `.env` file)
	- **Rate Limiting:** Implement client-side rate limiting and exponential backoff retry logic to respect free-tier limits (approximately 10 RPM, 250k TPM, 250 RPD). Log 429 rate limit errors for monitoring.
	- **Data Logging:** Ensure data logging is disabled in API requests (prompts/responses should not be stored or used for training by Google).
	- **Production Migration Path:** The client implementation should use a configurable base URL and authentication method, allowing production code to swap to Vertex AI endpoints (`https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent`) and service account authentication without refactoring call sites.

#### Frontend \(React/PWA\)

Proxies API requests to the local backend \(localhost:8001\)\.

The build must run an Accessibility Scan \(axe\-core\) that fails if the "Engineered Liquid Glass" composite UI has a contrast ratio of $< 4\.5:1$\.

### 4\. Mocking External Services

__External Service__

__Strategy__

__Logic__

Banking \(Plaid\)

"Use Plaid's official ""Sandbox"" environment\."

"Use test credentials \(user\_good, pass\_good\) to return consistent, fake transaction data\.\."

Texas SaaS Tax

"Create a ""Mock Tax Calculator""\."

Hardcode the __80% taxable rule__ in a local function\.

__Payout Processor Mock__

__Python Mock Service\.__

__Logs the monthly payout attempt to the console; does not attempt a real transaction\.__

__Developer Marketplace Mock__

__Local Testing Setup\.__

__Seed test developer accounts with `developers` table records and `developer_payout_id` set\. Mock MCP server endpoints for widget publishing and payout dashboard access\. Test developer flows include: widget submission, tier-based access control \(Pro/Ultimate can publish\), payout calculation simulation, and engagement metrics tracking\.__

### 5\. Infrastructure as Code (IaC) Note

**Terraform Not Used Locally:**
- Terraform infrastructure management applies only to GCP cloud environments (prod, stage, dev)
- Local development uses Docker Compose for emulation (see Section 1: Architecture Mapping & Ports)
- No Terraform state or infrastructure code is executed during local development
- Local networking uses Docker bridge network (isolated from GCP VPC architecture)

**Production Infrastructure:**
- All GCP infrastructure is managed via Terraform (see `infra/` directory)
- Networking architecture (VPC, PSC, NAT, LB, Armor) exists only in cloud environments
- Local development bypasses cloud networking entirely via Docker emulation

### 6\. Workflow Automation Setup (GCP Services)

Workflow automation for support tickets and access requests will be handled by Google Cloud services \(Cloud Workflows and Cloud Run\)\. Local development must simulate these workflows using HTTP stubs and Dockerized mock services\.

**Local Responsibilities:**
- Implement a local `approvals-service` mock that:
	- Reads/writes to the local PostgreSQL instance for `access_requests` and `access_tokens`\.
	- Exposes:
		- `GET /approvals/requests/{id}`
		- `POST /approvals/requests/{id}/approve`
		- `POST /approvals/requests/{id}/deny`
		- `POST /approvals/tokens/{jti}/refresh`
	- Logs email\-like notifications to the console instead of calling Gmail API\.
- Update the website/backend service in local mode so that:
	- `POST /api/access/request` writes to the local database and calls the local Approvals Service directly or via a stubbed workflow\.
	- `GET /api/access/refresh` calls the local Approvals Service refresh endpoint directly\.
- Use a Pub/Sub emulator only if needed; for most local workflows, direct HTTP calls to the Approvals Service mock are sufficient\.

---

## Related Documents

This Local App Dev Guide relates to the following planning documents:

**App Development Guides:**
- `Master App Dev Guide.md` - Master technical specification (local development requirements)
- `AI Agent Framework.md` - AI agent implementation (local development setup)
- `Model Context Protocol Framework.md` - MCP framework (local MCP server setup)

**Technical Documentation:**
- `getting started gcp.md` - GCP setup (GCP emulator configuration)
- `Security-Architecture.md` - Security architecture (local security considerations)
- `Data-Flow-Diagrams.md` - Data flow architecture (local data flow)

**Business Documents:**
- `Product-Roadmap.md` - Timeline for development activities
- `Operational-Procedures.md` - Operational procedures (development workflows)

**Last Updated:** December 05, 2025 at 01:34 AM
