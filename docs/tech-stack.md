# Finity App - Technology Stack

**Last Updated:** December 7, 2025

---

## Overview

This document outlines the complete technology stack for the Finity financial aggregation and AI-powered planning platform, from local development through production deployment.

---

## Development Tools

### Primary IDE
- **Cursor IDE**: Primary development environment with AI assistance
  - Used for: Daily coding, AI-assisted development, quick iterations
  - Location: Local development machine

### Secondary IDE (Precision Tools)
- **JetBrains Suite** (Student License):
  - **PyCharm Professional**: Deep debugging, refactoring, database work for FastAPI backend
  - **WebStorm**: Advanced React/TypeScript development when needed
  - **DataGrip**: PostgreSQL/Cloud SQL database management and querying
  - Used for: Complex debugging, heavy refactoring, database schema work
  - Location: Local development machine

---

## Version Control & CI/CD

### Source Control
- **GitHub Pro** (Student Pack): Private repository hosting
  - Repository: `github.com/TCoder920x/finity-app`
  - Branches: `main` (production), `Dev` (development)
  - Access: Private repository with GitHub Pro benefits

### CI/CD Pipeline
- **GitHub Actions**: Automated testing, linting, and deployment
  - Workflows: Lint, test, typecheck, build validation
  - Secrets Management: GitHub repository secrets (never in code)
  - Status: Configured for automated checks on PRs

---

## Frontend Stack

### Framework & Build Tools
- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling with custom "Engineered Liquid Glass" theme
- **ECharts**: Financial charting and visualization

### Development
- **Port**: 5175 (Vite dev server)
- **Production**: Cloud Storage + Cloud CDN (GCP)

### Mobile
- **Progressive Web App (PWA)**: Service worker, manifest
- **Capacitor 6**: Native iOS/Android packaging
- **Distribution**: App Store, Google Play

---

## Backend Stack

### Runtime & Framework
- **Python 3.11+**: Runtime
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server

### Development
- **Port**: 8001 (local FastAPI server)
- **Production**: Cloud Run (GCP)

### Database
- **PostgreSQL 16 + pgvector**: Primary database
  - Local: Docker container (port 5433)
  - Production: Cloud SQL (GCP)
  - Extensions: pgvector for RAG embeddings, pgcrypto for encryption

### NoSQL / Cache
- **Firestore (Datastore Mode)**: High-velocity metering, caching
  - Local: Firebase Emulator Suite (port 8080)
  - Production: Firestore Datastore Mode (GCP)

### Messaging
- **Pub/Sub**: Event-driven architecture
  - Local: Pub/Sub Emulator (port 8085)
  - Production: Cloud Pub/Sub (GCP)

---

## AI & Machine Learning

### Local Development
- **Google AI Studio**: Gemini 2.5 Flash API
  - Authentication: API key via `AI_STUDIO_API_KEY`
  - Model: `gemini-2.5-flash`
  - Rate Limits: Client-side throttling (~10 RPM, 250k TPM, 250 RPD)

### Production
- **Vertex AI**: Gemini models
  - Models: Gemini 2.5 Flash (Essential/Pro), Gemini 2.5 Pro (Ultimate)
  - Authentication: Service account credentials
  - RAG: Vertex AI Vector Search (Essential/Pro/Ultimate tiers)
  - Encryption: User DEK for prompt/response encryption

### ML Pipeline
- **Vertex AI Pipelines**: Categorization model training
- **Vertex AI Prediction**: Model serving endpoint
- **pgvector**: RAG embeddings storage and retrieval

---

## Third-Party Integrations

### Financial Data
- **Plaid**: Bank and investment account aggregation
  - Environment: Sandbox (local), Production (cloud)
  - APIs: Transactions, Investments, Link

### Payment Processing
- **Stripe**: Subscription billing and payment processing
  - MCP Server: Stripe MCP server for AI-assisted operations
  - CLI: Stripe CLI for webhook forwarding (`stripe listen --forward-to localhost:4242/webhook`)
  - Keys: Test keys configured in `.env`
  - Webhook Secret: Configured per endpoint in Stripe Dashboard

### Email Testing
- **Testmail**: Disposable email addresses for testing
  - API Key: Configured in `.env`
  - Usage: Email flow testing (signup, password reset, receipts)

### API Testing
- **Postman**: API collection management and testing
  - Newman CLI: Headless collection execution for CI/CD
  - API Key: Configured in `.env`
  - Collections: Exported to repository for version control

---

## Infrastructure (GCP)

