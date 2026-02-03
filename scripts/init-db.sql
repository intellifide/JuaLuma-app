-- Updated 2025-12-07 21:02 CST by ChatGPT
-- Modified 2025-12-18 by Antigravity: Removed audit tables as they are managed by Alembic

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
    time_zone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    weekly_digest_sent_at TIMESTAMPTZ,
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
    channel_sms BOOLEAN DEFAULT true,
    channel_push BOOLEAN DEFAULT true,
    channel_in_app BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(uid, event_key)
);

-- Notification dedupe table
CREATE TABLE IF NOT EXISTS notification_dedupe (
    uid VARCHAR(128) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    dedupe_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (uid, dedupe_key),
    UNIQUE(uid, dedupe_key)
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

CREATE TABLE IF NOT EXISTS support_ticket_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(128) UNIQUE NOT NULL,
    agent_id UUID NOT NULL,
    customer_uid VARCHAR(128) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed test data
INSERT INTO users (uid, email, role, theme_pref, currency_pref) VALUES
    ('test-user-1', 'test@example.com', 'user', 'glass', 'USD'),
    ('test-dev-1', 'developer@example.com', 'user', 'glass', 'USD'),
    ('test-agent-1', 'agent@example.com', 'support_agent', 'glass', 'USD'),
    ('test-manager-1', 'manager@example.com', 'support_manager', 'glass', 'USD'),
    ('user_regular', 'user_regular@example.com', 'user', 'glass', 'USD'),
    ('agent_support_1', 'agent_support_1@example.com', 'support_agent', 'glass', 'USD'),
    ('manager_support', 'manager_support@example.com', 'support_manager', 'glass', 'USD')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO subscriptions (uid, plan, status) VALUES
    ('test-user-1', 'free', 'active'),
    ('test-dev-1', 'pro', 'active'),
    ('test-agent-1', 'free', 'active'),
    ('test-manager-1', 'free', 'active'),
    ('user_regular', 'free', 'active'),
    ('agent_support_1', 'free', 'active'),
    ('manager_support', 'free', 'active')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO developers (uid, payout_frequency) VALUES
    ('test-dev-1', 'monthly')
ON CONFLICT (uid) DO NOTHING;

INSERT INTO support_agents (company_id, name, email, role) VALUES
    ('INT-AGENT-2025-001', 'Test Agent', 'agent@example.com', 'support_agent'),
    ('INT-AGENT-2025-002', 'Test Manager', 'manager@example.com', 'support_manager'),
    ('INT-AGENT-2025-003', 'Agent Support 1', 'agent_support_1@example.com', 'support_agent'),
    ('INT-AGENT-2025-004', 'Manager Support', 'manager_support@example.com', 'support_manager')
ON CONFLICT (company_id) DO NOTHING;
