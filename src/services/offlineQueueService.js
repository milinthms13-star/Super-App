/**
 * Offline Queue Service
 * Handles message queuing and syncing when offline
 */

import dbManager from '../utils/indexedDBManager';
import messagingApiClient from './messagingApiClient';

class OfflineQueueService {
  constructor() {
    this.syncInProgress = false;
    this.listeners = [];
  }

  /**
   * Initialize the service
   */
  async init() {
    await dbManager.init();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initial sync if online
    if (navigator.onLine) {
      await this.syncQueue();
    }
  }

  /**
   * Queue a message for sending
   */
  async queueMessage(message) {
    try {
      const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const queuedMessage = {
        ...message,
        clientMessageId,
        timestamp: Date.now(),
        status: 'queued'
      };

      // Add to local storage
      await dbManager.addMessage(queuedMessage);
      await dbManager.addToOfflineQueue(queuedMessage);

      // Notify listeners
      this.notifyListeners('messageQueued', queuedMessage);

      // Try to send if online
      if (navigator.onLine) {
        await this.syncQueue();
      }

      return queuedMessage;
    } catch (error) {
      console.error('Error queuing message:', error);
      throw error;
    }
  }

  /**
   * Sync queued messages with server
   */
  async syncQueue() {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners('syncStarted');

    try {
      const queue = await dbManager.getOfflineQueue();
      
      if (queue.length === 0) {
        this.syncInProgress = false;
        this.notifyListeners('syncCompleted', { synced: 0, failed: 0 });
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const queuedMessage of queue) {
        try {
          // Send message to server
          const response = await messagingApiClient.post('/api/messaging/messages', {
            chatId: queuedMessage.chatId,
            content: queuedMessage.content,
            messageType: queuedMessage.messageType,
            media: queuedMessage.media,
            replyTo: queuedMessage.replyTo,
            clientMessageId: queuedMessage.clientMessageId
          });

          if (response.data.success) {
            // Update local message status
            await dbManager.updateMessageStatus(queuedMessage.clientMessageId, 'sent');
            
            // Remove from queue
            await dbManager.removeFromOfflineQueue(queuedMessage.id);
            
            synced++;
            this.notifyListeners('messageSynced', {
              clientMessageId: queuedMessage.clientMessageId,
              serverMessage: response.data.message
            });
          }
        } catch (error) {
          console.error('Error syncing message:', error);
          
          // Update queue item status
          await dbManager.updateQueueItemStatus(queuedMessage.id, 'failed');
          
          failed++;
          this.notifyListeners('messageFailed', {
            clientMessageId: queuedMessage.clientMessageId,
            error: error.message
          });
        }
      }

      this.notifyListeners('syncCompleted', { synced, failed });
    } catch (error) {
      console.error('Error syncing queue:', error);
      this.notifyListeners('syncFailed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Handle online event
   */
  async handleOnline() {
    console.log('Connection restored. Syncing messages...');
    this.notifyListeners('online');
    await this.syncQueue();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Connection lost. Messages will be queued.');
    this.notifyListeners('offline');
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    const queue = await dbManager.getOfflineQueue();
    return {
      pending: queue.filter(item => item.status === 'pending').length,
      failed: queue.filter(item => item.status === 'failed').length,
      total: queue.length
    };
  }

  /**
   * Retry failed messages
   */
  async retryFailed() {
    const queue = await dbManager.getOfflineQueue();
    const failed = queue.filter(item => item.status === 'failed');

    for (const item of failed) {
      await dbManager.updateQueueItemStatus(item.id, 'pending');
    }

    if (navigator.onLine) {
      await this.syncQueue();
    }
  }

  /**
   * Clear queue
   */
  async clearQueue() {
    const queue = await dbManager.getOfflineQueue();
    for (const item of queue) {
      await dbManager.removeFromOfflineQueue(item.id);
    }
    this.notifyListeners('queueCleared');
  }

  /**
   * Add event listener
   */
  addEventListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }
}

// Singleton instance
const offlineQueueService = new OfflineQueueService();

export default offlineQueueService;
