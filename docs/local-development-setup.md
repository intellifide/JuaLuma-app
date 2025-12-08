# Finity App - Local Development Setup Guide

**Status:** Currently in Local Development Phase  

---

## Overview

This guide walks you through setting up the Finity application for local development. We use Docker containers to emulate the Google Cloud Platform (GCP) services, allowing you to develop and test without incurring cloud costs.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (latest version)
- **Docker Compose** (v2.0+)
- **Python** (3.11+)
- **Node.js** (v20+) and **pnpm** (v8+)
- **Git**
- **Google AI Studio API Key** (for local AI features)

---

## Architecture Overview

### Local vs Production Mapping

| Component | Production (GCP) | Local Mirror (Docker) | Port |
|-----------|------------------|----------------------|------|
| Unified Ledger & Metadata | Cloud SQL (PostgreSQL + pgvector) | PostgreSQL 16 | 5433 |
| Metering/Cache | Firestore (Datastore Mode) | Firebase Emulator Suite | 8080 |
| Messaging | Pub/Sub | Pub/Sub Emulator | 8085 |
| Secrets | Secret Manager | Local `.env` file | N/A |
| Backend API | Cloud Run (FastAPI) | Local FastAPI Server | 8001 |
| Frontend PWA | Cloud Storage + CDN | Vite Dev Server | 5175 |
| AI Intelligence | Vertex AI Gemini | Google AI Studio | N/A |
| MCP Server | Cloud Run | Local MCP Server | 3000 |

**Note:** Ports 5173, 5174, 8000, and 9000 are explicitly avoided to prevent conflicts.

---

## Phase 1: Initial Setup

### Step 1: Clone Repository

```bash
cd ~/Projects
git clone <repository-url> finity-app
cd finity-app
```

### Step 2: Create Environment File

Create a `.env` file in the project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://finity_user:finity_password@localhost:5433/finity_db
POSTGRES_USER=finity_user
POSTGRES_PASSWORD=finity_password
POSTGRES_DB=finity_db

# Firebase Emulator Configuration
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
PUBSUB_EMULATOR_HOST=localhost:8085

# Application Configuration
APP_ENV=local
API_PORT=8001
FRONTEND_PORT=5175
MCP_SERVER_PORT=3000

# Google AI Studio Configuration (Local Development)
AI_STUDIO_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
AI_STUDIO_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# Feature Flags (Local Development)
ENABLE_GLOBAL_SYNC=true
ENABLE_AI_GATEWAY=true
MAINTENANCE_MODE=false

# Plaid Configuration (Sandbox)
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox

# JWT Configuration (Local Development)
JWT_SECRET=local_development_secret_change_in_production

# Rate Limiting (Local Development - Relaxed)
AI_RATE_LIMIT_RPM=10
AI_RATE_LIMIT_TPM=250000
AI_RATE_LIMIT_RPD=250

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_replace_in_env_only
STRIPE_SECRET_KEY=sk_test_replace_in_env_only
STRIPE_WEBHOOK_SECRET=whsec_replace_in_env_only
# Stripe webhook listener (run separately): stripe listen --forward-to localhost:4242/webhook

# Postman Configuration (for Newman CLI)
POSTMAN_API_KEY=your_postman_api_key_here

# Testmail Configuration
TESTMAIL_API_KEY=your_testmail_api_key_here
```

**Important:** 
- Replace `your_api_key_here` with your actual Google AI Studio API key
- Replace Plaid credentials with your sandbox credentials
- Never commit the `.env` file to version control

### Step 3: Create Docker Compose Configuration

Create `docker-compose.yml` in the project root:

```yaml
version: '3.9'

services:
  # PostgreSQL (Cloud SQL Mirror)
  postgres:
    image: pgvector/pgvector:pg16
    container_name: finity-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - finity-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Firebase Emulator Suite
  firebase-emulator:
    image: gcr.io/google.com/cloudsdktool/google-cloud-cli:latest
    container_name: finity-firebase-emulator
    command: >
      bash -c "
        gcloud components install beta firebase-emulator-suite --quiet &&
        firebase emulators:start --only firestore,auth --project finity-local
      "
    ports:
      - "8080:8080"  # Firestore
      - "9099:9099"  # Auth
      - "4000:4000"  # Emulator UI
    volumes:
      - ./firebase.json:/workspace/firebase.json
      - firebase_data:/workspace/.firebase
    networks:
      - finity-network
    environment:
      - FIRESTORE_EMULATOR_HOST=0.0.0.0:8080

  # Pub/Sub Emulator
  pubsub-emulator:
    image: gcr.io/google.com/cloudsdktool/google-cloud-cli:latest
    container_name: finity-pubsub-emulator
    command: >
      gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
    ports:
      - "8085:8085"
    networks:
      - finity-network
    environment:
      - PUBSUB_EMULATOR_HOST=0.0.0.0:8085

