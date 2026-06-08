const logger = require('../utils/logger');

// ── Push Notifications (stub for Firebase) ──────────────
async function sendPushNotification(userId, payload) {
  // TODO: Integrate Firebase Admin SDK when FIREBASE_PROJECT_ID is set
  logger.info(`📱 [PUSH STUB] To: ${userId} | ${payload.title}: ${payload.body}`);
}

module.exports = { sendPushNotification };
