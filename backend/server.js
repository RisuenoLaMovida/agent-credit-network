const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
app.use(limiter);

// Routes
app.get('/', (req, res) => {
  res.json({
    name: 'Agent Credit Network API',
    version: '0.1.0',
    status: 'running',
    endpoints: [
      '/api/loans - Loan management',
      '/api/agents - Agent profiles',
      '/api/credit - Credit scores',
      '/api/lenders - Lender operations'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// TODO: Implement actual routes
// app.use('/api/loans', require('./routes/loans'));
// app.use('/api/agents', require('./routes/agents'));
// app.use('/api/credit', require('./routes/credit'));
// app.use('/api/lenders', require('./routes/lenders'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Agent Credit Network API running on port ${PORT}`);
});
