const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { setCache, getCache, deleteCache } = require('../config/redis');
const { isMockMode } = require('../config/database');
const { verifyToken, getMockUsers } = require('../middleware/auth');
const { sendOTPEmail } = require('../services/notificationService');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_prod';

// ── Helpers ───────────────────────────────────────────────
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

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

// ── POST /api/auth/send-otp ──────────────────────────────
// Passwordless login: send OTP to email
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  try {
    const otp = generateOTP();
    const otpKey = `otp:login:${email}`;
    await setCache(otpKey, otp, 600); // 10 min TTL

    await sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    logger.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────
// Verify OTP → auto-create account if new → return tokens
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, otp } = req.body;

  try {
    const otpKey = `otp:login:${email}`;
    const storedOTP = await getCache(otpKey);

    if (!storedOTP) return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    if (storedOTP !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    await deleteCache(otpKey);

    let user;
    let isNewUser = false;

    if (isMockMode()) {
      // Mock mode: in-memory user store
      const mockUsers = getMockUsers();
      user = Array.from(mockUsers.values()).find((u) => u.email === email);
      if (!user) {
        isNewUser = true;
        user = {
          id: uuidv4(),
          email,
          email_verified: true,
          is_active: true,
          is_banned: false,
          premium_tier: 'free',
          coins: 0,
          profile_completeness: 0,
          created_at: new Date().toISOString(),
          toSafeJSON() {
            const { toSafeJSON, ...safe } = this;
            return safe;
          },
        };
        mockUsers.set(user.id, user);
      }
    } else {
      const User = require('../models/User');
      user = await User.findOne({ where: { email } });
      if (!user) {
        isNewUser = true;
        user = await User.create({
          email,
          email_verified: true,
          is_active: true,
        });
      } else {
        user.email_verified = true;
        user.last_active = new Date();
        await user.save();
      }
    }

    const { accessToken, refreshToken } = signTokens(user.id, email);

    // Cache refresh token
    await setCache(`refresh:${user.id}`, refreshToken, 30 * 24 * 3600);

    res.json({
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: user.toSafeJSON ? user.toSafeJSON() : user,
      is_new_user: isNewUser,
    });
  } catch (err) {
    logger.error('OTP verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── POST /api/auth/resend-otp ────────────────────────────
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  try {
    const otp = generateOTP();
    await setCache(`otp:login:${email}`, otp, 600);
    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP resent successfully' });
  } catch (err) {
    logger.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend OTP' });
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
    await deleteCache(`refresh:${req.user.id}`);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    user: req.user.toSafeJSON ? req.user.toSafeJSON() : req.user,
  });
});

// ── POST /api/auth/oauth/apple ───────────────────────────
// Apple Sign-In (receives identityToken from iOS)
router.post('/oauth/apple', async (req, res) => {
  const { apple_id, email, first_name, last_name } = req.body;
  try {
    let user;
    let isNewUser = false;

    if (isMockMode()) {
      const mockUsers = getMockUsers();
      user = Array.from(mockUsers.values()).find((u) => u.apple_id === apple_id);
      if (!user && email) {
        user = Array.from(mockUsers.values()).find((u) => u.email === email);
      }
      if (!user) {
        isNewUser = true;
        user = {
          id: uuidv4(),
          apple_id, email, first_name, last_name,
          email_verified: true, is_active: true,
          premium_tier: 'free', coins: 0,
          profile_completeness: 0,
          toSafeJSON() { const { toSafeJSON, ...safe } = this; return safe; },
        };
        mockUsers.set(user.id, user);
      }
    } else {
      const User = require('../models/User');
      user = await User.findOne({ where: { apple_id } });
      if (!user && email) user = await User.findOne({ where: { email } });
      if (!user) {
        isNewUser = true;
        user = await User.create({
          apple_id, email, first_name, last_name,
          email_verified: true, is_active: true,
        });
      } else if (!user.apple_id) {
        user.apple_id = apple_id;
        await user.save();
      }
    }

    const { accessToken, refreshToken } = signTokens(user.id, email);
    await setCache(`refresh:${user.id}`, refreshToken, 30 * 24 * 3600);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: user.toSafeJSON ? user.toSafeJSON() : user,
      is_new_user: isNewUser,
    });
  } catch (err) {
    logger.error('Apple OAuth error:', err);
    res.status(500).json({ error: 'Apple Sign-In failed' });
  }
});

module.exports = router;
