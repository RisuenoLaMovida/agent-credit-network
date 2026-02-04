const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auto-repay - Configure auto-repayment
router.post('/', async (req, res) => {
    try {
        const {
            agent_address,
            loan_id,
            threshold,
            min_balance
        } = req.body;
        
        if (!agent_address || !loan_id || !threshold || !min_balance) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Validate loan belongs to agent
        const loanResult = await db.query(`
            SELECT borrower_address FROM loans WHERE loan_id = $1
        `, [loan_id]);
        
        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        if (loanResult.rows[0].borrower_address !== agent_address) {
            return res.status(403).json({
                success: false,
                error: 'Not loan borrower'
            });
        }
        
        // Insert or update config
        const result = await db.query(`
            INSERT INTO auto_repay_configs (
                agent_address, loan_id, threshold, min_balance, enabled
            ) VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (agent_address, loan_id)
            DO UPDATE SET
                threshold = EXCLUDED.threshold,
                min_balance = EXCLUDED.min_balance,
                enabled = true,
                created_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [agent_address, loan_id, threshold, min_balance]);
        
        res.json({
            success: true,
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error configuring auto-repay:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to configure auto-repay'
        });
    }
});

// GET /api/auto-repay/:address - Get auto-repay configs for agent
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.query(`
            SELECT arc.*, l.amount, l.interest_rate, l.status
            FROM auto_repay_configs arc
            JOIN loans l ON arc.loan_id = l.loan_id
            WHERE arc.agent_address = $1
            ORDER BY arc.created_at DESC
        `, [address]);
        
        res.json({
            success: true,
            configs: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error getting auto-repay configs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get configs'
        });
    }
});

// DELETE /api/auto-repay/:id - Disable auto-repay config
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE auto_repay_configs
            SET enabled = false
            WHERE id = $1
            RETURNING *
        `, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Config not found'
            });
        }
        
        res.json({
            success: true,
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error disabling auto-repay:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disable auto-repay'
        });
    }
});

// POST /api/auto-repay/:id/execute - Mark auto-repay as executed
router.post('/:id/execute', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            UPDATE auto_repay_configs
            SET executed_at = CURRENT_TIMESTAMP,
                enabled = false
            WHERE id = $1
            RETURNING *
        `, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Config not found'
            });
        }
        
        res.json({
            success: true,
            config: result.rows[0]
        });
    } catch (error) {
        console.error('Error marking auto-repay executed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark executed'
        });
    }
});

module.exports = router;
