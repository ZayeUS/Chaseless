// File: src/backend/routes/clients.js
import express from 'express';
import { query } from '../db.js';
import authenticate from '../middlewares/authenticate.js';
import { logAudit } from '../utils/auditLogger.js';

const router = express.Router();

// GET all clients for the authenticated user
router.get('/', authenticate, async (req, res) => {
    const { user_id } = req.user;
    try {
        const { rows } = await query(
            "SELECT * FROM clients WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC",
            [user_id]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching clients:", error);
        res.status(500).json({ message: "Error fetching clients" });
    }
});

// POST a new client for the authenticated user
router.post('/', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { name, email, address } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: "Client name and email are required." });
    }

    try {
        const { rows } = await query(
            "INSERT INTO clients (user_id, name, email, address) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, name, email, address]
        );
        const newClient = rows[0];

        await logAudit({
            actorUserId: user_id,
            action: 'create_client',
            tableName: 'clients',
            recordId: newClient.client_id,
            metadata: { name: newClient.name, email: newClient.email }
        });

        res.status(201).json(newClient);
    } catch (error) {
        console.error("Error creating client:", error);
        res.status(500).json({ message: "Error creating client" });
    }
});

// UPDATE an existing client
router.put('/:clientId', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { clientId } = req.params;
    const { name, email, address } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: "Client name and email are required." });
    }

    try {
        const { rows } = await query(
            "UPDATE clients SET name = $1, email = $2, address = $3, updated_at = CURRENT_TIMESTAMP WHERE client_id = $4 AND user_id = $5 RETURNING *",
            [name, email, address, clientId, user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Client not found or you do not have permission to edit it." });
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error updating client:", error);
        res.status(500).json({ message: "Error updating client" });
    }
});

// DELETE (soft delete) a client
router.delete('/:clientId', authenticate, async (req, res) => {
    const { user_id } = req.user;
    const { clientId } = req.params;

    try {
        const { rowCount } = await query(
            "UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE client_id = $1 AND user_id = $2 AND deleted_at IS NULL",
            [clientId, user_id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ message: "Client not found or you do not have permission to delete it." });
        }
        
        res.status(200).json({ message: "Client deleted successfully." });
    } catch (error) {
        console.error("Error deleting client:", error);
        res.status(500).json({ message: "Error deleting client" });
    }
});

export default router;