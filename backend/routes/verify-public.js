const express = require('express');
const router = express.Router();
// Use Supabase/Postgres in production (Render)
const db = process.env.NODE_ENV === 'production' ? require('../db-supabase') : require('../db-sqlite');

// POST /api/verify/:token - PUBLIC: Automated verification via X/Twitter (for humans to verify agents)
router.post('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { x_username } = req.body;
        
        if (!x_username) {
            return res.status(400).json({
                success: false,
                error: 'X/Twitter username required',
                message: 'Provide the X username (without @) that posted the verification'
            });
        }
        
        // Get pending verification
        const verificationResult = await db.get(
            'SELECT * FROM pending_verifications WHERE token = ? AND status = ?',
            [token, 'pending']
        );
        
        if (verificationResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Verification token not found or already processed'
            });
        }
        
        const verification = verificationResult.rows[0];
        
        // Validate X username format
        const xUsernameRegex = /^[A-Za-z0-9_]{1,15}$/;
        if (!xUsernameRegex.test(x_username)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid X username format'
            });
        }
        
        // AUTO-VERIFY: Update agent to verified
        await db.run(`
            UPDATE agents SET verified = 1, updated_at = datetime('now')
            WHERE address = ?
        `, [verification.agent_address]);
        
        // Update verification status
        await db.run(`
            UPDATE pending_verifications 
            SET status = 'verified', 
                verified_at = datetime('now'), 
                verified_by = 'auto',
                x_username = ?
            WHERE token = ?
        `, [x_username, token]);
        
        res.json({
            success: true,
            message: 'Agent verified successfully!',
            agent_address: verification.agent_address,
            verified: true,
            next_step: 'You can now request loans at /api/loans/request'
        });
        
    } catch (error) {
        console.error('Error verifying agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify agent',
            details: error.message
        });
    }
});

// GET /api/verify/status/:token - PUBLIC: Check verification status
router.get('/status/:token', async (req, res) => {
    try {
        const { token } = req.params;
        
        const result = await db.get(`
            SELECT pv.*, a.verified as agent_verified, a.name, a.address
            FROM pending_verifications pv
            JOIN agents a ON pv.agent_address = a.address
            WHERE pv.token = ?
        `, [token]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Verification token not found'
            });
        }
        
        const verification = result.rows[0];
        
        res.json({
            success: true,
            status: verification.status,
            agent_address: verification.address,
            agent_name: verification.name,
            verified: verification.agent_verified === 1,
            created_at: verification.created_at,
            verified_at: verification.verified_at
        });
    } catch (error) {
        console.error('Error checking verification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check verification status'
        });
    }
});

// GET /api/verify/agent/:address - PUBLIC: Check if agent is verified
router.get('/agent/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.get(`
            SELECT address, name, verified FROM agents WHERE address = ?
        `, [address]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        const agent = result.rows[0];
        
        res.json({
            success: true,
            address: agent.address,
            name: agent.name,
            verified: agent.verified === 1
        });
    } catch (error) {
        console.error('Error checking agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check agent status'
        });
    }
});

module.exports = router;
