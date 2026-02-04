const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendWebhook } = require('../webhook-service');

// GET /api/loans - List open loans
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        let queryText = `
            SELECT l.*, a1.name as borrower_name, a2.name as lender_name
            FROM loans l
            LEFT JOIN agents a1 ON l.borrower_address = a1.address
            LEFT JOIN agents a2 ON l.lender_address = a2.address
        `;
        
        const params = [];
        if (status) {
            queryText += ` WHERE l.status = $1`;
            params.push(status);
            queryText += ` ORDER BY l.created_at DESC LIMIT $2 OFFSET $3`;
            params.push(limit, offset);
        } else {
            queryText += ` ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`;
            params.push(limit, offset);
        }
        
        const result = await db.query(queryText, params);
        
        res.json({
            success: true,
            loans: result.rows,
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
        
        const result = await db.query(`
            SELECT l.*, a1.name as borrower_name, a2.name as lender_name
            FROM loans l
            LEFT JOIN agents a1 ON l.borrower_address = a1.address
            LEFT JOIN agents a2 ON l.lender_address = a2.address
            WHERE l.loan_id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        res.json({
            success: true,
            loan: result.rows[0]
        });
    } catch (error) {
        console.error('Error getting loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loan'
        });
    }
});

// POST /api/loans - Create a new loan request
router.post('/', async (req, res) => {
    try {
        const {
            loan_id,
            borrower_address,
            amount,
            interest_rate,
            duration,
            purpose,
            tx_hash
        } = req.body;
        
        // Validation
        if (!loan_id || !borrower_address || !amount || !interest_rate || !duration || !purpose) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Insert loan
        const result = await db.query(`
            INSERT INTO loans (
                loan_id, borrower_address, amount, interest_rate,
                duration, purpose, status, tx_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Requested', $7)
            RETURNING *
        `, [loan_id, borrower_address, amount, interest_rate, duration, purpose, tx_hash]);
        
        res.json({
            success: true,
            loan: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create loan'
        });
    }
});

// POST /api/loans/:id/fund - Fund a loan
router.post('/:id/fund', async (req, res) => {
    try {
        const { id } = req.params;
        const { lender_address, tx_hash } = req.body;
        
        if (!lender_address) {
            return res.status(400).json({
                success: false,
                error: 'Missing lender_address'
            });
        }
        
        // Update loan status
        const result = await db.query(`
            UPDATE loans
            SET lender_address = $1,
                status = 'Funded',
                funded_at = CURRENT_TIMESTAMP,
                tx_hash = $2
            WHERE loan_id = $3 AND status = 'Requested'
            RETURNING *
        `, [lender_address, tx_hash, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found or already funded'
            });
        }
        
        const fundedLoan = result.rows[0];
        
        // Send webhook to borrower
        sendWebhook(fundedLoan.borrower_address, 'loan_funded', {
            loan_id: fundedLoan.loan_id,
            lender_address: lender_address,
            amount: fundedLoan.amount,
            interest_rate: fundedLoan.interest_rate,
            tx_hash: tx_hash
        });
        
        res.json({
            success: true,
            loan: fundedLoan
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
        const { tx_hash } = req.body;
        
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');
            
            // Update loan status
            const loanResult = await client.query(`
                UPDATE loans
                SET status = 'Repaid',
                    repaid_at = CURRENT_TIMESTAMP,
                    tx_hash = $1
                WHERE loan_id = $2 AND status = 'Funded'
                RETURNING *
            `, [tx_hash, id]);
            
            if (loanResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Loan not found or not funded'
                });
            }
            
            const loan = loanResult.rows[0];
            
            // Update credit score
            const creditResult = await client.query(`
                SELECT score FROM credit_scores
                WHERE agent_address = $1
            `, [loan.borrower_address]);
            
            if (creditResult.rows.length > 0) {
                const oldScore = creditResult.rows[0].score;
                const newScore = Math.min(oldScore + 10, 850);
                
                await client.query(`
                    UPDATE credit_scores
                    SET score = $1,
                        repaid_loans = repaid_loans + 1,
                        total_loans = total_loans + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE agent_address = $2
                `, [newScore, loan.borrower_address]);
                
                // Log score change
                await client.query(`
                    INSERT INTO credit_score_history (
                        agent_address, old_score, new_score, reason, loan_id
                    ) VALUES ($1, $2, $3, 'loan_repaid', $4)
                `, [loan.borrower_address, oldScore, newScore, id]);
            }
            
            await client.query('COMMIT');
            
            // Send webhooks
            sendWebhook(loan.borrower_address, 'loan_repaid', {
                loan_id: loan.loan_id,
                amount: loan.amount,
                new_credit_score: loan.borrower_address ? (await client.query('SELECT score FROM credit_scores WHERE agent_address = $1', [loan.borrower_address])).rows[0]?.score : null,
                tx_hash: tx_hash
            });
            
            sendWebhook(loan.lender_address, 'loan_repaid_by_borrower', {
                loan_id: loan.loan_id,
                borrower_address: loan.borrower_address,
                amount: loan.amount,
                tx_hash: tx_hash
            });
            
            res.json({
                success: true,
                loan: loan
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error repaying loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to repay loan'
        });
    }
});

// GET /api/loans/borrower/:address - Get loans by borrower
router.get('/borrower/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.query(`
            SELECT l.*, a.name as lender_name
            FROM loans l
            LEFT JOIN agents a ON l.lender_address = a.address
            WHERE l.borrower_address = $1
            ORDER BY l.created_at DESC
        `, [address]);
        
        res.json({
            success: true,
            loans: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error getting borrower loans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loans'
        });
    }
});

// GET /api/loans/lender/:address - Get loans by lender
router.get('/lender/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        const result = await db.query(`
            SELECT l.*, a.name as borrower_name
            FROM loans l
            LEFT JOIN agents a ON l.borrower_address = a.address
            WHERE l.lender_address = $1
            ORDER BY l.created_at DESC
        `, [address]);
        
        res.json({
            success: true,
            loans: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error getting lender loans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loans'
        });
    }
});

module.exports = router;
