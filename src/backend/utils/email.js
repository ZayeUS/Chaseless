// File: src/backend/utils/email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, html, from }) => {
  try {
    // ** THE FIX: Determine the 'from' address correctly. **
    // If a 'from' object is passed in, use it directly.
    // Otherwise, create a default 'from' object using the .env variable.
    const fromAddress = from || {
      email: process.env.FROM_EMAIL,
      name: 'Chaseless', // Updated for brand consistency
    };

    const msg = {
      to,
      from: fromAddress, // Use the correctly determined from address
      subject,
      html,
    };

    // Ensure the from address is valid before sending
    if (!fromAddress.email) {
        throw new Error("Email sending failed: FROM_EMAIL is not configured in your .env file and no 'from' address was provided.");
    }

    await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    // Log the detailed error message from the email service
    console.error('❌ Email send failed:', err.response?.body || err.message);
    // Throw a new error to be caught by the calling function
    throw new Error('Email failed');
  }
};