// File: src/backend/routes/invoices.js
import express from 'express';
import { query, pool } from '../db.js'; 
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

// --- PUBLIC ROUTE ---
router.get('/public/:invoiceId', async (req, res) => {
    const { invoiceId } = req.params;
    try {
        const invoiceQuery = `
            SELECT 
                i.*, 
                c.name as client_name,
                p.first_name as user_first_name,
                p.last_name as user_last_name,
                p.avatar_url as user_avatar_url
            FROM invoices i
            JOIN clients c ON i.client_id = c.client_id
            JOIN users u ON i.user_id = u.user_id
            JOIN profiles p ON i.user_id = p.user_id
            WHERE i.invoice_id = $1`;
            
        const invoiceResult = await query(invoiceQuery, [invoiceId]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ message: "Invoice not found." });
        }

        const itemsResult = await query("SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC", [invoiceId]);

        const invoice = invoiceResult.rows[0];
        invoice.items = itemsResult.rows;

        res.status(200).json(invoice);
    } catch (error) {
        console.error("Error fetching public invoice:", error);
        res.status(500).json({ message: "Error retrieving invoice data." });
    }
});


// --- AUTHENTICATED ROUTES ---

router.get('/next-number', authenticate, async (req, res) => {
    const { user_id } = req.user;
    try {
        const year = new Date().getFullYear();
        const countQuery = `SELECT COUNT(*) as invoice_count FROM invoices WHERE user_id = $1 AND EXTRACT(YEAR FROM issue_date) = $2`;
        const countResult = await query(countQuery, [user_id, year]);
        const newSequence = parseInt(countResult.rows[0].invoice_count, 10) + 1;
        const paddedSequence = String(newSequence).padStart(3, '0');
        const nextInvoiceNumber = `INV-${year}-${paddedSequence}`;
        res.status(200).json({ nextInvoiceNumber });
    } catch (error) {
        console.error("Error generating next invoice number:", error);
        res.status(500).json({ message: "Could not generate next invoice number." });
    }
});

router.get('/', authenticate, async (req, res) => {
    const { user_id } = req.user;
    try {
        const { rows } = await query(
            `SELECT i.*, c.name as client_name 
             FROM invoices i 
             JOIN clients c ON i.client_id = c.client_id 
             WHERE i.user_id = $1 
             ORDER BY i.issue_date DESC`,
            [user_id]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        res.status(500).json({ message: "Error fetching invoices" });
    }
});

router.get('/:invoiceId', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { invoiceId } = req.params;
    try {
        const invoiceResult = await query("SELECT * FROM invoices WHERE invoice_id = $1 AND user_id = $2", [invoiceId, user_id]);
        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ message: "Invoice not found." });
        }
        const itemsResult = await query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
        const invoice = invoiceResult.rows[0];
        invoice.items = itemsResult.rows;
        res.status(200).json(invoice);
    } catch (error) {
        console.error("Error fetching invoice:", error);
        res.status(500).json({ message: "Error fetching invoice" });
    }
});

router.post('/', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { client_id, issue_date, due_date, items, notes } = req.body;
    if (!client_id || !issue_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Missing required invoice fields." });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const year = new Date(issue_date).getFullYear();
        const countQuery = `SELECT COUNT(*) as invoice_count FROM invoices WHERE user_id = $1 AND EXTRACT(YEAR FROM issue_date) = $2`;
        const countResult = await client.query(countQuery, [user_id, year]);
        const newSequence = parseInt(countResult.rows[0].invoice_count, 10) + 1;
        const paddedSequence = String(newSequence).padStart(3, '0');
        const generatedInvoiceNumber = `INV-${year}-${paddedSequence}`;
        const total_amount = items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);
        const invoiceQuery = `INSERT INTO invoices (user_id, client_id, invoice_number, issue_date, due_date, total_amount, status, notes) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7) RETURNING *`;
        const invoiceResult = await client.query(invoiceQuery, [user_id, client_id, generatedInvoiceNumber, issue_date, due_date, total_amount, notes]);
        const newInvoice = invoiceResult.rows[0];
        const itemInsertPromises = items.map(item => {
            const itemQuery = `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ($1, $2, $3, $4)`;
            return client.query(itemQuery, [newInvoice.invoice_id, item.description, item.quantity, item.unit_price]);
        });
        await Promise.all(itemInsertPromises);
        await client.query('COMMIT');
        res.status(201).json(newInvoice);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error creating invoice:", error);
        res.status(500).json({ message: "Error creating invoice" });
    } finally {
        client.release();
    }
});

// NEW: Endpoint to UPDATE an existing invoice
router.put('/:invoiceId', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { invoiceId } = req.params;
    const { client_id, issue_date, due_date, items, notes, status } = req.body;

    if (!client_id || !issue_date || !due_date || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Missing required invoice fields." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Can't edit an invoice that has been paid
        const currentInvoiceRes = await client.query("SELECT status FROM invoices WHERE invoice_id = $1 AND user_id = $2", [invoiceId, user_id]);
        if (currentInvoiceRes.rows.length === 0) {
            throw new Error("Invoice not found or user does not have permission.");
        }
        if (currentInvoiceRes.rows[0].status === 'paid') {
            return res.status(403).json({ message: "Cannot edit a paid invoice." });
        }

        const total_amount = items.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0);

        const invoiceQuery = `UPDATE invoices SET client_id = $1, issue_date = $2, due_date = $3, total_amount = $4, notes = $5, status = $6, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $7 AND user_id = $8 RETURNING *`;
        const invoiceResult = await client.query(invoiceQuery, [client_id, issue_date, due_date, total_amount, notes, status || 'draft', invoiceId, user_id]);
        
        if (invoiceResult.rows.length === 0) {
            throw new Error("Invoice not found or user does not have permission.");
        }
        const updatedInvoice = invoiceResult.rows[0];

        // Replace old line items with new ones
        await client.query("DELETE FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
        const itemInsertPromises = items.map(item => {
            const itemQuery = `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES ($1, $2, $3, $4)`;
            return client.query(itemQuery, [updatedInvoice.invoice_id, item.description, item.quantity, item.unit_price]);
        });
        await Promise.all(itemInsertPromises);
        
        await client.query('COMMIT');
        res.status(200).json(updatedInvoice);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error updating invoice:", error);
        res.status(500).json({ message: "Error updating invoice" });
    } finally {
        client.release();
    }
});


router.put('/:invoiceId/status', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { invoiceId } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['draft', 'sent', 'paid', 'overdue', 'void'];
    if (!status || !allowedStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid or missing status." });
    }
    try {
        const { rows } = await query(
            "UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = $2 AND user_id = $3 RETURNING *",
            [status, invoiceId, user_id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: "Invoice not found or you do not have permission to edit it." });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error updating invoice status:", error);
        res.status(500).json({ message: "Error updating invoice status" });
    }
});

export default router;