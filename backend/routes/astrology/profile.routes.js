const express = require('express');

const authMiddleware = require('../../middleware/auth');
const { findProfileByUserId, saveProfileByUserId } = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate } = authMiddleware;

// GET /api/astrology/profile
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const profile = await findProfileByUserId(userId);
    return res.json({ success: true, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/astrology/profile
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const updatedProfile = await saveProfileByUserId(userId, req.body);
    return res.json({ success: true, data: updatedProfile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
