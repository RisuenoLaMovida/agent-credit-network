const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/credit/:address - Get credit score
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.query(`
            SELECT * FROM credit_scores
            WHERE agent_address = $1
        `, [address]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Credit score not found'
            });
        }
        
        res.json({
            success: true,
            credit: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting credit score:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get credit score'
        });
    }
});

// GET /api/credit/:address/history - Get credit score history
router.get('/:address/history', async (req, res) => {
    try {
        const { address } = req.params;
        const { limit = 50 } = req.query;
        
        const result = await db.query(`
            SELECT * FROM credit_score_history
            WHERE agent_address = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [address, limit]);
        
        res.json({
            success: true,
            history: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error getting credit history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get credit history'
        });
    }
});

module.exports = router;
