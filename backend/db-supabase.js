const { Pool } = require('pg');

// PostgreSQL/Supabase connection configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Log connection status
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database (Supabase)');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
});

// Initialize database tables (auto-create if not exist)
async function initDatabase() {
    try {
        const client = await pool.connect();
        try {
            // Test connection
            await client.query('SELECT NOW()');
            console.log('✅ Database connection verified');
            
            // Auto-create tables if they don't exist
            console.log('🔄 Checking/creating tables...');
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS agents (
                    id SERIAL PRIMARY KEY,
                    address VARCHAR(42) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS credit_scores (
                    agent_address VARCHAR(42) PRIMARY KEY REFERENCES agents(address),
                    score INTEGER DEFAULT 300,
                    tier VARCHAR(20) DEFAULT 'No Credit',
                    max_loan_amount BIGINT DEFAULT 25000000,
                    total_loans INTEGER DEFAULT 0,
                    repaid_loans INTEGER DEFAULT 0,
                    defaulted_loans INTEGER DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS loans (
                    id SERIAL PRIMARY KEY,
                    loan_id INTEGER UNIQUE NOT NULL,
                    borrower_address VARCHAR(42) NOT NULL,
                    lender_address VARCHAR(42),
                    amount BIGINT NOT NULL,
                    interest_rate INTEGER NOT NULL,
                    duration INTEGER NOT NULL,
                    purpose TEXT,
                    status INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    funded_at TIMESTAMP,
                    repaid_at TIMESTAMP,
                    tx_hash VARCHAR(66)
                )
            `);
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS pending_verifications (
                    id SERIAL PRIMARY KEY,
                    agent_address VARCHAR(42) NOT NULL,
                    token VARCHAR(50) UNIQUE NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW(),
                    verified_at TIMESTAMP,
                    verified_by VARCHAR(50),
                    x_username VARCHAR(50)
                )
            `);
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    loan_id INTEGER NOT NULL,
                    sender_address VARCHAR(42) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    is_read BOOLEAN DEFAULT FALSE
                )
            `);
            
            console.log('✅ All tables ready');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
        throw error;
    }
}

// Helper function to run SQL (INSERT, UPDATE, DELETE)
// Returns: { id: lastID, changes: rowCount }
async function run(sql, params = []) {
    const client = await pool.connect();
    try {
        // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
        let pgSql = sql;
        let paramIndex = 1;
        while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex}`);
            paramIndex++;
        }
        
        // Convert SQLite datetime('now') to PostgreSQL NOW()
        pgSql = pgSql.replace(/datetime\('now'\)/gi, 'NOW()');
        pgSql = pgSql.replace(/datetime\('now',\s*'([-+]?\d+)\s*day'\)/gi, "NOW() + INTERVAL '$1 days'");
        
        // Handle SQLite MIN/MAX in UPDATE statements
        pgSql = pgSql.replace(/MIN\(([^)]+)\)/gi, 'LEAST($1)');
        pgSql = pgSql.replace(/MAX\(([^)]+)\)/gi, 'GREATEST($1)');
        
        const result = await client.query(pgSql, params);
        
        return {
            id: result.rows[0]?.id || null,
            changes: result.rowCount
        };
    } finally {
        client.release();
    }
}

// Helper function to query multiple rows
// Returns: { rows: [], rowCount: number }
async function query(sql, params = []) {
    const client = await pool.connect();
    try {
        // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
        let pgSql = sql;
        let paramIndex = 1;
        while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex}`);
            paramIndex++;
        }
        
        // Convert SQLite datetime functions
        pgSql = pgSql.replace(/datetime\('now'\)/gi, 'NOW()');
        pgSql = pgSql.replace(/datetime\('now',\s*'([-+]?\d+)\s*day'\)/gi, "NOW() + INTERVAL '$1 days'");
        
        const result = await client.query(pgSql, params);
        
        // Convert PostgreSQL types to match SQLite
        const rows = result.rows.map(row => ({
            ...row,
            // Convert verified from boolean to integer if present
            verified: row.verified !== undefined ? (row.verified ? 1 : 0) : undefined,
            // Ensure is_read is integer
            is_read: row.is_read !== undefined ? parseInt(row.is_read) : undefined
        }));
        
        return {
            rows: rows,
            rowCount: result.rowCount
        };
    } finally {
        client.release();
    }
}

// Helper function to get a single row
// Returns: { rows: [row] || [], rowCount: 0 || 1 }
async function get(sql, params = []) {
    const client = await pool.connect();
    try {
        // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
        let pgSql = sql;
        let paramIndex = 1;
        while (pgSql.includes('?')) {
            pgSql = pgSql.replace('?', `$${paramIndex}`);
            paramIndex++;
        }
        
        // Convert SQLite datetime functions
        pgSql = pgSql.replace(/datetime\('now'\)/gi, 'NOW()');
        pgSql = pgSql.replace(/datetime\('now',\s*'([-+]?\d+)\s*day'\)/gi, "NOW() + INTERVAL '$1 days'");
        
        const result = await client.query(pgSql, params);
        
        if (result.rows.length === 0) {
            return {
                rows: [],
                rowCount: 0
            };
        }
        
        // Convert PostgreSQL types to match SQLite
        const row = {
            ...result.rows[0],
            // Convert verified from boolean to integer if present
            verified: result.rows[0].verified !== undefined ? (result.rows[0].verified ? 1 : 0) : undefined,
            // Ensure is_read is integer
            is_read: result.rows[0].is_read !== undefined ? parseInt(result.rows[0].is_read) : undefined
        };
        
        return {
            rows: [row],
            rowCount: 1
        };
    } finally {
        client.release();
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received: closing database pool');
    await pool.end();
});

process.on('SIGINT', async () => {
    console.log('SIGINT received: closing database pool');
    await pool.end();
});

module.exports = {
    db: pool,
    pool,
    initDatabase,
    query,
    get,
    run
};