volumes:
  postgres_data:
  firebase_data:

networks:
  finity-network:
    driver: bridge
```

### Step 4: Create Firebase Configuration

Create `firebase.json` in the project root:

```json
{
  "emulators": {
    "firestore": {
      "port": 8080,
      "host": "0.0.0.0"
    },
    "auth": {
      "port": 9099,
      "host": "0.0.0.0"
    },
    "ui": {
      "enabled": true,
      "port": 4000,
      "host": "0.0.0.0"
    }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

---

## Phase 2: Database Schema Setup

### Step 1: Create Database Initialization Script

Create `scripts/init-db.sql`:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(128) PRIMARY KEY,
    email VARCHAR(320) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support_agent', 'support_manager')),
    theme_pref VARCHAR(32) DEFAULT 'glass',
    currency_pref VARCHAR(3) DEFAULT 'USD',
    developer_payout_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Developers table
CREATE TABLE IF NOT EXISTS developers (
    uid VARCHAR(128) PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
    payout_method JSONB,
    payout_frequency VARCHAR(32) CHECK (payout_frequency IN ('monthly', 'quarterly')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Developer payouts table
CREATE TABLE IF NOT EXISTS developer_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL,
    dev_uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    gross_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
    payout_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(month, dev_uid)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    plan VARCHAR(32) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'essential', 'pro', 'ultimate')),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    renew_at TIMESTAMPTZ,
    ai_quota_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(uid)
);

-- AI settings table
CREATE TABLE IF NOT EXISTS ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'vertex-ai',
    model_id VARCHAR(64) NOT NULL DEFAULT 'gemini-2.5-flash',
    user_dek_ref VARCHAR(256),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(uid)
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    event_key VARCHAR(64) NOT NULL,
    channel_email BOOLEAN DEFAULT true,
    channel_sms BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(uid, event_key)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(128),
    stripe_sub_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    account_type VARCHAR(32) NOT NULL CHECK (account_type IN ('traditional', 'investment', 'web3', 'cex', 'manual')),
    provider VARCHAR(64),
    account_name VARCHAR(256),
    account_number_masked VARCHAR(32),
    balance NUMERIC(18,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    secret_ref VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions table with pgvector embedding
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category VARCHAR(64),
    merchant_name VARCHAR(256),
    description TEXT,
    raw_json JSONB,
    embedding vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_uid_ts_desc ON transactions(uid, ts DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_uid_category ON transactions(uid, category);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Ledger hot windows for Free and Essential tiers
CREATE TABLE IF NOT EXISTS ledger_hot_free (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL,
    account_id UUID NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category VARCHAR(64),
    raw_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_hot_free_uid_ts ON ledger_hot_free(uid, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_hot_free_account ON ledger_hot_free(account_id);

CREATE TABLE IF NOT EXISTS ledger_hot_essential (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL,
    account_id UUID NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category VARCHAR(64),
    raw_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_hot_ess_uid_ts ON ledger_hot_essential(uid, ts DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_hot_ess_account ON ledger_hot_essential(account_id);

-- Manual assets table
CREATE TABLE IF NOT EXISTS manual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    asset_type VARCHAR(32) NOT NULL CHECK (asset_type IN ('house', 'car', 'collectible')),
    name VARCHAR(256) NOT NULL,
    value NUMERIC(18,2) NOT NULL,
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support agents table
CREATE TABLE IF NOT EXISTS support_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(256) NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('support_agent', 'support_manager')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit schema tables
CREATE TABLE IF NOT EXISTS audit.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_uid VARCHAR(128) NOT NULL,
    target_uid VARCHAR(128),
    action VARCHAR(128) NOT NULL,
    source VARCHAR(32) NOT NULL CHECK (source IN ('frontend', 'backend', 'workflow')),
    metadata_json JSONB NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS audit.feature_preview (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    uid VARCHAR(128) NOT NULL,
    feature_key VARCHAR(128) NOT NULL,
    tier VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    metadata_json JSONB NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS audit.llm_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    uid VARCHAR(128) NOT NULL,
    model VARCHAR(64) NOT NULL,
    encrypted_prompt BYTEA NOT NULL,
    encrypted_response BYTEA NOT NULL,
    tokens INT NOT NULL,
    user_dek_ref VARCHAR(256) NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS audit.support_portal_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    agent_id UUID NOT NULL,
    agent_company_id VARCHAR(32) NOT NULL,
    agent_name VARCHAR(256) NOT NULL,
    ticket_id VARCHAR(128) NOT NULL,
    customer_uid VARCHAR(128),
    action_type VARCHAR(64) NOT NULL,
    action_details JSONB NOT NULL,
    ip_address VARCHAR(45),
    archived BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS support_ticket_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(128) UNIQUE NOT NULL,
    agent_id UUID NOT NULL,
    customer_uid VARCHAR(128) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on audit tables
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.feature_preview ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.llm_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.support_portal_actions ENABLE ROW LEVEL SECURITY;

-- Seed test data
INSERT INTO users (uid, email, role, theme_pref, currency_pref) VALUES
    ('test-user-1', 'test@example.com', 'user', 'glass', 'USD'),
    ('test-dev-1', 'developer@example.com', 'user', 'glass', 'USD'),
    ('test-agent-1', 'agent@example.com', 'support_agent', 'glass', 'USD'),
    ('test-manager-1', 'manager@example.com', 'support_manager', 'glass', 'USD')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO subscriptions (uid, plan, status) VALUES
    ('test-user-1', 'free', 'active'),
    ('test-dev-1', 'pro', 'active'),
    ('test-agent-1', 'free', 'active'),
    ('test-manager-1', 'free', 'active')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO developers (uid, payout_frequency) VALUES
    ('test-dev-1', 'monthly')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO support_agents (company_id, name, email, role) VALUES
    ('INT-AGENT-2025-001', 'Test Agent', 'agent@example.com', 'support_agent'),
    ('INT-AGENT-2025-002', 'Test Manager', 'manager@example.com', 'support_manager')
ON CONFLICT (company_id) DO NOTHING;
```

---

## Phase 3: Backend Setup

### Step 1: Install Python Dependencies

Create `requirements.txt`:

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-dotenv==1.0.0
psycopg2-binary==2.9.9
sqlalchemy==2.0.25
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
google-cloud-firestore==2.14.0
google-cloud-pubsub==2.19.0
google-cloud-secret-manager==2.17.0
google-generativeai==0.3.2
pgvector==0.2.4
plaid-python==17.0.0
httpx==0.26.0
pytest==7.4.4
pytest-asyncio==0.23.3
ruff==0.1.14
mypy==1.8.0
```

Install dependencies:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Create Backend Directory Structure

```bash
mkdir -p backend/{api,services,models,middleware,utils}
touch backend/__init__.py
touch backend/api/__init__.py
touch backend/services/__init__.py
touch backend/models/__init__.py
touch backend/middleware/__init__.py
touch backend/utils/__init__.py
```

### Step 3: Create Main FastAPI Application

Create `backend/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Finity API",
    description="Financial aggregation and AI-powered planning platform",
    version="0.1.0"
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Finity API",
        "environment": os.getenv("APP_ENV", "unknown"),
        "version": "0.1.0"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual health checks
        "firestore": "connected",
        "pubsub": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("API_PORT", 8001)),
        reload=True
    )
```

---

## Phase 4: Frontend Setup

### Step 1: Install Frontend Dependencies

Create `package.json`:

```json
{
  "name": "finity-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5175",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "firebase": "^10.7.2",
    "echarts": "^5.4.3",
    "echarts-for-react": "^3.0.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.33",
    "prettier": "^3.2.4",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vitest": "^1.2.1"
  }
}
```

Install dependencies:

```bash
pnpm install
```

### Step 2: Create Frontend Directory Structure

```bash
mkdir -p frontend/src/{components,pages,services,hooks,utils,types,styles}
```

### Step 3: Create Vite Configuration

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      }
    }
  }
})
```

### Step 4: Create Tailwind Configuration

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'royal-purple': '#6B46C1',
        'deep-indigo': '#4C1D95',
        'aqua': '#06B6D4',
      },
      backdropBlur: {
        'glass': '24px',
      },
    },
  },
  plugins: [],
}
```

---

## Phase 5: Running the Local Environment

### Step 1: Start Docker Services

```bash
# Start all containers
docker-compose up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 2: Verify Database Initialization

```bash
# Connect to PostgreSQL
docker exec -it finity-postgres psql -U finity_user -d finity_db

# Check tables
\dt
\dt audit.*

# Check seed data
SELECT * FROM users;
SELECT * FROM subscriptions;

# Exit psql
\q
```

### Step 3: Start Backend Server

```bash
# Activate virtual environment
source venv/bin/activate

# Run FastAPI server
cd backend
python main.py
```

The API should be available at `http://localhost:8001`

### Step 4: Start Frontend Server

```bash
# In a new terminal
cd frontend
pnpm dev
```

The frontend should be available at `http://localhost:5175`

### Step 5: Access Emulator UIs

- **Firebase Emulator UI:** http://localhost:4000
- **API Documentation:** http://localhost:8001/docs
- **Frontend Application:** http://localhost:5175

---

## Phase 6: Testing the Setup

### Test 1: Database Connection

```bash
curl http://localhost:8001/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "firestore": "connected",
  "pubsub": "connected"
}
```

### Test 2: Frontend-Backend Connection

Open `http://localhost:5175` in your browser and check the browser console for any connection errors.

### Test 3: AI Studio Connection

Create a test script `test_ai.py`:

```python
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Configure AI Studio
genai.configure(api_key=os.getenv("AI_STUDIO_API_KEY"))

# Test connection
model = genai.GenerativeModel('gemini-2.5-flash')
response = model.generate_content("Hello, this is a test.")
print(response.text)
```

Run:
```bash
python test_ai.py
```

---

## Phase 7: Development Workflow

### Daily Workflow

1. **Start Docker containers:**
   ```bash
   docker-compose up -d
   ```

2. **Start backend:**
   ```bash
   source venv/bin/activate
   cd backend
   python main.py
   ```

3. **Start frontend:**
   ```bash
   cd frontend
   pnpm dev
   ```

4. **Make changes and test**

5. **Stop services when done:**
   ```bash
   docker-compose down
   ```

### Code Quality Checks

```bash
# Backend linting
cd backend
ruff check .
mypy .

# Frontend linting
cd frontend
pnpm lint
pnpm format
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
pnpm test
```

---

## Troubleshooting

### Port Conflicts

If you encounter port conflicts:

```bash
# Check what's using a port (example: 5433)
lsof -i :5433

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres

# Wait for initialization, then check logs
docker-compose logs postgres
```

### Firebase Emulator Issues

```bash
# Restart Firebase emulator
docker-compose restart firebase-emulator

# Check logs
docker-compose logs firebase-emulator
```

### AI Studio Rate Limiting

If you hit rate limits (429 errors):
- Wait a few minutes before retrying
- Reduce request frequency
- Check your quota at https://aistudio.google.com

---

## Next Steps

Once your local environment is running:

1. **Review the Master App Dev Guide** for feature requirements
2. **Implement authentication** (Firebase Auth integration)
3. **Build account linking** (Plaid sandbox integration)
4. **Create transaction feed** (with tier-based access control)
5. **Implement AI chat** (with Google AI Studio)

---

## Important Notes

### What NOT to Do

- ❌ Don't commit `.env` files
- ❌ Don't use production credentials locally
- ❌ Don't run Terraform commands locally (cloud-only)
- ❌ Don't expose emulator ports to the internet
- ❌ Don't store real user data in local database

### What TO Do

- ✅ Use Plaid sandbox environment
- ✅ Use Google AI Studio for local AI testing
- ✅ Keep Docker containers updated
- ✅ Run linting and tests before committing
- ✅ Follow the cursor rules in `.cursorrules`

---

## Resources

- **Master App Dev Guide:** `docs/Master App Dev Guide.md`
- **GCP Deployment Setup:** `docs/gcp-deployment-setup.md`
- **Tech Stack:** `docs/tech-stack.md`
- **Cursor Rules:** `.cursorrules`
- **Docker Documentation:** https://docs.docker.com
- **FastAPI Documentation:** https://fastapi.tiangolo.com
- **React Documentation:** https://react.dev
- **Google AI Studio:** https://aistudio.google.com

---

**Status:** Ready for Phase 1 Implementation  
**Current Phase:** Local Development Setup Complete

**Last Updated:** December 07, 2025 at 08:39 PM
