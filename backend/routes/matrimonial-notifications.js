/**
 * Notification Routes
 * Manage notification preferences and send notifications
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const NotificationPreference = require('../models/NotificationPreference');
const MatrimonialProfile = require('../models/MatrimonialProfile');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticate);

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    let preferences = await NotificationPreference.findOne({ userId: req.user._id });
    
    if (!preferences) {
      // Create default preferences
      preferences = await NotificationPreference.create({
        userId: req.user._id,
        profileId: profile._id,
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    logger.error('Get notification preferences failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences',
    });
  }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const { email, sms, whatsapp, push, inApp, quietHours, timezone } = req.body;

    let preferences = await NotificationPreference.findOne({ userId: req.user._id });
    
    if (!preferences) {
      preferences = new NotificationPreference({
        userId: req.user._id,
        profileId: profile._id,
      });
    }

    // Update preferences
    if (email) preferences.email = { ...preferences.email, ...email };
    if (sms) preferences.sms = { ...preferences.sms, ...sms };
    if (whatsapp) preferences.whatsapp = { ...preferences.whatsapp, ...whatsapp };
    if (push) preferences.push = { ...preferences.push, ...push };
    if (inApp) preferences.inApp = { ...preferences.inApp, ...inApp };
    if (quietHours) preferences.quietHours = { ...preferences.quietHours, ...quietHours };
    if (timezone) preferences.timezone = timezone;

    await preferences.save();

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: preferences,
    });
  } catch (error) {
    logger.error('Update notification preferences failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
    });
  }
});

// Test notification (for development)
router.post('/test', async (req, res) => {
  try {
    const { notificationType, channels } = req.body;

    const result = await notificationService.sendNotification(
      req.user._id,
      notificationType || 'newMatch',
      {
        userName: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        matchName: 'Test Match',
        matchAge: 28,
        matchLocation: 'Mumbai',
        matchProfession: 'Software Engineer',
        matchEducation: 'B.Tech',
        matchScore: 85,
        profileUrl: `${process.env.FRONTEND_URL}/matrimonial/profile/test`,
        unsubscribeUrl: `${process.env.FRONTEND_URL}/matrimonial/notifications/preferences`,
      },
      channels || ['email']
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      data: result,
    });
  } catch (error) {
    logger.error('Test notification failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
    });
  }
});

module.exports = router;
