const https = require('https');
const logger = require('../utils/logger');

/**
 * Send OTP via Resend HTTP API (works on free tier with onboarding@resend.dev)
 * Falls back gracefully — OTP is always logged to console for dev/debug.
 */
async function sendOTPEmail(email, otp, firstName = '') {
  // Always log to console — visible in Render logs for debugging
  logger.info(`\n╔══════════════════════════════════════╗`);
  logger.info(`║  📧 OTP for ${email}`);
  logger.info(`║  Code: ${otp}`);
  logger.info(`║  Expires in 10 minutes`);
  logger.info(`╚══════════════════════════════════════╝\n`);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.warn('📧 RESEND_API_KEY not set — OTP only logged to console.');
    return;
  }

  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.FROM_NAME || 'LoveMarriage';

  const body = JSON.stringify({
    from: `${fromName} <${fromEmail}>`,
    to: [email],
    subject: 'Your LoveMarriage Login Code',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:400px;margin:0 auto;padding:40px 20px;background:#fff;">
        <h1 style="font-size:24px;font-weight:700;color:#000;margin-bottom:8px;">Your login code</h1>
        <p style="color:#666;margin-bottom:24px;">Hi${firstName ? ` ${firstName}` : ''}, use this code to sign in to LoveMarriage:</p>
        <div style="background:#000;color:#fff;font-size:36px;letter-spacing:10px;text-align:center;padding:24px;border-radius:12px;font-weight:700;">${otp}</div>
        <p style="color:#999;font-size:13px;margin-top:24px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          logger.info(`✅ OTP email sent to ${email} via Resend`);
        } else {
          logger.error(`❌ Resend error (${res.statusCode}): ${data}`);
        }
        resolve(); // Never reject — OTP is in console regardless
      });
    });

    req.on('error', (err) => {
      logger.error(`❌ Resend network error: ${err.message}`);
      resolve(); // Non-fatal
    });

    req.write(body);
    req.end();
  });
}

// ── Push Notifications (stub for Firebase) ──────────────
async function sendPushNotification(userId, payload) {
  logger.info(`📱 [PUSH STUB] To: ${userId} | ${payload.title}: ${payload.body}`);
}

module.exports = { sendOTPEmail, sendPushNotification };
