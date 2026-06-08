/**
 * AI Matching Engine
 * Computes compatibility scores between two users based on
 * profile attributes, preferences, and behavioral data.
 */

const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');

// ── Weight configuration ───────────────────────────────────
const WEIGHTS = {
  age: 0.15,
  religion: 0.20,
  education: 0.12,
  profession: 0.08,
  location: 0.10,
  lifestyle: 0.10,
  family_values: 0.12,
  physical: 0.05,
  horoscope: 0.08,
};

/**
 * Compute compatibility score (0–100) between two profiles
 */
async function computeCompatibility(profileA, profileB, userA, userB) {
  const cacheKey = `compat:${[userA.id, userB.id].sort().join(':')}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const scores = {};
  let total = 0;
  let usedWeight = 0;

  // 1. Age compatibility
  const ageA = _getAge(userA.date_of_birth);
  const ageB = _getAge(userB.date_of_birth);
  const ageDiff = Math.abs(ageA - ageB);
  const ageScore = ageDiff <= 2 ? 100 : ageDiff <= 5 ? 85 : ageDiff <= 8 ? 65 : ageDiff <= 12 ? 45 : 20;
  scores.age = _applyPreference(ageScore, ageA, profileB?.partner_age_min, profileB?.partner_age_max);
  total += scores.age * WEIGHTS.age;
  usedWeight += WEIGHTS.age;

  // 2. Religion compatibility
  const sameReligion = profileA?.religion && profileA.religion === profileB?.religion;
  const religionPref = profileB?.partner_religion || [];
  let religionScore = sameReligion ? 100 : 50;
  if (religionPref.length > 0 && !religionPref.includes(profileA?.religion)) {
    religionScore = Math.min(religionScore, 30);
  }
  scores.religion = religionScore;
  total += scores.religion * WEIGHTS.religion;
  usedWeight += WEIGHTS.religion;

  // 3. Education compatibility
  const EDU_RANK = { 'high_school': 1, 'diploma': 2, 'bachelors': 3, 'masters': 4, 'phd': 5 };
  const eduA = EDU_RANK[profileA?.education_level] || 3;
  const eduB = EDU_RANK[profileB?.education_level] || 3;
  const eduDiff = Math.abs(eduA - eduB);
  scores.education = eduDiff === 0 ? 100 : eduDiff === 1 ? 80 : eduDiff === 2 ? 55 : 30;
  total += scores.education * WEIGHTS.education;
  usedWeight += WEIGHTS.education;

  // 4. Location compatibility
  const sameCity = userA.city && userA.city === userB.city;
  const sameState = userA.state && userA.state === userB.state;
  const sameCountry = userA.country && userA.country === userB.country;
  scores.location = sameCity ? 100 : sameState ? 75 : sameCountry ? 50 : 20;
  if (userA.latitude && userB.latitude) {
    const distKm = _haversine(userA.latitude, userA.longitude, userB.latitude, userB.longitude);
    scores.location = distKm < 10 ? 100 : distKm < 50 ? 85 : distKm < 200 ? 65 : distKm < 500 ? 40 : 15;
  }
  total += scores.location * WEIGHTS.location;
  usedWeight += WEIGHTS.location;

  // 5. Lifestyle compatibility
  let lifestyleScore = 50;
  if (profileA?.diet && profileB?.diet) {
    lifestyleScore += profileA.diet === profileB.diet ? 25 : -10;
  }
  if (profileA?.smoking && profileB?.smoking) {
    lifestyleScore += profileA.smoking === 'never' && profileB.smoking === 'never' ? 15 : -5;
  }
  if (profileA?.drinking && profileB?.drinking) {
    lifestyleScore += profileA.drinking === 'never' && profileB.drinking === 'never' ? 10 : -5;
  }
  const hobbiesA = profileA?.hobbies || [];
  const hobbiesB = profileB?.hobbies || [];
  const sharedHobbies = hobbiesA.filter((h) => hobbiesB.includes(h)).length;
  lifestyleScore += Math.min(sharedHobbies * 5, 20);
  scores.lifestyle = Math.max(0, Math.min(100, lifestyleScore));
  total += scores.lifestyle * WEIGHTS.lifestyle;
  usedWeight += WEIGHTS.lifestyle;

  // 6. Family values
  const sameFamily = profileA?.family_values === profileB?.family_values;
  scores.family_values = sameFamily ? 100
    : Math.abs(
      ['traditional', 'moderate', 'liberal'].indexOf(profileA?.family_values)
      - ['traditional', 'moderate', 'liberal'].indexOf(profileB?.family_values)
    ) === 1 ? 70 : 40;
  total += scores.family_values * WEIGHTS.family_values;
  usedWeight += WEIGHTS.family_values;

  // 7. Profession compatibility
  const profPref = profileB?.partner_profession || [];
  scores.profession = profPref.length === 0 ? 80 : profPref.includes(profileA?.profession) ? 100 : 50;
  total += scores.profession * WEIGHTS.profession;
  usedWeight += WEIGHTS.profession;

  // 8. Horoscope (if both enabled)
  if (profileA?.horoscope_enabled && profileB?.horoscope_enabled) {
    scores.horoscope = _computeHoroscopeScore(profileA, profileB);
    total += scores.horoscope * WEIGHTS.horoscope;
    usedWeight += WEIGHTS.horoscope;
  }

  const finalScore = usedWeight > 0 ? Math.round(total / usedWeight) : 50;

  const result = { score: finalScore, breakdown: scores, computed_at: new Date().toISOString() };
  await setCache(cacheKey, result, 3600);
  return result;
}

/**
 * Get daily curated matches — top N profiles sorted by compatibility
 */
async function getDailyCuratedMatches(user, profile, allCandidates, limit = 10) {
  const scoredCandidates = [];

  for (const candidate of allCandidates) {
    try {
      const candProfile = candidate.profile || candidate.dataValues?.profile;
      const compat = await computeCompatibility(profile, candProfile, user, candidate);
      scoredCandidates.push({
        user: {
          id: candidate.id,
          first_name: candidate.first_name,
          date_of_birth: candidate.date_of_birth,
          profile_photo_url: candidate.profile_photo_url,
          photos: candidate.photos,
          city: candidate.city,
          premium_tier: candidate.premium_tier,
        },
        profile: candProfile,
        compatibility: compat.score,
        breakdown: compat.breakdown,
      });
    } catch (err) {
      logger.warn(`Compat error for ${candidate.id}: ${err.message}`);
    }
  }

  return scoredCandidates
    .sort((a, b) => b.compatibility - a.compatibility || Math.random() - 0.5)
    .slice(0, limit);
}

/**
 * Generate icebreaker questions based on shared interests
 */
async function generateIcebreakers(profileA, profileB) {
  const cacheKey = `ice:${[profileA.user_id, profileB.user_id].sort().join(':')}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const sharedHobbies = (profileA?.hobbies || []).filter((h) => (profileB?.hobbies || []).includes(h));
  const context = sharedHobbies.length > 0
    ? `You both enjoy: ${sharedHobbies.join(', ')}.`
    : `One works in ${profileA?.profession}, the other in ${profileB?.profession}.`;

  const icebreakers = [
    "What does your ideal Sunday look like?",
    "What's one thing on your bucket list you haven't done yet?",
    "What's the best trip you've ever taken?",
    `You both seem to enjoy similar things — ${context} What's your favourite memory related to that?`,
    "What kind of family traditions are important to you?",
  ];

  await setCache(cacheKey, icebreakers, 86400);
  return icebreakers;
}

