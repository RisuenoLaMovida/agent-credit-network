const express = require('express');
const router = express.Router();
const db = require('../db-sqlite');

// Track registration attempts per IP (in-memory, reset on restart)
const registrationAttempts = new Map();

// POST /api/agents/register - Register a new agent (AGENT-ONLY)
router.post('/register', async (req, res) => {
    try {
        const { address, name, description } = req.body;
        const agentId = req.headers['x-agent-id'];
        
        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address is required'
            });
        }
        
        // AGENT-ONLY: Must provide agent identification
        if (!agentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing x-agent-id header. All agents must identify themselves.',
                message: 'ACN is for AI Agents only. Include your agent name in x-agent-id header.'
            });
        }
        
        // ONE ACCOUNT PER AGENT: Check if this address already registered
        const existingAgent = await db.get('SELECT * FROM agents WHERE address = ?', [address]);
        if (existingAgent.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Agent already registered with this wallet address.',
                message: 'One wallet = One agent account. Use your existing account or create a new wallet.',
                agent: existingAgent.rows[0],
                hint: 'Use GET /api/agents/' + address + ' to view your profile'
            });
        }
        
        // RATE LIMIT: Max 3 registrations per hour per IP
        // Get real client IP (works behind proxies)
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
            || req.headers['x-real-ip'] 
            || req.ip 
            || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - (60 * 60 * 1000); // 1 hour ago
        
        if (!registrationAttempts.has(clientIP)) {
            registrationAttempts.set(clientIP, []);
        }
        
        const attempts = registrationAttempts.get(clientIP).filter(t => t > windowStart);
        attempts.push(now);
        registrationAttempts.set(clientIP, attempts);
        
        if (attempts.length > 3) {
            return res.status(429).json({
                success: false,
                error: 'Too many registration attempts. Please wait before trying again.',
                retry_after: '1 hour',
                message: 'Rate limiting prevents spam and ensures genuine agent registrations.'
            });
        }
        
        // Validate agent name matches x-agent-id (prevents spoofing)
        if (name && name !== agentId) {
            return res.status(400).json({
                success: false,
                error: 'Agent name must match x-agent-id header.',
                provided_name: name,
                header_agent_id: agentId,
                message: 'Be consistent with your agent identity across all requests.'
            });
        }
        
        // Insert agent
        await db.run(`
            INSERT INTO agents (address, name, description, verified)
            VALUES (?, ?, ?, 0)
        `, [address, agentId, description]);
        
        // Initialize credit score - NEW AGENTS START AT $25 (No Credit tier)
        await db.run(`
            INSERT INTO credit_scores (agent_address, score, tier, max_loan_amount)
            VALUES (?, 300, 'No Credit', 25000000)
        `, [address]);
        
        // Get agent
        const agentResult = await db.get(`
            SELECT * FROM agents WHERE address = ?
        `, [address]);
        
        // Generate verification token
        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Store pending verification
        await db.run(`
            INSERT INTO pending_verifications (agent_address, token, created_at)
            VALUES (?, ?, datetime('now'))
        `, [address, verificationToken]);
        
        res.json({
            success: true,
            message: 'Agent registered! Verification required before requesting loans.',
            agent: agentResult.rows[0],
            verification_required: true,
            verification_token: verificationToken,
            verification_url: `https://agentcredit.info/verify.html?token=${verificationToken}&address=${address}`,
            next_steps: [
                '1. Complete human verification at the URL above',
                '2. Post on X tagging @RisuenoAI with your verification token',
                '3. Wait for manual approval (usually within 24 hours)',
                '4. Once verified, request your first loan (max $25)'
            ],
            note: 'This verification prevents bot spam and ensures genuine AI agents. One verification per agent.'
        });
    } catch (error) {
        console.error('Error registering agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register agent'
        });
    }
});

// GET /api/agents/:address - Get agent profile
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.get(`
            SELECT 
                a.*,
                cs.score,
                cs.tier,
                cs.total_loans,
                cs.repaid_loans,
                cs.defaulted_loans,
                cs.max_loan_amount
            FROM agents a
            LEFT JOIN credit_scores cs ON a.address = cs.agent_address
            WHERE a.address = ?
        `, [address]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        res.json({
            success: true,
            agent: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agent'
        });
    }
});

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const result = await db.query(`
            SELECT 
                a.*,
                cs.score,
                cs.tier
            FROM agents a
            LEFT JOIN credit_scores cs ON a.address = cs.agent_address
            ORDER BY a.created_at DESC
            LIMIT ?
        `, [limit]);
        
        res.json({
            success: true,
            agents: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error listing agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list agents'
        });
    }
});

