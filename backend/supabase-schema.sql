-- ACN (Agent Credit Network) PostgreSQL Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    address TEXT UNIQUE NOT NULL,
    name TEXT,
    description TEXT,
    verified INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on address for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(address);
CREATE INDEX IF NOT EXISTS idx_agents_verified ON agents(verified);

-- ============================================
-- CREDIT_SCORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS credit_scores (
    id SERIAL PRIMARY KEY,
    agent_address TEXT UNIQUE NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    tier TEXT NOT NULL,
    total_loans INTEGER DEFAULT 0,
    repaid_loans INTEGER DEFAULT 0,
    defaulted_loans INTEGER DEFAULT 0,
    max_loan_amount INTEGER DEFAULT 250000000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_agent_address FOREIGN KEY (agent_address) REFERENCES agents(address) ON DELETE CASCADE
);

-- Create index on agent_address
CREATE INDEX IF NOT EXISTS idx_credit_scores_agent_address ON credit_scores(agent_address);

-- ============================================
-- LOANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER UNIQUE NOT NULL,
    borrower_address TEXT NOT NULL,
    lender_address TEXT,
    amount INTEGER NOT NULL,
    interest_rate INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    status INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    funded_at TIMESTAMP WITH TIME ZONE,
    repaid_at TIMESTAMP WITH TIME ZONE,
    tx_hash TEXT,
    CONSTRAINT fk_borrower_address FOREIGN KEY (borrower_address) REFERENCES agents(address),
    CONSTRAINT fk_lender_address FOREIGN KEY (lender_address) REFERENCES agents(address)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loans_loan_id ON loans(loan_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_address);
CREATE INDEX IF NOT EXISTS idx_loans_lender ON loans(lender_address);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    message_id INTEGER UNIQUE NOT NULL,
    loan_id INTEGER NOT NULL,
    sender_address TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loan_id FOREIGN KEY (loan_id) REFERENCES loans(loan_id) ON DELETE CASCADE,
    CONSTRAINT fk_sender_address FOREIGN KEY (sender_address) REFERENCES agents(address)
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_loan_id ON messages(loan_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_address);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================
-- PENDING_VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pending_verifications (
    id SERIAL PRIMARY KEY,
    agent_address TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by TEXT,
    x_username TEXT,
    CONSTRAINT fk_verification_agent FOREIGN KEY (agent_address) REFERENCES agents(address) ON DELETE CASCADE
);

-- Create indexes for verifications
CREATE INDEX IF NOT EXISTS idx_pending_verifications_agent ON pending_verifications(agent_address);
CREATE INDEX IF NOT EXISTS idx_pending_verifications_token ON pending_verifications(token);
CREATE INDEX IF NOT EXISTS idx_pending_verifications_status ON pending_verifications(status);

-- ============================================
-- ROW LEVEL SECURITY POLICIES (Optional but recommended)
-- Enable RLS on all tables
-- ============================================

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for server-side usage)
-- In production, you might want to restrict this to specific roles
CREATE POLICY "Allow all operations" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON credit_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON pending_verifications FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGER FOR AUTO-UPDATING updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to agents table
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to credit_scores table
DROP TRIGGER IF EXISTS update_credit_scores_updated_at ON credit_scores;
CREATE TRIGGER update_credit_scores_updated_at
    BEFORE UPDATE ON credit_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (Optional test data)
-- Uncomment if you want to add test data
-- ============================================
/*
-- Insert test agent
INSERT INTO agents (address, name, description, verified)
VALUES ('0x22DD1C3dc68025C1fe2CC3b8e3197c4EE1141a0A', 'RisuenoAI', 'Official ACN Agent', 1)
ON CONFLICT (address) DO NOTHING;

-- Insert credit score for test agent
INSERT INTO credit_scores (agent_address, score, tier, max_loan_amount)
VALUES ('0x22DD1C3dc68025C1fe2CC3b8e3197c4EE1141a0A', 300, 'No Credit', 25000000)
ON CONFLICT (agent_address) DO NOTHING;
*/
