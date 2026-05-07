// Phase 3: Feature 10 - Offline Message Queuing and Incremental Sync
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const syncService = require('../services/syncService');
const OfflineQueue = require('../models/OfflineQueue');

/**
 * Queue message for offline delivery
 * POST /api/messaging/v3/sync/queue
 */
router.post('/queue', authMiddleware, async (req, res) => {
  try {
    const { 
      deviceId, 
      action, 
      clientMessageId, 
      conversationId, 
      payload 
    } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!deviceId || !action || !clientMessageId || !conversationId || !payload) {
      return res.status(400).json({ 
        error: 'Missing required fields: deviceId, action, clientMessageId, conversationId, payload' 
      });
    }

    // Validate action type
    const validActions = ['sendMessage', 'editMessage', 'deleteMessage', 'reaction'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action. Allowed: ${validActions.join(', ')}`
      });
    }

    const queuedItem = await syncService.queueMessage(
      userId,
      deviceId,
      action,
      clientMessageId,
      conversationId,
      payload
    );

    res.status(201).json({
      success: true,
      data: queuedItem,
      message: 'Message queued for offline delivery'
    });
  } catch (error) {
    console.error('Error queuing message:', error);
    res.status(500).json({ 
      error: 'Failed to queue message',
      details: error.message 
    });
  }
});

/**
 * Get pending messages for device
 * GET /api/messaging/v3/sync/pending?deviceId=:deviceId
 */
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.userId;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const pendingMessages = await syncService.getPendingMessages(userId, deviceId);

    res.json({
      success: true,
      data: pendingMessages,
      count: pendingMessages.length
    });
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending messages',
      details: error.message 
    });
  }
});

/**
 * Get failed messages for device
 * GET /api/messaging/v3/sync/failed?deviceId=:deviceId
 */
router.get('/failed', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.userId;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const failedMessages = await syncService.getFailedMessages(userId, deviceId);

    res.json({
      success: true,
      data: failedMessages,
      count: failedMessages.length
    });
  } catch (error) {
    console.error('Error fetching failed messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch failed messages',
      details: error.message 
    });
  }
});

/**
 * Mark message as synced
 * PUT /api/messaging/v3/sync/:queueItemId/synced
 */
router.put('/:queueItemId/synced', authMiddleware, async (req, res) => {
  try {
    const { queueItemId } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const queueItem = await OfflineQueue.findById(queueItemId);
    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    if (queueItem.userId.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await syncService.markMessageAsSynced(queueItemId);

    res.json({
      success: true,
      data: updated,
      message: 'Message marked as synced'
    });
  } catch (error) {
    console.error('Error marking message as synced:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as synced',
      details: error.message 
    });
  }
});

/**
 * Mark message as failed
 * PUT /api/messaging/v3/sync/:queueItemId/failed
 */
router.put('/:queueItemId/failed', authMiddleware, async (req, res) => {
  try {
    const { queueItemId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    const queueItem = await OfflineQueue.findById(queueItemId);
    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    if (queueItem.userId.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await syncService.markMessageAsFailed(queueItemId, reason);

    res.json({
      success: true,
      data: updated,
      message: 'Message marked as failed'
    });
  } catch (error) {
    console.error('Error marking message as failed:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as failed',
      details: error.message 
    });
  }
});

/**
 * Retry syncing message
 * PUT /api/messaging/v3/sync/:queueItemId/retry
 */
router.put('/:queueItemId/retry', authMiddleware, async (req, res) => {
  try {
    const { queueItemId } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const queueItem = await OfflineQueue.findById(queueItemId);
    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }

    if (queueItem.userId.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await syncService.retryMessage(queueItemId);

    res.json({
      success: true,
      data: updated,
      message: 'Message retry attempted'
    });
  } catch (error) {
    console.error('Error retrying message:', error);
    res.status(500).json({ 
      error: 'Failed to retry message',
      details: error.message 
    });
  }
});

/**
 * Full sync operation - pull all new messages since last sync
 * POST /api/messaging/v3/sync
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      lastSyncTimestamp, 
      deviceId, 
      limit = 100 
    } = req.body;
    const userId = req.user.userId;

    if (!deviceId || !lastSyncTimestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields: deviceId, lastSyncTimestamp' 
      });
    }

    // Sync messages from server
    const syncedMessages = await syncService.syncMessagesFromServer(
      userId,
      new Date(lastSyncTimestamp),
      limit
    );

    res.json({
      success: true,
      data: syncedMessages,
      syncTimestamp: new Date(),
      messageCount: syncedMessages.length
    });
  } catch (error) {
    console.error('Error during sync:', error);
    res.status(500).json({ 
      error: 'Failed to sync messages',
      details: error.message 
    });
  }
});

/**
 * Batch sync multiple operations
 * POST /api/messaging/v3/sync/batch
 */
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { deviceId, operations } = req.body;
    const userId = req.user.userId;

    if (!deviceId || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: deviceId (string), operations (array with at least 1 item)' 
      });
    }

    const results = await syncService.batchSync(userId, deviceId, operations);

    res.json({
      success: true,
      data: results,
      operationCount: operations.length
    });
  } catch (error) {
    console.error('Error during batch sync:', error);
    res.status(500).json({ 
      error: 'Failed to batch sync',
      details: error.message 
    });
  }
});

/**
 * Update message delivery status (sent/delivered/read)
 * POST /api/messaging/v3/sync/status
 */
router.post('/status', authMiddleware, async (req, res) => {
  try {
    const { messageStatuses } = req.body;
    const userId = req.user.userId;

    if (!Array.isArray(messageStatuses) || messageStatuses.length === 0) {
      return res.status(400).json({ 
        error: 'Message statuses array is required' 
      });
    }

    const updated = await syncService.syncMessageStatus(messageStatuses);

    res.json({
      success: true,
      data: updated,
      updatedCount: updated.length
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ 
      error: 'Failed to update message status',
      details: error.message 
    });
  }
});

/**
 * Get sync metadata (state info for client)
 * GET /api/messaging/v3/sync/metadata
 */
router.get('/metadata', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const metadata = await syncService.getSyncMetadata(userId);

    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Error fetching sync metadata:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sync metadata',
      details: error.message 
    });
  }
});

/**
 * Get sync statistics
 * GET /api/messaging/v3/sync/statistics
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const statistics = await syncService.getSyncStatistics(userId);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching sync statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sync statistics',
      details: error.message 
    });
  }
});

/**
 * Cleanup expired offline queue items (admin only)
 * POST /api/messaging/v3/sync/cleanup
 */
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only admins can trigger cleanup' });
    }

    const result = await syncService.cleanupExpiredItems();

    res.json({
      success: true,
      data: result,
      message: 'Cleanup completed'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup expired items',
      details: error.message 
    });
  }
});

/**
 * Export offline queue (debug endpoint, owner/admin only)
 * GET /api/messaging/v3/sync/export?deviceId=:deviceId
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.query;
    const userId = req.user.userId;

    if (!deviceId && !req.user.isAdmin) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const exportData = await syncService.exportOfflineQueue(userId);

    res.json({
      success: true,
      data: exportData,
      exportTimestamp: new Date()
    });
  } catch (error) {
    console.error('Error exporting queue:', error);
    res.status(500).json({ 
      error: 'Failed to export queue',
      details: error.message 
    });
  }
});

module.exports = router;
