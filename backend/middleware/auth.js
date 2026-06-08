const jwt = require('jsonwebtoken');
const { getCache } = require('../config/redis');
const { isMockMode } = require('../config/database');
const logger = require('../utils/logger');

// In-memory user store for mock mode
const mockUsers = new Map();

function getMockUsers() { return mockUsers; }

/**
 * verifyToken — protect any route behind JWT
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been blacklisted (logout)
    const isBlacklisted = await getCache(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod');

    if (isMockMode()) {
      // Mock mode: build user from decoded token + mock store
      const mockUser = mockUsers.get(decoded.id) || {
        id: decoded.id,
        email: decoded.email,
        first_name: 'User',
        premium_tier: 'free',
        is_active: true,
        is_banned: false,
        toSafeJSON() { return this; },
      };
      req.user = mockUser;
      req.token = token;
      return next();
    }

    // Real DB mode
    const User = require('../models/User');
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash', 'otp_code', 'refresh_token'] },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (!user.is_active) return res.status(401).json({ error: 'Account deactivated' });
    if (user.is_banned) return res.status(403).json({ error: 'Account suspended', reason: user.ban_reason });

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next(err);
  }
}

/**
 * requirePremium — gates routes to premium users only
 */
function requirePremium(minTier = 'silver') {
  const TIERS = { free: 0, silver: 1, gold: 2, platinum: 3 };
  return (req, res, next) => {
    const userTier = TIERS[req.user.premium_tier] || 0;
    const required = TIERS[minTier] || 1;
    if (userTier < required) {
      return res.status(403).json({
        error: `This feature requires ${minTier} plan or above`,
        code: 'UPGRADE_REQUIRED',
        required_tier: minTier,
        current_tier: req.user.premium_tier,
      });
    }
    next();
  };
}

/**
 * requireAdmin — admin-only routes
 */
function requireAdmin(req, res, next) {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * optionalAuth — attaches user if token present, otherwise continues
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod');
    if (!isMockMode()) {
      const User = require('../models/User');
      req.user = await User.findByPk(decoded.id);
    }
  } catch (_) { /* ignore */ }
  next();
}

module.exports = { verifyToken, requirePremium, requireAdmin, optionalAuth, getMockUsers };
