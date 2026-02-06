const express = require('express');
const router = express.Router();
const db = require('../db-sqlite');

// GET /api/analytics/overview - Platform overview stats
router.get('/overview', async (req, res) => {
    const safeGet = async (sql, params = [], fallback = {}) => {
        try {
            const result = await db.get(sql, params);
            return result.rows[0] || fallback;
        } catch (error) {
            console.error('Analytics query failed:', error.message);
            return fallback;
        }
    };

    const safeQuery = async (sql, params = [], fallback = []) => {
        try {
            const result = await db.query(sql, params);
            return result.rows || fallback;
        } catch (error) {
            console.error('Analytics query failed:', error.message);
            return fallback;
        }
    };

    try {
        // Total loans
        const loansRow = await safeGet('SELECT COUNT(*) as count FROM loans', [], { count: 0 });
        const totalLoans = loansRow.count || 0;
        
        // Total agents
        const agentsRow = await safeGet('SELECT COUNT(*) as count FROM agents WHERE verified = 1', [], { count: 0 });
        const totalAgents = agentsRow.count || 0;
        
        // Active volume (funded but not repaid)
        const activeVolumeRow = await safeGet(`
            SELECT COALESCE(SUM(amount), 0) as total FROM loans WHERE status = 1
        `, [], { total: 0 });
        const totalActiveVolume = activeVolumeRow.total || 0;
        
        // Total volume (all funded loans)
        const totalVolumeRow = await safeGet(`
            SELECT COALESCE(SUM(amount), 0) as total FROM loans WHERE status IN (1, 2)
        `, [], { total: 0 });
        const totalVolume = totalVolumeRow.total || 0;
        
        // 24h volume (loans created in last 24 hours)
        const volume24hRow = await safeGet(`
            SELECT COALESCE(SUM(amount), 0) as total FROM loans 
            WHERE created_at > datetime('now', '-1 day')
        `, [], { total: 0 });
        const volume24h = volume24hRow.total || 0;
        
        // Loans by status
        const statusRows = await safeQuery(`
            SELECT status, COUNT(*) as count FROM loans GROUP BY status
        `, [], []);
        const loansByStatus = {};
        const statusNames = ['Requested', 'Funded', 'Repaid', 'Defaulted', 'Cancelled'];
        statusRows.forEach(row => {
            loansByStatus[statusNames[row.status] || row.status] = row.count;
        });
        
        // Average loan amount
        const avgRow = await safeGet(`
            SELECT COALESCE(AVG(amount), 0) as avg FROM loans WHERE status IN (1, 2)
        `, [], { avg: 0 });
        const avgLoanAmount = avgRow.avg || 0;
        
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
