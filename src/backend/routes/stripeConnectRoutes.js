// File: src/backend/routes/stripeConnectRoutes.js
import express from 'express';
import Stripe from 'stripe'; 
import { query } from '../db.js'; 
import authenticate from '../middlewares/authenticate.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// 1. Create a Stripe Express Account and get the onboarding link
router.post('/create-account-link', authenticate, async (req, res) => {
    const { user_id, email } = req.user;

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl || !frontendUrl.startsWith('http')) {
        console.error('CRITICAL CONFIGURATION ERROR: The FRONTEND_URL environment variable is not set or is invalid in your backend .env file. It must start with http or https.');
        return res.status(500).send({ error: 'Server configuration error prevents connecting to Stripe.' });
    }

    try {
        let accountId;
        
        const existingAccount = await query('SELECT stripe_account_id FROM stripe_accounts WHERE user_id = $1', [user_id]);

        if (existingAccount.rows.length > 0) {
            accountId = existingAccount.rows[0].stripe_account_id;
        } else {
            const account = await stripe.accounts.create({
                type: 'express',
                email: email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            accountId = account.id;
            
            await query('INSERT INTO stripe_accounts (user_id, stripe_account_id) VALUES ($1, $2)', [user_id, accountId]);
        }
        
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${frontendUrl}/user-profile?reauth=true`,
            return_url: `${frontendUrl}/user-profile?stripe_return=true`,
            type: 'account_onboarding',
        });
        
        res.json({ url: accountLink.url });

    } catch (error) {
        console.error("Error creating Stripe account link:", error);
        res.status(500).send({ error: 'Failed to create Stripe onboarding link. Please try again later.' });
    }
});

// 2. Get the status of the user's Stripe account
router.get('/account-status', authenticate, async (req, res) => {
    const { user_id } = req.user;
    try {
        const result = await query('SELECT stripe_account_id FROM stripe_accounts WHERE user_id = $1', [user_id]);
        if (result.rows.length === 0) {
            return res.json({ isConnected: false });
        }
        
        const accountId = result.rows[0].stripe_account_id;
        const account = await stripe.accounts.retrieve(accountId);
        
        res.json({
            isConnected: true,
            detailsSubmitted: account.details_submitted,
            payoutsEnabled: account.payouts_enabled,
        });
        
    } catch (error) {
        console.error("Error fetching Stripe account status:", error);
        res.status(500).send({ error: 'Failed to fetch Stripe account status.' });
    }
});

// 3. Create a checkout session for a specific invoice ON BEHALF of the user
router.post('/create-invoice-checkout', async (req, res) => {
    const { invoiceId } = req.body;
    
    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl || !frontendUrl.startsWith('http')) {
        console.error('CRITICAL CONFIGURATION ERROR: The FRONTEND_URL environment variable is not set or is invalid.');
        return res.status(500).send({ error: 'Server configuration error prevents creating payment session.' });
    }
    
    if (!invoiceId) return res.status(400).send({ error: 'Invoice ID is required.' });

    try {
        // --- THE FIX: Added 'draft' to the list of payable statuses for testing ---
        const invoiceQuery = `
            SELECT i.total_amount, i.invoice_number, i.user_id, sa.stripe_account_id
            FROM invoices i
            JOIN stripe_accounts sa ON i.user_id = sa.user_id
            WHERE i.invoice_id = $1 AND (i.status = 'sent' OR i.status = 'overdue' OR i.status = 'draft') -- 'draft' is added for testing
        `;
        const result = await query(invoiceQuery, [invoiceId]);

        if (result.rows.length === 0) {
            return res.status(404).send({ error: 'Invoice not found, is not in a payable state, or the seller has not connected a Stripe account.' });
        }

        const { total_amount, invoice_number, stripe_account_id } = result.rows[0];

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: `Payment for Invoice #${invoice_number}` },
                    unit_amount: Math.round(parseFloat(total_amount) * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${frontendUrl}/invoice/${invoiceId}?payment_success=true`,
            cancel_url: `${frontendUrl}/invoice/${invoiceId}`,
            payment_intent_data: {
                application_fee_amount: Math.round(parseFloat(total_amount) * 100 * 0.02), // Example: 2% application fee
                transfer_data: {
                    destination: stripe_account_id,
                },
            },
        });
        
        await query('UPDATE invoices SET stripe_payment_intent_id = $1 WHERE invoice_id = $2', [session.payment_intent, invoiceId]);

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating invoice checkout session:", error);
        res.status(500).send({ error: 'Failed to create payment session.' });
    }
});


export default router;