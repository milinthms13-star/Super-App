const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authMiddleware } = require('../middleware/auth');
const { validatePhoneNumber, validateOTP } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for OTP endpoints (prevent abuse)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many OTP requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const alertLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // 3 alerts per minute max
  message: 'Too many SOS alerts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// ENDPOINT 1: Send OTP to phone number
router.post(
  '/send-contact-otp',
  authMiddleware,
  otpLimiter,
  validatePhoneNumber,
  sosController.sendContactOTP
);

// ENDPOINT 2: Verify OTP code
router.post(
  '/verify-contact-otp',
  authMiddleware,
  validateOTP,
  sosController.verifyContactOTP
);

// ENDPOINT 3: Create tracking link (generates token & 24h expiry)
router.post(
  '/create-tracking-link',
  authMiddleware,
  alertLimiter,
  sosController.createTrackingLink
);

// ENDPOINT 4: Get tracking location (public - no auth needed, token-based)
router.get(
  '/tracking/:token',
  sosController.getTrackingLocation
);

// ENDPOINT 5: Send SOS alert (enhanced with photos)
router.post(
  '/send-alert',
  authMiddleware,
  alertLimiter,
  sosController.sendSOSAlert
);

// Additional endpoints for phase 1

// Get OTP status (check if verified)
router.get(
  '/contact/:contactId/otp-status',
  authMiddleware,
  sosController.getOTPStatus
);

// Get incident details (for follow-up)
router.get(
  '/incident/:incidentId',
  authMiddleware,
  sosController.getIncidentDetails
);

// List all incidents for user
router.get(
  '/incidents',
  authMiddleware,
  sosController.getUserIncidents
);

// Update incident status (resolved/escalated)
router.patch(
  '/incident/:incidentId/status',
  authMiddleware,
  sosController.updateIncidentStatus
);

// ========== PHASE 2: AUDIO RECORDING ==========

// Upload audio recording to incident
router.post(
  '/upload-audio/:incidentId',
  authMiddleware,
  sosController.uploadAudio
);

// Get audio recordings for incident
router.get(
  '/audio/:incidentId',
  authMiddleware,
  sosController.getIncidentAudio
);

// ========== PHASE 2: SPAM DETECTION ==========

// Check if incident is spam/false alarm
router.post(
  '/check-spam/:incidentId',
  authMiddleware,
  sosController.checkSpam
);

// Get spam report for incident
router.get(
  '/spam-report/:incidentId',
  authMiddleware,
  sosController.getSpamReport
);

module.exports = router;
