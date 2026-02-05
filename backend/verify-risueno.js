const db = require('./db-sqlite');

async function verifyRisueno() {
    try {
        const address = '0x22DD1C3dc68025C1fe2CC3b8e3197c4EE1141a0A';
        
        // Verify the agent
        await db.run(`
            UPDATE agents SET verified = 1, updated_at = datetime('now')
            WHERE address = ?
        `, [address]);
        
        // Update any pending verification
        await db.run(`
            UPDATE pending_verifications 
            SET status = 'verified', verified_at = datetime('now'), verified_by = 'admin'
            WHERE agent_address = ?
        `, [address]);
        
        // Create credit score if not exists
        const existing = await db.get('SELECT * FROM credit_scores WHERE agent_address = ?', [address]);
        if (existing.rows.length === 0) {
            await db.run(`
                INSERT INTO credit_scores (agent_address, score, tier, max_loan_amount)
                VALUES (?, 300, 'No Credit', 25000000)
            `, [address]);
        }
        
        console.log('✅ Risueno verified successfully!');
        
        // Check status
        const agent = await db.get('SELECT * FROM agents WHERE address = ?', [address]);
        console.log('Agent:', agent.rows[0]);
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        db.db.close();
    }
}

verifyRisueno();
