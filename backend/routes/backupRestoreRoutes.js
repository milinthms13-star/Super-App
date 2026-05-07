const express = require('express');
const router = express.Router();
const backupRestoreService = require('../services/backupRestoreService');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/messaging/v4/backups/create
 * Create a backup
 */
router.post('/create', async (req, res) => {
  try {
    const { chatId, backupType } = req.body;

    const backup = await backupRestoreService.createBackup(
      req.user._id,
      chatId || null,
      backupType || 'single-chat'
    );

    res.status(201).json({
      message: 'Backup initiated successfully',
      data: backup,
    });
  } catch (error) {
    logger.error('Error creating backup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/backups
 * Get all backups for user
 */
router.get('/', async (req, res) => {
  try {
    const { status, backupType, page, limit } = req.query;

    const result = await backupRestoreService.getBackups(req.user._id, {
      status,
      backupType,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error retrieving backups:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/backups/:id/restore
 * Restore from backup
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const restoreQueue = await backupRestoreService.restoreChatFromBackup(
      req.params.id,
      req.user._id
    );

    res.status(201).json({
      message: 'Restoration initiated successfully',
      data: restoreQueue,
    });
  } catch (error) {
    logger.error('Error initiating restore:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/messaging/v4/backups/:id
 * Delete a backup
 */
router.delete('/:id', async (req, res) => {
  try {
    const backup = await backupRestoreService.deleteBackup(req.params.id);

    res.json({
      message: 'Backup deleted successfully',
      data: backup,
    });
  } catch (error) {
    logger.error('Error deleting backup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/backups/:id/download
 * Download backup file
 */
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await require('../models/ChatBackup').findById(req.params.id);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const fs = require('fs').promises;
    const file = await fs.readFile(backup.storageLocation);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup_${new Date().toISOString()}.json"`,
    });

    res.send(file);
  } catch (error) {
    logger.error('Error downloading backup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/backups/auto-backup/configure
 * Configure auto-backup
 */
router.post('/auto-backup/configure', async (req, res) => {
  try {
    const { frequency } = req.body;

    if (!frequency || !['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({
        error: 'frequency must be one of: daily, weekly, monthly',
      });
    }

    const backup = await backupRestoreService.scheduleAutoBackup(req.user._id, frequency);

    res.json({
      message: 'Auto-backup configured successfully',
      data: backup,
    });
  } catch (error) {
    logger.error('Error configuring auto-backup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/backups/export/json
 * Export chat as JSON
 */
router.post('/export/json', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const jsonData = await backupRestoreService.exportChatAsJSON(chatId, req.user._id);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="chat_export_${Date.now()}.json"`,
    });

    res.send(jsonData);
  } catch (error) {
    logger.error('Error exporting chat as JSON:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messaging/v4/backups/export/csv
 * Export chat as CSV
 */
router.post('/export/csv', async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId is required' });
    }

    const csvData = await backupRestoreService.exportChatAsCSV(chatId);

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="chat_export_${Date.now()}.csv"`,
    });

    res.send(csvData);
  } catch (error) {
    logger.error('Error exporting chat as CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messaging/v4/restore/:id/status
 * Get restoration status
 */
router.get('/restore/:id/status', async (req, res) => {
  try {
    const status = await backupRestoreService.getRestoreStatus(req.params.id);

    res.json({
      message: 'Restoration status retrieved successfully',
      data: status,
    });
  } catch (error) {
    logger.error('Error retrieving restore status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
