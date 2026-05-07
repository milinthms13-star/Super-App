/**
 * WebSocket Client for Moderation Panel
 * Manages real-time connection to moderation backend
 * Handles reconnection, message routing, and event subscriptions
 */

class ModerationWebSocketClient {
  constructor(baseUrl = `ws://${window.location.host}`) {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.token = null;
    this.userId = null;
    this.role = null;
    this.listeners = new Map(); // event -> [callbacks]
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.messageQueue = [];
    this.connected = false;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token, userId, role = 'moderator') {
    return new Promise((resolve, reject) => {
      try {
        this.token = token;
        this.userId = userId;
        this.role = role;

        const url = `${this.baseUrl}/ws/moderation?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(url);

        this.ws.addEventListener('open', () => this.handleOpen(resolve));
        this.ws.addEventListener('message', (event) => this.handleMessage(event));
        this.ws.addEventListener('close', () => this.handleClose());
        this.ws.addEventListener('error', (error) => this.handleError(error, reject));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket open
   */
  handleOpen(resolve) {
    this.connected = true;
    this.reconnectAttempts = 0;
    console.log('[ModerationWS] Connected');

    // Send authentication message
    this.send({
      type: 'authenticate',
      userId: this.userId,
      role: this.role
    });

    // Process queued messages
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      this.ws.send(JSON.stringify(msg));
    }

    // Emit connected event
    this.emit('connected', {
      userId: this.userId,
      role: this.role,
      timestamp: new Date()
    });

    resolve();
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      console.log('[ModerationWS] Received:', message.type);

      // Route message to listeners
      this.emit(message.type, message);

      // Also emit generic message event
      this.emit('message', message);
    } catch (error) {
      console.error('[ModerationWS] Error parsing message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  handleClose() {
    this.connected = false;
    console.log('[ModerationWS] Disconnected');

    // Emit disconnected event
    this.emit('disconnected', {
      timestamp: new Date()
    });

    // Attempt reconnect
    this.attemptReconnect();
  }

  /**
   * Handle WebSocket error
   */
  handleError(error, reject) {
    console.error('[ModerationWS] Error:', error);

    if (reject) {
      reject(error);
    }

    this.emit('error', {
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ModerationWS] Max reconnect attempts reached');
      this.emit('reconnect_failed', {
        attempts: this.reconnectAttempts,
        timestamp: new Date()
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[ModerationWS] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(this.token, this.userId, this.role).catch((error) => {
        console.error('[ModerationWS] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * Send message to server
   */
  send(message) {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[ModerationWS] Error sending message:', error);
      this.messageQueue.push(message);
    }
  }

  /**
   * Claim moderation task
   */
  claimTask(taskId, reportId) {
    this.send({
      type: 'claim_task',
      taskId,
      reportId
    });
  }

  /**
   * Release moderation task
   */
  releaseTask(taskId) {
    this.send({
      type: 'release_task',
      taskId
    });
  }

  /**
   * Subscribe to report updates
   */
  subscribeReport(reportId) {
    this.send({
      type: 'subscribe_report',
      reportId
    });
  }

  /**
   * Unsubscribe from report updates
   */
  unsubscribeReport(reportId) {
    this.send({
      type: 'unsubscribe_report',
      reportId
    });
  }

  /**
   * Request queue statistics
   */
  requestQueueStats() {
    this.send({
      type: 'queue_stats'
    });
  }

  /**
   * Send heartbeat/ping
   */
  ping() {
    this.send({
      type: 'ping'
    });
  }

  /**
   * Register event listener
   */
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
    };
  }

  /**
   * Unregister event listener
   */
  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ModerationWS] Error in listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.connected = false;
    this.messageQueue = [];
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default ModerationWebSocketClient;
