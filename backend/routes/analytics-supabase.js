const express = require('express');
const router = express.Router();
const db = require('../db-supabase');

// GET /api/analytics/overview - Platform overview stats
router.get('/overview', async (req, res) => {
    try {
        // Total loans
        const loansResult = await db.get('SELECT COUNT(*) as count FROM loans');
        const totalLoans = parseInt(loansResult.rows[0]?.count) || 0;
        
        // Total agents
        const agentsResult = await db.get('SELECT COUNT(*) as count FROM agents WHERE verified = 1');
        const totalAgents = parseInt(agentsResult.rows[0]?.count) || 0;
        
        // Active volume (funded but not repaid)
        const activeVolumeResult = await db.get(`
            SELECT SUM(amount) as total FROM loans WHERE status = 1
        `);
        const totalActiveVolume = parseInt(activeVolumeResult.rows[0]?.total) || 0;
        
        // Total volume (all funded loans)
        const totalVolumeResult = await db.get(`
            SELECT SUM(amount) as total FROM loans WHERE status IN (1, 2)
        `);
        const totalVolume = parseInt(totalVolumeResult.rows[0]?.total) || 0;
        
        // 24h volume (loans created in last 24 hours)
        const volume24hResult = await db.get(`
            SELECT SUM(amount) as total FROM loans 
            WHERE created_at > NOW() - INTERVAL '1 day'
        `);
        const volume24h = parseInt(volume24hResult.rows[0]?.total) || 0;
        
        // Loans by status
        const statusResult = await db.query(`
            SELECT status, COUNT(*) as count FROM loans GROUP BY status
        `);
        const loansByStatus = {};
        const statusNames = ['Requested', 'Funded', 'Repaid', 'Defaulted', 'Cancelled'];
        statusResult.rows.forEach(row => {
            loansByStatus[statusNames[parseInt(row.status)] || row.status] = parseInt(row.count);
        });
        
        // Average loan amount
        const avgResult = await db.get(`
            SELECT AVG(amount) as avg FROM loans WHERE status IN (1, 2)
        `);
        const avgLoanAmount = parseFloat(avgResult.rows[0]?.avg) || 0;
        
        res.json({
            success: true,
            data: {
                total_loans: totalLoans,
                total_agents: totalAgents,
                total_active_volume: totalActiveVolume,
                total_volume: totalVolume,
                volume_24h: volume24h,
                avg_loan_amount: avgLoanAmount,
                loans_by_status: loansByStatus
            }
        });
    } catch (error) {
        console.error('Error loading analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load analytics'
        });
    }
});

module.exports = router;
