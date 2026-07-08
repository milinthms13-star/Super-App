/**
 * WebSocket Service for Real-Time Communication
 * Handles messaging, typing indicators, read receipts, online status
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const MatrimonialProfile = require('../models/MatrimonialProfile');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> WebSocket connection
    this.rooms = new Map(); // roomId -> Set of userIds
    this.typingTimers = new Map(); // userId -> timeoutId
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/matrimonial'
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket service initialized');
  }

  async handleConnection(ws, req) {
    const token = this.extractToken(req);
    
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId || decoded.id;

      ws.userId = userId;
      ws.isAlive = true;
      
      this.clients.set(userId, ws);
      logger.info(`WebSocket client connected: ${userId}`);

      // Send online status to relevant users
      await this.broadcastOnlineStatus(userId, 'online');

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for user ${userId}:`, error);
      });

      // Send connection success
      this.sendToClient(userId, {
        type: 'connected',
        userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  extractToken(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || 
                  req.headers.authorization?.replace('Bearer ', '');
    return token;
  }

  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      switch (type) {
        case 'message':
          await this.handleChatMessage(ws, payload);
          break;
        case 'typing':
          await this.handleTypingIndicator(ws, payload);
          break;
        case 'read_receipt':
          await this.handleReadReceipt(ws, payload);
          break;
        case 'join_room':
          await this.handleJoinRoom(ws, payload);
          break;
        case 'leave_room':
          await this.handleLeaveRoom(ws, payload);
          break;
        case 'call_signal':
          await this.handleCallSignal(ws, payload);
          break;
        default:
          logger.warn(`Unknown message type: ${type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendToClient(ws.userId, {
        type: 'error',
        message: 'Failed to process message'
      });
    }
  }

  async handleChatMessage(ws, payload) {
    const { toUserId, content, roomId, messageId, attachments } = payload;
    
    // Save message to database
    const profile = await MatrimonialProfile.findOne({ userId: ws.userId });
    const toProfile = await MatrimonialProfile.findOne({ userId: toUserId });

    if (!profile || !toProfile) {
      this.sendToClient(ws.userId, {
        type: 'error',
        message: 'Recipient not found'
      });
      return;
    }

    // Check if blocked
    if (toProfile.blockedBy?.includes(profile._id)) {
      this.sendToClient(ws.userId, {
        type: 'error',
        message: 'Unable to send message'
      });
      return;
    }

    const newMessage = {
      id: messageId || require('crypto').randomUUID(),
      fromProfileId: profile._id,
      toProfileId: toProfile._id,
      content,
      attachments: attachments || [],
      isRead: false,
      createdAt: new Date()
    };

    profile.messages.push(newMessage);
    await profile.save();

    toProfile.messages.push(newMessage);
    await toProfile.save();

    // Send to recipient
    this.sendToClient(toUserId, {
      type: 'message',
      payload: {
        ...newMessage,
        fromUserId: ws.userId,
        fromProfileId: profile._id.toString(),
        toProfileId: toProfile._id.toString()
      }
    });

    // Confirm to sender
    this.sendToClient(ws.userId, {
      type: 'message_sent',
      payload: {
        messageId: newMessage.id,
        status: 'delivered',
        timestamp: newMessage.createdAt
      }
    });

    logger.info(`Message sent from ${ws.userId} to ${toUserId}`);
  }

  async handleTypingIndicator(ws, payload) {
    const { toUserId, isTyping } = payload;

    // Clear existing timer
    if (this.typingTimers.has(ws.userId)) {
      clearTimeout(this.typingTimers.get(ws.userId));
    }

    // Send typing indicator to recipient
    this.sendToClient(toUserId, {
      type: 'typing',
      payload: {
        fromUserId: ws.userId,
        isTyping,
        timestamp: new Date().toISOString()
      }
    });

    // Auto-clear typing indicator after 5 seconds
    if (isTyping) {
      const timer = setTimeout(() => {
        this.sendToClient(toUserId, {
          type: 'typing',
          payload: {
            fromUserId: ws.userId,
            isTyping: false,
            timestamp: new Date().toISOString()
          }
        });
      }, 5000);

      this.typingTimers.set(ws.userId, timer);
    }
  }

  async handleReadReceipt(ws, payload) {
    const { messageId, toUserId } = payload;

    // Update message status in database
    const profile = await MatrimonialProfile.findOne({ userId: ws.userId });
    if (profile) {
      const message = profile.messages.find(m => m.id === messageId);
      if (message) {
        message.isRead = true;
        await profile.save();
      }
    }

    // Notify sender
    this.sendToClient(toUserId, {
      type: 'read_receipt',
      payload: {
        messageId,
        readBy: ws.userId,
        readAt: new Date().toISOString()
      }
    });
  }

  async handleJoinRoom(ws, payload) {
    const { roomId } = payload;
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    this.rooms.get(roomId).add(ws.userId);
    
    // Notify other room members
    this.broadcastToRoom(roomId, {
      type: 'user_joined',
      payload: {
        userId: ws.userId,
        roomId,
        timestamp: new Date().toISOString()
      }
    }, ws.userId);
  }

  async handleLeaveRoom(ws, payload) {
    const { roomId } = payload;
    
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(ws.userId);
      
      // Notify other room members
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        payload: {
          userId: ws.userId,
          roomId,
          timestamp: new Date().toISOString()
        }
      }, ws.userId);
    }
  }

  async handleCallSignal(ws, payload) {
    const { toUserId, signal, callId, callType } = payload;

    this.sendToClient(toUserId, {
      type: 'call_signal',
      payload: {
        fromUserId: ws.userId,
        signal,
        callId,
        callType,
        timestamp: new Date().toISOString()
      }
    });
  }

  async handleDisconnection(ws) {
    if (!ws.userId) return;

    logger.info(`WebSocket client disconnected: ${ws.userId}`);
    
    this.clients.delete(ws.userId);

    // Clear typing timer
    if (this.typingTimers.has(ws.userId)) {
      clearTimeout(this.typingTimers.get(ws.userId));
      this.typingTimers.delete(ws.userId);
    }

    // Remove from all rooms
    for (const [roomId, members] of this.rooms.entries()) {
      if (members.has(ws.userId)) {
        members.delete(ws.userId);
        this.broadcastToRoom(roomId, {
          type: 'user_left',
          payload: {
            userId: ws.userId,
            roomId,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Broadcast offline status
    await this.broadcastOnlineStatus(ws.userId, 'offline');
  }

  sendToClient(userId, data) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  broadcastToRoom(roomId, data, excludeUserId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const userId of room) {
      if (userId !== excludeUserId) {
        this.sendToClient(userId, data);
      }
    }
  }

  async broadcastOnlineStatus(userId, status) {
    // Get user's connections (people they've messaged)
    const profile = await MatrimonialProfile.findOne({ userId })
      .select('messages interests');
    
    if (!profile) return;

    const connectedUserIds = new Set();
    
    // Add message recipients
    profile.messages.forEach(msg => {
      if (msg.toProfileId) {
        connectedUserIds.add(msg.toProfileId.toString());
      }
    });

    // Add interest recipients
    profile.interests.forEach(interest => {
      if (interest.toProfileId) {
        connectedUserIds.add(interest.toProfileId.toString());
      }
    });

    // Get userIds from profileIds
    const connectedProfiles = await MatrimonialProfile.find({
      _id: { $in: Array.from(connectedUserIds) }
    }).select('userId');

    // Broadcast to all connected users
    for (const p of connectedProfiles) {
      this.sendToClient(p.userId.toString(), {
        type: 'online_status',
        payload: {
          userId,
          status,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  broadcast(data) {
    for (const client of this.clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  }

  startHeartbeat() {
    setInterval(() => {
      for (const [userId, ws] of this.clients.entries()) {
        if (ws.isAlive === false) {
          logger.info(`Terminating inactive WebSocket connection: ${userId}`);
          ws.terminate();
          this.clients.delete(userId);
          continue;
        }

        ws.isAlive = false;
        ws.ping();
      }
    }, 30000); // 30 seconds
  }

  getOnlineUsers() {
    return Array.from(this.clients.keys());
  }

  isUserOnline(userId) {
    return this.clients.has(userId);
  }
}

// Singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;
