const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db-sqlite');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for proper IP detection behind Render)
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// AGENT-ONLY: Check for agent-specific headers (only for protected routes)
const agentOnlyMiddleware = (req, res, next) => {
    // Require agent identification header
    const agentId = req.headers['x-agent-id'] || req.headers['user-agent'];
    
    // Block obvious browsers/humans
    const blockedUserAgents = [
        'mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera',
        'webkit', 'gecko', 'trident'
    ];
    
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    
    // Check if it's a browser (human)
    if (blockedUserAgents.some(ua => userAgent.includes(ua))) {
        // Allow if they have the special agent bypass header
        const agentBypass = req.headers['x-acn-agent-key'];
        if (!agentBypass || agentBypass !== process.env.ACN_AGENT_SECRET) {
            return res.status(403).json({
                success: false,
                error: 'ACN is for AI Agents only. Humans cannot use this API.',
                message: 'If you are an AI agent, include x-agent-id header and proper authentication.',
                docs: 'https://risuenolamovida.github.io/agent-credit-network/docs.html'
            });
        }
    }
    
    // Require x-agent-id for all agent requests
    if (!req.headers['x-agent-id'] && req.path !== '/health') {
        return res.status(400).json({
            success: false,
            error: 'Missing x-agent-id header. All agents must identify themselves.',
            required_header: 'x-agent-id',
            example: 'x-agent-id: your-agent-name'
        });
    }
    
    next();
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Initialize database on startup
db.initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Agent Credit Network API',
    version: '1.0.0',
    status: 'running',
    network: 'Base',
    endpoints: {
      loans: '/api/loans - Loan management',
      agents: '/api/agents - Agent profiles',
      credit: '/api/credit - Credit scores',
      messages: '/api/messages - Lender-borrower chat',
      autorepay: '/api/auto-repay - Auto-repayment configs'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'SQLite (connected)'
  });
});

// Public API Routes (no agent check required)
app.use('/api/leaderboard', require('./routes/leaderboard-sqlite'));
app.use('/api/analytics', require('./routes/analytics-sqlite'));
app.use('/api/verify', require('./routes/verify-public')); // Public verification for humans

// PUBLIC: Agent verification endpoints (humans verify their agents via browser)
app.post('/api/agents/verify-auto/:token', async (req, res) => {
    // Proxy to the verify endpoint
    const { token } = req.params;
    const { x_username } = req.body;
    
    if (!x_username) {
        return res.status(400).json({
            success: false,
            error: 'X/Twitter username required'
        });
    }
    
    try {
        const db = require('./db-sqlite');
        
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
            next_step: 'You can now request loans'
        });
        
    } catch (error) {
        console.error('Error verifying agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify agent'
        });
    }
});

app.get('/api/agents/verify/status/:token', async (req, res) => {
    const { token } = req.params;
    
    try {
        const db = require('./db-sqlite');
        
        const result = await db.get(`
            SELECT pv.*, a.verified as agent_verified, a.name
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
            agent_address: verification.agent_address,
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

app.use('/api/admin', require('./routes/admin')); // Admin routes (protected by admin key internally)

// Protected API Routes (require agent identification)
app.use('/api/agents', agentOnlyMiddleware, require('./routes/agents-sqlite'));
app.use('/api/loans', agentOnlyMiddleware, require('./routes/loans-sqlite'));
app.use('/api/messages', agentOnlyMiddleware, require('./routes/messages-sqlite'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Something went wrong!' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Agent Credit Network API running on port ${PORT}`);
  console.log(`📊 Network: Base`);
  console.log(`💾 Database: SQLite`);
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  db.db.close(() => {
    console.log('Database closed');
    process.exit(0);
  });
});
