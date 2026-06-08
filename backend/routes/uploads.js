const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const { isMockMode } = require('../config/database');
const logger = require('../utils/logger');

// ── Local disk storage (dev fallback when R2 isn't configured) ──
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${req.user.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, or HEIC images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Helper: upload to Cloudflare R2 if configured ────────
async function uploadToR2(filePath, key) {
  const r2Endpoint = process.env.R2_ENDPOINT;
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME;

  if (!r2Endpoint || !r2AccessKey) {
    // Return local URL
    return `/api/uploads/static/${path.basename(filePath)}`;
  }

  // Use S3-compatible API (Cloudflare R2 is S3-compatible)
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    endpoint: r2Endpoint,
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
    signatureVersion: 'v4',
    s3ForcePathStyle: true,
  });

  const fileBuffer = fs.readFileSync(filePath);
  const result = await s3.upload({
    Bucket: r2Bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: 'image/jpeg',
  }).promise();

  fs.unlinkSync(filePath);
  return result.Location || `${r2Endpoint}/${r2Bucket}/${key}`;
}

// ── POST /api/uploads/photo ───────────────────────────────
router.post('/photo', verifyToken, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const key = `profiles/${req.user.id}/${Date.now()}.jpg`;
    const url = await uploadToR2(req.file.path, key);

    if (!isMockMode()) {
      const User = require('../models/User');
      await User.update({ profile_photo_url: url }, { where: { id: req.user.id } });
    }

    logger.info(`Profile photo updated: user=${req.user.id}`);
    res.json({ url, message: 'Profile photo updated' });
  } catch (err) {
    logger.error('Photo upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// ── POST /api/uploads/photos (gallery, max 6) ────────────
router.post('/photos', verifyToken, upload.array('photos', 6), async (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });

  try {
    let existing = [];
    if (!isMockMode()) {
      const User = require('../models/User');
      const user = await User.findByPk(req.user.id);
      existing = Array.isArray(user.photos) ? user.photos : [];
    }

    if (existing.length + req.files.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 photos allowed.' });
    }

    const urls = [];
    for (const file of req.files) {
      const key = `galleries/${req.user.id}/${Date.now()}_${file.originalname}`;
      const url = await uploadToR2(file.path, key);
      urls.push(url);
    }

    const newPhotos = [...existing, ...urls];
    if (!isMockMode()) {
      const User = require('../models/User');
      await User.update({ photos: newPhotos }, { where: { id: req.user.id } });
    }

    res.json({ urls, photos: newPhotos, message: `${urls.length} photo(s) added` });
  } catch (err) {
    logger.error('Gallery upload error:', err);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// ── DELETE /api/uploads/photos ────────────────────────────
router.delete('/photos', verifyToken, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Photo URL required' });

  try {
    if (isMockMode()) return res.json({ photos: [], message: 'Photo deleted' });

    const User = require('../models/User');
    const user = await User.findByPk(req.user.id);
    const photos = (Array.isArray(user.photos) ? user.photos : []).filter((p) => p !== url);
    await user.update({ photos });
    res.json({ photos, message: 'Photo deleted' });
  } catch (err) {
    logger.error('Delete photo error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// ── Serve local uploads (dev only) ────────────────────────
router.use('/static', express.static(uploadDir));

module.exports = router;
