/**
 * advancedSecurityRoutes.js
 * Routes for 2FA, rate limiting, security audits
 */

const express = require('express');
const router = express.Router();
const AdvancedSecurityService = require('../services/AdvancedSecurityService');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// 2FA endpoints
router.post('/2fa/enable', verifyToken, async (req, res) => {
  try {
    const result = await AdvancedSecurityService.enable2FA(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/2fa/verify', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    const result = await AdvancedSecurityService.verify2FAToken(
      req.user.userId,
      token
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Rate limiting
router.get('/rate-limit', verifyToken, async (req, res) => {
  try {
    const { limit = 1000, window = 3600 } = req.query;
    const result = await AdvancedSecurityService.checkRateLimit(
      req.user.userId,
      limit,
      window
    );
    res.json({
      success: true,
      data: result,
      headers: {
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': result.resetIn,
      },
    });
  } catch (error) {
    res.status(429).json({ success: false, message: error.message });
  }
});

// Security event logging
router.post('/events/log', verifyToken, async (req, res) => {
  try {
    const result = await AdvancedSecurityService.logSecurityEvent(
      req.user.userId,
      req.body.eventType,
      req.body.details
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Suspicious activity detection
router.get('/suspicious-activity/:userId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await AdvancedSecurityService.detectSuspiciousActivity(
      req.params.userId
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Compliance reporting
router.get('/compliance-report', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const result = await AdvancedSecurityService.generateComplianceReport(period);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
