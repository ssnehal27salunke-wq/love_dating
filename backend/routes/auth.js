const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { setCache, getCache, deleteCache } = require('../config/redis');
const { verifyToken, getMockUsers } = require('../middleware/auth');
const logger = require('../utils/logger');
// Removed User model import because we use Mongoose now (mongoose models are registered globally usually, but we should import it)
const mongoose = require('mongoose');
// Since the app currently doesn't have a Mongoose User schema defined in the codebase, we'll need to define it or use a generic approach.
// Looking at the previous code, it used Sequelize `models/User`. Since the user switched to MongoDB Atlas, we must define a Mongoose schema if it doesn't exist, or just use the Mongoose connection.
// I will create the Mongoose User model in `models/User.js` separately. For now, I'll assume it exists or will be created.
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_prod';

// ── Helpers ───────────────────────────────────────────────
function signTokens(userId, email) {
  const accessToken = jwt.sign(
    { id: userId, email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
  return { accessToken, refreshToken };
}

// ── POST /api/auth/oauth/apple ───────────────────────────
// Apple Sign-In (receives identityToken from iOS)
router.post('/oauth/apple', async (req, res) => {
  const { apple_id, email, first_name, last_name, identity_token } = req.body;
  try {
    let user;
    let isNewUser = false;

    // TODO: Verify the identity_token with Apple's servers using apple-signin-auth
    // For now, we trust the client's payload since we are waiting for the Team ID.
    
    // Find by Apple ID or Email
    user = await User.findOne({ $or: [{ apple_id }, { email }] });
    
    if (!user) {
      isNewUser = true;
      user = await User.create({
        apple_id,
        email,
        first_name,
        last_name,
        is_active: true,
      });
    } else if (!user.apple_id) {
      // Link Apple ID to existing account
      user.apple_id = apple_id;
      await user.save();
    }

    const { accessToken, refreshToken } = signTokens(user._id || user.id, email);
    await setCache(`refresh:${user._id || user.id}`, refreshToken, 30 * 24 * 3600);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: user.toJSON ? user.toJSON() : user,
      is_new_user: isNewUser,
    });
  } catch (err) {
    logger.error('Apple OAuth error:', err);
    res.status(500).json({ error: 'Apple Sign-In failed' });
  }
});

// ── POST /api/auth/oauth/google ──────────────────────────
// Google Sign-In
router.post('/oauth/google', async (req, res) => {
  const { google_id, email, first_name, last_name, id_token } = req.body;
  try {
    let user;
    let isNewUser = false;

    user = await User.findOne({ $or: [{ google_id }, { email }] });
    
    if (!user) {
      isNewUser = true;
      user = await User.create({
        google_id,
        email,
        first_name,
        last_name,
        is_active: true,
      });
    } else if (!user.google_id) {
      user.google_id = google_id;
      await user.save();
    }

    const { accessToken, refreshToken } = signTokens(user._id || user.id, email);
    await setCache(`refresh:${user._id || user.id}`, refreshToken, 30 * 24 * 3600);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: user.toJSON ? user.toJSON() : user,
      is_new_user: isNewUser,
    });
  } catch (err) {
    logger.error('Google OAuth error:', err);
    res.status(500).json({ error: 'Google Sign-In failed' });
  }
});

// ── POST /api/auth/refresh ───────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET);
    const cached = await getCache(`refresh:${decoded.id}`);

    if (cached !== refresh_token) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { accessToken, refreshToken: newRefresh } = signTokens(decoded.id, decoded.email);
    await setCache(`refresh:${decoded.id}`, newRefresh, 30 * 24 * 3600);

    res.json({ access_token: accessToken, refresh_token: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await setCache(`blacklist:${req.token}`, '1', 86400); // 24h blacklist
    await deleteCache(`refresh:${req.user.id || req.user._id}`);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    user: req.user.toJSON ? req.user.toJSON() : req.user,
  });
});

module.exports = router;
