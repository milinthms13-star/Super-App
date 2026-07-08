/**
 * WebSocket Client for Real-Time Communication
 * Frontend WebSocket integration with React
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
  window.location.host;

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Map();
    this.connectionPromise = null;
    this.isIntentionallyClosed = false;
  }

  connect(token) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.connectionPromise;
    }

    this.isIntentionallyClosed = false;
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = `${WS_BASE_URL}/ws/matrimonial?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.emit('connected', { timestamp: new Date() });
          resolve(this.ws);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect(token);
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  reconnect(token) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  handleMessage(data) {
    const { type, payload } = data;
    
    console.log('WebSocket message received:', type, payload);
    
    this.emit(type, payload);
    this.emit('message', data);
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }

  sendMessage(toUserId, content, messageId, attachments = []) {
    return this.send('message', {
      toUserId,
      content,
      messageId: messageId || this.generateMessageId(),
      attachments,
      timestamp: new Date().toISOString()
    });
  }

  sendTypingIndicator(toUserId, isTyping) {
    return this.send('typing', {
      toUserId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  sendReadReceipt(messageId, toUserId) {
    return this.send('read_receipt', {
      messageId,
      toUserId,
      timestamp: new Date().toISOString()
    });
  }

  joinRoom(roomId) {
    return this.send('join_room', { roomId });
  }

  leaveRoom(roomId) {
    return this.send('leave_room', { roomId });
  }

  sendCallSignal(toUserId, signal, callId, callType) {
    return this.send('call_signal', {
      toUserId,
      signal,
      callId,
      callType
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
const wsClient = new WebSocketClient();

// React Hook for WebSocket
export const useWebSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const clientRef = useRef(wsClient);

  useEffect(() => {
    if (!token) return;

    const client = clientRef.current;

    const handleConnected = () => {
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleMessage = (payload) => {
      setMessages(prev => [...prev, {
        ...payload,
        id: payload.messageId || payload.id,
        receivedAt: new Date()
      }]);
    };

    const handleTyping = (payload) => {
      setTypingUsers(prev => ({
        ...prev,
        [payload.fromUserId]: payload.isTyping
      }));

      // Auto-clear typing after 5 seconds
      if (payload.isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [payload.fromUserId]: false
          }));
        }, 5000);
      }
    };

    const handleOnlineStatus = (payload) => {
      setOnlineUsers(prev => {
        if (payload.status === 'online') {
          return [...new Set([...prev, payload.userId])];
        } else {
          return prev.filter(id => id !== payload.userId);
        }
      });
    };

    client.on('connected', handleConnected);
    client.on('disconnected', handleDisconnected);
    client.on('message', handleMessage);
    client.on('typing', handleTyping);
    client.on('online_status', handleOnlineStatus);

    client.connect(token).catch(error => {
      console.error('Failed to connect WebSocket:', error);
    });

    return () => {
      client.off('connected', handleConnected);
      client.off('disconnected', handleDisconnected);
      client.off('message', handleMessage);
      client.off('typing', handleTyping);
      client.off('online_status', handleOnlineStatus);
      client.disconnect();
    };
  }, [token]);

  const sendMessage = useCallback((toUserId, content, attachments) => {
    return clientRef.current.sendMessage(toUserId, content, undefined, attachments);
  }, []);

  const sendTypingIndicator = useCallback((toUserId, isTyping) => {
    return clientRef.current.sendTypingIndicator(toUserId, isTyping);
  }, []);

  const sendReadReceipt = useCallback((messageId, toUserId) => {
    return clientRef.current.sendReadReceipt(messageId, toUserId);
  }, []);

  const joinRoom = useCallback((roomId) => {
    return clientRef.current.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId) => {
    return clientRef.current.leaveRoom(roomId);
  }, []);

  const sendCallSignal = useCallback((toUserId, signal, callId, callType) => {
    return clientRef.current.sendCallSignal(toUserId, signal, callId, callType);
  }, []);

  return {
    isConnected,
    onlineUsers,
    messages,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    sendReadReceipt,
    joinRoom,
    leaveRoom,
    sendCallSignal,
    client: clientRef.current
  };
};

export default wsClient;
