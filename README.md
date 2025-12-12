<!-- Updated 2025-12-10 14:58 CST by ChatGPT -->
# Finity App

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-85%25-green)
![License](https://img.shields.io/badge/license-MIT-blue)

Finity is a modern financial management app that syncs bank data, tracks manual assets, surfaces AI-powered insights, and offers a marketplace for extensible widgets.

## Overview
- **Bank integration**: Plaid-powered sync for accounts and transactions.
- **Manual assets**: Track real estate, vehicles, crypto, and other holdings.
- **AI assistant**: Conversational guidance with spending summaries and budgeting tips.
- **Marketplace**: Developer-published widgets with ratings and payouts.
- **Support portal**: Ticketing and notifications for customers and support staff.

## Technology Stack
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Storybook
- **Backend**: FastAPI, Python 3.11, SQLAlchemy, Pydantic
- **Data**: PostgreSQL (Cloud SQL) plus Firestore
- **Auth**: Firebase Authentication
- **Infra**: Terraform on Google Cloud Platform

## Local Runtime (Docker-only)
All app services run via `docker-compose.yml`; the legacy local development doc has been removed.

### Quick Start
1. **Clone**
   ```bash
   git clone https://github.com/TCoder920x/finity-app.git
   cd finity-app
   ```
2. **Environment**
   - Create `.env` at the repo root with values for `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and any API keys (see `docker-compose.yml` for expected variables).
3. **Start stack**
   ```bash
   docker compose up -d --build
   ```
   Services:
   - Backend API: http://localhost:8001
   - Frontend: http://localhost:5175
   - Postgres: localhost:5433
   - Firebase emulators: Firestore 8080, Auth 9099, UI 4000
   - Pub/Sub emulator: 8085
4. **Agent Setup (MCP)**
   - Configure Cursor to connect to the **Postgres MCP** (`localhost:5433`) and **Postman MCP** (see details in `docs/Master App Dev Guide.md`).

## Developer Tools
- **Agent Skills:** Use the AI Agent to perform database seeding, integration verification, and state resets via the `Finity Dev Tools` MCP (exposed at `/mcp-dev`).
- **Tests (Host):**
   ```bash
   # Backend
   pip install -r backend/requirements.txt
   pytest backend/
   ```

## Contribution Guidelines
- Create a feature branch from `Dev`.
- Keep changes small; add tests and docs as needed.
- Run lint/tests before opening a PR (`pnpm lint && pnpm test` in frontend, `pytest` in backend).
- Use clear commit messages; avoid committing secrets or `.env`.

## License
MIT licensed — see [LICENSE](LICENSE) for details.
