const db = require('./db-sqlite');

async function cleanup() {
    try {
        console.log('🧹 Cleaning up test data...\n');
        
        // Get list of test addresses to delete
        const testAddresses = [
            '0xTestClaimAgent',
            '0xNoCreditTest', 
            '0xTestAgent123',
            '0x01fE86d6c350026deC79220E1c15e5964d1161aa' // old Risueno
        ];
        
        for (const addr of testAddresses) {
            console.log(`Deleting agent: ${addr}`);
            
            // Delete loans
            await db.run('DELETE FROM loans WHERE borrower_address = ? OR lender_address = ?', [addr, addr]);
            
            // Delete credit scores
            await db.run('DELETE FROM credit_scores WHERE agent_address = ?', [addr]);
            
            // Delete pending verifications
            await db.run('DELETE FROM pending_verifications WHERE agent_address = ?', [addr]);
            
            // Delete agent
            await db.run('DELETE FROM agents WHERE address = ?', [addr]);
        }
        
        // Also delete any agents with "Test" in the name
        const testAgents = await db.query("SELECT address FROM agents WHERE name LIKE '%Test%'");
        for (const agent of testAgents.rows) {
            console.log(`Deleting test agent by name: ${agent.address}`);
            await db.run('DELETE FROM loans WHERE borrower_address = ? OR lender_address = ?', [agent.address, agent.address]);
            await db.run('DELETE FROM credit_scores WHERE agent_address = ?', [agent.address]);
            await db.run('DELETE FROM pending_verifications WHERE agent_address = ?', [agent.address]);
            await db.run('DELETE FROM agents WHERE address = ?', [agent.address]);
        }
        
        console.log('\n✅ Cleanup complete!\n');
        
        // Show remaining agents
        const remaining = await db.query('SELECT id, name, address, verified FROM agents ORDER BY id');
        console.log('Remaining agents:');
        if (remaining.rows.length === 0) {
            console.log('  None - fresh start!');
        } else {
            remaining.rows.forEach(a => {
                console.log(`  ID:${a.id} | ${a.name} | ${a.address} | Verified:${a.verified}`);
            });
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

cleanup();
