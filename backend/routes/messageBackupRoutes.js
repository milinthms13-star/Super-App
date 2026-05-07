const express = require('express');
const router = express.Router();
const messageBackupService = require('../services/messageBackupService');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// Export chat messages
router.post('/:chatId/export', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { format = 'json', includeAttachments = false, startDate, endDate } = req.body;

    const backup = await messageBackupService.exportChat(chatId, userId, {
      format,
      includeAttachments,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      message: 'Chat exported successfully',
      data: backup,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Import messages from backup
router.post('/:chatId/import', authMiddleware, upload.single('backup'), async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No backup file provided' });
    }

    const result = await messageBackupService.importMessages(
      chatId,
      userId,
      req.file.buffer
    );

    res.json({
      success: true,
      message: 'Messages imported successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Archive chat with backup
router.post('/:chatId/archive', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const result = await messageBackupService.archiveChat(chatId, userId);

    res.json({
      success: true,
      message: 'Chat archived successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get list of backups for chat
router.get('/:chatId/backups', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;

    const backups = await messageBackupService.getBackups(chatId);

    res.json({
      success: true,
      data: backups,
      count: backups.length,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Cleanup old backups
router.post('/:chatId/cleanup', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { keepCount = 5 } = req.body;

    const deletedCount = await messageBackupService.cleanupOldBackups(
      chatId,
      keepCount
    );

    res.json({
      success: true,
      message: `Deleted ${deletedCount} old backups`,
      deletedCount,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get backup statistics for user
router.get('/user/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await messageBackupService.getBackupStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Restore from backup
router.post('/:chatId/restore', authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { backupFile } = req.body;

    const result = await messageBackupService.restoreFromBackup(
      backupFile,
      chatId
    );

    res.json({
      success: true,
      message: 'Chat restored from backup',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Download specific backup
router.get('/:chatId/backups/:backupFile/download', authMiddleware, async (req, res) => {
  try {
    const { backupFile } = req.params;
    const path = require('path');
    const fs = require('fs').promises;

    const filePath = path.join('backups', backupFile);

    // Verify file exists
    await fs.stat(filePath);

    res.download(filePath, backupFile);
  } catch (error) {
    res.status(404).json({ success: false, error: 'Backup file not found' });
  }
});

// Bulk operations - export multiple chats
router.post('/bulk/export', authMiddleware, async (req, res) => {
  try {
    const { chatIds, format = 'json' } = req.body;
    const userId = req.user.id;

    const results = [];

    for (const chatId of chatIds) {
      try {
        const backup = await messageBackupService.exportChat(chatId, userId, {
          format,
        });
        results.push({ chatId, success: true, backup });
      } catch (err) {
        results.push({ chatId, success: false, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Exported ${results.filter((r) => r.success).length} of ${chatIds.length} chats`,
      data: results,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
