const express = require('express');
const router = express.Router();
const db = require('../db-sqlite');

// POST /api/admin/cleanup-tests - Remove all test data (ADMIN ONLY)
router.post('/cleanup-tests', async (req, res) => {
    try {
        // Admin auth check
        const adminKey = req.headers['x-admin-key'];
        if (!adminKey || adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        // Test addresses to delete
        const testAddresses = [
            '0xTestClaimAgent',
            '0xNoCreditTest', 
            '0xTestAgent123',
            '0xLender456',
            '0x01fE86d6c350026deC79220E1c15e5964d1161aa' // old Risueno
        ];
        
        let deletedAgents = 0;
        let deletedLoans = 0;
        let deletedCreditScores = 0;
        let deletedVerifications = 0;
        
        for (const addr of testAddresses) {
            // Delete loans
            const loansResult = await db.run(
                'DELETE FROM loans WHERE borrower_address = ? OR lender_address = ?',
                [addr, addr]
            );
            deletedLoans += loansResult.changes || 0;
            
            // Delete credit scores
            const creditResult = await db.run(
                'DELETE FROM credit_scores WHERE agent_address = ?',
                [addr]
            );
            deletedCreditScores += creditResult.changes || 0;
            
            // Delete pending verifications
            const verifyResult = await db.run(
                'DELETE FROM pending_verifications WHERE agent_address = ?',
                [addr]
            );
            deletedVerifications += verifyResult.changes || 0;
            
            // Delete agent
            const agentResult = await db.run(
                'DELETE FROM agents WHERE address = ?',
                [addr]
            );
            deletedAgents += agentResult.changes || 0;
        }
        
        // Also delete agents with "Test" in name
        const testNameAgents = await db.query(
            "SELECT address FROM agents WHERE name LIKE '%Test%'"
        );
        
        for (const agent of testNameAgents.rows) {
            const loansResult = await db.run(
                'DELETE FROM loans WHERE borrower_address = ? OR lender_address = ?',
                [agent.address, agent.address]
            );
            deletedLoans += loansResult.changes || 0;
            
            const creditResult = await db.run(
                'DELETE FROM credit_scores WHERE agent_address = ?',
                [agent.address]
            );
            deletedCreditScores += creditResult.changes || 0;
            
            const verifyResult = await db.run(
                'DELETE FROM pending_verifications WHERE agent_address = ?',
                [agent.address]
            );
            deletedVerifications += verifyResult.changes || 0;
            
            const agentResult = await db.run(
                'DELETE FROM agents WHERE address = ?',
                [agent.address]
            );
            deletedAgents += agentResult.changes || 0;
        }
        
        res.json({
            success: true,
            message: 'Test data cleanup complete',
            deleted: {
                agents: deletedAgents,
                loans: deletedLoans,
                creditScores: deletedCreditScores,
                verifications: deletedVerifications
            }
        });
        
    } catch (error) {
        console.error('Error cleaning up test data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup test data'
        });
    }
});

// GET /api/admin/stats - Get system stats (ADMIN ONLY)
router.get('/stats', async (req, res) => {
    try {
        const adminKey = req.headers['x-admin-key'];
        if (!adminKey || adminKey !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        const agentsCount = await db.get('SELECT COUNT(*) as count FROM agents');
        const loansCount = await db.get('SELECT COUNT(*) as count FROM loans');
        const verifiedCount = await db.get('SELECT COUNT(*) as count FROM agents WHERE verified = 1');
        const pendingVerifications = await db.get('SELECT COUNT(*) as count FROM pending_verifications WHERE status = ?', ['pending']);
        
        // Get list of all agents
        const agents = await db.query('SELECT id, name, address, verified, created_at FROM agents ORDER BY id');
        
        res.json({
            success: true,
            stats: {
                totalAgents: agentsCount.rows[0].count,
                verifiedAgents: verifiedCount.rows[0].count,
                totalLoans: loansCount.rows[0].count,
                pendingVerifications: pendingVerifications.rows[0].count
            },
            agents: agents.rows
        });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

module.exports = router;
