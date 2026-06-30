const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD, // 16-character App Password
  },
});

/**
 * Send an email from the academy.
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {Array} [options.attachments] - Optional attachments
 */
async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Email credentials not set – skipping email.');
    return;
  }

  const mailOptions = {
    from: `"Lumière Beauty Academy" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email send failed:', error.message);
  }
}

/**
 * Pre-designed email templates – keep brand consistent.
 */
const templates = {
  purchaseReceipt: (studentName, courseTitle, amount) => `
    <div style="max-width:600px;margin:0 auto;font-family:'DM Sans',sans-serif;background:#fffaf7;border:1px solid #f0a0b8;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#c84070,#f07090);padding:24px;text-align:center">
        <h1 style="color:white;margin:0;font-family:'Cormorant Garamond',serif;font-size:32px">Lumière Beauty Academy</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:#1a0810;font-family:'Cormorant Garamond',serif">Thank you, ${studentName}!</h2>
        <p style="color:#4a2028;font-size:16px;line-height:1.6">Your enrollment in <strong>${courseTitle}</strong> is confirmed. You now have full access to all lessons, quizzes, and resources.</p>
        <div style="background:#fef6f8;border-radius:12px;padding:16px;margin:24px 0">
          <p style="margin:0;font-size:14px;color:#6a3040"><strong>Amount paid:</strong> $${(amount / 100).toFixed(2)}</p>
        </div>
        <a href="${process.env.SITE_URL || 'https://eyelash-academy.netlify.app'}/learn/${courseTitle.toLowerCase().replace(/\s+/g, '-')}" style="display:inline-block;background:linear-gradient(135deg,#c84070,#f07090);color:white;padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:500;font-size:15px">Start Learning →</a>
      </div>
    </div>
  `,

  certificateReady: (studentName, courseTitle, certUrl) => `
    <div style="max-width:600px;margin:0 auto;font-family:'DM Sans',sans-serif;background:#fffaf7;border:1px solid #f0a0b8;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#c84070,#f07090);padding:24px;text-align:center">
        <h1 style="color:white;margin:0;font-family:'Cormorant Garamond',serif;font-size:32px">Lumière Beauty Academy</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:#1a0810;font-family:'Cormorant Garamond',serif">Congratulations, ${studentName}!</h2>
        <p style="color:#4a2028;font-size:16px;line-height:1.6">You've successfully completed <strong>${courseTitle}</strong> and earned your certificate.</p>
        <a href="${certUrl}" style="display:inline-block;background:linear-gradient(135deg,#c84070,#f07090);color:white;padding:14px 32px;border-radius:100px;text-decoration:none;font-weight:500;font-size:15px;margin-top:16px">Download Your Certificate →</a>
      </div>
    </div>
  `,

  callBookingConfirmation: (studentName, scheduledTime) => `
    <div style="max-width:600px;margin:0 auto;font-family:'DM Sans',sans-serif;background:#fffaf7;border:1px solid #f0a0b8;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#c84070,#f07090);padding:24px;text-align:center">
        <h1 style="color:white;margin:0;font-family:'Cormorant Garamond',serif;font-size:32px">Lumière Beauty Academy</h1>
      </div>
      <div style="padding:32px">
        <h2 style="color:#1a0810;font-family:'Cormorant Garamond',serif">Session Booked, ${studentName}!</h2>
        <p style="color:#4a2028;font-size:16px;line-height:1.6">Your 1‑on‑1 call is scheduled for <strong>${new Date(scheduledTime).toLocaleString()}</strong>.</p>
        <p style="color:#6a3040;font-size:14px">You'll receive a reminder 15 minutes before. Make sure your browser notifications are enabled!</p>
      </div>
    </div>
  `,
};

module.exports = { sendEmail, templates };