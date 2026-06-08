const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const { isMockMode } = require('../config/database');
const logger = require('../utils/logger');

// ── GET /api/profiles/me ──────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (isMockMode()) {
      return res.json({ user: req.user, profile: req.user._profile || null });
    }
    const Profile = require('../models/Profile');
    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    res.json({ user: req.user.toSafeJSON(), profile: profile || null });
  } catch (err) {
    logger.error('Get own profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/profiles/me ──────────────────────────────────
router.put('/me', verifyToken, async (req, res) => {
  try {
    const profileFields = [
      'bio', 'height_cm', 'weight_kg', 'body_type', 'complexion',
      'religion', 'caste', 'sub_caste', 'mother_tongue', 'languages_known',
      'education_level', 'education_detail', 'college',
      'profession', 'profession_detail', 'company', 'annual_income_usd',
      'family_type', 'family_status', 'family_values',
      'fathers_occupation', 'mothers_occupation', 'num_brothers', 'num_sisters',
      'diet', 'smoking', 'drinking', 'hobbies', 'interests', 'marital_status',
      'have_children', 'num_children',
      'horoscope_enabled', 'rashi', 'nakshatra', 'manglik', 'birth_time', 'birth_place',
      'partner_age_min', 'partner_age_max', 'partner_height_min', 'partner_height_max',
      'partner_religion', 'partner_caste', 'partner_education', 'partner_profession',
      'partner_location', 'partner_diet', 'partner_marital_status', 'partner_preferences_text',
    ];

    if (isMockMode()) {
      // Mock: store profile data on the user object
      const profileData = {};
      profileFields.forEach((f) => { if (req.body[f] !== undefined) profileData[f] = req.body[f]; });
      req.user._profile = { ...req.user._profile, ...profileData };

      // Update user-level fields
      ['first_name', 'last_name', 'date_of_birth', 'gender', 'looking_for',
       'country', 'state', 'city'].forEach((f) => {
        if (req.body[f] !== undefined) req.user[f] = req.body[f];
      });

      return res.json({ message: 'Profile updated', profile: req.user._profile, created: !req.user._profileCreated });
    }

    const Profile = require('../models/Profile');
    const User = require('../models/User');

    const data = {};
    profileFields.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

    const [profile, created] = await Profile.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id },
    });
    await profile.update(data);

    // Update user's location / basic info
    const userFields = {};
    ['first_name', 'last_name', 'date_of_birth', 'gender', 'looking_for',
     'country', 'state', 'city'].forEach((f) => {
      if (req.body[f] !== undefined) userFields[f] = req.body[f];
    });
    if (Object.keys(userFields).length > 0) {
      await User.update(userFields, { where: { id: req.user.id } });
    }

    logger.info(`Profile updated: ${req.user.id} (${created ? 'created' : 'updated'})`);
    res.json({ message: 'Profile updated', profile, created });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── GET /api/profiles/:userId ─────────────────────────────
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    if (isMockMode()) {
      const { getMockUsers } = require('../middleware/auth');
      const user = getMockUsers().get(req.params.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user, profile: user._profile || null });
    }

    const User = require('../models/User');
    const Profile = require('../models/Profile');
    const user = await User.findByPk(req.params.userId, {
      attributes: { exclude: ['password_hash', 'otp_code', 'refresh_token', 'push_token', 'apple_id', 'google_id'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = await Profile.findOne({ where: { user_id: req.params.userId } });
    res.json({ user, profile });
  } catch (err) {
    logger.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── POST /api/profiles/report ─────────────────────────────
router.post('/report', verifyToken, [
  body('reported_id').notEmpty(),
  body('reason').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { reported_id, reason, description } = req.body;
  try {
    if (isMockMode()) {
      logger.info(`[MOCK] Report filed: ${req.user.id} reported ${reported_id} for ${reason}`);
      return res.json({ message: 'Report submitted. Our team will review it shortly.' });
    }

    const { Report } = require('../models/Match');
    await Report.create({
      reporter_id: req.user.id,
      reported_id,
      reason,
      description,
    });
    res.json({ message: 'Report submitted. Our team will review it shortly.' });
  } catch (err) {
    logger.error('Report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
