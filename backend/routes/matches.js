const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { verifyToken, requirePremium } = require('../middleware/auth');
const { isMockMode } = require('../config/database');
const { getCache, setCache } = require('../config/redis');
const { sendPushNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

const DAILY_LIKE_LIMITS = { free: 5, silver: 20, gold: 50, platinum: Infinity };

// ── GET /api/matches/discover ─────────────────────────────
router.get('/discover', verifyToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const user = req.user;

  try {
    if (isMockMode()) {
      // Mock: return empty discover feed
      return res.json({ data: [], page: parseInt(page), total: 0, has_more: false });
    }

    const User = require('../models/User');
    const Profile = require('../models/Profile');
    const { Interest } = require('../models/Match');
    const { computeCompatibility, getDailyCuratedMatches } = require('../services/aiMatchingService');

    const cacheKey = `discover:${user.id}:${page}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const myProfile = await Profile.findOne({ where: { user_id: user.id } });
    if (!myProfile) return res.status(400).json({ error: 'Complete your profile first' });

    // Exclude already interacted users
    const interacted = await Interest.findAll({
      where: { sender_id: user.id },
      attributes: ['receiver_id'],
    });
    const excludeIds = [user.id, ...interacted.map((i) => i.receiver_id)];

    const ageMin = myProfile.partner_age_min || 18;
    const ageMax = myProfile.partner_age_max || 60;
    const dobMin = new Date(); dobMin.setFullYear(dobMin.getFullYear() - ageMax);
    const dobMax = new Date(); dobMax.setFullYear(dobMax.getFullYear() - ageMin);

    const candidates = await User.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        gender: user.looking_for === 'any' ? { [Op.in]: ['male', 'female', 'other'] } : user.looking_for,
        date_of_birth: { [Op.between]: [dobMin, dobMax] },
        is_active: true, is_banned: false,
      },
      include: [{ model: Profile, as: 'profile' }],
      limit: 100,
    });

    const ranked = await getDailyCuratedMatches(user, myProfile, candidates, parseInt(limit));

    const result = {
      data: ranked,
      page: parseInt(page),
      total: candidates.length,
      has_more: candidates.length > parseInt(limit) * parseInt(page),
    };

    await setCache(cacheKey, result, 1800);
    res.json(result);
  } catch (err) {
    logger.error('Discover error:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ── POST /api/matches/interest ────────────────────────────
router.post('/interest', verifyToken, async (req, res) => {
  const { receiver_id, type = 'like', note } = req.body;
  const sender = req.user;

  if (receiver_id === sender.id) {
    return res.status(400).json({ error: 'Cannot like yourself' });
  }

  try {
    if (isMockMode()) {
      logger.info(`[MOCK] ${sender.id} sent ${type} to ${receiver_id}`);
      return res.json({ type: 'interest', action: type, message: `${type} sent!` });
    }

    const User = require('../models/User');
    const Profile = require('../models/Profile');
    const { Interest, Match } = require('../models/Match');
    const { computeCompatibility } = require('../services/aiMatchingService');

    // Check daily like limit
    const todayKey = `likes:${sender.id}:${new Date().toISOString().split('T')[0]}`;
    const todayCount = parseInt(await getCache(todayKey) || '0');
    const likeLimit = DAILY_LIKE_LIMITS[sender.premium_tier] || 5;

    if (type !== 'pass' && todayCount >= likeLimit) {
      return res.status(429).json({
        error: `Daily like limit (${likeLimit}) reached`,
        code: 'UPGRADE_FOR_MORE_LIKES',
        resets_at: 'midnight',
      });
    }

    // Super like costs coins
    if (type === 'super_like') {
      if (sender.coins < 5) {
        return res.status(402).json({ error: 'Insufficient coins for super like (costs 5 coins)' });
      }
      await User.decrement('coins', { by: 5, where: { id: sender.id } });
    }

    // Upsert interest
    const [interest, created] = await Interest.findOrCreate({
      where: { sender_id: sender.id, receiver_id },
      defaults: { type, note },
    });
    if (!created) await interest.update({ type, note });

    if (type !== 'pass') {
      await setCache(todayKey, todayCount + 1, 86400);

      // Check for mutual match
      const reverseInterest = await Interest.findOne({
        where: { sender_id: receiver_id, receiver_id: sender.id, type: { [Op.ne]: 'pass' } },
      });

      if (reverseInterest) {
        const [uA, uB] = [sender.id, receiver_id].sort();
        const [match, matchCreated] = await Match.findOrCreate({
          where: { user_a_id: uA, user_b_id: uB },
          defaults: { user_a_id: uA, user_b_id: uB },
        });

        if (matchCreated) {
          const profileA = await Profile.findOne({ where: { user_id: sender.id } });
          const profileB = await Profile.findOne({ where: { user_id: receiver_id } });
          const receiver = await User.findByPk(receiver_id);
          const compat = await computeCompatibility(profileA, profileB, sender, receiver);
          await match.update({
            compatibility_score: compat.score,
            compatibility_breakdown: compat.breakdown,
          });

          await sendPushNotification(receiver_id, {
            title: "It's a Match! 💍",
            body: `You and ${sender.first_name} liked each other!`,
            data: { type: 'new_match', match_id: match.id },
          });

          return res.json({ type: 'match', match_id: match.id, compatibility: compat.score });
        }
      }

      await sendPushNotification(receiver_id, {
        title: 'Someone likes you! ❤️',
        body: type === 'super_like'
          ? `${sender.first_name} sent you a Super Like!`
          : 'Someone sent you a like. Check your matches!',
        data: { type: 'new_like' },
      });
    }

    res.json({
      type: 'interest',
      action: type,
      message: type === 'pass' ? 'Passed' : type === 'super_like' ? 'Super like sent!' : 'Like sent!',
    });
  } catch (err) {
    logger.error('Interest error:', err);
    res.status(500).json({ error: 'Failed to send interest' });
  }
});

// ── GET /api/matches ──────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user.id;

  try {
    if (isMockMode()) {
      return res.json({ data: [], total: 0, page: parseInt(page), has_more: false });
    }

    const User = require('../models/User');
    const Profile = require('../models/Profile');
    const { Match } = require('../models/Match');

    const { count, rows: matches } = await Match.findAndCountAll({
      where: {
        [Op.or]: [{ user_a_id: userId }, { user_b_id: userId }],
        status: 'active',
      },
      order: [['last_message_at', 'DESC NULLS LAST'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    const enriched = await Promise.all(matches.map(async (match) => {
      const partnerId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;
      const partner = await User.findByPk(partnerId, {
        attributes: ['id', 'first_name', 'last_name', 'profile_photo_url', 'last_active', 'premium_tier'],
      });
      const partnerProfile = await Profile.findOne({
        where: { user_id: partnerId },
        attributes: ['profession', 'bio'],
      });
      return {
        id: match.id,
        partner,
        profile: partnerProfile,
        compatibility: match.compatibility_score,
        last_message: match.last_message_preview,
        last_active: match.last_message_at,
        matched_at: match.created_at,
      };
    }));

    res.json({ data: enriched, total: count, page: parseInt(page), has_more: count > parseInt(limit) * parseInt(page) });
  } catch (err) {
    logger.error('Get matches error:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ── GET /api/matches/who-liked-me ─────────────────────────
router.get('/who-liked-me', verifyToken, requirePremium('gold'), async (req, res) => {
  try {
    if (isMockMode()) return res.json({ data: [], count: 0 });

    const User = require('../models/User');
    const { Interest } = require('../models/Match');

    const interests = await Interest.findAll({
      where: { receiver_id: req.user.id, type: { [Op.in]: ['like', 'super_like'] } },
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    const result = await Promise.all(interests.map(async (i) => {
      const user = await User.findByPk(i.sender_id, {
        attributes: ['id', 'first_name', 'profile_photo_url', 'date_of_birth', 'city'],
      });
      return { interest: i, user };
    }));

    res.json({ data: result, count: result.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// ── DELETE /api/matches/:matchId ──────────────────────────
router.delete('/:matchId', verifyToken, async (req, res) => {
  try {
    if (isMockMode()) return res.json({ message: 'Unmatched successfully' });

    const { Match } = require('../models/Match');
    const match = await Match.findOne({
      where: {
        id: req.params.matchId,
        [Op.or]: [{ user_a_id: req.user.id }, { user_b_id: req.user.id }],
      },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    await match.update({ status: 'unmatched', unmatched_by: req.user.id, unmatched_at: new Date() });
    res.json({ message: 'Unmatched successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unmatch' });
  }
});

module.exports = router;
