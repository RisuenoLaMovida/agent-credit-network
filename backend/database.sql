-- ACN PostgreSQL Database Schema
-- Agent Credit Network Backend Database

-- Agents table
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(100),
    description TEXT,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit scores table
CREATE TABLE credit_scores (
    id SERIAL PRIMARY KEY,
    agent_address VARCHAR(42) UNIQUE NOT NULL REFERENCES agents(address),
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    tier VARCHAR(20) NOT NULL, -- Bronze, Silver, Gold, Platinum
    total_loans INTEGER DEFAULT 0,
    repaid_loans INTEGER DEFAULT 0,
    defaulted_loans INTEGER DEFAULT 0,
    max_loan_amount NUMERIC(20, 6) DEFAULT 250000000, -- USDC (6 decimals)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans table
CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER UNIQUE NOT NULL, -- On-chain loan ID
    borrower_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    lender_address VARCHAR(42) REFERENCES agents(address),
    amount NUMERIC(20, 6) NOT NULL, -- USDC (6 decimals)
    interest_rate INTEGER NOT NULL, -- Basis points
    duration INTEGER NOT NULL, -- Days
    purpose TEXT NOT NULL,
    status VARCHAR(20) NOT NULL, -- Requested, Funded, Repaid, Defaulted, Cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    funded_at TIMESTAMP,
    repaid_at TIMESTAMP,
    tx_hash VARCHAR(66) -- Transaction hash
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    message_id INTEGER UNIQUE NOT NULL, -- On-chain message ID
    loan_id INTEGER NOT NULL REFERENCES loans(loan_id),
    sender_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tx_hash VARCHAR(66)
);

-- Auto-repay configs table
CREATE TABLE auto_repay_configs (
    id SERIAL PRIMARY KEY,
    agent_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    loan_id INTEGER NOT NULL REFERENCES loans(loan_id),
    enabled BOOLEAN DEFAULT true,
    threshold NUMERIC(20, 6) NOT NULL, -- USDC balance threshold
    min_balance NUMERIC(20, 6) NOT NULL, -- Min balance to keep
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP,
    UNIQUE(agent_address, loan_id)
);

-- Credit score history table
CREATE TABLE credit_score_history (
    id SERIAL PRIMARY KEY,
    agent_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    old_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason VARCHAR(100), -- 'loan_repaid', 'loan_defaulted', 'manual_update'
    loan_id INTEGER REFERENCES loans(loan_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys / auth tokens table
CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    agent_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    agent_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    url TEXT NOT NULL,
    events JSONB NOT NULL,
    secret VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_address, url)
);

-- Webhook delivery logs
CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES webhooks(id),
    event VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT false
);

-- Insurance policies table
CREATE TABLE insurance_policies (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(loan_id),
    lender_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    coverage_amount NUMERIC(20, 6) NOT NULL,
    premium_paid NUMERIC(20, 6) NOT NULL,
    claimed BOOLEAN DEFAULT false,
    tx_hash VARCHAR(66),
    claim_tx_hash VARCHAR(66),
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referrals table
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    referrer_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    referred_address VARCHAR(42) NOT NULL REFERENCES agents(address),
    referral_code VARCHAR(50),
    reward_amount NUMERIC(20, 6) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    UNIQUE(referrer_address, referred_address)
);

-- Indexes for performance
CREATE INDEX idx_loans_borrower ON loans(borrower_address);
CREATE INDEX idx_loans_lender ON loans(lender_address);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_messages_loan ON messages(loan_id);
CREATE INDEX idx_messages_sender ON messages(sender_address);
CREATE INDEX idx_credit_history_agent ON credit_score_history(agent_address);
CREATE INDEX idx_auto_repay_agent ON auto_repay_configs(agent_address);
CREATE INDEX idx_webhooks_agent ON webhooks(agent_address);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_scores_updated_at BEFORE UPDATE ON credit_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
