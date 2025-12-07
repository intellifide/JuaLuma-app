
## Updated AI Agent Framework

### 1\. Core Backend \(FastAPI & Polyglot Logic\)

#### LLM Gateway Agent

- __Focus:__ Model orchestration & Privacy Pipeline for Gemini cloud models (Google AI Studio for local dev, Vertex AI for production)\.
- __Objective:__ Implement the ChatService pipeline:
	- Check Firestore for quota\.
	- RAG Injection: Pre\-fetch "Budget Status" and "Net Worth" to prepend to System Prompt\.
	- Encryption: Encrypt the __raw prompt__ and __raw response__ with the __User DEK__\.
	- Stream result to the Cloud SQL log ledger via `LogLedgerService`\.
- __Inputs:__ User prompt, tier, and user\_dek\_ref\.
- __Outputs:__ Secure orchestration code handling the full request/response lifecycle\.

- __Local Development Path (Google AI Studio):__
	- **Endpoint Configuration:** Use Google AI Studio Gemini 2.5 Flash API for local development.
	- **Base URL:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
	- **Authentication:** API key authentication via `AI_STUDIO_API_KEY` environment variable (stored in local `.env` file).
	- **Model:** `gemini-2.5-flash` (configurable via `GEMINI_MODEL` environment variable).
	- **Rate Limiting:** Implement client-side rate limiting and exponential backoff retry logic to respect free-tier limits (approximately 10 RPM, 250k TPM, 250 RPD). Log 429 rate limit errors for monitoring.
	- **Data Logging:** Ensure data logging is disabled in API requests (prompts/responses should not be stored or used for training by Google).
	- **RAG Context:** Uses local pgvector search for RAG injection (Vertex AI Vector Search not available in local dev; use Cloud SQL `transactions` table with `embedding` column for similarity search).
	- **Request Isolation:** Tag each request with authenticated `uid` and unique `session_id` (e.g., `{uid}-{timestamp}-{rand}`) in request metadata.

- __Production Path Details (Vertex AI Gemini & Vector Search):__
	- For Essential/Pro/Ultimate tiers, the ChatService MUST:
		- Validate or create a per\-user Vertex AI Vector Search index \(e\.g\., `finity-vector-index-{uid}`\) or a documented per\-user namespace.
		- Use that index/namespace to fetch only the authenticated user's financial context (Budget Status, Net Worth, etc\.) for RAG.
		- Tag each Vertex AI Gemini request with the authenticated `uid` and a unique `session_id` (e\.g\., `{uid}-{timestamp}-{rand}`\) via labels/metadata to enforce isolation.
		- Ensure that data logging is disabled on all Gemini endpoints so prompts/responses are not stored or used for training.
		- Encrypt raw prompts and responses with the User DEK before any storage or logging and stream only the encrypted, redacted payloads into Cloud SQL (`audit.llm_logs`) via `LogLedgerService`.
	- **Endpoint Configuration:** Use Vertex AI Gemini endpoints for production.
	- **Base URL:** `https://{location}-aiplatform.googleapis.com/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent`
	- **Authentication:** Service account credentials (Application Default Credentials or workload identity).
	- **Model:** Same model identifiers (`gemini-2.5-flash`, `gemini-2.5-pro`) but accessed via Vertex AI publisher endpoints.

- __Migration Strategy:__
	- The client implementation must use a configurable transport layer that allows swapping base URLs and authentication methods without refactoring call sites.
	- Environment variables (`APP_ENV=local|cloud`) control which pathway is used.
	- This ensures minimal code changes when moving from development to production.

#### Service Logic Agent

- __Focus:__ Business logic & Polyglot orchestration\.
- __Objective:__ Write service functions that route data to the correct store based on the __Mandated Storage Strategy__ and execute specific v2\.4 business rules\.
- __New Mandate:__
	- SubscriptionService: Implement __Texas SaaS Tax logic__ \($taxable\\\_amount = total \\times 0\.80$\)\.
- __Inputs:__ A business rule \(e\.g\., "Process subscription upgrade"\)\.
- __Outputs:__ Python logic using Cloud SQL \(Ledger\) and Firestore \(Metering\)\.

#### FastAPI Router Agent

- __Focus:__ Scaffolding API boilerplate\.
- __Objective:__ Generate APIRouter files in routers/ based on the v2\.4 API Surface\.
- __Inputs:__ Route path, method, and Pydantic models\.
- __Outputs:__ A \.py file with endpoint signatures, dependency injection \(e\.g\., Depends\(get\_current\_user\)\), and strict typing\.

#### Payout Agent

- __Focus:__ Widget monetization\.
- __Objective:__ Write Python logic for the Payout Calculation Service \(including the engagement score formula\) and manage the monthly ledgering process in Cloud SQL\.
- __Inputs:__ Monetization rules, engagement data schema\.
- __Outputs:__ Python logic for calculating __Engagement Score__ \($Downloads \\times Average\\ Rating\\ Score$\) and generating Cloud SQL inserts\.

