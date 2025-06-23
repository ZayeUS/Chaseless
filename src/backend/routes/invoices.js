// File: src/backend/routes/invoices.js
import express from 'express';
import { query, pool } from '../db.js';
import authenticate from '../middlewares/authenticate.js';
import { sendEmail } from '../utils/email.js';
import { professionalTemplate } from '../templates/professionalTemplate.js';

const router = express.Router();

// ── PUBLIC ROUTE ──────────────────────────────────────────────────────────────
// GET /api/invoices/public/:invoiceId
// Returns invoice + items + client & user info, increments view_count/viewed_at.
router.get('/public/:invoiceId', async (req, res) => {
  const { invoiceId } = req.params;
  try {
    // Load invoice with client & user data
    const invoiceQ = `
      SELECT 
        i.*, 
        c.name    AS client_name,
        c.email   AS client_email,
        c.address AS client_address,
        p.first_name     AS user_first_name,
        p.last_name      AS user_last_name,
        p.avatar_url     AS user_avatar_url
      FROM invoices i
      JOIN clients  c ON i.client_id = c.client_id
      JOIN users    u ON i.user_id   = u.user_id
      JOIN profiles p ON i.user_id   = p.user_id
      WHERE i.invoice_id = $1
    `;
    const invRes = await query(invoiceQ, [invoiceId]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found." });
    }
    const invoice = invRes.rows[0];

    // Increment view_count and set viewed_at
    await query(
      `UPDATE invoices
         SET view_count  = COALESCE(view_count,0) + 1,
             viewed_at   = CURRENT_TIMESTAMP,
             updated_at  = CURRENT_TIMESTAMP
       WHERE invoice_id = $1`,
      [invoiceId]
    );

    // Load line items
    const itemsRes = await query(
      `SELECT * FROM invoice_items
         WHERE invoice_id = $1
         ORDER BY created_at ASC`,
      [invoiceId]
    );
    invoice.items = itemsRes.rows;

    return res.json(invoice);
  } catch (err) {
    console.error("Error fetching public invoice:", err);
    return res.status(500).json({ message: "Error retrieving invoice data." });
  }
});

// ── AUTHENTICATED ROUTES ─────────────────────────────────────────────────────

// GET /api/invoices/next-number
router.get('/next-number', authenticate, async (req, res) => {
  const { user_id } = req.user;
  try {
    const year = new Date().getFullYear();
    const cntRes = await query(
      `SELECT COUNT(*) AS invoice_count 
         FROM invoices 
        WHERE user_id = $1 
          AND EXTRACT(YEAR FROM issue_date) = $2`,
      [user_id, year]
    );
    const nextSeq = parseInt(cntRes.rows[0].invoice_count, 10) + 1;
    const padded  = String(nextSeq).padStart(3, '0');
    const nextNum = `INV-${year}-${padded}`;
    return res.json({ nextInvoiceNumber: nextNum });
  } catch (err) {
    console.error("Error generating next invoice number:", err);
    return res.status(500).json({ message: "Could not generate next invoice number." });
  }
});

// GET /api/invoices/
// List all invoices, recalc overdue
router.get('/', authenticate, async (req, res) => {
  const { user_id } = req.user;
  try {
    const dbRes = await query(
      `SELECT i.*, c.name AS client_name
         FROM invoices i
         JOIN clients c ON i.client_id = c.client_id
        WHERE i.user_id = $1
        ORDER BY i.issue_date DESC`,
      [user_id]
    );
    const today = new Date(); today.setHours(0,0,0,0);
    const invoices = dbRes.rows.map(inv => {
      if (inv.status === 'sent' && new Date(inv.due_date) < today) {
        return { ...inv, status: 'overdue' };
      }
      return inv;
    });
    return res.json(invoices);
  } catch (err) {
    console.error("Error fetching invoices:", err);
    return res.status(500).json({ message: "Error fetching invoices." });
  }
});

