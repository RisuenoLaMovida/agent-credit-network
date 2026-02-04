const db = require('./db');
const crypto = require('crypto');

/**
 * Send webhook notification to all registered listeners for an agent
 * @param {string} agentAddress - The agent to notify
 * @param {string} event - Event type (loan_funded, loan_repaid, etc.)
 * @param {object} data - Event payload
 */
async function sendWebhook(agentAddress, event, data) {
    try {
        // Get active webhooks for this agent that listen to this event
        const result = await db.query(`
            SELECT * FROM webhooks 
            WHERE agent_address = $1 
              AND active = true
              AND events @> $2::jsonb
        `, [agentAddress, JSON.stringify([event])]);
        
        if (result.rows.length === 0) return;
        
        const payload = {
            event: event,
            timestamp: new Date().toISOString(),
            data: data
        };
        
        const payloadString = JSON.stringify(payload);
        
        // Send to all matching webhooks (fire and forget)
        for (const webhook of result.rows) {
            try {
                const signature = crypto
                    .createHmac('sha256', webhook.secret)
                    .update(payloadString)
                    .digest('hex');
                
                fetch(webhook.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-ACN-Signature': signature,
                        'X-ACN-Event': event
                    },
                    body: payloadString
                }).then(async response => {
                    // Log delivery
                    await db.query(`
                        INSERT INTO webhook_logs (webhook_id, event, payload, response_status, success)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [webhook.id, event, payload, response.status, response.ok]);
                }).catch(async err => {
                    // Log failure
                    await db.query(`
                        INSERT INTO webhook_logs (webhook_id, event, payload, response_status, response_body, success)
                        VALUES ($1, $2, $3, $4, $5, false)
                    `, [webhook.id, event, payload, 0, err.message]);
                });
            } catch (err) {
                console.error('Webhook delivery error:', err);
            }
        }
    } catch (error) {
        console.error('Webhook system error:', error);
    }
}

module.exports = { sendWebhook };
