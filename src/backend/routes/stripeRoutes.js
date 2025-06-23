// File: src/backend/routes/stripeRoutes.js
import express from 'express';
import Stripe from 'stripe'; 
import { retrieveCheckoutSession } from '../utils/stripe.js'; 
import { query } from '../db.js'; 
import authenticate from '../middlewares/authenticate.js';
import { sendEmail } from '../utils/email.js'; // NEW IMPORT
import { baseTemplate } from '../templates/baseTemplate.js'; // NEW IMPORT

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

router.post('/complete-payment', authenticate, async (req, res) => {
  const { sessionId } = req.body;
  
  try {
    const session = await retrieveCheckoutSession(sessionId);
    if (!session) {
      return res.status(400).json({ message: 'Invalid session' });
    }

    console.log('Stripe session:', JSON.stringify(session, null, 2));

    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    let subscriptionPlan = 'Unknown Plan';
    
    if (session.subscription && session.subscription.plan && session.subscription.plan.product) {
      try {
        const product = await stripe.products.retrieve(session.subscription.plan.product);
        subscriptionPlan = product.name;
      } catch (err) {
        console.log('Error fetching product details from expanded subscription:', err);
      }
    }
    
    if (subscriptionPlan === 'Unknown Plan' && session.line_items && session.line_items.data) {
      for (const item of session.line_items.data) {
        if (item.price && item.price.product) {
          try {
            if (typeof item.price.product === 'object' && item.price.product.name) {
              subscriptionPlan = item.price.product.name;
              break;
            }
            const product = await stripe.products.retrieve(item.price.product);
            subscriptionPlan = product.name;
            break;
          } catch (err) {
            console.log('Error fetching product details from line items:', err);
          }
        }
      }
    }
    
    if (subscriptionPlan === 'Unknown Plan' && session.metadata && session.metadata.plan_name) {
      subscriptionPlan = session.metadata.plan_name;
    }
    
    console.log('Extracted plan name:', subscriptionPlan);
    
    const userEmail = session.customer_details?.email; // Get user's email for notification
    if (!userEmail) {
      return res.status(400).json({ message: 'Email not found in session' });
    }

    const userQuery = 'SELECT user_id FROM users WHERE email = $1';
    const userResult = await query(userQuery, [userEmail]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userId = userResult.rows[0].user_id;

    const existingPaymentQuery = 'SELECT * FROM payments WHERE stripe_subscription_id = $1';
    const actualSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    const existingPayment = await query(existingPaymentQuery, [actualSubscriptionId]);

    if (existingPayment.rows.length > 0) {
      console.log('Subscription already exists for this session');
      
      // Still send email even if already recorded, for idempotency
      const emailBody = baseTemplate({
        title: `Existing Subscription Confirmed: ${subscriptionPlan}`,
        body: `
          <p>Hello Cofoundless Team,</p>
          <p>Just to let you know, user <strong>${userEmail}</strong>'s subscription for the <strong>${subscriptionPlan}</strong> plan (Status: ${session.subscription.status}) was re-confirmed.</p>
          <p>This payment record already existed in the database, indicating a successful re-processing or a duplicate webhook.</p>
          <p><strong>Details:</strong><br>
          User ID: ${userId}<br>
          Customer ID: ${typeof session.customer === 'string' ? session.customer : session.customer.id}<br>
          Subscription ID: ${actualSubscriptionId}<br>
          Subscription Status: ${session.subscription.status}</p>
          <p>Please log in to your Stripe dashboard for more details.</p>
        `,
        footer: 'Cofoundless Automated Notification'
      });

      try {
        await sendEmail({
          to: 'owner@cofoundless.com', // Send to the owner
          subject: `ℹ️ Existing Subscription Re-confirmed: ${subscriptionPlan} - ${userEmail}`,
          html: emailBody
        });
        console.log('Email sent for existing subscription re-confirmation.');
      } catch (emailErr) {
        console.error('Failed to send re-confirmation email:', emailErr);
      }

      return res.status(200).json({ message: 'Subscription already recorded.' });
    }

    const insertQuery = `
      INSERT INTO payments (user_id, stripe_customer_id, stripe_subscription_id, stripe_status, subscription_plan)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`;

    const subscriptionStatus = session.subscription.status;

    const values = [
      userId,
      typeof session.customer === 'string' ? session.customer : session.customer.id, // Store customer ID, not full object
      actualSubscriptionId, 
      subscriptionStatus || 'active',
      subscriptionPlan
    ];

    const result = await query(insertQuery, values);
    console.log('Subscription stored in DB:', result.rows[0]);
    
    // NEW: Send email notification to owner
    const emailBody = baseTemplate({
      title: `🎉 New Subscription Purchase: ${subscriptionPlan}`,
      body: `
        <p>Hello Cofoundless Team,</p>
        <p>A new user has just purchased a subscription!</p>
        <p><strong>User Email:</strong> ${userEmail}</p>
        <p><strong>Plan:</strong> ${subscriptionPlan}</p>
        <p><strong>Subscription Status:</strong> ${subscriptionStatus}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Stripe Customer ID:</strong> ${typeof session.customer === 'string' ? session.customer : session.customer.id}</p>
        <p><strong>Stripe Subscription ID:</strong> ${actualSubscriptionId}</p>
        <p>Congratulations on the new subscriber!</p>
        <p>Please log in to your Stripe dashboard for more details.</p>
      `,
      footer: 'Cofoundless Automated Notification'
    });

    try {
      await sendEmail({
        to: 'owner@cofoundless.com', // Recipient email address
        subject: `💰 New Subscriber: ${subscriptionPlan} - ${userEmail}`, // Email subject
        html: emailBody // HTML content from your base template
      });
      console.log('Subscription purchase email sent to owner.');
    } catch (emailErr) {
      console.error('Failed to send new subscription email:', emailErr);
    }

    res.status(200).json({ message: 'Payment completed and subscription created successfully.' });
  } catch (err) {
    console.error('Error processing payment:', err);
    
    if (err.code === '23505') { 
      return res.status(200).json({ message: 'Subscription already recorded.' });
    }
    
    res.status(500).json({ message: 'Error completing payment.' });
  }
});

// NEW ENDPOINT: Handle Free Tier Selection
router.post('/select-free-tier', authenticate, async (req, res) => {
  const { user_id } = req.user; 

  try {
    const existingActiveSubscriptionQuery = `
      SELECT * FROM payments
      WHERE user_id = $1 AND (stripe_status = 'active' OR stripe_status = 'trialing' OR stripe_status = 'free_active')
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const existingSubscription = await query(existingActiveSubscriptionQuery, [user_id]);

    if (existingSubscription.rows.length > 0) {
      const existingStatus = existingSubscription.rows[0].stripe_status;
      const existingPlan = existingSubscription.rows[0].subscription_plan;
      if (existingStatus === 'free_active') {
        return res.status(200).json({ message: 'User is already on the free tier.', status: 'free_active', plan: 'Free' });
      } else {
        return res.status(400).json({ message: `User already has an active ${existingPlan} plan (${existingStatus}).` });
      }
    }

    const freeCustomerId = `free_customer_${user_id}`; 
    const freeSubscriptionId = `free_sub_${user_id}`;   

    const insertFreeTierQuery = `
      INSERT INTO payments (user_id, stripe_customer_id, stripe_subscription_id, stripe_status, subscription_plan)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const freeTierValues = [
      user_id,
      freeCustomerId,
      freeSubscriptionId,
      'free_active', 
      'Free'
    ];

    const result = await query(insertFreeTierQuery, freeTierValues);
    console.log('Free tier selected and recorded for user:', user_id, result.rows[0]);

    // NEW: Send email notification for free tier selection
    const userEmail = req.user.email; // Get user's email from authenticated user
    const emailBody = baseTemplate({
      title: `✨ New Free Tier User: ${userEmail}`,
      body: `
        <p>Hello Cofoundless Team,</p>
        <p>A new user has just selected the Free Tier:</p>
        <p><strong>User Email:</strong> ${userEmail}</p>
        <p><strong>User ID:</strong> ${user_id}</p>
        <p>They are now exploring your platform. Consider reaching out to them!</p>
      `,
      footer: 'Cofoundless Automated Notification'
    });

    try {
      await sendEmail({
        to: 'owner@cofoundless.com', 
        subject: `🆓 New Free User: ${userEmail}`,
        html: emailBody
      });
      console.log('Free tier selection email sent to owner.');
    } catch (emailErr) {
      console.error('Failed to send free tier selection email:', emailErr);
    }


    res.status(201).json({ message: 'Free tier selected successfully.', status: 'free_active', plan: 'Free' });

  } catch (err) {
    console.error('Error selecting free tier:', err);
    if (err.code === '23505') { 
        console.log('Concurrent free tier insertion detected for user:', user_id);
        return res.status(200).json({ message: 'Free tier already recorded for this user.', status: 'free_active', plan: 'Free' });
    }
    res.status(500).json({ message: 'Failed to select free tier.' });
  }
});


router.get('/payment-status', authenticate, async (req, res) => {
  const { user_id } = req.user; 

  try {
    const paymentStatusQuery = `
      SELECT stripe_status, subscription_plan 
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await query(paymentStatusQuery, [user_id]);

    if (result.rows.length > 0) {
      // User has a payment record, return their status.
      return res.status(200).json({ 
        status: result.rows[0].stripe_status,
        plan: result.rows[0].subscription_plan
      });
    } else {
      // --- FIX ---
      // Instead of a 404, we now return a 200 with a default 'unsubscribed' status.
      // This is an expected state for a new user and not an error.
      return res.status(200).json({ status: 'unsubscribed', plan: null });
    }
  } catch (err) {
    console.error('Error fetching payment status:', err);
    return res.status(500).json({ message: 'Error fetching payment status.' });
  }
});



export default router;