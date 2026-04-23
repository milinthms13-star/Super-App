// backend/config/websocket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Call = require('../models/Call');
const User = require('../models/User');
const devAuthStore = require('../utils/devAuthStore');
const { ensureMessagingUser } = require('../utils/ensureMessagingUser');
const { getJwtSecret } = require('../middleware/auth');

let io;
const userSockets = new Map(); // userId -> Set of socket IDs
const userStatus = new Map(); // userId -> { status, lastSeen }
const normalizeUserKey = (userId) => (userId?.toString ? userId.toString() : String(userId || ''));

const initializeWebSocket = (server, options = {}) => {
  const allowedSocketOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = socketIo(server, {
    cors: {
      origin: allowedSocketOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e7, // 10MB
    ...options,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, getJwtSecret(), {
        issuer: 'malabarbazaar-api',
        audience: 'malabarbazaar-web',
      });

      const useMemoryAuth = process.env.AUTH_STORAGE === 'memory' && process.env.NODE_ENV !== 'production';
      let user = useMemoryAuth
        ? await devAuthStore.findUserById(payload.sub)
        : await User.findById(payload.sub);

      if (!user && useMemoryAuth && payload.email) {
        user = await devAuthStore.findUserByEmail(payload.email);
        if (!user) {
          user = await devAuthStore.upsertUserByEmail(payload.email);
        }
      }

      if (!user) {
        return next(new Error('User not found'));
      }

      const resolvedUser = await ensureMessagingUser(user);
      socket.userId = resolvedUser?._id?.toString ? resolvedUser._id.toString() : user._id.toString();
      socket.user = resolvedUser || user;
      next();
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[WebSocket] User ${socket.userId} connected: ${socket.id}`);

    // Store socket mapping
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);

    // Set user online
    setUserOnline(socket.userId);

    // Broadcast online status
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      timestamp: new Date(),
    });

    // ============== MESSAGE EVENTS ==============

    /**
     * Join a chat room
     * @event chat:join
     * @param {string} chatId - Chat ID to join
     */
    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`[WebSocket] User ${socket.userId} joined chat ${chatId}`);
    });

    /**
     * Leave a chat room
     * @event chat:leave
     * @param {string} chatId - Chat ID to leave
     */
    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
      io.to(`chat:${chatId}`).emit('user:typing:stopped', {
        userId: socket.userId,
      });
    });

    /**
     * Send message in real-time
     * @event message:send
     * @param {object} data - {chatId, content, messageType, media, replyTo}
     */
    socket.on('message:send', async (data, callback) => {
      try {
        const message = {
          chatId: data.chatId,
          senderId: socket.userId,
          messageType: data.messageType || 'text',
          content: data.content,
          media: data.media,
          replyTo: data.replyTo,
          createdAt: new Date(),
          deliveryStatus: [
            {
              userId: socket.userId,
              status: 'sent',
              sentAt: new Date(),
            },
          ],
        };

        // Broadcast to chat room
        io.to(`chat:${data.chatId}`).emit('message:received', {
          ...message,
          _id: 'temp-' + Date.now(), // Temporary ID until saved
        });

        // Acknowledge receipt to sender
        if (callback) callback({ success: true });

        // Mark message as delivered for online users
        setTimeout(() => {
          io.to(`chat:${data.chatId}`).emit('message:delivered', {
            messageId: message._id,
            chatId: data.chatId,
            timestamp: new Date(),
          });
        }, 100);
      } catch (error) {
        console.error('[WebSocket] Message send error:', error);
        if (callback) callback({ error: error.message });
      }
    });

    /**
     * Mark message as read
     * @event message:read
     * @param {string} messageId - Message ID
     * @param {string} chatId - Chat ID
     */
    socket.on('message:read', (data) => {
      io.to(`chat:${data.chatId}`).emit('message:read:updated', {
        messageId: data.messageId,
        userId: socket.userId,
        readAt: new Date(),
      });
    });

    /**
     * User is typing
     * @event user:typing
     * @param {string} chatId - Chat ID
     */
    socket.on('user:typing', (chatId) => {
      socket.broadcast.to(`chat:${chatId}`).emit('user:typing:started', {
        userId: socket.userId,
        chatId,
        timestamp: new Date(),
      });
    });

    /**
     * User stopped typing
     * @event user:typing:stopped
     * @param {string} chatId - Chat ID
     */
    socket.on('user:typing:stopped', (chatId) => {
      socket.broadcast.to(`chat:${chatId}`).emit('user:typing:stopped', {
        userId: socket.userId,
        chatId,
      });
    });

    // ============== CALL EVENTS ==============

    /**
     * Initiate a call
     * @event call:initiate
     * @param {object} data - {chatId, recipientId, callType: 'audio'|'video'}
     */
    socket.on('call:initiate', (data) => {
      const recipientSocket = Array.from(userSockets.get(data.recipientId) || []);

      if (recipientSocket.length > 0) {
        io.to(recipientSocket).emit('call:incoming', {
          callId: 'call-' + Date.now(),
          initiatorId: socket.userId,
          chatId: data.chatId,
          callType: data.callType,
          timestamp: new Date(),
        });

        // Acknowledge to initiator
        socket.emit('call:ringing', {
          recipientId: data.recipientId,
          callType: data.callType,
        });
      } else {
        socket.emit('call:failed', {
          reason: 'User is offline',
        });
      }
    });

    /**
     * Accept incoming call
     * @event call:accept
     * @param {object} data - {callId, sdpAnswer}
     */
    socket.on('call:accept', (data) => {
      io.emit('call:accepted', {
        callId: data.callId,
        recipientId: socket.userId,
        sdpAnswer: data.sdpAnswer,
        timestamp: new Date(),
      });
    });

    /**
     * Decline incoming call
     * @event call:decline
     * @param {string} callId - Call ID
     */
    socket.on('call:decline', (callId) => {
      io.emit('call:declined', {
        callId,
        declinedBy: socket.userId,
        timestamp: new Date(),
      });
    });

    /**
     * Send WebRTC ICE candidate
     * @event call:ice-candidate
     * @param {object} data - {callId, candidate}
     */
    socket.on('call:ice-candidate', (data) => {
      socket.broadcast.emit('call:ice-candidate', {
        callId: data.callId,
        candidate: data.candidate,
        from: socket.userId,
      });
    });

    /**
     * End call
     * @event call:end
     * @param {string} callId - Call ID
     */
    socket.on('call:end', (callId) => {
      io.emit('call:ended', {
        callId,
        endedBy: socket.userId,
        timestamp: new Date(),
      });
    });

    /**
     * Share screen
     * @event call:screen-share
     * @param {object} data - {callId, enabled, stream}
     */
    socket.on('call:screen-share', (data) => {
      socket.broadcast.emit('call:screen-share', {
        callId: data.callId,
        userId: socket.userId,
        enabled: data.enabled,
        stream: data.stream,
      });
    });

    // ============== REACTION EVENTS ==============

    /**
     * Add message reaction
     * @event message:reaction:add
     * @param {object} data - {messageId, emoji, chatId}
     */
    socket.on('message:reaction:add', (data) => {
      io.to(`chat:${data.chatId}`).emit('message:reaction:added', {
        messageId: data.messageId,
        userId: socket.userId,
        emoji: data.emoji,
        timestamp: new Date(),
      });
    });

    /**
     * Remove message reaction
     * @event message:reaction:remove
     * @param {object} data - {messageId, emoji, chatId}
     */
    socket.on('message:reaction:remove', (data) => {
      io.to(`chat:${data.chatId}`).emit('message:reaction:removed', {
        messageId: data.messageId,
        userId: socket.userId,
        emoji: data.emoji,
      });
    });

    // ============== PRESENCE EVENTS ==============

    /**
     * Update user presence
     * @event presence:update
     * @param {object} data - {status: 'online'|'away'|'busy'|'offline', activity?}
     */
    socket.on('presence:update', (data) => {
      updateUserStatus(socket.userId, data);

      socket.broadcast.emit('user:presence:updated', {
        userId: socket.userId,
        status: data.status,
        activity: data.activity,
        timestamp: new Date(),
      });
    });

    /**
     * Get users online status
     * @event users:status:get
     * @param {array} userIds - List of user IDs to check
     */
    socket.on('users:status:get', (userIds) => {
      const statuses = userIds.map((userId) => ({
        userId,
        status: userStatus.get(normalizeUserKey(userId)) || { status: 'offline', lastSeen: null },
      }));

      socket.emit('users:status:response', statuses);
    });

    // ============== NOTIFICATION EVENTS ==============

    /**
     * Send notification
     * @event notification:send
     * @param {object} data - {userId, title, body, type, actionData}
     */
    socket.on('notification:send', (data) => {
      const targetSocket = Array.from(userSockets.get(data.userId) || []);
      if (targetSocket.length > 0) {
        io.to(targetSocket).emit('notification:received', {
          ...data,
          sentAt: new Date(),
        });
      }
    });

    // ============== CONNECTION TERMINATION ==============

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User ${socket.userId} disconnected: ${socket.id}`);

      // Remove socket from user's socket set
      const sockets = userSockets.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(socket.userId);
          setUserOffline(socket.userId);

          // Broadcast offline status
          socket.broadcast.emit('user:offline', {
            userId: socket.userId,
            lastSeen: new Date(),
          });
        }
      }
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for user ${socket.userId}:`, error);
    });
  });

  return io;
};

// ============== HELPER FUNCTIONS ==============

const setUserOnline = (userId) => {
  userStatus.set(normalizeUserKey(userId), {
    status: 'online',
    lastSeen: new Date(),
  });
};

const setUserOffline = (userId) => {
  userStatus.set(normalizeUserKey(userId), {
    status: 'offline',
    lastSeen: new Date(),
  });
};

const updateUserStatus = (userId, data) => {
  const normalizedUserId = normalizeUserKey(userId);
  const currentStatus = userStatus.get(normalizedUserId) || {};
  userStatus.set(normalizedUserId, {
    ...currentStatus,
    status: data.status,
    activity: data.activity,
    lastSeen: new Date(),
  });
};

/**
 * Emit to specific user
 */
const emitToUser = (userId, event, data) => {
  const sockets = userSockets.get(normalizeUserKey(userId));
  if (sockets && sockets.size > 0) {
    io.to(Array.from(sockets)).emit(event, data);
  }
};

/**
 * Broadcast to all connected users
 */
const broadcast = (event, data) => {
  io.emit(event, data);
};

/**
 * Get user's online status
 */
const getUserStatus = (userId) => {
  return userStatus.get(normalizeUserKey(userId)) || { status: 'offline', lastSeen: null };
};

/**
 * Get all online users
 */
const getOnlineUsers = () => {
  return Array.from(userSockets.keys());
};

module.exports = {
  initializeWebSocket,
  io: () => io,
  emitToUser,
  broadcast,
  getUserStatus,
  getOnlineUsers,
};
