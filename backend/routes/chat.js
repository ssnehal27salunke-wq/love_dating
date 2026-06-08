const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth');
const { isMongoMock } = require('../config/mongodb');
const logger = require('../utils/logger');

// In-memory chat store for mock mode
const mockMessages = new Map();

// ── GET /api/chat/:matchId/messages ──────────────────────
router.get('/:matchId/messages', verifyToken, async (req, res) => {
  try {
    if (isMongoMock()) {
      const messages = mockMessages.get(req.params.matchId) || [];
      return res.json({ data: messages, page: 1, has_more: false });
    }

    const { Message } = require('../models/Message');
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      match_id: req.params.matchId,
      deleted_for_all: false,
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { match_id: req.params.matchId, sender_id: { $ne: req.user.id }, status: { $ne: 'read' } },
      { status: 'read', read_at: new Date() }
    );

    res.json({
      data: messages.reverse(),
      page: parseInt(page),
      has_more: messages.length === parseInt(limit),
    });
  } catch (err) {
    logger.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ── POST /api/chat/:matchId/messages ──────────────────────
router.post('/:matchId/messages', verifyToken, async (req, res) => {
  const { content, message_type = 'text', media_url, reply_to_message_id } = req.body;

  if (!content && !media_url) {
    return res.status(400).json({ error: 'Message content or media required' });
  }

  try {
    if (isMongoMock()) {
      const msg = {
        _id: Date.now().toString(),
        match_id: req.params.matchId,
        sender_id: req.user.id,
        content: content || '',
        message_type,
        media_url,
        status: 'sent',
        createdAt: new Date().toISOString(),
      };
      const existing = mockMessages.get(req.params.matchId) || [];
      existing.push(msg);
      mockMessages.set(req.params.matchId, existing);
      return res.status(201).json(msg);
    }

    const { Message, Conversation } = require('../models/Message');

    const message = await Message.create({
      match_id: req.params.matchId,
      sender_id: req.user.id,
      content,
      message_type,
      media_url,
      reply_to_message_id,
    });

    // Update conversation summary
    const preview = message_type === 'text'
      ? (content.length > 50 ? content.substring(0, 50) + '…' : content)
      : `📷 ${message_type}`;

    await Conversation.findOneAndUpdate(
      { match_id: req.params.matchId },
      {
        $set: {
          last_message: { content: preview, sender_id: req.user.id, message_type, sent_at: new Date() },
        },
        $addToSet: { participants: req.user.id },
      },
      { upsert: true }
    );

    // Emit via socket if connected
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${req.params.matchId}`).emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (err) {
    logger.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── DELETE /api/chat/:matchId/messages/:messageId ────────
router.delete('/:matchId/messages/:messageId', verifyToken, async (req, res) => {
  try {
    if (isMongoMock()) return res.json({ message: 'Message deleted' });

    const { Message } = require('../models/Message');
    const { deleteForAll = false } = req.body;
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.sender_id !== req.user.id) {
      return res.status(403).json({ error: "Cannot delete others' messages" });
    }

    if (deleteForAll) {
      await message.updateOne({ deleted_for_all: true, content: 'This message was deleted' });
    } else {
      await message.updateOne({ deleted_by_sender: true });
    }

    res.json({ message: 'Message deleted' });
  } catch (err) {
    logger.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