### Compute
- **Cloud Run**: Serverless container hosting (FastAPI backend)
- **Cloud Functions (Gen2)**: Event-driven functions
- **Cloud Run Jobs**: Scheduled tasks (sync, archiving, pruning)

### Storage
- **Cloud SQL (PostgreSQL)**: Primary database with HA
- **Firestore (Datastore Mode)**: NoSQL metering and cache
- **Cloud Storage**: Static assets, PWA hosting, Coldline archives
- **Secret Manager**: API keys, OAuth tokens, credentials

### Networking
- **VPC**: Private networking with subnets
- **Private Service Connect**: Google APIs access
- **Cloud NAT**: Internet egress
- **Global HTTPS Load Balancer**: Ingress with Cloud Armor WAF
- **Cloud CDN**: Static asset delivery

### Monitoring & Logging
- **Cloud Logging**: Application and infrastructure logs
- **Cloud Monitoring**: Metrics, alerts, SLO tracking
- **Security Command Center**: Security scanning

### CI/CD
- **Cloud Build**: Container builds (if needed)
- **Artifact Registry**: Container images
- **GitHub Actions**: Primary CI/CD pipeline

---

## Local Development Environment

### Emulators & Mocks
- **PostgreSQL**: Docker container (port 5433)
- **Firebase Emulator Suite**: Firestore (8080), Auth (9099)
- **Pub/Sub Emulator**: Port 8085
- **FastAPI**: Local server (port 8001)
- **Vite**: Dev server (port 5175)

### Secrets Management
- **Local**: `.env` file (gitignored)
- **Cloud**: GCP Secret Manager

### Environment Variables
- See `.env.example` for required variables
- Never commit `.env` to version control

---

## Testing Tools

### API Testing
- **Postman + Newman**: Collection-based API testing
  - Local: Manual collection runs
  - CI/CD: Newman CLI execution

### Email Testing
- **Testmail**: Disposable inboxes for email flow validation

### Code Quality
- **Ruff**: Python linting
- **mypy**: Python type checking
- **ESLint/Prettier**: Frontend linting/formatting
- **Codecov** (optional): Coverage reporting

---

## Security & Compliance

### Encryption
- **Cloud KMS**: Key management for User DEKs
- **pgcrypto**: Database-level encryption
- **TLS 1.3**: All external communications

### Secrets
- **Secret Manager**: Production secrets
- **`.env`**: Local development secrets (gitignored)
- **GitHub Secrets**: CI/CD secrets

### Compliance
- **GLBA**: Security program alignment
- **GDPR**: Privacy by design, Right to be Forgotten
- **FinCEN**: Non-custodial/read-only mandate

---

## Development Workflow

### Daily Development
1. **Cursor IDE**: Primary coding environment with AI assistance
2. **Local Emulators**: Docker Compose for services
3. **FastAPI**: Backend development on port 8001
4. **Vite**: Frontend development on port 5175

### Debugging & Precision Work
1. **JetBrains**: Switch to PyCharm/WebStorm/DataGrip for complex tasks
2. **Database**: DataGrip for schema work and queries

### Testing
1. **Postman**: API endpoint testing with collections
2. **Newman**: Automated collection runs in CI/CD
3. **Testmail**: Email flow validation

### CI/CD
1. **GitHub Actions**: Automated lint, test, typecheck on PRs
2. **Codecov** (optional): Coverage gates
3. **Deployment**: Manual approval for production

---

## Tool Integration Summary

### CLI/API-Driven Tools (No GUI Required)
- ✅ **GitHub Actions**: CI/CD via workflows
- ✅ **Postman/Newman**: CLI execution
- ✅ **Stripe CLI/MCP**: Terminal commands and MCP server
- ✅ **Testmail**: API-based email testing
- ✅ **Codecov**: CI integration (status checks only)

### Desktop Applications
- ✅ **Cursor IDE**: Primary development
- ✅ **JetBrains**: Precision debugging/refactoring
- ✅ **Stripe CLI**: Webhook forwarding

### Set-and-Forget Services
- ✅ **Imgbot**: Automatic image optimization (GitHub App)

---

## Notes

- All secrets are stored in `.env` (local) or GitHub Secrets / GCP Secret Manager (cloud)
- Never commit secrets to version control
- Use `.env.example` as a template for required variables
- GitHub repository is private (GitHub Pro benefit)
- All external tools are CLI/API-driven to minimize GUI interfaces

---

**Repository**: `github.com/TCoder920x/finity-app`  
**Primary IDE**: Cursor  
**CI/CD**: GitHub Actions  
**Cloud Provider**: GCP only
