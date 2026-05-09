/**
 * mobileSDKRoutes.js
 * Routes for mobile app integration, push notifications, offline sync
 */

const express = require('express');
const router = express.Router();
const MobileSDKService = require('../services/MobileSDKService');
const { verifyToken } = require('../middleware/authMiddleware');

// Device registration
router.post('/devices/register', verifyToken, async (req, res) => {
  try {
    const result = await MobileSDKService.registerDevice(
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Push notifications
router.post('/push', verifyToken, async (req, res) => {
  try {
    const result = await MobileSDKService.sendPushNotification(
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// App configuration
router.get('/config', async (req, res) => {
  try {
    const { appVersion } = req.query;
    const result = await MobileSDKService.getMobileAppConfig(appVersion);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Sync offline data
router.post('/sync/offline', verifyToken, async (req, res) => {
  try {
    const result = await MobileSDKService.syncOfflineData(
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Check for app updates
router.get('/updates', async (req, res) => {
  try {
    const { currentVersion, platform } = req.query;
    const result = await MobileSDKService.checkForAppUpdates(
      currentVersion,
      platform
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Analytics tracking
router.post('/analytics', verifyToken, async (req, res) => {
  try {
    const result = await MobileSDKService.trackAnalytics(
      req.user.userId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
