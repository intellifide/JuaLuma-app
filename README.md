<!-- Updated 2025-12-10 14:58 CST by ChatGPT -->

# jualuma App

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![License](https://img.shields.io/badge/license-MIT-blue)

jualuma is a modern financial management app that syncs bank data, tracks manual assets, surfaces AI-powered insights, and offers a marketplace for extensible widgets.

## Overview

- **Bank integration**: Plaid-powered webhook-first, cursor-based auto-sync for accounts and transactions.
- **Manual assets**: Track real estate, vehicles, crypto, and other holdings.
- **AI assistant**: Conversational guidance with spending summaries and budgeting tips.
- **Marketplace**: Developer-published widgets with ratings and payouts.
- **Support portal**: Ticketing and notifications for customers and support staff.

## Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Storybook
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, Pydantic
- **Data**: PostgreSQL (Cloud SQL) and Google Cloud Firestore
- **Auth**: GCP Identity Platform (Native REST Implementation)
- **Infra**: Terraform on Google Cloud Platform

## Local Runtime (Docker-only)

All app services run via `docker-compose.yml`; the legacy local development doc has been removed.

### Quick Start

1. **Clone**
   ```bash
   git clone https://github.com/TCoder920x/jualuma-app.git
   cd jualuma-app
   ```
2. **Environment**
   - Copy `.env.example` to `.env`, then fill required values.
   - Active Web3 provider keys are Tatum-only (`TATUM_API_KEY`, `TATUM_BASE_URL`, retry/timeout settings).
   - Web3 provider contract and support boundaries are documented in `docs/Web3-History-Providers.md`.
3. **Start stack**

   ```bash
   docker compose up -d --build
   ```

   Services:
   - Backend API: http://localhost:8001
   - Frontend: http://localhost:5175
   - Postgres: localhost:5433

4. **Agent Setup (MCP)**
   - Configure the IDE to connect to the **Postgres MCP** (`localhost:5433`) and other MCP servers (see details in `docs/tech-stack.md`).

## Developer Tools

- **Agent Skills:** Use the AI Agent to perform database seeding, integration verification, and state resets via the `jualuma Dev Tools` MCP (exposed at `/mcp-dev`).
- **Tests (Host):**
  ```bash
  # Backend
  pip install -r backend/requirements.txt
  pytest backend/
  ```

## Contribution Guidelines

- Branch model:
  - `main` = production
  - `Dev` = development integration
  - `stage` = release candidate
- Create feature branches from `Dev`.
- Promote changes only by PR flow: `feature/*` -> `Dev` -> `stage` -> `main`.
- Keep changes small; add tests and docs as needed.
- Run lint/tests before opening a PR (`pnpm lint && pnpm test` in frontend, `pytest` in backend).
- Use clear commit messages; avoid committing secrets or `.env`.
- Promotion gate policy: `docs/stage-release-architecture.md`.
- Promotion checklist: `docs/stage-promotion-gates.md`.
- Rollback/incident runbook: `docs/stage-rollback-runbook.md`.
- Stage ingress/domain policy: `docs/stage-domain-policy.md`.
- Stage infra inventory: `docs/stage-infra-inventory.md`.

## License

PolyForm Noncommercial 1.0.0 — see [LICENSE](LICENSE) and [PolyForm-Noncommercial-1.0.0.txt](PolyForm-Noncommercial-1.0.0.txt) for details.
