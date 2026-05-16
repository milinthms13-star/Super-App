const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> { ws, connected, lastPing }
    this.trackingSessions = new Map(); // trackingId -> { clients set }
    this.chatSessions = new Map(); // orderId -> { clients set }
    this.heartbeatInterval = null;
    this.initialized = false;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    if (this.initialized) {
      return;
    }

    this.wss = new WebSocket.Server({
      server,
      path: '/api/fooddelivery/ws',
    });

    this.wss.on('connection', (ws, req) => {
      this._handleConnection(ws, req);
    });

    // Heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this._heartbeat();
    }, 30000); // 30 seconds
    if (typeof this.heartbeatInterval.unref === 'function') {
      this.heartbeatInterval.unref();
    }

    this.initialized = true;

    console.log('WebSocket server initialized at /api/fooddelivery/ws');
  }

  /**
   * Handle new WebSocket connection
   */
  _handleConnection(ws, req) {
    try {
      // Extract token from query string
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Store client connection
      this.clients.set(userId, {
        ws,
        userId,
        connected: true,
        lastPing: Date.now(),
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        this._handleMessage(userId, message);
      });

      // Handle connection close
      ws.on('close', () => {
        this._handleDisconnect(userId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        this._handleDisconnect(userId);
      });

      // Send connection confirmation
      this._sendToUser(userId, {
        type: 'connection_established',
        message: 'Connected to real-time updates',
        timestamp: new Date(),
      });

      console.log(`User ${userId} connected`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(4002, 'Invalid token');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  _handleMessage(userId, rawMessage) {
    try {
      const message = JSON.parse(rawMessage);

      switch (message.type) {
        case 'subscribe_tracking':
          this._subscribeToTracking(userId, message.trackingId);
          break;

        case 'unsubscribe_tracking':
          this._unsubscribeFromTracking(userId, message.trackingId);
          break;

        case 'subscribe_chat':
          this._subscribeToChat(userId, message.orderId);
          break;

        case 'unsubscribe_chat':
          this._unsubscribeFromChat(userId, message.orderId);
          break;

        case 'location_update':
          this._broadcastLocationUpdate(message.trackingId, message.location);
          break;

        case 'chat_message':
          this._broadcastChatMessage(message.orderId, message);
          break;

        case 'typing':
          this._broadcastTyping(message.orderId, userId, message.isTyping);
          break;

        case 'pong':
          // Response to ping (heartbeat)
          this.clients.get(userId).lastPing = Date.now();
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('WebSocket message handling error:', error);
    }
  }

  /**
   * Handle connection disconnect
   */
  _handleDisconnect(userId) {
    const client = this.clients.get(userId);
    if (client) {
      client.connected = false;
      this.clients.delete(userId);

      // Prevent unbounded growth by removing disconnected users
      // from tracking/chat subscriber sets.
      for (const [trackingId, subscribers] of this.trackingSessions.entries()) {
        subscribers.delete(userId);
        if (subscribers.size === 0) {
          this.trackingSessions.delete(trackingId);
        }
      }

      for (const [orderId, subscribers] of this.chatSessions.entries()) {
        subscribers.delete(userId);
        if (subscribers.size === 0) {
          this.chatSessions.delete(orderId);
        }
      }

      console.log(`User ${userId} disconnected`);
    }
  }

  /**
   * Subscribe to order tracking updates
   */
  _subscribeToTracking(userId, trackingId) {
    if (!this.trackingSessions.has(trackingId)) {
      this.trackingSessions.set(trackingId, new Set());
    }

    this.trackingSessions.get(trackingId).add(userId);

    this._sendToUser(userId, {
      type: 'subscribed_tracking',
      trackingId,
      message: `Subscribed to tracking: ${trackingId}`,
      timestamp: new Date(),
    });
  }

  /**
   * Unsubscribe from order tracking
   */
  _unsubscribeFromTracking(userId, trackingId) {
    const session = this.trackingSessions.get(trackingId);
    if (session) {
      session.delete(userId);
      if (session.size === 0) {
        this.trackingSessions.delete(trackingId);
      }
    }

    this._sendToUser(userId, {
      type: 'unsubscribed_tracking',
      trackingId,
      message: `Unsubscribed from tracking: ${trackingId}`,
      timestamp: new Date(),
    });
  }

  /**
   * Subscribe to chat
   */
  _subscribeToChat(userId, orderId) {
    if (!this.chatSessions.has(orderId)) {
      this.chatSessions.set(orderId, new Set());
    }

    this.chatSessions.get(orderId).add(userId);

    this._sendToUser(userId, {
      type: 'subscribed_chat',
      orderId,
      message: `Subscribed to chat: ${orderId}`,
      timestamp: new Date(),
    });
  }

  /**
   * Unsubscribe from chat
   */
  _unsubscribeFromChat(userId, orderId) {
    const session = this.chatSessions.get(orderId);
    if (session) {
      session.delete(userId);
      if (session.size === 0) {
        this.chatSessions.delete(orderId);
      }
    }

    this._sendToUser(userId, {
      type: 'unsubscribed_chat',
      orderId,
      message: `Unsubscribed from chat: ${orderId}`,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast location update to tracking subscribers
   */
  _broadcastLocationUpdate(trackingId, location) {
    const subscribers = this.trackingSessions.get(trackingId);
    if (!subscribers) return;

    const message = {
      type: 'location_update',
      trackingId,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date(),
        accuracy: location.accuracy,
      },
    };

    subscribers.forEach((userId) => {
      this._sendToUser(userId, message);
    });
  }

  /**
   * Broadcast chat message
   */
  _broadcastChatMessage(orderId, messageData) {
    const subscribers = this.chatSessions.get(orderId);
    if (!subscribers) return;

    const message = {
      type: 'new_message',
      orderId,
      message: {
        sender: messageData.sender,
        senderName: messageData.senderName,
        content: messageData.content,
        messageType: messageData.messageType,
        timestamp: new Date(),
      },
    };

    subscribers.forEach((userId) => {
      this._sendToUser(userId, message);
    });
  }

  /**
   * Broadcast typing indicator
   */
  _broadcastTyping(orderId, typingUserId, isTyping) {
    const subscribers = this.chatSessions.get(orderId);
    if (!subscribers) return;

    const message = {
      type: 'typing_indicator',
      orderId,
      userId: typingUserId,
      isTyping,
      timestamp: new Date(),
    };

    subscribers.forEach((userId) => {
      if (userId !== typingUserId) {
        this._sendToUser(userId, message);
      }
    });
  }

  /**
   * Send ETA update
   */
  sendETAUpdate(trackingId, etaMinutes, distance) {
    const subscribers = this.trackingSessions.get(trackingId);
    if (!subscribers) return;

    const message = {
      type: 'eta_update',
      trackingId,
      eta: {
        minutes: etaMinutes,
        distance,
        timestamp: new Date(),
      },
    };

    subscribers.forEach((userId) => {
      this._sendToUser(userId, message);
    });
  }

  /**
   * Send status update
   */
  sendStatusUpdate(orderId, status, message = '') {
    const subscribers = this.trackingSessions.get(orderId);
    if (!subscribers) return;

    const payload = {
      type: 'status_update',
      orderId,
      status,
      message,
      timestamp: new Date(),
    };

    subscribers.forEach((userId) => {
      this._sendToUser(userId, payload);
    });
  }

  /**
   * Send notification via WebSocket
   */
  sendNotification(userId, notification) {
    this._sendToUser(userId, {
      type: 'notification',
      notification: {
        title: notification.title,
        body: notification.body,
        notificationType: notification.notificationType,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Send message to specific user
   */
  _sendToUser(userId, message) {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
      }
    }
  }

  /**
   * Send message to all users
   */
  broadcastToAll(message) {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting:', error);
        }
      }
    });
  }

  /**
   * Heartbeat to keep connections alive
   */
  _heartbeat() {
    this.clients.forEach((client, userId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(
            JSON.stringify({
              type: 'ping',
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error(`Heartbeat error for user ${userId}:`, error);
        }
      } else {
        // Remove disconnected clients
        this.clients.delete(userId);
      }
    });
  }

  /**
   * Get active connections count
   */
  getActiveConnections() {
    return this.clients.size;
  }

  /**
   * Get tracking subscribers count
   */
  getTrackingSubscribers(trackingId) {
    const subscribers = this.trackingSessions.get(trackingId);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * Get chat subscribers count
   */
  getChatSubscribers(orderId) {
    const subscribers = this.chatSessions.get(orderId);
    return subscribers ? subscribers.size : 0;
  }
}

// Export singleton instance
module.exports = new WebSocketManager();