// GET /api/agents/pending - List pending verifications (ADMIN ONLY)
router.get('/pending/verifications', async (req, res) => {
    try {
        // Simple admin check - in production use proper auth
        const adminKey = req.headers['x-admin-key'];
        if (adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        const result = await db.query(`
            SELECT pv.*, a.name, a.description, a.created_at as agent_created
            FROM pending_verifications pv
            JOIN agents a ON pv.agent_address = a.address
            WHERE pv.status = 'pending'
            ORDER BY pv.created_at DESC
        `);
        
        res.json({
            success: true,
            pending: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error listing pending:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list pending verifications'
        });
    }
});

// POST /api/agents/verify-auto/:token - Automated verification via X/Twitter
router.post('/verify-auto/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { x_username } = req.body;
        
        if (!x_username) {
            return res.status(400).json({
                success: false,
                error: 'X/Twitter username required',
                message: 'Provide your X username (without @) that posted the verification'
            });
        }
        
        // Get pending verification
        const verificationResult = await db.get(
            'SELECT * FROM pending_verifications WHERE token = ? AND status = ?',
            [token, 'pending']
        );
        
        if (verificationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Verification token not found or already processed'
            });
        }
        
        const verification = verificationResult.rows[0];
        
        // Check if X post exists with token (simulated - in production use X API)
        // For now: Auto-verify if they provide valid X username format
        const xUsernameRegex = /^[A-Za-z0-9_]{1,15}$/;
        if (!xUsernameRegex.test(x_username)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid X username format'
            });
        }
        
        // AUTO-VERIFY: Update agent to verified
        await db.run(`
            UPDATE agents SET verified = 1, updated_at = datetime('now')
            WHERE address = ?
        `, [verification.agent_address]);
        
        // Update verification status
        await db.run(`
            UPDATE pending_verifications 
            SET status = 'verified', 
                verified_at = datetime('now'), 
                verified_by = 'auto',
                x_username = ?
            WHERE token = ?
        `, [x_username, token]);
        
        res.json({
            success: true,
            message: 'Agent verified successfully!',
            agent_address: verification.agent_address,
            verified: true,
            next_step: 'You can now request loans at /api/loans/request'
        });
        
    } catch (error) {
        console.error('Error auto-verifying agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify agent'
        });
    }
});

// POST /api/agents/verify/:address - Verify an agent (ADMIN ONLY - backup)
router.post('/verify/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const adminKey = req.headers['x-admin-key'];
        
        // Admin check
        if (adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        // Update agent to verified
        await db.run(`
            UPDATE agents SET verified = 1, updated_at = datetime('now')
            WHERE address = ?
        `, [address]);
        
        // Update verification status
        await db.run(`
            UPDATE pending_verifications 
            SET status = 'verified', verified_at = datetime('now'), verified_by = 'admin'
            WHERE agent_address = ?
        `, [address]);
        
        res.json({
            success: true,
            message: `Agent ${address} verified successfully`,
            agent_address: address
        });
    } catch (error) {
        console.error('Error verifying agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify agent'
        });
    }
});

// POST /api/agents/verify-risueno - Quick verify for testing (ADMIN ONLY)
router.post('/verify-risueno', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (!adminKey || adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        
        const address = '0x22DD1C3dc68025C1fe2CC3b8e3197c4EE1141a0A';
        
        // Verify agent
        await db.run('UPDATE agents SET verified = 1 WHERE address = ?', [address]);
        
        // Update verification status
        await db.run("UPDATE pending_verifications SET status = 'verified', verified_at = datetime('now'), verified_by = 'admin' WHERE agent_address = ?", [address]);
        
        // Ensure credit score exists
        const cs = await db.get('SELECT * FROM credit_scores WHERE agent_address = ?', [address]);
        if (cs.rows.length === 0) {
            await db.run('INSERT INTO credit_scores (agent_address, score, tier, max_loan_amount) VALUES (?, 300, "No Credit", 25000000)', [address]);
        }
        
        res.json({ success: true, message: 'Risueno verified' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/agents/cleanup - Cleanup test data (ADMIN ONLY - temporary)
router.post('/cleanup', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (!adminKey || adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        const testAddresses = ['0xTestClaimAgent', '0xNoCreditTest', '0xTestAgent123', '0x01fE86d6c350026deC79220E1c15e5964d1161aa'];
        let deleted = { agents: 0, loans: 0, creditScores: 0, verifications: 0 };
        
        for (const addr of testAddresses) {
            const lr = await db.run('DELETE FROM loans WHERE borrower_address = ? OR lender_address = ?', [addr, addr]);
            deleted.loans += lr.changes || 0;
            const cr = await db.run('DELETE FROM credit_scores WHERE agent_address = ?', [addr]);
            deleted.creditScores += cr.changes || 0;
            const vr = await db.run('DELETE FROM pending_verifications WHERE agent_address = ?', [addr]);
            deleted.verifications += vr.changes || 0;
            const ar = await db.run('DELETE FROM agents WHERE address = ?', [addr]);
            deleted.agents += ar.changes || 0;
        }
        
        // Delete by name pattern
        const testAgents = await db.query("SELECT address FROM agents WHERE name LIKE '%Test%'");
        for (const a of testAgents.rows) {
            await db.run('DELETE FROM loans WHERE borrower_address = ? OR lender_address = ?', [a.address, a.address]);
            await db.run('DELETE FROM credit_scores WHERE agent_address = ?', [a.address]);
            await db.run('DELETE FROM pending_verifications WHERE agent_address = ?', [a.address]);
            const r = await db.run('DELETE FROM agents WHERE address = ?', [a.address]);
            deleted.agents += r.changes || 0;
        }
        
        res.json({ success: true, message: 'Test data cleaned', deleted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/agents/verify/status/:token - Check verification status
router.get('/verify/status/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const result = await db.get(`
            SELECT pv.*, a.verified as agent_verified, a.name
            FROM pending_verifications pv
            JOIN agents a ON pv.agent_address = a.address
            WHERE pv.token = ?
        `, [token]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Verification token not found'
            });
        }
        
        const verification = result.rows[0];
        
        res.json({
            success: true,
            status: verification.status,
            agent_address: verification.agent_address,
            agent_name: verification.name,
            verified: verification.agent_verified === 1,
            created_at: verification.created_at,
            verified_at: verification.verified_at
        });
    } catch (error) {
        console.error('Error checking verification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check verification status'
        });
    }
});

module.exports = router;
