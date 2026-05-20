// src/websocket/dashboardWebSocketClient.js
// Socket.IO client for dashboard real-time analytics
import { io } from 'socket.io-client';
import { BACKEND_BASE_URL } from '../utils/api';

class DashboardWebSocketClient {
  constructor(baseUrl = BACKEND_BASE_URL || window.location.origin) {
    this.baseUrl = String(baseUrl || window.location.origin).replace(/\/+$/, '');
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.baseUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          auth: token ? { token } : {},
          withCredentials: true,
          reconnection: true,
        });

        this.socket.on('connect', () => {
          this.connected = true;
          this.emit('connected');
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.connected = false;
          this.emit('disconnected');
        });

        this.socket.on('connect_error', (err) => {
          this.emit('error', err);
          reject(err);
        });

        this.socket.onAny((eventType, data) => {
          this.emit(eventType, data);
        });
      } catch (err) {
        reject(err);
      }
    });
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
        try {
          cb(data);
        } catch (_e) {
          // Ignore listener errors
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

export default DashboardWebSocketClient;
