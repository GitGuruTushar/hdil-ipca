const mongoose = require('mongoose');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth');

// userId -> Set<socketId>. In-memory and single-process — correct at this
// app's scale; would need Redis pub/sub only if ever horizontally scaled.
const onlineUsers = new Map();

async function contactIdsFor(userId) {
  const conversations = await Conversation.find({ participants: userId }, '_id participants');
  const ids = new Set();
  conversations.forEach((c) => c.participants.forEach((p) => ids.add(String(p))));
  ids.delete(String(userId));
  return ids;
}

module.exports = function attachSocketHandlers(io, logger) {
  // Socket.io's path (/socket.io/*) is not mounted under the Express app's
  // '/api' prefix, so it bypasses the Mongo-readiness gate, rate limiter, and
  // mongoSanitize that guard every HTTP route — this handshake check is the
  // socket transport's only defense against a request arriving mid-outage.
  io.use(async (socket, next) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return next(new Error('Database unavailable'));
      }
      const token = socket.handshake.auth?.token;
      const user = await verifyToken(token);
      socket.userId = String(user._id);
      socket.fullName = user.fullName;
      next();
    } catch (err) {
      next(new Error(err.message || 'Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.userId}`);

    if (!onlineUsers.has(socket.userId)) onlineUsers.set(socket.userId, new Set());
    const wasOffline = onlineUsers.get(socket.userId).size === 0;
    onlineUsers.get(socket.userId).add(socket.id);

    try {
      const contactIds = await contactIdsFor(socket.userId);

      socket.emit('presence:snapshot', {
        onlineUserIds: [...contactIds].filter((id) => onlineUsers.has(id) && onlineUsers.get(id).size > 0)
      });

      if (wasOffline) {
        contactIds.forEach((id) => io.to(`user:${id}`).emit('presence:update', { userId: socket.userId, online: true }));
      }
    } catch (err) {
      logger?.error(`Socket presence setup failed for user ${socket.userId}: ${err.message}`);
    }

    socket.on('conversation:join', async (conversationId, ack) => {
      try {
        const convo = await Conversation.findOne({ _id: conversationId, participants: socket.userId }, '_id');
        if (!convo) return ack?.({ ok: false, error: 'Not a participant' });
        socket.join(`conversation:${conversationId}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: 'Invalid conversation' });
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('typing:start', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: socket.userId,
        fullName: socket.fullName
      });
    });

    socket.on('typing:stop', (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId: socket.userId });
    });

    socket.on('disconnect', async () => {
      const set = onlineUsers.get(socket.userId);
      set?.delete(socket.id);
      if (set && set.size === 0) {
        try {
          const lastSeenAt = new Date();
          await User.findByIdAndUpdate(socket.userId, { lastSeenAt });
          const contactIds = await contactIdsFor(socket.userId);
          contactIds.forEach((id) =>
            io.to(`user:${id}`).emit('presence:update', { userId: socket.userId, online: false, lastSeenAt })
          );
        } catch (err) {
          logger?.error(`Socket disconnect cleanup failed for user ${socket.userId}: ${err.message}`);
        }
      }
    });
  });
};
