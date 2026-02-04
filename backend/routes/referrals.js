const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// POST /api/referrals/register - Register a referral
router.post('/register', async (req, res) => {
    try {
        const { referrer_address, referred_address, referral_code } = req.body;
        
        if (!referrer_address || !referred_address) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        if (referrer_address === referred_address) {
            return res.status(400).json({
                success: false,
                error: 'Cannot refer yourself'
            });
        }
        
        const code = referral_code || crypto.randomBytes(8).toString('hex').toUpperCase();
        
        const result = await db.query(`
            INSERT INTO referrals (referrer_address, referred_address, referral_code)
            VALUES ($1, $2, $3)
            ON CONFLICT (referrer_address, referred_address)
            DO NOTHING
            RETURNING *
        `, [referrer_address, referred_address, code]);
        
        if (result.rowCount === 0) {
            return res.status(409).json({
                success: false,
                error: 'Referral already exists'
            });
        }
        
        res.json({
            success: true,
            referral: result.rows[0],
            referral_code: code
        });
    } catch (error) {
        console.error('Error registering referral:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register referral'
        });
    }
});

// GET /api/referrals/:address - Get agent's referrals
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { as } = req.query; // 'referrer' or 'referred'
        
        let queryText, params;
        
        if (as === 'referrer') {
            queryText = `
                SELECT r.*, a.name as referred_name
                FROM referrals r
                JOIN agents a ON r.referred_address = a.address
                WHERE r.referrer_address = $1
                ORDER BY r.created_at DESC
            `;
            params = [address];
        } else if (as === 'referred') {
            queryText = `
                SELECT r.*, a.name as referrer_name
                FROM referrals r
                JOIN agents a ON r.referrer_address = a.address
                WHERE r.referred_address = $1
                ORDER BY r.created_at DESC
            `;
            params = [address];
        } else {
            // Both
            queryText = `
                SELECT * FROM referrals
                WHERE referrer_address = $1 OR referred_address = $1
                ORDER BY created_at DESC
            `;
            params = [address];
        }
        
        const result = await db.query(queryText, params);
        
        res.json({
            success: true,
            referrals: result.rows
        });
    } catch (error) {
        console.error('Error getting referrals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get referrals'
        });
    }
});

// POST /api/referrals/:id/pay - Mark referral as paid
router.post('/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;
        const { reward_amount, tx_hash } = req.body;
        
        const result = await db.query(`
            UPDATE referrals
            SET status = 'paid',
                reward_amount = $1,
                paid_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'pending'
            RETURNING *
        `, [reward_amount, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Referral not found or already paid'
            });
        }
        
        res.json({
            success: true,
            referral: result.rows[0]
        });
    } catch (error) {
        console.error('Error paying referral:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to pay referral'
        });
    }
});

// GET /api/referrals/stats/:address - Get referral stats
router.get('/stats/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.query(`
            SELECT 
                COUNT(CASE WHEN referrer_address = $1 THEN 1 END) as referrals_made,
                COUNT(CASE WHEN referred_address = $1 THEN 1 END) as was_referred,
                SUM(CASE WHEN referrer_address = $1 AND status = 'paid' THEN reward_amount ELSE 0 END) as total_earnings
            FROM referrals
            WHERE referrer_address = $1 OR referred_address = $1
        `, [address]);
        
        res.json({
            success: true,
            stats: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting referral stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stats'
        });
    }
});

module.exports = router;
