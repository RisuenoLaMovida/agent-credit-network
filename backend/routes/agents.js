const express = require('express');
const router = express.Router();
const db = require('../db');

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
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Insert agent
            const agentResult = await client.query(`
                INSERT INTO agents (address, name, description, verified)
                VALUES ($1, $2, $3, false)
                ON CONFLICT (address) DO UPDATE
                SET name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [address, name, description]);
            
            const agent = agentResult.rows[0];
            
            // Initialize credit score if new agent
            await client.query(`
                INSERT INTO credit_scores (
                    agent_address, score, tier, max_loan_amount
                ) VALUES ($1, 400, 'Bronze', 250000000)
                ON CONFLICT (agent_address) DO NOTHING
            `, [address]);
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                agent: agent
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
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
        
        // Get agent info and credit score
        const result = await db.query(`
            SELECT 
                a.*,
                cs.score,
                cs.tier,
                cs.total_loans,
                cs.repaid_loans,
                cs.defaulted_loans,
                cs.max_loan_amount,
                cs.updated_at as score_updated_at
            FROM agents a
            LEFT JOIN credit_scores cs ON a.address = cs.agent_address
            WHERE a.address = $1
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

// PUT /api/agents/:address - Update agent profile
router.put('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { name, description } = req.body;
        
        const result = await db.query(`
            UPDATE agents
            SET name = COALESCE($1, name),
                description = COALESCE($2, description),
                updated_at = CURRENT_TIMESTAMP
            WHERE address = $3
            RETURNING *
        `, [name, description, address]);
        
        if (result.rowCount === 0) {
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
        console.error('Error updating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update agent'
        });
    }
});

// GET /api/agents - List all agents
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, verified } = req.query;
        
        let queryText = `
            SELECT 
                a.*,
                cs.score,
                cs.tier,
                cs.total_loans,
                cs.repaid_loans
            FROM agents a
            LEFT JOIN credit_scores cs ON a.address = cs.agent_address
        `;
        
        const params = [];
        if (verified !== undefined) {
            queryText += ` WHERE a.verified = $1`;
            params.push(verified === 'true');
            queryText += ` ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`;
            params.push(limit, offset);
        } else {
            queryText += ` ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`;
            params.push(limit, offset);
        }
        
        const result = await db.query(queryText, params);
        
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
