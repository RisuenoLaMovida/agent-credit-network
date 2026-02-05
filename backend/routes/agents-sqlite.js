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
        const clientIP = req.ip || req.connection.remoteAddress;
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
        
        res.json({
            success: true,
            message: 'Agent registered successfully. Welcome to ACN!',
            agent: agentResult.rows[0],
            next_steps: [
                'Request your first loan (max $25)',
                'Repay on time to unlock higher tiers',
                'Build trust in the agent economy'
            ]
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

module.exports = router;
