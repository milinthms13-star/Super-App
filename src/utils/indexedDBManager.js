/**
 * IndexedDB Manager for Offline Message Storage
 * Provides offline-first messaging capabilities
 */

const DB_NAME = 'MessagingDB';
const DB_VERSION = 1;

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('status', 'status', { unique: false });
          messagesStore.createIndex('clientMessageId', 'clientMessageId', { unique: true });
        }

        // Chats store
        if (!db.objectStoreNames.contains('chats')) {
          const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatsStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
        }

        // Offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('chatId', 'chatId', { unique: false });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
        }

        // Media cache store
        if (!db.objectStoreNames.contains('mediaCache')) {
          const mediaStore = db.createObjectStore('mediaCache', { keyPath: 'url' });
          mediaStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * Add message to local storage
   */
  async addMessage(message) {
    const transaction = this.db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    
    const messageData = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      status: message.status || 'pending'
    };

    return new Promise((resolve, reject) => {
      const request = store.add(messageData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get messages by chat ID
   */
  async getMessagesByChatId(chatId, limit = 50) {
    const transaction = this.db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('chatId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(chatId);
      request.onsuccess = () => {
        const messages = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update message status
   */
  async updateMessageStatus(clientMessageId, status) {
    const transaction = this.db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');
    const index = store.index('clientMessageId');

    return new Promise((resolve, reject) => {
      const getRequest = index.get(clientMessageId);
      
      getRequest.onsuccess = () => {
        const message = getRequest.result;
        if (message) {
          message.status = status;
          const updateRequest = store.put(message);
          updateRequest.onsuccess = () => resolve(message);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Add to offline queue
   */
  async addToOfflineQueue(message) {
    const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    
    const queueItem = {
      ...message,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get offline queue
   */
  async getOfflineQueue() {
    const transaction = this.db.transaction(['offlineQueue'], 'readonly');
    const store = transaction.objectStore('offlineQueue');
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove from offline queue
   */
  async removeFromOfflineQueue(id) {
    const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update queue item status
   */
  async updateQueueItemStatus(id, status) {
    const transaction = this.db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = status;
          item.attempts = (item.attempts || 0) + 1;
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve(item);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(null);
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Cache media
   */
  async cacheMedia(url, blob, expiresInMs = 86400000) { // 24 hours default
    const transaction = this.db.transaction(['mediaCache'], 'readwrite');
    const store = transaction.objectStore('mediaCache');
    
    const mediaData = {
      url,
      blob,
      expiresAt: Date.now() + expiresInMs
    };

    return new Promise((resolve, reject) => {
      const request = store.put(mediaData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached media
   */
  async getCachedMedia(url) {
    const transaction = this.db.transaction(['mediaCache'], 'readonly');
    const store = transaction.objectStore('mediaCache');

    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => {
        const media = request.result;
        if (media && media.expiresAt > Date.now()) {
          resolve(media.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear expired media cache
   */
  async clearExpiredMedia() {
    const transaction = this.db.transaction(['mediaCache'], 'readwrite');
    const store = transaction.objectStore('mediaCache');
    const index = store.index('expiresAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    const transaction = this.db.transaction(['messages', 'chats', 'offlineQueue', 'mediaCache'], 'readwrite');
    
    const promises = ['messages', 'chats', 'offlineQueue', 'mediaCache'].map(storeName => {
      return new Promise((resolve, reject) => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  /**
   * Get database stats
   */
  async getStats() {
    const transaction = this.db.transaction(['messages', 'chats', 'offlineQueue', 'mediaCache'], 'readonly');
    
    const counts = await Promise.all([
      this.getCount(transaction.objectStore('messages')),
      this.getCount(transaction.objectStore('chats')),
      this.getCount(transaction.objectStore('offlineQueue')),
      this.getCount(transaction.objectStore('mediaCache'))
    ]);

    return {
      messages: counts[0],
      chats: counts[1],
      offlineQueue: counts[2],
      mediaCache: counts[3]
    };
  }

  getCount(store) {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const dbManager = new IndexedDBManager();

export default dbManager;
