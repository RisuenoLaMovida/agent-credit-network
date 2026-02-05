const express = require('express');
const router = express.Router();
const db = require('../db-sqlite');

// Loan status constants
const LOAN_STATUS = {
    REQUESTED: 0,
    FUNDED: 1,
    REPAID: 2,
    DEFAULTED: 3,
    CANCELLED: 4
};

const STATUS_NAMES = ['Requested', 'Funded', 'Repaid', 'Defaulted', 'Cancelled'];

// POST /api/loans/request - Request a new loan
router.post('/request', async (req, res) => {
    try {
        const { borrower_address, amount, interest_rate, duration, purpose } = req.body;
        
        // Validation
        if (!borrower_address || !amount || !interest_rate || !duration) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: borrower_address, amount, interest_rate, duration'
            });
        }
        
        if (amount < 1000000 || amount > 10000000000) { // $1 to $10K (6 decimals)
            return res.status(400).json({
                success: false,
                error: 'Amount must be between $1 and $10,000'
            });
        }
        
        if (interest_rate < 500 || interest_rate > 2500) { // 5% to 25%
            return res.status(400).json({
                success: false,
                error: 'Interest rate must be between 5% and 25%'
            });
        }
        
        if (duration < 7 || duration > 180) { // 7 to 180 days
            return res.status(400).json({
                success: false,
                error: 'Duration must be between 7 and 180 days'
            });
        }
        
        // Check if borrower is registered
        const agentCheck = await db.get('SELECT * FROM agents WHERE address = ?', [borrower_address]);
        if (agentCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Agent not registered. Register first at /api/agents/register'
            });
        }
        
        // Get credit score and check max loan amount
        const creditResult = await db.get('SELECT * FROM credit_scores WHERE agent_address = ?', [borrower_address]);
        if (creditResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Credit score not found. Contact support.'
            });
        }
        
        const credit = creditResult.rows[0];
        
        // Calculate max loan based on tier (TRUST-BASED LIMITS)
        const TIER_LIMITS = {
            'No Credit': 25000000,      // $25 - Brand new agents
            'Bronze': 100000000,         // $100 - Starting out
            'Silver': 250000000,         // $250 - Building trust
            'Gold': 500000000,           // $500 - Proven borrower
            'Platinum': 1000000000       // $1,000 - Elite status
        };
        
        const maxLoanAmount = TIER_LIMITS[credit.tier] || 25000000;
        
        if (amount > maxLoanAmount) {
            return res.status(400).json({
                success: false,
                error: `Loan amount exceeds your tier limit. Your max: $${maxLoanAmount / 1000000} (Tier: ${credit.tier})`,
                max_allowed: maxLoanAmount,
                your_tier: credit.tier,
                your_score: credit.score,
                warning: 'Start small, build trust, unlock higher limits'
            });
        }
        
        // Check for active loans (prevent multiple simultaneous loans)
        const activeLoansResult = await db.get(`
            SELECT COUNT(*) as count FROM loans 
            WHERE borrower_address = ? 
            AND status IN (?, ?)
        `, [borrower_address, LOAN_STATUS.REQUESTED, LOAN_STATUS.FUNDED]);
        
        if (activeLoansResult.rows[0].count >= 3) {
            return res.status(400).json({
                success: false,
                error: 'You have too many active loans. Repay or cancel existing loans before requesting new ones.',
                active_loans: activeLoansResult.rows[0].count,
                max_allowed: 3
            });
        }
        
        // Get next loan ID
        const counterResult = await db.get('SELECT MAX(loan_id) as max_id FROM loans');
        const loanId = (counterResult.rows[0]?.max_id || 0) + 1;
        
        // Insert loan
        await db.run(`
            INSERT INTO loans (loan_id, borrower_address, lender_address, amount, interest_rate, duration, purpose, status, created_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, datetime('now'))
        `, [loanId, borrower_address, amount, interest_rate, duration, purpose || '', LOAN_STATUS.REQUESTED]);
        
        // Get created loan
        const loanResult = await db.get('SELECT * FROM loans WHERE loan_id = ?', [loanId]);
        
        res.json({
            success: true,
            loan: {
                ...loanResult.rows[0],
                status_name: STATUS_NAMES[loanResult.rows[0].status]
            },
            message: 'Loan requested successfully'
        });
    } catch (error) {
        console.error('Error requesting loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to request loan'
        });
    }
});

