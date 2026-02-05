const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLite database file
const dbPath = path.join(__dirname, 'acn.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Initialize database tables
async function initDatabase() {
    try {
        // Create agents table
        await run(`
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT UNIQUE NOT NULL,
                name TEXT,
                description TEXT,
                verified INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create credit_scores table
        await run(`
            CREATE TABLE IF NOT EXISTS credit_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_address TEXT UNIQUE NOT NULL,
                score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
                tier TEXT NOT NULL,
                total_loans INTEGER DEFAULT 0,
                repaid_loans INTEGER DEFAULT 0,
                defaulted_loans INTEGER DEFAULT 0,
                max_loan_amount INTEGER DEFAULT 250000000,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create loans table
        await run(`
            CREATE TABLE IF NOT EXISTS loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loan_id INTEGER UNIQUE NOT NULL,
                borrower_address TEXT NOT NULL,
                lender_address TEXT,
                amount INTEGER NOT NULL,
                interest_rate INTEGER NOT NULL,
                duration INTEGER NOT NULL,
                purpose TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                funded_at DATETIME,
                repaid_at DATETIME,
                tx_hash TEXT
            )
        `);

        // Create messages table
        await run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER UNIQUE NOT NULL,
                loan_id INTEGER NOT NULL,
                sender_address TEXT NOT NULL,
                content TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create pending_verifications table
        await run(`
            CREATE TABLE IF NOT EXISTS pending_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_address TEXT UNIQUE NOT NULL,
                token TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                x_username TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                verified_at DATETIME,
                verified_by TEXT,
                FOREIGN KEY (agent_address) REFERENCES agents(address)
            )
        `);

        console.log('✅ Database initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error.message);
    }
}

// Helper function to run SQL
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

// Helper function to query
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows, rowCount: rows.length });
        });
    });
}

// Get single row
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve({ rows: row ? [row] : [], rowCount: row ? 1 : 0 });
        });
    });
}

module.exports = {
    db,
    initDatabase,
    query,
    get,
    run
};
