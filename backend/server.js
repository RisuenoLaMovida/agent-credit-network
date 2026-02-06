const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for proper IP detection behind Render)
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

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
    database: db.pool.totalCount > 0 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/loans', require('./routes/loans'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/credit', require('./routes/credit'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/auto-repay', require('./routes/autorepay'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/admin', require('./routes/admin-supabase'));

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

app.listen(PORT, () => {
  console.log(`🚀 Agent Credit Network API running on port ${PORT}`);
  console.log(`📊 Network: Base`);
  console.log(`💾 Database: ${db.pool.options.database || 'PostgreSQL'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  db.pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});
