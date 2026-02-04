const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// POST /api/webhooks - Register a webhook
router.post('/', async (req, res) => {
    try {
        const { agent_address, url, events, secret } = req.body;
        
        if (!agent_address || !url || !events || !Array.isArray(events)) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: agent_address, url, events[]'
            });
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({
                success: false,
                error: 'Invalid URL'
            });
        }
        
        // Generate webhook secret if not provided
        const webhookSecret = secret || crypto.randomBytes(32).toString('hex');
        
        const result = await db.query(`
            INSERT INTO webhooks (agent_address, url, events, secret, active)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (agent_address, url)
            DO UPDATE SET
                events = EXCLUDED.events,
                secret = EXCLUDED.secret,
                active = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [agent_address, url, JSON.stringify(events), webhookSecret]);
        
        res.json({
            success: true,
            webhook: {
                ...result.rows[0],
                secret: webhookSecret // Return secret on creation
            }
        });
    } catch (error) {
        console.error('Error registering webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register webhook'
        });
    }
});

// GET /api/webhooks/:address - Get agent's webhooks
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.query(`
            SELECT id, url, events, active, created_at, updated_at
            FROM webhooks
            WHERE agent_address = $1
            ORDER BY created_at DESC
        `, [address]);
        
        res.json({
            success: true,
            webhooks: result.rows.map(w => ({
                ...w,
                events: JSON.parse(w.events)
            }))
        });
    } catch (error) {
        console.error('Error getting webhooks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get webhooks'
        });
    }
});

// DELETE /api/webhooks/:id - Delete a webhook
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.query(`
            UPDATE webhooks
            SET active = false
            WHERE id = $1
        `, [id]);
        
        res.json({
            success: true,
            message: 'Webhook deactivated'
        });
    } catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete webhook'
        });
    }
});

// POST /api/webhooks/test/:id - Test a webhook
router.post('/test/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(`
            SELECT * FROM webhooks WHERE id = $1 AND active = true
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Webhook not found'
            });
        }
        
        const webhook = result.rows[0];
        
        // Send test payload
        const payload = {
            event: 'test',
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook from ACN' }
        };
        
        const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
        
        // Fire and forget
        fetch(webhook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ACN-Signature': signature,
                'X-ACN-Event': 'test'
            },
            body: JSON.stringify(payload)
        }).catch(err => console.error('Webhook test failed:', err));
        
        res.json({
            success: true,
            message: 'Test webhook sent'
        });
    } catch (error) {
        console.error('Error testing webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test webhook'
        });
    }
});

module.exports = router;
