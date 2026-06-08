const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ── Email OTP via Resend / SMTP ─────────────────────────
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    // Resend.com uses SMTP interface
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: resendKey },
    });
    logger.info('📧 Email transport: Resend.com');
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    // Generic SMTP (SendGrid, etc.)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    logger.info('📧 Email transport: SMTP');
  } else {
    logger.warn('📧 No email provider configured. OTPs will be logged to console.');
    return null;
  }
  return transporter;
}

async function sendOTPEmail(email, otp, firstName = '') {
  const transport = getTransporter();

  // Always log to console (useful for development & debugging)
  logger.info(`\n╔══════════════════════════════════════╗`);
  logger.info(`║  📧 OTP for ${email}`);
  logger.info(`║  Code: ${otp}`);
  logger.info(`║  Expires in 10 minutes`);
  logger.info(`╚══════════════════════════════════════╝\n`);

  if (!transport) return;

  try {
    await transport.sendMail({
      from: `"${process.env.FROM_NAME || 'LoveMarriage'}" <${process.env.FROM_EMAIL || 'hello@lovemarriage.app'}>`,
      to: email,
      subject: 'Your LoveMarriage Login Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #000; margin-bottom: 8px;">Your login code</h1>
          <p style="color: #666; margin-bottom: 24px;">Hi${firstName ? ` ${firstName}` : ''}, use this code to log in to LoveMarriage:</p>
          <div style="background: #000; color: #fff; font-size: 32px; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 12px; font-weight: 700;">${otp}</div>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    logger.info(`OTP email sent to ${email}`);
  } catch (err) {
    logger.error(`Failed to send OTP email to ${email}:`, err.message);
    // Don't throw — the OTP is still logged to console for dev
  }
}

// ── Push Notifications (stub for Firebase) ──────────────
async function sendPushNotification(userId, payload) {
  // TODO: Integrate Firebase Admin SDK when FIREBASE_PROJECT_ID is set
  logger.info(`📱 [PUSH STUB] To: ${userId} | ${payload.title}: ${payload.body}`);
}

module.exports = { sendOTPEmail, sendPushNotification };
