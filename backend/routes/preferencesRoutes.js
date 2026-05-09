/**
 * preferencesRoutes.js
 * User preferences and settings endpoints
 */

const express = require('express');
const router = express.Router();
const PreferencesService = require('../services/PreferencesService');
const { verifyToken } = require('../middleware/auth');

// GET /api/user/preferences - Get all preferences
router.get('/', verifyToken, async (req, res) => {
  try {
    const preferences = await PreferencesService.getPreferences(req.user.id);
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/preferences - Update preferences
router.put('/', verifyToken, async (req, res) => {
  try {
    const preferences = await PreferencesService.updatePreferences(req.user.id, req.body);
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/preferences/notifications - Get notification preferences
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const preferences = await PreferencesService.getNotificationPreferences(req.user.id);
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/preferences/notifications - Update notification preferences
router.put('/notifications', verifyToken, async (req, res) => {
  try {
    const preferences = await PreferencesService.updateNotificationPreferences(
      req.user.id,
      req.body
    );
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/notifications/disable - Disable notification
router.post('/notifications/disable', verifyToken, async (req, res) => {
  try {
    const { notificationType, channel } = req.body;

    if (!notificationType) {
      return res.status(400).json({ error: 'Notification type required' });
    }

    const preferences = await PreferencesService.disableNotification(
      req.user.id,
      notificationType,
      channel
    );

    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/notifications/enable - Enable notification
router.post('/notifications/enable', verifyToken, async (req, res) => {
  try {
    const { notificationType, channel } = req.body;

    if (!notificationType) {
      return res.status(400).json({ error: 'Notification type required' });
    }

    const preferences = await PreferencesService.enableNotification(
      req.user.id,
      notificationType,
      channel
    );

    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/preferences/privacy - Get privacy preferences
router.get('/privacy', verifyToken, async (req, res) => {
  try {
    const privacy = await PreferencesService.getPrivacyPreferences(req.user.id);
    res.json({ success: true, data: privacy });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/preferences/privacy - Update privacy preferences
router.put('/privacy', verifyToken, async (req, res) => {
  try {
    const privacy = await PreferencesService.updatePrivacyPreferences(req.user.id, req.body);
    res.json({ success: true, data: privacy });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/preferences/shopping - Get shopping preferences
router.get('/shopping', verifyToken, async (req, res) => {
  try {
    const shopping = await PreferencesService.getShoppingPreferences(req.user.id);
    res.json({ success: true, data: shopping });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/preferences/shopping - Update shopping preferences
router.put('/shopping', verifyToken, async (req, res) => {
  try {
    const shopping = await PreferencesService.updateShoppingPreferences(req.user.id, req.body);
    res.json({ success: true, data: shopping });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/shopping/brand/add - Add preferred brand
router.post('/shopping/brand/add', verifyToken, async (req, res) => {
  try {
    const { brandId } = req.body;

    if (!brandId) {
      return res.status(400).json({ error: 'Brand ID required' });
    }

    const brands = await PreferencesService.addPreferredBrand(req.user.id, brandId);
    res.json({ success: true, data: { preferredBrands: brands } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/shopping/brand/remove - Remove preferred brand
router.post('/shopping/brand/remove', verifyToken, async (req, res) => {
  try {
    const { brandId } = req.body;

    if (!brandId) {
      return res.status(400).json({ error: 'Brand ID required' });
    }

    const brands = await PreferencesService.removePreferredBrand(req.user.id, brandId);
    res.json({ success: true, data: { preferredBrands: brands } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/shopping/seller/block - Block seller
router.post('/shopping/seller/block', verifyToken, async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID required' });
    }

    const sellers = await PreferencesService.blockSeller(req.user.id, sellerId);
    res.json({ success: true, data: { blockedSellers: sellers } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/shopping/seller/unblock - Unblock seller
router.post('/shopping/seller/unblock', verifyToken, async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller ID required' });
    }

    const sellers = await PreferencesService.unblockSeller(req.user.id, sellerId);
    res.json({ success: true, data: { blockedSellers: sellers } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/user/preferences/display - Get display preferences
router.get('/display', verifyToken, async (req, res) => {
  try {
    const display = await PreferencesService.getDisplayPreferences(req.user.id);
    res.json({ success: true, data: display });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/user/preferences/display - Update display preferences
router.put('/display', verifyToken, async (req, res) => {
  try {
    const display = await PreferencesService.updateDisplayPreferences(req.user.id, req.body);
    res.json({ success: true, data: display });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/consent/give - Give consent
router.post('/consent/give', verifyToken, async (req, res) => {
  try {
    const { consentType } = req.body;

    if (!consentType) {
      return res.status(400).json({ error: 'Consent type required' });
    }

    const consent = await PreferencesService.giveConsent(req.user.id, consentType);
    res.json({ success: true, data: { consentGiven: consent } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/user/preferences/consent/revoke - Revoke consent
router.post('/consent/revoke', verifyToken, async (req, res) => {
  try {
    const { consentType } = req.body;

    if (!consentType) {
      return res.status(400).json({ error: 'Consent type required' });
    }

    const consent = await PreferencesService.revokeConsent(req.user.id, consentType);
    res.json({ success: true, data: { consentGiven: consent } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/user/preferences/reset - Reset to defaults
router.delete('/reset', verifyToken, async (req, res) => {
  try {
    const preferences = await PreferencesService.resetToDefaults(req.user.id);
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
