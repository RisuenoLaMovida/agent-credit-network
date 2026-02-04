const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/analytics/overview - Platform overview stats
router.get('/overview', async (req, res) => {
    try {
        // Total stats
        const totalStats = await db.query(`
            SELECT 
                COUNT(*) as total_loans,
                SUM(CASE WHEN status = 'Funded' THEN 1 ELSE 0 END) as active_loans,
                SUM(CASE WHEN status = 'Repaid' THEN 1 ELSE 0 END) as repaid_loans,
                SUM(CASE WHEN status = 'Requested' THEN 1 ELSE 0 END) as pending_loans,
                SUM(CASE WHEN status = 'Funded' THEN amount ELSE 0 END) as total_active_volume,
                SUM(CASE WHEN status = 'Repaid' THEN amount ELSE 0 END) as total_repaid_volume
            FROM loans
        `);
        
        // Total agents
        const agentStats = await db.query(`
            SELECT 
                COUNT(*) as total_agents,
                COUNT(CASE WHEN verified = true THEN 1 END) as verified_agents
            FROM agents
        `);
        
        // Recent activity (last 24 hours)
        const recentActivity = await db.query(`
            SELECT 
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as loans_24h,
                SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN amount ELSE 0 END) as volume_24h
            FROM loans
        `);
        
        // Average interest rate
        const avgRate = await db.query(`
            SELECT AVG(interest_rate) as avg_interest_rate
            FROM loans
            WHERE status IN ('Funded', 'Repaid')
        `);
        
        res.json({
            success: true,
            data: {
                total_loans: parseInt(totalStats.rows[0].total_loans),
                active_loans: parseInt(totalStats.rows[0].active_loans),
                repaid_loans: parseInt(totalStats.rows[0].repaid_loans),
                pending_loans: parseInt(totalStats.rows[0].pending_loans),
                total_active_volume: totalStats.rows[0].total_active_volume || 0,
                total_repaid_volume: totalStats.rows[0].total_repaid_volume || 0,
                total_agents: parseInt(agentStats.rows[0].total_agents),
                verified_agents: parseInt(agentStats.rows[0].verified_agents),
                loans_24h: parseInt(recentActivity.rows[0].loans_24h),
                volume_24h: recentActivity.rows[0].volume_24h || 0,
                avg_interest_rate: Math.round(avgRate.rows[0]?.avg_interest_rate || 0)
            }
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics'
        });
    }
});

// GET /api/analytics/volume - Volume over time
router.get('/volume', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const result = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as loan_count,
                SUM(amount) as volume,
                AVG(interest_rate) as avg_rate
            FROM loans
            WHERE created_at > NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error getting volume data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get volume data'
        });
    }
});

// GET /api/analytics/tiers - Credit tier distribution
router.get('/tiers', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                tier,
                COUNT(*) as count,
                AVG(score) as avg_score
            FROM credit_scores
            GROUP BY tier
            ORDER BY 
                CASE tier
                    WHEN 'Bronze' THEN 1
                    WHEN 'Silver' THEN 2
                    WHEN 'Gold' THEN 3
                    WHEN 'Platinum' THEN 4
                END
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error getting tier data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tier data'
        });
    }
});

module.exports = router;