### 2\. Database & Data \(Polyglot Architecture\)

#### Log Ledger Schema Agent

- __Focus:__ Analytics & Logs\.
- __Objective:__ Define the JSON schema for llm\_logs and audit\_log tables, ensuring strictly typed fields for the __encrypted__ raw\_prompt and raw\_response, and metadata\_json\.
- __Inputs:__ Log structure definitions\.
- __Outputs:__ bq command\-line definitions or Python TableSchema objects\.

#### PostgreSQL Schema Agent \(Ledger\)

- __Focus:__ Financial integrity\.
- __Objective:__ Generate __PostgreSQL DDL__ statements for Cloud SQL\.
- __Mandate:__ Must generate the __Mandatory Secondary Indexes__:
	- CREATE INDEX Idx\_Transactions\_Uid\_Ts\_Desc ON transactions\(uid, ts DESC\);
	- CREATE INDEX Idx\_Transactions\_Uid\_Category ON transactions\(uid, category\);
- __Inputs:__ Schema definitions for accounts, transactions, positions\.
- __Outputs:__ DDL scripts including table definitions, indexes, and pgvector extension setup\.

#### Firestore Design Agent \(Metering\)

- __Focus:__ High\-velocity schema design\.
- __Objective:__ Design the __Key__ structure for api\_usage, enrich\_cache, and the new __widget\_engagement__ collection to prevent hotspotting and track downloads and user ratings\.
- __Mandate:__ Ensure enrich\_cache uses a __Normalized Key__ \(lowercase, stripped whitespace\) to maximize cache hit rates\.
- __Inputs:__ Access patterns \(e\.g\., "Query usage by user per hour", "Query engagement by widget"\)\.
- __Outputs:__ Python code to create collections and helper functions to construct optimized Keys \(e\.g\., f"\{uid\}\#\{reverse\_timestamp\}"\)\.

#### SQLAlchemy Model Agent \(Metadata\)

- __Focus:__ Cloud SQL \(PostgreSQL\) models\.
- __Objective:__ Generate models\.py for low\-velocity relational data \(users, subscriptions, ai\_settings, and the new __developer\_payouts__ table\)\.
- __Inputs:__ Schema definitions for relational tables\.
- __Outputs:__ Python classes using SQLAlchemy DeclarativeBase\.

### 3\. Frontend \(React, PWA & Material UI\)

#### React Component Agent

- __Focus:__ Scaffolding strict Typescript components\.
- __Objective:__ Generate \.tsx files with defined interfaces\.
- __Inputs:__ Component name \(e\.g\., NetWorthCard\)\.
- __Outputs:__ Functional component skeleton\.

#### Material Glass Agent \(Engineered Glass\)

- __Focus:__ Implementing __Engineered Liquid Glass__\.
- __Objective:__ Create the Tailwind utility class glass\-panel\-default to achieve the "Engineered Vibrancy" standard\.
- __Mandate:__
	- backdrop\-filter: blur\(24px\) saturate\(150%\);
	- background\-color: rgba\(255, 255, 255, 0\.65\); \(Luminance Floor\)\.
- __Inputs:__ Unstyled JSX\.
- __Outputs:__ JSX with the specific glass\-panel\-default classes ensuring 4\.5:1 contrast\.

#### PWA Configuration Agent

- __Focus:__ Mobile\-first installability\.
- __Objective:__ Generate the manifest\.json and Service Worker logic \(workbox\) to make the app installable on iOS/Android\.
- __Inputs:__ App assets and icon paths\.
- __Outputs:__ Valid PWA configuration files\.

#### Frontend API Client Agent

- __Focus:__ Data fetching\.
- __Objective:__ Generate react\-query hooks\.
- __Inputs:__ API endpoints\.
- __Outputs:__ Hooks handling loading states, caching, and error boundaries\.

### 4\. GCP & DevOps

#### CI/CD Pipeline Agent

- __Focus:__ Cloud Build automation\.
- __Objective:__ Generate cloudbuild\.yaml enforcing the __4\-Stage Pipeline__\.
- __Mandate:__ Include the axe\-core step specifically configured to scan the __Composite Layer__ \(Glass \+ Background\) for contrast compliance\.
- __Inputs:__ Pipeline stages\.
- __Outputs:__ YAML configuration\.

#### GCP Integration Agent

- __Focus:__ Client library implementation\.
- __Objective:__ Write Python snippets for:
	- Secret Manager: Runtime retrieval of keys \(no caching\)\.
	- Pub/Sub: Publishing domain events\.
- __Inputs:__ Specific GCP task\.
- __Outputs:__ Secure, authenticated client code\.

