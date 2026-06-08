const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

class User extends Model {
  async validatePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password_hash);
  }

  toSafeJSON() {
    const obj = this.toJSON();
    delete obj.password_hash;
    delete obj.otp_code;
    delete obj.otp_expires;
    delete obj.refresh_token;
    return obj;
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    validate: { is: /^\+[1-9]\d{6,14}$/ },
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: { len: [2, 100] },
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true,
  },
  looking_for: {
    type: DataTypes.ENUM('male', 'female', 'any'),
    defaultValue: 'any',
  },
  // Location
  country: { type: DataTypes.STRING(100) },
  state: { type: DataTypes.STRING(100) },
  city: { type: DataTypes.STRING(100) },
  latitude: { type: DataTypes.DECIMAL(10, 7) },
  longitude: { type: DataTypes.DECIMAL(10, 7) },
  // Profile photo
  profile_photo_url: { type: DataTypes.TEXT },
  photos: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  // Account status
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_banned: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  ban_reason: { type: DataTypes.TEXT },
  // Verification
  phone_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  id_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  selfie_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Auth tokens
  otp_code: { type: DataTypes.STRING(6) },
  otp_expires: { type: DataTypes.DATE },
  refresh_token: { type: DataTypes.TEXT },
  // OAuth
  google_id: { type: DataTypes.STRING(255) },
  apple_id: { type: DataTypes.STRING(255) },
  // Premium
  premium_tier: {
    type: DataTypes.ENUM('free', 'silver', 'gold', 'platinum'),
    defaultValue: 'free',
  },
  premium_expires: { type: DataTypes.DATE },
  coins: { type: DataTypes.INTEGER, defaultValue: 0 },
  // Stats
  profile_completeness: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_active: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // Push notification token
  push_token: { type: DataTypes.TEXT },
  // Privacy
  show_online_status: { type: DataTypes.BOOLEAN, defaultValue: true },
  incognito_mode: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash') && user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
  },
  indexes: [
    { fields: ['phone'] },
    { fields: ['email'] },
    { fields: ['country', 'state', 'city'] },
    { fields: ['gender', 'is_active', 'is_banned'] },
    { fields: ['premium_tier'] },
  ],
});

module.exports = User;
