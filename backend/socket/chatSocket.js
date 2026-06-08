/**
 * Socket.io Chat Engine
 * Real-time messaging, typing indicators, read receipts, online presence.
 */

const jwt = require('jsonwebtoken');
const { isMongoMock } = require('../config/mongodb');
const { isMockMode } = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_prod';

// In-memory presence tracking (works in both mock and real mode)
const onlineUsers = new Map(); // userId -> socketId

function initSocket(io) {
  // ── Auth middleware ─────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, JWT_SECRET);

      let user;
      if (isMockMode()) {
        const { getMockUsers } = require('../middleware/auth');
        user = getMockUsers().get(decoded.id) || { id: decoded.id, first_name: 'User' };
      } else {
        const User = require('../models/User');
        user = await User.findByPk(decoded.id, {
          attributes: ['id', 'first_name', 'last_name', 'profile_photo_url', 'premium_tier'],
        });
      }

      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ──────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    logger.info(`Socket connected: ${userId} (${socket.id})`);

    onlineUsers.set(userId, socket.id);
    socket.broadcast.emit('user_online', { user_id: userId });

    // ── Join match rooms ──────────────────────────────────
    socket.on('join_match', async ({ match_id }) => {
      try {
        if (!isMockMode()) {
          const { Match } = require('../models/Match');
          const match = await Match.findOne({ where: { id: match_id, status: 'active' } });
          if (!match) return socket.emit('error', { message: 'Match not found' });

          const isParticipant = match.user_a_id === userId || match.user_b_id === userId;
          if (!isParticipant) return socket.emit('error', { message: 'Not authorised' });
        }

        socket.join(`match:${match_id}`);

        // Mark messages as delivered (MongoDB)
        if (!isMongoMock()) {
          const { Message } = require('../models/Message');
          await Message.updateMany(
            { match_id, sender_id: { $ne: userId }, status: 'sent' },
            { status: 'delivered', delivered_at: new Date() }
          );
        }

        socket.emit('joined_match', { match_id });
      } catch (err) {
        logger.error('Join match error:', err);
        socket.emit('error', { message: 'Failed to join match room' });
      }
    });

    // ── Send message ──────────────────────────────────────
    socket.on('send_message', async (data) => {
      const { match_id, content, message_type = 'text', media_url, reply_to, temp_id } = data;

      try {
        let messageObj;

        if (isMongoMock()) {
          // Mock: just broadcast
          messageObj = {
            _id: Date.now().toString(),
            match_id,
            sender_id: userId,
            sender: { id: userId, name: socket.user.first_name, photo: socket.user.profile_photo_url },
            content,
            message_type,
            media_url,
            status: 'sent',
            created_at: new Date().toISOString(),
          };
        } else {
          const { Message, Conversation } = require('../models/Message');
          const { encryptMessage } = require('../utils/encryption');

          const encrypted = content ? encryptMessage(content) : null;

          const message = await Message.create({
            match_id,
            sender_id: userId,
            content: content || '',
            encrypted_content: encrypted,
            message_type,
            media_url,
            reply_to_message_id: reply_to || null,
            status: 'sent',
          });

          const preview = message_type === 'text'
            ? (content.length > 50 ? content.substring(0, 50) + '…' : content)
            : `📷 ${message_type}`;

          await Conversation.findOneAndUpdate(
            { match_id },
            {
              match_id,
              $set: {
                last_message: { content: preview, sender_id: userId, message_type, sent_at: new Date() },
              },
              $addToSet: { participants: userId },
            },
            { upsert: true, new: true }
          );

          // Update match last_message
          if (!isMockMode()) {
            const { Match } = require('../models/Match');
            await Match.update(
              { last_message_at: new Date(), last_message_preview: preview },
              { where: { id: match_id } }
            );
          }

          messageObj = {
            _id: message._id.toString(),
            match_id,
            sender_id: userId,
            sender: { id: userId, name: socket.user.first_name, photo: socket.user.profile_photo_url },
            content,
            message_type,
            media_url,
            status: 'sent',
            created_at: message.createdAt,
            reply_to,
          };
        }

        // Broadcast to match room
        io.to(`match:${match_id}`).emit('new_message', messageObj);

        // Confirm to sender
        socket.emit('message_sent', { temp_id, message_id: messageObj._id });
      } catch (err) {
        logger.error('Send message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Read receipts ─────────────────────────────────────
    socket.on('mark_read', async ({ match_id, message_ids }) => {
      try {
        if (!isMongoMock()) {
          const { Message } = require('../models/Message');
          await Message.updateMany(
            { _id: { $in: message_ids }, sender_id: { $ne: userId }, status: { $ne: 'read' } },
            { status: 'read', read_at: new Date() }
          );
        }

        socket.to(`match:${match_id}`).emit('messages_read', {
          match_id,
          message_ids,
          read_by: userId,
          read_at: new Date().toISOString(),
        });
      } catch (err) {
        logger.error('Mark read error:', err);
      }
    });

    // ── Typing indicators ─────────────────────────────────
    socket.on('typing_start', ({ match_id }) => {
      socket.to(`match:${match_id}`).emit('typing', { user_id: userId, match_id, is_typing: true });
    });
    socket.on('typing_stop', ({ match_id }) => {
      socket.to(`match:${match_id}`).emit('typing', { user_id: userId, match_id, is_typing: false });
    });

    // ── Message reaction ──────────────────────────────────
    socket.on('react_message', async ({ message_id, emoji, match_id }) => {
      try {
        if (!isMongoMock()) {
          const { Message } = require('../models/Message');
          await Message.findByIdAndUpdate(message_id, { $pull: { reactions: { user_id: userId } } });
          if (emoji) {
            await Message.findByIdAndUpdate(message_id, { $push: { reactions: { user_id: userId, emoji } } });
          }
        }
        io.to(`match:${match_id}`).emit('message_reaction', { message_id, user_id: userId, emoji });
      } catch (err) {
        logger.error('React error:', err);
      }
    });

    // ── Disconnect ────────────────────────────────────────
    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { user_id: userId, last_active: new Date() });
      logger.info(`Socket disconnected: ${userId}`);
    });
  });
}

module.exports = { initSocket };
