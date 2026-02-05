const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db-sqlite');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
