const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// ── Interest (one-way like/pass) ─────────────────────────
class Interest extends Model {}

Interest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  receiver_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.ENUM('like', 'super_like', 'pass'),
    defaultValue: 'like',
  },
  note: {
    type: DataTypes.TEXT,
    validate: { len: [0, 200] },
  },
}, {
  sequelize,
  modelName: 'Interest',
  tableName: 'interests',
  indexes: [
    { unique: true, fields: ['sender_id', 'receiver_id'] },
    { fields: ['receiver_id', 'type'] },
  ],
});

// ── Match (two-way mutual interest) ─────────────────────
class Match extends Model {}

Match.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_a_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  user_b_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  compatibility_score: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  compatibility_breakdown: { type: DataTypes.JSONB, defaultValue: {} },
  status: {
    type: DataTypes.ENUM('active', 'unmatched', 'blocked'),
    defaultValue: 'active',
  },
  unmatched_by: { type: DataTypes.UUID },
  unmatched_at: { type: DataTypes.DATE },
  last_message_at: { type: DataTypes.DATE },
  last_message_preview: { type: DataTypes.STRING(200) },
  family_approved_a: { type: DataTypes.BOOLEAN, defaultValue: false },
  family_approved_b: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'Match',
  tableName: 'matches',
  indexes: [
    { unique: true, fields: ['user_a_id', 'user_b_id'] },
    { fields: ['user_a_id', 'status'] },
    { fields: ['user_b_id', 'status'] },
    { fields: ['last_message_at'] },
  ],
});

// ── Subscription ─────────────────────────────────────────
class Subscription extends Model {
  isActive() {
    return this.status === 'active' && new Date(this.current_period_end) > new Date();
  }
}

Subscription.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  },
  plan: { type: DataTypes.ENUM('silver', 'gold', 'platinum'), allowNull: false },
  gateway: { type: DataTypes.ENUM('stripe', 'razorpay', 'apple', 'google'), allowNull: false },
  gateway_subscription_id: { type: DataTypes.STRING(255) },
  gateway_customer_id: { type: DataTypes.STRING(255) },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'past_due', 'paused'),
    defaultValue: 'active',
  },
  amount_usd: { type: DataTypes.DECIMAL(10, 2) },
  currency: { type: DataTypes.STRING(3), defaultValue: 'USD' },
  interval: { type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'), defaultValue: 'monthly' },
  current_period_start: { type: DataTypes.DATE },
  current_period_end: { type: DataTypes.DATE },
  cancelled_at: { type: DataTypes.DATE },
  cancel_at_period_end: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'Subscription',
  tableName: 'subscriptions',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['gateway_subscription_id'] },
    { fields: ['status'] },
  ],
});

// ── Report ───────────────────────────────────────────────
class Report extends Model {}

Report.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reporter_id: { type: DataTypes.UUID, allowNull: false },
  reported_id: { type: DataTypes.UUID, allowNull: false },
  reason: {
    type: DataTypes.ENUM(
      'fake_profile', 'harassment', 'inappropriate_content',
      'spam', 'scam', 'underage', 'offensive_language', 'other'
    ),
    allowNull: false,
  },
  description: { type: DataTypes.TEXT },
  evidence_urls: { type: DataTypes.JSONB, defaultValue: [] },
  status: {
    type: DataTypes.ENUM('pending', 'investigating', 'resolved', 'dismissed'),
    defaultValue: 'pending',
  },
  admin_notes: { type: DataTypes.TEXT },
  resolved_at: { type: DataTypes.DATE },
}, {
  sequelize,
  modelName: 'Report',
  tableName: 'reports',
});

module.exports = { Interest, Match, Subscription, Report };