### 5\. Testing & QA

#### Dynamic Contrast Auditor Agent

- __Focus:__ __Engineered Glass Compliance__\.
- __Objective:__ Configure axe\-core or custom script to analyze the __Computed Composite Layer__ \(Background \+ Blur \+ Text\) to ensure the contrast ratio is $\\ge$ 4\.5:1\.
- __Inputs:__ Rendered DOM state\.
- __Outputs:__ Pass/Fail report on text legibility over glass\.

#### Cloud SQL Emulator Agent

- __Focus:__ Integration testing\.
- __Objective:__ Write pytest fixtures that spin up a local PostgreSQL instance and seed it with test ledger data\.
- __Inputs:__ Test data requirements\.
- __Outputs:__ Fixture code ensuring tests don't hit production DBs\.

#### Playwright E2E Agent

- __Focus:__ Critical flow verification\.
- __Objective:__ Generate scripts for Onboarding, Account Linking, and Subscription upgrades\.
- __Inputs:__ User flow descriptions\.
- __Outputs:__ Typescript Playwright tests\.

### 6\. Security & Privacy \(The "Red Team" Layer\)

#### Crypto\-Erasure & Purge Agent

- __Focus:__ Right to be Forgotten \(RTBF\) & Physical Purging\.
- __Objective:__ Implement the __User DEK Lifecycle__:
	- create\_user\_dek\(uid\): Generate key in KMS\.
	- encrypt\_with\_dek\(data, uid\): Encrypt logs\.
	- destroy\_user\_dek\(uid\): The "Crypto\-Shred" function\.
- __Mandate:__ Schedule a __Cloud Run Job__ to physically DELETE Cloud SQL log rows and flag the corresponding Coldline Parquet files 24 hours after key destruction\.
- __Inputs:__ KMS configuration\.
- __Outputs:__ Python functions managing DEK lifecycles and Cloud Scheduler config\.

#### FinCEN Compliance Agent

- __Focus:__ Scope enforcement\.
- __Objective:__ Write middleware that validates every outgoing request to Plaid/CEX APIs to ensure __only__ read or view scopes are used\. Block any request attempting trade, move, or withdraw\.
- __Inputs:__ API Client code\.
- __Outputs:__ Validation logic/middleware\.

#### DLP Integration Agent \(REMOVED\)

### 7\. External Integrations

#### Stripe Tax Agent

- __Focus:__ Texas SaaS Compliance\.
- __Objective:__ Implement the Stripe logic via the SubscriptionService to apply tax to __80%__ of the gross amount \(utilizing the 20% exemption\)\.
- __Inputs:__ Stripe Product configuration\.
- __Outputs:__ Python code for Stripe Session creation with correct tax metadata\.

#### Plaid/CEX Link Agent

- __Focus:__ Secure Aggregation\.
- __Objective:__ Handle the exchange of public tokens for access tokens, immediately passing the token to the GCP Integration Agent for storage in __Secret Manager__ \(never DB\)\.
- __Inputs:__ Link callbacks\.
- __Outputs:__ Secure token handling logic\.

__Acronym__

__Definition__

__API__

Application Programming Interface 28282828

__RAG__

Retrieval\-Augmented Generation 29

__DEK__

Data Encryption Key 30

__DDL__

Data Definition Language 32323232

__DOM__

Document Object Model 33

__CI/CD__

Continuous Integration / Continuous Deployment 34

__GCP__

Google Cloud Platform 35

__DLP__

Data Loss Prevention 36

__KMS__

Key Management Service 37373737

__FinCEN__

Financial Crimes Enforcement Network 38

__LLM__

Large Language Model 39

__RTBF__

Right to Be Forgotten 40

---

## Related Documents

This AI Agent Framework relates to the following planning documents:

**App Development Guides:**
- `Master App Dev Guide.md` - Master technical specification (Section 2.2, 2.3: AI features)
- `Local App Dev Guide.md` - Local development setup (AI agent local development)
- `Model Context Protocol Framework.md` - MCP framework (MCP server integration)

**Legal Documents:**
- `AI-Assistant-Disclaimer.md` - AI Assistant disclaimer (legal requirements)
- `Terms-of-Service.md` - Terms of Service (AI Assistant provisions)
- `Privacy-Policy.md` - Privacy Policy (AI data handling)
- `Compliance-Checklist.md` - Compliance requirements (SEC compliance, Section 4.1)

**Business Documents:**
- `Intellifide, LLC business plan.md` - Business plan Section 2.2 (AI-Powered Data Analysis Tools)
- `Product-Roadmap.md` - Timeline for AI features

**Technical Documentation:**
- `Security-Architecture.md` - Security architecture (AI data security)
- `Data-Flow-Diagrams.md` - Data flow architecture (AI data flow)

**Last Updated:** December 05, 2025 at 01:34 AM
