const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/messages - Send a message
router.post('/', async (req, res) => {
    try {
        const {
            message_id,
            loan_id,
            sender_address,
            content,
            tx_hash
        } = req.body;
        
        if (!loan_id || !sender_address || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        // Validate sender is participant
        const loanResult = await db.query(`
            SELECT borrower_address, lender_address
            FROM loans
            WHERE loan_id = $1
        `, [loan_id]);
        
        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Loan not found'
            });
        }
        
        const loan = loanResult.rows[0];
        if (sender_address !== loan.borrower_address && sender_address !== loan.lender_address) {
            return res.status(403).json({
                success: false,
                error: 'Only loan participants can send messages'
            });
        }
        
        // Insert message
        const result = await db.query(`
            INSERT INTO messages (
                message_id, loan_id, sender_address, content, tx_hash
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [message_id, loan_id, sender_address, content, tx_hash]);
        
        res.json({
            success: true,
            message: result.rows[0]
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// GET /api/messages/:loanId - Get messages for a loan
router.get('/:loanId', async (req, res) => {
    try {
        const { loanId } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        
        const result = await db.query(`
            SELECT m.*, a.name as sender_name
            FROM messages m
            LEFT JOIN agents a ON m.sender_address = a.address
            WHERE m.loan_id = $1
            ORDER BY m.created_at ASC
            LIMIT $2 OFFSET $3
        `, [loanId, limit, offset]);
        
        res.json({
            success: true,
            messages: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get messages'
        });
    }
});

// PUT /api/messages/:loanId/read - Mark messages as read
router.put('/:loanId/read', async (req, res) => {
    try {
        const { loanId } = req.params;
        const { reader_address } = req.body;
        
        if (!reader_address) {
            return res.status(400).json({
                success: false,
                error: 'reader_address required'
            });
        }
        
        // Mark all unread messages not sent by reader as read
        const result = await db.query(`
            UPDATE messages
            SET is_read = true
            WHERE loan_id = $1
              AND sender_address != $2
              AND is_read = false
            RETURNING *
        `, [loanId, reader_address]);
        
        res.json({
            success: true,
            marked_count: result.rowCount
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark messages as read'
        });
    }
});

// GET /api/messages/:loanId/unread - Get unread count
router.get('/:loanId/unread/:address', async (req, res) => {
    try {
        const { loanId, address } = req.params;
        
        const result = await db.query(`
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE loan_id = $1
              AND sender_address != $2
              AND is_read = false
        `, [loanId, address]);
        
        res.json({
            success: true,
            unread_count: parseInt(result.rows[0].unread_count)
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unread count'
        });
    }
});

module.exports = router;
