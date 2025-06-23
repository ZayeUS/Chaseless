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
        
        // ** THE FIX: Also return the accountId so the frontend can build the dashboard link **
        res.json({
            isConnected: true,
            detailsSubmitted: account.details_submitted,
            payoutsEnabled: account.payouts_enabled,
            accountId: accountId 
        });
        
    } catch (error) {
        console.error("Error fetching Stripe account status:", error);
        res.status(500).send({ error: 'Failed to fetch Stripe account status.' });
    }
});

// 3. Create a checkout session for a specific invoice ON BEHALF of the user

router.post('/create-invoice-checkout', authenticate, async (req, res) => {
    const { invoiceId, unit_amount, description } = req.body;
    if (!invoiceId || !unit_amount) {
      return res.status(400).json({ message: 'invoiceId and unit_amount are required.' });
    }
  
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',        // or dynamic currency
            unit_amount,            // amount in cents, includes 3% fee
            product_data: {
              name: description || `Invoice #${invoiceId}`,
            }
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/invoice/${invoiceId}?payment_success=true`,
        cancel_url:  `${process.env.FRONTEND_URL}/invoice/${invoiceId}`
      });
  
      res.json({ url: session.url });
    } catch (err) {
      console.error('Error creating Stripe session:', err);
      res.status(500).json({ message: 'Could not create payment session.' });
    }
  });


export default router;