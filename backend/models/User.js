const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  apple_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  google_id: {
    type: String,
    unique: true,
    sparse: true,
  },
  first_name: {
    type: String,
    trim: true,
  },
  last_name: {
    type: String,
    trim: true,
  },
  date_of_birth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  looking_for: {
    type: String,
    enum: ['male', 'female', 'any'],
    default: 'any',
  },
  // Location
  country: String,
  state: String,
  city: String,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  // Profile photo
  profile_photo_url: String,
  photos: {
    type: [String],
    default: [],
  },
  // Account status
  is_verified: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  is_banned: { type: Boolean, default: false },
  is_admin: { type: Boolean, default: false },
  ban_reason: String,
  // Verification
  email_verified: { type: Boolean, default: false },
  id_verified: { type: Boolean, default: false },
  selfie_verified: { type: Boolean, default: false },
  // Premium
  premium_tier: {
    type: String,
    enum: ['free', 'silver', 'gold', 'platinum'],
    default: 'free',
  },
  premium_expires: Date,
  coins: { type: Number, default: 0 },
  // Stats
  profile_completeness: { type: Number, default: 0 },
  last_active: { type: Date, default: Date.now },
  // Push notification token
  push_token: String,
  // Privacy
  show_online_status: { type: Boolean, default: true },
  incognito_mode: { type: Boolean, default: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Create a geospatial index
UserSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', UserSchema);

module.exports = User;
