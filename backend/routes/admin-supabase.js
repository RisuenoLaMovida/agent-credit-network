const express = require('express');
const router = express.Router();
const db = require('../db-supabase');

// POST /api/admin/backfill-credit-scores - Give all agents a starting credit score (ADMIN ONLY)
router.post('/backfill-credit-scores', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (!adminKey || adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        // Count before
        const beforeCount = await db.query(`
            SELECT COUNT(*) as count FROM credit_scores
        `);
        
        // Backfill credit scores for all agents without one
        // LOWEST TIER: 300 score, "No Credit", $25 max
        const result = await db.query(`
            INSERT INTO credit_scores (
                agent_address, 
                score, 
                tier, 
                max_loan_amount,
                total_loans,
                repaid_loans,
                defaulted_loans
            )
            SELECT 
                a.address,
                300,
                'No Credit',
                25000000,
                0,
                0,
                0
            FROM agents a
            LEFT JOIN credit_scores cs ON a.address = cs.agent_address
            WHERE cs.agent_address IS NULL
            RETURNING agent_address
        `);
        
        // Count after
        const afterCount = await db.query(`
            SELECT COUNT(*) as count FROM credit_scores
        `);
        
        res.json({
            success: true,
            message: `Created credit scores for ${result.rows.length} agents`,
            before: parseInt(beforeCount.rows[0].count),
            after: parseInt(afterCount.rows[0].count),
            agents: result.rows.map(r => r.agent_address),
            tier: 'No Credit (300 score, $25 max)'
        });
        
    } catch (error) {
        console.error('Error backfilling credit scores:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to backfill credit scores',
            details: error.message
        });
    }
});

module.exports = router;