// GET /api/invoices/:invoiceId/rules
router.get('/:invoiceId/rules', authenticate, async (req, res) => {
  const { invoiceId } = req.params;
  const { user_id } = req.user;
  try {
    const { rows } = await query(
      `SELECT 
         auto_followups_enabled,
         view_reminder_days,
         due_reminder_days,
         repeat_interval_days,
         followup_message_template
       FROM invoices
      WHERE invoice_id = $1
        AND user_id    = $2`,
      [invoiceId, user_id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching rules.' });
  }
});

// GET /api/invoices/:invoiceId/follow-ups
router.get('/:invoiceId/follow-ups', authenticate, async (req, res) => {
  const { invoiceId } = req.params;
  const { user_id } = req.user;
  try {
    // Verify ownership
    const invCheck = await query(
      `SELECT 1 FROM invoices WHERE invoice_id = $1 AND user_id = $2`,
      [invoiceId, user_id]
    );
    if (!invCheck.rows.length) {
      return res.status(403).json({ message: "Not authorized or invoice not found." });
    }
    const fuRes = await query(
      `SELECT follow_up_id, method, message, sent_at
         FROM invoice_follow_ups
        WHERE invoice_id = $1
        ORDER BY sent_at DESC`,
      [invoiceId]
    );
    return res.json(fuRes.rows);
  } catch (err) {
    console.error("Error listing follow-ups:", err);
    return res.status(500).json({ message: "Error retrieving follow-up logs." });
  }
});

// POST /api/invoices/:invoiceId/follow-up
router.post('/:invoiceId/follow-up', authenticate, async (req, res) => {
  const { invoiceId } = req.params;
  const { user_id }  = req.user;
  const { method, message } = req.body;
  if (!method || !message) {
    return res.status(400).json({ message: "Missing follow-up method or message." });
  }

  const clientConn = await pool.connect();
  try {
    await clientConn.query('BEGIN');
    // Verify invoice
    const invRes = await clientConn.query(
      `SELECT client_id, invoice_number, total_amount 
         FROM invoices 
        WHERE invoice_id = $1 
          AND user_id = $2`,
      [invoiceId, user_id]
    );
    if (!invRes.rows.length) throw new Error("Invoice not found or not authorized.");
    const invoice = invRes.rows[0];

    // Insert follow-up
    const fuRes = await clientConn.query(
      `INSERT INTO invoice_follow_ups (
         invoice_id, user_id, method, message
       ) VALUES ($1,$2,$3,$4)
       RETURNING follow_up_id, sent_at`,
      [invoiceId, user_id, method, message]
    );
    const followUp = fuRes.rows[0];

    // Bump counters
    await clientConn.query(
      `UPDATE invoices
         SET follow_up_count   = COALESCE(follow_up_count,0) + 1,
             last_follow_up_at = CURRENT_TIMESTAMP,
             updated_at        = CURRENT_TIMESTAMP
       WHERE invoice_id = $1`,
      [invoiceId]
    );

    // If email, send it
    if (method === 'email') {
      const clientInfo = await clientConn.query(
        `SELECT email, name 
           FROM clients 
          WHERE client_id = $1`,
        [invoice.client_id]
      );
      if (clientInfo.rows.length) {
        const { email: toEmail, name: clientName } = clientInfo.rows[0];
        const subject = `Reminder: Invoice #${invoice.invoice_number}`;
        const html = professionalTemplate({
          preheader: `Reminder: Invoice #${invoice.invoice_number}`,
          title: `Hi ${clientName},`,
          bodyHtml: `<p>${message}</p>
                     <p><a href="${process.env.FRONTEND_URL}/invoice/${invoiceId}">View & Pay Invoice</a></p>`,
          cta: { url:`${process.env.FRONTEND_URL}/invoice/${invoiceId}`, text:'View & Pay' }
        });
        await sendEmail({
          to: toEmail,
          from: { email: process.env.FROM_EMAIL, name: invoice.user_first_name },
          subject,
          html
        });
      }
    }

    await clientConn.query('COMMIT');
    return res.status(201).json({
      follow_up_id: followUp.follow_up_id,
      sent_at: followUp.sent_at
    });
  } catch (err) {
    await clientConn.query('ROLLBACK');
    console.error("Error creating follow-up:", err);
    return res.status(500).json({ message: err.message || "Error sending follow-up." });
  } finally {
    clientConn.release();
  }
});

// POST /api/invoices/
// Create invoice + items + follow-up rule fields
router.post('/', authenticate, async (req, res) => {
  const { user_id } = req.user;
  const {
    client_id, issue_date, due_date, items, notes, status = 'draft',
    auto_followups_enabled, view_reminder_days,
    due_reminder_days, repeat_interval_days,
    followup_message_template
  } = req.body;

  if (!client_id || !issue_date || !due_date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Generate invoice_number
    const year = new Date(issue_date).getFullYear();
    const cntRes = await conn.query(
      `SELECT COUNT(*) AS invoice_count 
         FROM invoices 
        WHERE user_id = $1 
          AND EXTRACT(YEAR FROM issue_date) = $2`,
      [user_id, year]
    );
    const seq = parseInt(cntRes.rows[0].invoice_count,10) + 1;
    const invoice_number = `INV-${year}-${String(seq).padStart(3,'0')}`;

    // Calculate total_amount
    const total_amount = items.reduce(
      (sum, it) =>
        sum + (parseFloat(it.quantity)||0) * (parseFloat(it.unit_price)||0),
      0
    );

    // Insert invoice with rules
    const invRes = await conn.query(
      `INSERT INTO invoices (
         user_id, client_id, invoice_number,
         issue_date, due_date, total_amount,
         status, notes,
         auto_followups_enabled,
         view_reminder_days,
         due_reminder_days,
         repeat_interval_days,
         followup_message_template
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
       ) RETURNING *`,
      [
        user_id, client_id, invoice_number,
        issue_date, due_date, total_amount,
        status, notes,
        auto_followups_enabled,
        view_reminder_days,
        due_reminder_days,
        repeat_interval_days,
        followup_message_template
      ]
    );
    const invoice = invRes.rows[0];

    // Insert items
    for (const it of items) {
      await conn.query(
        `INSERT INTO invoice_items (
           invoice_id, description, quantity, unit_price
         ) VALUES ($1,$2,$3,$4)`,
        [invoice.invoice_id, it.description, it.quantity, it.unit_price]
      );
    }

    await conn.query('COMMIT');
    return res.status(201).json(invoice);
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error("Error creating invoice:", err);
    return res.status(500).json({ message: "Error creating invoice." });
  } finally {
    conn.release();
  }
});

// PUT /api/invoices/:invoiceId
router.put('/:invoiceId', authenticate, async (req, res) => {
  const { user_id } = req.user;
  const { invoiceId } = req.params;
  const {
    client_id, issue_date, due_date, items, notes, status = 'draft',
    auto_followups_enabled, view_reminder_days,
    due_reminder_days, repeat_interval_days,
    followup_message_template
  } = req.body;

  if (!client_id || !issue_date || !due_date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Fetch original status
    const curRes = await conn.query(
      `SELECT status FROM invoices 
        WHERE invoice_id = $1 
          AND user_id    = $2`,
      [invoiceId, user_id]
    );
    if (!curRes.rows.length) throw new Error("Invoice not found or not authorized.");
    const originalStatus = curRes.rows[0].status;

    // Calculate total_amount
    const total_amount = items.reduce(
      (sum, it) =>
        sum + (parseFloat(it.quantity)||0) * (parseFloat(it.unit_price)||0),
      0
    );

    // Update invoice + rules
    const updRes = await conn.query(
      `UPDATE invoices SET
         client_id    = $1,
         issue_date   = $2,
         due_date     = $3,
         total_amount = $4,
         notes        = $5,
         status       = $6,
         auto_followups_enabled    = $7,
         view_reminder_days        = $8,
         due_reminder_days         = $9,
         repeat_interval_days      = $10,
         followup_message_template = $11,
         updated_at   = CURRENT_TIMESTAMP
       WHERE invoice_id = $12
         AND user_id    = $13
       RETURNING *`,
      [
        client_id, issue_date, due_date, total_amount, notes, status,
        auto_followups_enabled,
        view_reminder_days,
        due_reminder_days,
        repeat_interval_days,
        followup_message_template,
        invoiceId, user_id
      ]
    );
    const updatedInvoice = updRes.rows[0];

    // Replace items
    await conn.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
    for (const it of items) {
      await conn.query(
        `INSERT INTO invoice_items (
           invoice_id, description, quantity, unit_price
         ) VALUES ($1,$2,$3,$4)`,
        [invoiceId, it.description, it.quantity, it.unit_price]
      );
    }

    // If just moved to "sent", fire email
    if (status === 'sent' && originalStatus !== 'sent') {
      const ciRes = await conn.query(
        `SELECT c.email AS client_email, p.first_name
           FROM clients c
           JOIN profiles p ON p.user_id = $1
          WHERE c.client_id = $2`,
        [user_id, client_id]
      );
      if (ciRes.rows.length) {
        const { client_email, first_name } = ciRes.rows[0];
        const html = professionalTemplate({
          preheader: `Invoice #${updatedInvoice.invoice_number} has been sent.`,
          title: `New Invoice from ${first_name}`,
          bodyHtml: `<p>You have a new invoice <strong>#${updatedInvoice.invoice_number}</strong> for <strong>$${updatedInvoice.total_amount}</strong>.</p>
                     <p>Due by ${new Date(updatedInvoice.due_date).toLocaleDateString()}.</p>`,
          cta: {
            url: `${process.env.FRONTEND_URL}/invoice/${invoiceId}`,
            text: 'View & Pay Invoice'
          }
        });
        await sendEmail({
          to: client_email,
          from: { email: process.env.FROM_EMAIL, name: first_name },
          subject: `Invoice #${updatedInvoice.invoice_number} Sent`,
          html
        });
      }
    }

    await conn.query('COMMIT');
    return res.json(updatedInvoice);
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error("Error updating invoice:", err);
    return res.status(500).json({ message: "Error updating invoice." });
  } finally {
    conn.release();
  }
});

// PUT /api/invoices/:invoiceId/status
router.put('/:invoiceId/status', authenticate, async (req, res) => {
  const { invoiceId } = req.params;
  const { user_id }  = req.user;
  const { status }   = req.body;
  const allowed = ['draft','sent','paid','overdue','void'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid or missing status." });
  }

  try {
    // Fetch original
    const curRes = await query(
      `SELECT status, client_id, invoice_number, total_amount
         FROM invoices
        WHERE invoice_id = $1 AND user_id = $2`,
      [invoiceId, user_id]
    );
    if (!curRes.rows.length) {
      return res.status(404).json({ message: "Invoice not found or not authorized." });
    }
    const originalStatus = curRes.rows[0].status;

    // Update status
    const updRes = await query(
      `UPDATE invoices
         SET status      = $1,
             updated_at  = CURRENT_TIMESTAMP
       WHERE invoice_id = $2
         AND user_id    = $3
       RETURNING *`,
      [status, invoiceId, user_id]
    );
    const updatedInvoice = updRes.rows[0];

    // Email if moved to "sent"
    if (status === 'sent' && originalStatus !== 'sent') {
      const ciRes = await query(
        `SELECT c.email AS client_email, p.first_name
           FROM clients c
           JOIN profiles p ON p.user_id = $1
          WHERE c.client_id = $2`,
        [user_id, updatedInvoice.client_id]
      );
      if (ciRes.rows.length) {
        const { client_email, first_name } = ciRes.rows[0];
        const html = professionalTemplate({
          preheader: `Invoice #${updatedInvoice.invoice_number} has been sent.`,
          title: `New Invoice from ${first_name}`,
          bodyHtml: `<p>You have a new invoice <strong>#${updatedInvoice.invoice_number}</strong> for <strong>$${updatedInvoice.total_amount}</strong>.</p>`,
          cta: {
            url: `${process.env.FRONTEND_URL}/invoice/${invoiceId}`,
            text: 'View & Pay Invoice'
          }
        });
        await sendEmail({
          to: client_email,
          from: { email: process.env.FROM_EMAIL, name: first_name },
          subject: `Invoice #${updatedInvoice.invoice_number} Sent`,
          html
        });
      }
    }

    return res.json(updatedInvoice);
  } catch (err) {
    console.error("Error updating invoice status:", err);
    return res.status(500).json({ message: "Error updating invoice status." });
  }
});

export default router;
