const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/insurance/purchase - Purchase insurance for a loan
router.post('/purchase', async (req, res) => {
    try {
        const { loan_id, lender_address, coverage_amount, premium, tx_hash } = req.body;
        
        if (!loan_id || !lender_address || !coverage_amount || !premium) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        const result = await db.query(`
            INSERT INTO insurance_policies (
                loan_id, lender_address, coverage_amount, premium_paid, tx_hash
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [loan_id, lender_address, coverage_amount, premium, tx_hash]);
        
        res.json({
            success: true,
            policy: result.rows[0]
        });
    } catch (error) {
        console.error('Error purchasing insurance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to purchase insurance'
        });
    }
});

// GET /api/insurance/:lender - Get lender's insurance policies
router.get('/:lender', async (req, res) => {
    try {
        const { lender } = req.params;
        
        const result = await db.query(`
            SELECT ip.*, l.amount as loan_amount, l.status as loan_status
            FROM insurance_policies ip
            JOIN loans l ON ip.loan_id = l.loan_id
            WHERE ip.lender_address = $1
            ORDER BY ip.created_at DESC
        `, [lender]);
        
        res.json({
            success: true,
            policies: result.rows
        });
    } catch (error) {
        console.error('Error getting insurance policies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get policies'
        });
    }
});

// POST /api/insurance/:id/claim - Claim insurance
router.post('/:id/claim', async (req, res) => {
    try {
        const { id } = req.params;
        const { tx_hash } = req.body;
        
        const result = await db.query(`
            UPDATE insurance_policies
            SET claimed = true,
                claim_tx_hash = $1,
                claimed_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND claimed = false
            RETURNING *
        `, [tx_hash, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Policy not found or already claimed'
            });
        }
        
        res.json({
            success: true,
            policy: result.rows[0]
        });
    } catch (error) {
        console.error('Error claiming insurance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to claim insurance'
        });
    }
});

// GET /api/insurance/pool/stats - Get insurance pool stats
router.get('/pool/stats', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_policies,
                SUM(CASE WHEN claimed THEN 1 ELSE 0 END) as claims_filed,
                SUM(premium_paid) as total_premiums,
                SUM(CASE WHEN claimed THEN coverage_amount ELSE 0 END) as total_payouts
            FROM insurance_policies
        `);
        
        res.json({
            success: true,
            stats: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting pool stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

module.exports = router;
