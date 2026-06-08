const mongoose = require('mongoose');

// ── Message Schema ────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  match_id: { type: String, required: true, index: true },
  sender_id: { type: String, required: true },
  content: {
    type: String,
    required: function () { return this.message_type === 'text'; },
    maxlength: 2000,
  },
  encrypted_content: { type: String },
  message_type: {
    type: String,
    enum: ['text', 'image', 'voice', 'video', 'file', 'gif', 'location', 'icebreaker'],
    default: 'text',
  },
  // Media attachments
  media_url: { type: String },
  media_thumbnail: { type: String },
  media_duration_sec: { type: Number },
  media_size_bytes: { type: Number },
  // Status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  read_at: { type: Date },
  delivered_at: { type: Date },
  // Reactions
  reactions: [{
    user_id: String,
    emoji: String,
    at: { type: Date, default: Date.now },
  }],
  // Reply thread
  reply_to_message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  // Soft delete
  deleted_by_sender: { type: Boolean, default: false },
  deleted_by_receiver: { type: Boolean, default: false },
  deleted_for_all: { type: Boolean, default: false },
  // AI icebreaker
  is_ai_generated: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

MessageSchema.index({ match_id: 1, createdAt: -1 });
MessageSchema.index({ sender_id: 1 });

// ── Conversation Schema (per-match summary) ───────────────
const ConversationSchema = new mongoose.Schema({
  match_id: { type: String, required: true, unique: true },
  participants: [String],
  last_message: {
    content: String,
    sender_id: String,
    message_type: String,
    sent_at: Date,
  },
  unread_count: {
    type: Map,
    of: Number,
    default: {},
  },
  is_muted: {
    type: Map,
    of: Boolean,
    default: {},
  },
  typing_users: [String],
}, {
  timestamps: true,
});

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ 'last_message.sent_at': -1 });

const Message = mongoose.model('Message', MessageSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = { Message, Conversation };
