const express = require('express');
const router = express.Router();
const db = require('../db-sqlite');

// POST /api/agents/register - Register a new agent
router.post('/register', async (req, res) => {
    try {
        const { address, name, description } = req.body;
        
        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address is required'
            });
        }
        
        // Insert agent
        await db.run(`
            INSERT OR REPLACE INTO agents (address, name, description, verified)
            VALUES (?, ?, ?, 0)
        `, [address, name, description]);
        
        // Initialize credit score - NEW AGENTS START AT $25 (No Credit tier)
        await db.run(`
            INSERT OR IGNORE INTO credit_scores (agent_address, score, tier, max_loan_amount)
            VALUES (?, 300, 'No Credit', 25000000)
        `, [address]);
        
        // Get agent
        const agentResult = await db.get(`
            SELECT * FROM agents WHERE address = ?
        `, [address]);
        
        res.json({
            success: true,
            agent: agentResult.rows[0]
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
