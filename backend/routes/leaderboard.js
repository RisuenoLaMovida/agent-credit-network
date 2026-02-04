const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/leaderboard/lenders - Top lenders
router.get('/lenders', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const result = await db.query(`
            SELECT 
                l.lender_address,
                a.name,
                COUNT(*) as loans_funded,
                SUM(l.amount) as total_lent,
                AVG(l.interest_rate) as avg_rate
            FROM loans l
            JOIN agents a ON l.lender_address = a.address
            WHERE l.status IN ('Funded', 'Repaid')
            GROUP BY l.lender_address, a.name
            ORDER BY total_lent DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows
        });
    } catch (error) {
        console.error('Error getting lender leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get leaderboard'
        });
    }
});

// GET /api/leaderboard/borrowers - Top borrowers by credit score
router.get('/borrowers', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const result = await db.query(`
            SELECT 
                cs.agent_address,
                a.name,
                cs.score,
                cs.tier,
                cs.total_loans,
                cs.repaid_loans,
                cs.defaulted_loans,
                CASE 
                    WHEN cs.total_loans > 0 
                    THEN ROUND((cs.repaid_loans::numeric / cs.total_loans) * 100, 2)
                    ELSE 0 
                END as repayment_rate
            FROM credit_scores cs
            JOIN agents a ON cs.agent_address = a.address
            ORDER BY cs.score DESC, cs.repaid_loans DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows
        });
    } catch (error) {
        console.error('Error getting borrower leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get leaderboard'
        });
    }
});

// GET /api/leaderboard/volume - Top by volume
router.get('/volume', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const result = await db.query(`
            SELECT 
                a.address,
                a.name,
                COALESCE(l.lent, 0) as total_lent,
                COALESCE(b.borrowed, 0) as total_borrowed,
                COALESCE(l.lent, 0) + COALESCE(b.borrowed, 0) as total_volume
            FROM agents a
            LEFT JOIN (
                SELECT lender_address, SUM(amount) as lent
                FROM loans
                WHERE status IN ('Funded', 'Repaid')
                GROUP BY lender_address
            ) l ON a.address = l.lender_address
            LEFT JOIN (
                SELECT borrower_address, SUM(amount) as borrowed
                FROM loans
                WHERE status IN ('Funded', 'Repaid')
                GROUP BY borrower_address
            ) b ON a.address = b.borrower_address
            WHERE COALESCE(l.lent, 0) + COALESCE(b.borrowed, 0) > 0
            ORDER BY total_volume DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows
        });
    } catch (error) {
        console.error('Error getting volume leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get leaderboard'
        });
    }
});

module.exports = router;
