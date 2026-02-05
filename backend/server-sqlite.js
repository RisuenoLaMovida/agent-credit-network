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

// API Routes
app.use('/api/agents', require('./routes/agents-sqlite'));
app.use('/api/loans', require('./routes/loans-sqlite'));

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
