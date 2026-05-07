// src/websocket/dashboardWebSocketClient.js
// Simple WebSocket client for dashboard real-time analytics

class DashboardWebSocketClient {
  constructor(baseUrl = window.location.origin.replace(/^http/, 'ws')) {
    this.baseUrl = baseUrl;
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.baseUrl}/socket.io/?token=${encodeURIComponent(token)}&EIO=4&transport=websocket`;
        this.socket = new window.WebSocket(url);
        this.socket.onopen = () => {
          this.connected = true;
          this.emit('connected');
          resolve();
        };
        this.socket.onmessage = (event) => this.handleMessage(event);
        this.socket.onclose = () => {
          this.connected = false;
          this.emit('disconnected');
        };
        this.socket.onerror = (err) => {
          this.emit('error', err);
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  handleMessage(event) {
    try {
      // Socket.IO payloads: 42["event",{...}]
      if (typeof event.data === 'string' && event.data.startsWith('42')) {
        const payload = JSON.parse(event.data.slice(2));
        const [eventType, data] = payload;
        this.emit(eventType, data);
      }
    } catch (err) {
      this.emit('error', err);
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const arr = this.listeners.get(eventType);
      const idx = arr.indexOf(callback);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }

  emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach((cb) => {
        try { cb(data); } catch (e) { /* ignore */ }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }
}

export default DashboardWebSocketClient;