// ── Private helpers ───────────────────────────────────────
function _getAge(dob) {
  if (!dob) return 25;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function _applyPreference(base, value, min, max) {
  if (!min && !max) return base;
  if (min && value < min) return Math.max(0, base - 30);
  if (max && value > max) return Math.max(0, base - 30);
  return Math.min(100, base + 10);
}

function _haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dO = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dL / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _computeHoroscopeScore(pA, pB) {
  const RASHI_COMPAT = {
    'aries': ['leo', 'sagittarius', 'gemini'],
    'taurus': ['virgo', 'capricorn', 'cancer'],
    'gemini': ['libra', 'aquarius', 'aries'],
    'cancer': ['scorpio', 'pisces', 'taurus'],
    'leo': ['aries', 'sagittarius', 'gemini'],
    'virgo': ['taurus', 'capricorn', 'cancer'],
    'libra': ['gemini', 'aquarius', 'leo'],
    'scorpio': ['cancer', 'pisces', 'virgo'],
    'sagittarius': ['aries', 'leo', 'libra'],
    'capricorn': ['taurus', 'virgo', 'scorpio'],
    'aquarius': ['gemini', 'libra', 'sagittarius'],
    'pisces': ['cancer', 'scorpio', 'capricorn'],
  };
  const rashiA = (pA.rashi || '').toLowerCase();
  const rashiB = (pB.rashi || '').toLowerCase();
  const compatible = (RASHI_COMPAT[rashiA] || []).includes(rashiB);
  const manglikMatch = pA.manglik === pB.manglik;

  return compatible && manglikMatch ? 95 : compatible || manglikMatch ? 70 : 45;
}

module.exports = { computeCompatibility, getDailyCuratedMatches, generateIcebreakers };
