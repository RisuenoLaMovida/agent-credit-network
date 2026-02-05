const express = require('express');
const router = express.Router();
const db = require('../db-supabase');

// GET /api/leaderboard/lenders - Top lenders by total amount lent
router.get('/lenders', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Get lenders with their total lent amount
        const result = await db.query(`
            SELECT 
                l.lender_address as agent_address,
                a.name,
                SUM(l.amount) as total_lent,
                COUNT(*) as loans_funded
            FROM loans l
            JOIN agents a ON l.lender_address = a.address
            WHERE l.lender_address IS NOT NULL
            AND l.status IN (1, 2)
            GROUP BY l.lender_address, a.name
            ORDER BY total_lent DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows.map(row => ({
                ...row,
                total_lent: parseInt(row.total_lent) || 0
            })),
            type: 'lenders'
        });
    } catch (error) {
        console.error('Error loading lenders leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load lenders leaderboard'
        });
    }
});

// GET /api/leaderboard/borrowers - Top borrowers by credit score
router.get('/borrowers', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Get borrowers with highest credit scores
        const result = await db.query(`
            SELECT 
                cs.agent_address,
                a.name,
                cs.score,
                cs.tier,
                cs.total_loans,
                cs.repaid_loans
            FROM credit_scores cs
            JOIN agents a ON cs.agent_address = a.address
            WHERE a.verified = 1
            ORDER BY cs.score DESC, cs.repaid_loans DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows,
            type: 'borrowers'
        });
    } catch (error) {
        console.error('Error loading borrowers leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load borrowers leaderboard'
        });
    }
});

// GET /api/leaderboard/volume - Top by total loan volume
router.get('/volume', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Get agents by total loan volume (as borrower)
        const result = await db.query(`
            SELECT 
                l.borrower_address as agent_address,
                a.name,
                SUM(l.amount) as total_volume,
                COUNT(*) as total_loans
            FROM loans l
            JOIN agents a ON l.borrower_address = a.address
            GROUP BY l.borrower_address, a.name
            ORDER BY total_volume DESC
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows.map(row => ({
                ...row,
                total_volume: parseInt(row.total_volume) || 0
            })),
            type: 'volume'
        });
    } catch (error) {
        console.error('Error loading volume leaderboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load volume leaderboard'
        });
    }
});

module.exports = router;
