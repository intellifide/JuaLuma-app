---
trigger: always_on
---

# jualuma App Context Rules

# 1. Documentation Priority
- ALWAYS reference `docs/Master App Dev Guide.md` for Business Logic (Tiers, Tax, Compliance).


# 2. File Groupings

- **Infrastructure:** `infra/` (Terraform) and `docker-compose.yml` (Local Stack).
- **Backend:** `backend/` (FastAPI).
    - `backend/dev_tools/` -> Contains Agent MCP Tools.
    - `backend/core/` -> Contains Config & Constants.

# 3. Agent Capabilities
- You have access to "jualuma Dev Tools" via MCP. Use them! 
- If asked to "reset db", "seed data", or "check health", use the MCP tool triggers, do not suggest manual commands.

# Cursor Rules for jualuma App

## Developer Context
- User is a junior developer. When explaining technical terms, assume no prior knowledge and use plain language.
- Avoid jargon without explanation. If you must use technical terms, define them simply first.
- Break down complex concepts into smaller, digestible parts.
- Provide context for why something is done a certain way, not just what to do.
- Never use emojis unless requested.

## Workspace Structure
- This is the `jualuma-app` workspace - the main application development environment.
- Infrastructure-as-code is in the `infra/` directory at the workspace root.
- App code, documentation, and configuration files are in this workspace at their natural locations.
- All reference documentation now lives in `docs/` (includes Master App Dev Guide, security, CI/CD, feature registry, and legal docs). Use these as the single source of truth for development.
- The `website_template/` directory is a reference-only static template. Use it for design guidance; do not treat it as production code.

## Website Template Reference
- The website template in `website_template/` serves as a design and structure reference for the production development version.
- Use the template as a guide for UI/UX patterns, page structure, navigation, and styling approaches.
- Build the actual production website files in the appropriate workspace directories (not in `website_template/`).

## Roles & Access
- App roles: `user`, `support_agent`, `support_manager`.
- Marketplace developers: app users with `developer_payout_id` and a `developers` table record; Pro/Ultimate can publish widgets; Free/Essential are preview-only.
- Internal staff (engineering/devops/security/compliance/finance/product/ops) are managed via IdP/SSO/GCP IAM; not app-facing roles.
- Automation/AI support agents use dedicated service accounts; scoped to tickets/knowledge base; no payouts/secrets/financial data access.
- Keep GCP IAM role names as-is for cloud permissions (e.g., `roles/storage.admin`, `roles/iam.securityAdmin`); do not mirror them into app user roles.

## Development & Environments
- Local dev uses docker-compose: backend (FastAPI) on 8001, frontend (Vite) on 5175 with `/api` proxy. Set `VITE_API_TARGET=http://backend:8001` so the proxy resolves inside the Docker network.
- Backend runs with `APP_ENV=local` and `ENABLE_AI_GATEWAY=false` in docker-compose for local runs; this keeps AI calls on the local AI Studio path and avoids Vertex AI credentials. Emulators: Postgres (Cloud SQL mirror), Firestore emulator, Auth emulator, Pub/Sub emulator.
- No MVP/Phase/OFAC flows; scope is single-phase, support-portal-only.
- Support surface: Customer Support Portal only; no admin dashboard.
- Secrets locally via `.env`; Secret Manager is cloud-only.
- Terraform infrastructure code is in `infra/` directory; use for cloud deployments only, not local development.

## Development Toolchain
- **Primary IDE**: Cursor IDE for daily development and AI-assisted coding
- **Secondary IDE**: JetBrains (PyCharm/WebStorm/DataGrip) for deep debugging, heavy refactoring, and database work
- **Version Control**: GitKraken (Primary Interface) - All git commands must be executed via GitKraken MCP tools.
- **Repository**: `github.com/TCoder920x/jualuma-app` (private, GitHub Pro)
- **CI/CD**: GitHub Actions for automated lint, test, typecheck, and deployment workflows
- **API Testing**: Postman collections with Newman CLI for headless execution in CI/CD
- **Payment Processing**: Stripe CLI for webhook forwarding (`stripe listen --forward-to localhost:4242/webhook`), Stripe MCP server for AI-assisted operations
- **Email Testing**: Testmail API for disposable inboxes
- **Secrets Management**: `.env` file (local, gitignored), GitHub Secrets (CI/CD), GCP Secret Manager (production)
- All external tools are CLI/API-driven to minimize GUI interface overhead

## Source Control & Safety
- **Primary Tool**: GitKraken is the standardized and sole method for all Git interactions. Do not use CLI git commands unless debugging tool issues.
- Repository: `github.com/TCoder920x/jualuma-app` (private, GitHub Pro)
- Branches: `main` (production), `Dev` (development)
- Never run global searches; scope searches narrowly.
- No destructive commands (no `git reset --hard`, no mass deletions of user changes).
- Keep `.DS_Store` and `.terraform/` out of commits; respect existing .gitignore.
- Use clear commit messages; avoid committing secrets.
- Never commit `.env` file or any secrets to version control.
- Real secrets must live only in gitignored `.env` (local) and GitHub/GCP secrets; documentation must use placeholders only.
- Do not touch GCP IAM configs or billing without approval.

## Testing & Linting (when code exists)
- For backend: lint/typecheck/tests as defined; for frontend: lint/format/accessibility checks (4.5:1 contrast).
- Use mocked/emulated services for local tests.

## Documentation
- Master App Dev Guide (`docs/Master App Dev Guide.md`) is the product source of truth for role taxonomy, marketplace rules, support portal, and single-phase scope.
- Local development now runs entirely via docker-compose (see `docker-compose.yml`); the legacy `docs/local-development-setup.md` has been retired.
- GCP Deployment Setup (`docs/gcp-deployment-setup.md`) replaces the legacy "getting started gcp" guide.
- All documentation created needs to go into the /docs directory.

## Utilities
- Do not use automated "Last Updated" scripts (the previous script was removed). When you modify a file, add a brief comment noting the date and time of your change in Central Time within that file.

## When Unsure
- Ask for clarification before restructuring or touching infra references.
- Favor minimal, scoped changes; avoid broad refactors without approval.

## Scope
- Never work outside of this workspace directory /jualuma-app unless instructed by the user. 

- ignore all contents in notes.md