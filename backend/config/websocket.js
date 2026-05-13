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

const resolveCallRelayTarget = async (callId, senderUserId, preferredTargetId = '') => {
  if (!callId) {
    return null;
  }

  const call = await Call.findById(callId).select('initiatorId recipientId');
  if (!call) {
    return null;
  }

  const normalizedSenderId = normalizeUserKey(senderUserId);
  const initiatorId = normalizeUserKey(call.initiatorId);
  const recipientId = normalizeUserKey(call.recipientId);

  if (![initiatorId, recipientId].includes(normalizedSenderId)) {
    return null;
  }

  const normalizedPreferredTarget = normalizeUserKey(preferredTargetId);
  let targetUserId = normalizedSenderId === initiatorId ? recipientId : initiatorId;

  if (
    normalizedPreferredTarget &&
    normalizedPreferredTarget !== normalizedSenderId &&
    [initiatorId, recipientId].includes(normalizedPreferredTarget)
  ) {
    targetUserId = normalizedPreferredTarget;
  }

  return {
    call,
    targetUserId,
  };
};

const initializeWebSocket = (server, options = {}) => {
  const allowedSocketOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, '')) // Remove trailing slashes
    .filter(Boolean);

  io = socketIo(server, {
    cors: {
      origin: (origin, callback) => {
        // Allow localhost, undefined, or configured origins
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedSocketOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow for production debugging
        }
      },
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
  io.on('connection', async (socket) => {
    console.log(`[WebSocket] User ${socket.userId} connected: ${socket.id}`);

    // Store socket mapping
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);

    // Set user online
    setUserOnline(socket.userId);

    // Phase 1: Update device connection status
    try {
      const Device = require('../models/Device');
      const deviceService = require('../services/deviceService');
      const deviceFingerprint = socket.handshake.auth.deviceFingerprint;
      
      if (deviceFingerprint) {
        await deviceService.updateConnectionStatus(
          deviceFingerprint,
          'online',
          socket.id
        );
        socket.deviceFingerprint = deviceFingerprint;
      }
    } catch (err) {
      console.error('[WebSocket] Failed to update device connection status:', err.message);
    }

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
        chatId,
      });
    });

    /**
     * Send message in real-time
     * @event message:send
     * @param {object} data - {chatId, content, messageType, media, replyTo}
     */
    // --- Real-time dashboard update helper ---
    const emitDashboardUpdate = async (source = 'message') => {
      try {
        const AnalyticsDashboardService = require('../services/analyticsDashboardService');
        const dashboardService = new AnalyticsDashboardService();
        const dashboardData = await dashboardService.getDashboardOverview(null, 1);
        broadcast('dashboard:update', { source, dashboardData });
      } catch (err) {
        console.error('[WebSocket] Error emitting dashboard update:', err);
      }
    };

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

        // Emit dashboard update on message send
        emitDashboardUpdate('message:send');
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
      // Emit dashboard update on message read
      emitDashboardUpdate('message:read');
    });
  // Optionally, add similar emitDashboardUpdate calls to message:delivered, message:failed, etc. if those events are handled elsewhere.

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
     * Notify the other participant that the local peer is ready to exchange WebRTC signaling.
     * @event call:ready
     * @param {object} data - {callId, targetUserId?}
     */
    socket.on('call:ready', async (data = {}) => {
      try {
        const relayTarget = await resolveCallRelayTarget(
          data.callId,
          socket.userId,
          data.targetUserId
        );

        if (!relayTarget?.targetUserId) {
          return;
        }

        emitToUser(relayTarget.targetUserId, 'call:ready', {
          callId: data.callId,
          fromUserId: socket.userId,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('[WebSocket] Call ready relay error:', error);
      }
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
     * Relay WebRTC offers, answers, ICE candidates, and shared call UI state.
     * @event call:signal
     * @param {object} data - {callId, targetUserId?, description?, candidate?, backgroundMode?}
     */
    socket.on('call:signal', async (data = {}) => {
      try {
        const relayTarget = await resolveCallRelayTarget(
          data.callId,
          socket.userId,
          data.targetUserId
        );

        if (!relayTarget?.targetUserId) {
          return;
        }

        const { call } = relayTarget;
        const hasDescription = Boolean(data.description?.type && data.description?.sdp);
        const hasCandidate = Boolean(data.candidate);
        const normalizedBackgroundMode =
          data.backgroundMode?.layout === 'both-sides'
            ? { layout: 'both-sides' }
            : data.backgroundMode?.layout === 'one-side'
              ? { layout: 'one-side' }
              : undefined;
        const hasBackgroundMode = Boolean(normalizedBackgroundMode);

        if (!hasDescription && !hasCandidate && !hasBackgroundMode) {
          return;
        }

        if (hasDescription) {
          if (data.description.type === 'offer') {
            call.sdpOffer = data.description.sdp;
          }

          if (data.description.type === 'answer') {
            call.sdpAnswer = data.description.sdp;
          }
        }

        if (hasDescription) {
          await call.save();
        }

        emitToUser(relayTarget.targetUserId, 'call:signal', {
          callId: data.callId,
          fromUserId: socket.userId,
          description: hasDescription ? data.description : undefined,
          candidate: hasCandidate ? data.candidate : undefined,
          backgroundMode: hasBackgroundMode ? normalizedBackgroundMode : undefined,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('[WebSocket] Call signal relay error:', error);
      }
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

    // ============== SOS STATUS EVENTS (Priority 3) ==============

    /**
     * Join incident real-time updates room
     * @event sos:incident:join
     * @param {object} data - {incidentId}
     */
    socket.on('sos:incident:join', (data) => {
      const { incidentId } = data;
      if (incidentId) {
        socket.join(`sos:incident:${incidentId}`);
        console.log(`[WebSocket] User ${socket.userId} subscribed to incident ${incidentId} updates`);
        
        // Notify others in the room
        socket.broadcast.to(`sos:incident:${incidentId}`).emit('sos:user:joined', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Leave incident real-time updates room
     * @event sos:incident:leave
     * @param {object} data - {incidentId}
     */
    socket.on('sos:incident:leave', (data) => {
      const { incidentId } = data;
      if (incidentId) {
        socket.leave(`sos:incident:${incidentId}`);
        console.log(`[WebSocket] User ${socket.userId} unsubscribed from incident ${incidentId}`);
        
        // Notify others in the room
        socket.broadcast.to(`sos:incident:${incidentId}`).emit('sos:user:left', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Request full timeline for incident
     * @event sos:incident:request_timeline
     * @param {object} data - {incidentId}
     */
    socket.on('sos:incident:request_timeline', async (data) => {
      try {
        const { incidentId } = data;
        const SosIncident = require('../models/SosIncident');
        
        const incident = await SosIncident.findById(incidentId);
        if (!incident) {
          socket.emit('sos:error', {
            message: 'Incident not found',
          });
          return;
        }

        socket.emit('sos:incident:timeline', {
          incidentId,
          timeline: incident.statusHistory || [],
          currentStatus: incident.currentStatus || 'initial',
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('[WebSocket] Timeline request error:', error);
        socket.emit('sos:error', {
          message: 'Failed to fetch timeline',
        });
      }
    });

    /**
     * Listen for status update notifications (for incident caller)
     * Real-time status updates are broadcast automatically via emitToUser in controller
     * This event allows clients to explicitly request re-sync
     */
    socket.on('sos:incident:status_request', async (data) => {
      try {
        const { incidentId } = data;
        const SosIncident = require('../models/SosIncident');
        
        const incident = await SosIncident.findById(incidentId);
        if (!incident) {
          return;
        }

        const latestStatus = incident.statusHistory?.[incident.statusHistory.length - 1] || {
          status: 'initial',
          timestamp: incident.createdAt,
          updatedBy: 'system',
        };

        socket.emit('sos:incident:status', {
          incidentId,
          currentStatus: incident.currentStatus || 'initial',
          latestUpdate: latestStatus,
          updatedAt: incident.lastStatusUpdate,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('[WebSocket] Status request error:', error);
      }
    });

    // ============== CONNECTION TERMINATION ==============

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User ${socket.userId} disconnected: ${socket.id}`);

      // Phase 1: Update device connection status to offline
      if (socket.deviceFingerprint) {
        try {
          const deviceService = require('../services/deviceService');
          deviceService.updateConnectionStatus(
            socket.deviceFingerprint,
            'offline',
            null
          ).catch(err => {
            console.error('[WebSocket] Failed to update device offline status:', err.message);
          });
        } catch (err) {
          console.error('[WebSocket] Error updating device status:', err.message);
        }
      }

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
