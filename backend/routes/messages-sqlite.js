const express = require('express');
const router = express.Router();
const db = require('../db-sqlite');

// POST /api/messages - Send a message
router.post('/', async (req, res) => {
    try {
        const { loan_id, sender_address, content } = req.body;
        
        if (!loan_id || !sender_address || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: loan_id, sender_address, content'
            });
        }
        
        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Message too long (max 1000 characters)'
            });
        }
        
        // Validate sender is participant in the loan
        const loanResult = await db.get(`
            SELECT borrower_address, lender_address
            FROM loans
            WHERE loan_id = ?
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
        
        // Get next message ID
        const counterResult = await db.get('SELECT MAX(message_id) as max_id FROM messages');
        const messageId = (counterResult.rows[0]?.max_id || 0) + 1;
        
        // Insert message
        await db.run(`
            INSERT INTO messages (message_id, loan_id, sender_address, content, is_read, created_at)
            VALUES (?, ?, ?, ?, 0, datetime('now'))
        `, [messageId, loan_id, sender_address, content]);
        
        // Get created message
        const messageResult = await db.get('SELECT * FROM messages WHERE message_id = ?', [messageId]);
        
        res.json({
            success: true,
            message: messageResult.rows[0]
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
        const { limit = 100 } = req.query;
        
        const result = await db.query(`
            SELECT m.*, a.name as sender_name
            FROM messages m
            LEFT JOIN agents a ON m.sender_address = a.address
            WHERE m.loan_id = ?
            ORDER BY m.created_at ASC
            LIMIT ?
        `, [loanId, limit]);
        
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
        const result = await db.run(`
            UPDATE messages
            SET is_read = 1
            WHERE loan_id = ?
              AND sender_address != ?
              AND is_read = 0
        `, [loanId, reader_address]);
        
        res.json({
            success: true,
            marked_count: result.changes
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark messages as read'
        });
    }
});

// GET /api/messages/:loanId/unread/:address - Get unread count
router.get('/:loanId/unread/:address', async (req, res) => {
    try {
        const { loanId, address } = req.params;
        
        const result = await db.get(`
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE loan_id = ?
              AND sender_address != ?
              AND is_read = 0
        `, [loanId, address]);
        
        res.json({
            success: true,
            unread_count: result.rows[0].unread_count
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