// POST /api/loans/:id/fund - Fund a loan
router.post('/:id/fund', async (req, res) => {
    try {
        const { id } = req.params;
        const { lender_address } = req.body;
        
        if (!lender_address) {
            return res.status(400).json({
                success: false,
                error: 'lender_address is required'
            });
        }
        
        // Get loan
        const loanResult = await db.get('SELECT * FROM loans WHERE loan_id = ?', [id]);
        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        const loan = loanResult.rows[0];
        
        if (parseInt(loan.status) !== LOAN_STATUS.REQUESTED) {
            return res.status(400).json({
                success: false,
                error: `Loan cannot be funded (status: ${STATUS_NAMES[parseInt(loan.status)]})`
            });
        }
        
        if (loan.borrower_address === lender_address) {
            return res.status(400).json({
                success: false,
                error: 'Cannot fund your own loan'
            });
        }
        
        // Update loan
        await db.run(`
            UPDATE loans 
            SET lender_address = ?, status = ?, funded_at = datetime('now')
            WHERE loan_id = ?
        `, [lender_address, LOAN_STATUS.FUNDED, id]);
        
        // Get updated loan
        const updatedResult = await db.get('SELECT * FROM loans WHERE loan_id = ?', [id]);
        
        res.json({
            success: true,
            loan: {
                ...updatedResult.rows[0],
                status_name: STATUS_NAMES[parseInt(updatedResult.rows[0].status)]
            },
            message: 'Loan funded successfully'
        });
    } catch (error) {
        console.error('Error funding loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fund loan'
        });
    }
});

// POST /api/loans/:id/repay - Repay a loan
router.post('/:id/repay', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get loan
        const loanResult = await db.get('SELECT * FROM loans WHERE loan_id = ?', [id]);
        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        const loan = loanResult.rows[0];
        
        if (parseInt(loan.status) !== LOAN_STATUS.FUNDED) {
            return res.status(400).json({
                success: false,
                error: `Loan cannot be repaid (status: ${STATUS_NAMES[parseInt(loan.status)]})`
            });
        }
        
        // Update loan
        await db.run(`
            UPDATE loans 
            SET status = ?, repaid_at = datetime('now')
            WHERE loan_id = ?
        `, [LOAN_STATUS.REPAID, id]);
        
        // Update borrower's credit score
        await db.run(`
            UPDATE credit_scores 
            SET total_loans = total_loans + 1, 
                repaid_loans = repaid_loans + 1,
                score = MIN(score + 10, 850)
            WHERE agent_address = ?
        `, [loan.borrower_address]);
        
        // Get updated loan
        const updatedResult = await db.get('SELECT * FROM loans WHERE loan_id = ?', [id]);
        
        res.json({
            success: true,
            loan: {
                ...updatedResult.rows[0],
                status_name: STATUS_NAMES[parseInt(updatedResult.rows[0].status)]
            },
            message: 'Loan repaid successfully'
        });
    } catch (error) {
        console.error('Error repaying loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to repay loan'
        });
    }
});

// GET /api/loans - List all loans
router.get('/', async (req, res) => {
    try {
        const { status, borrower, lender, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM loans WHERE 1=1';
        const params = [];
        
        if (status !== undefined) {
            query += ' AND status = ?';
            params.push(parseInt(status));
        }
        
        if (borrower) {
            query += ' AND borrower_address = ?';
            params.push(borrower);
        }
        
        if (lender) {
            query += ' AND lender_address = ?';
            params.push(lender);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        
        const result = await db.query(query, params);
        
        // Add status names
        const loans = result.rows.map(loan => ({
            ...loan,
            status_name: STATUS_NAMES[parseInt(loan.status)]
        }));
        
        res.json({
            success: true,
            loans,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error listing loans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list loans'
        });
    }
});

// GET /api/loans/:id - Get loan details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.get('SELECT * FROM loans WHERE loan_id = ?', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        res.json({
            success: true,
            loan: {
                ...result.rows[0],
                status_name: STATUS_NAMES[parseInt(result.rows[0].status)]
            }
        });
    } catch (error) {
        console.error('Error getting loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loan'
        });
    }
});

// POST /api/loans/:id/cancel - Cancel a loan request
router.post('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const { borrower_address } = req.body;
        
        // Get loan
        const loanResult = await db.get('SELECT * FROM loans WHERE loan_id = ?', [id]);
        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        const loan = loanResult.rows[0];
        
        if (loan.borrower_address !== borrower_address) {
            return res.status(403).json({
                success: false,
                error: 'Only borrower can cancel'
            });
        }
        
        if (parseInt(loan.status) !== LOAN_STATUS.REQUESTED) {
            return res.status(400).json({
                success: false,
                error: `Cannot cancel loan (status: ${STATUS_NAMES[parseInt(loan.status)]})`
            });
        }
        
        // Update loan
        await db.run(`
            UPDATE loans 
            SET status = ?
            WHERE loan_id = ?
        `, [LOAN_STATUS.CANCELLED, id]);
        
        res.json({
            success: true,
            message: 'Loan cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel loan'
        });
    }
});

module.exports = router;
