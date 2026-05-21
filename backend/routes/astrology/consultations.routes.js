const express = require('express');

const authMiddleware = require('../../middleware/auth');
const {
  saveConsultationBookingWithLock,
  listConsultationBookings,
  addConsultantSlotPersistent,
  removeConsultantSlotPersistent,
  bookingLimiter,
  sanitizeText,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate } = authMiddleware;

// POST /api/astrology/consultations/book
router.post('/book', authenticate, bookingLimiter, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const bookingPayload = { ...req.body, userId };

    const result = await saveConsultationBookingWithLock(bookingPayload);
    if (result.conflict) {
      return res.status(409).json({ success: false, message: 'This slot is already booked.' });
    }
    return res.json({ success: true, data: result.booking, reused: result.reused });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/astrology/consultations
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const bookings = await listConsultationBookings(userId);
    return res.json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/astrology/consultations/slots/add
router.post('/slots/add', authenticate, async (req, res) => {
  try {
    const consultantId = sanitizeText(req.body.consultantId || req.user.consultantId || req.user._id || req.user.id, 80);
    const slotTime = sanitizeText(req.body.slotTime || req.body.slotLabel, 80);
    if (!consultantId || !slotTime) {
      return res.status(400).json({ success: false, message: 'consultantId and slotTime are required.' });
    }
    const updatedConsultant = await addConsultantSlotPersistent(consultantId, slotTime);
    return res.json({ success: true, data: updatedConsultant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/astrology/consultations/slots/remove
router.delete('/slots/remove', authenticate, async (req, res) => {
  try {
    const consultantId = sanitizeText(req.body.consultantId || req.user.consultantId || req.user._id || req.user.id, 80);
    const slotTime = sanitizeText(req.body.slotTime || req.body.slotLabel || req.body.slotId, 80);
    if (!consultantId || !slotTime) {
      return res.status(400).json({ success: false, message: 'consultantId and slotTime are required.' });
    }
    const updatedConsultant = await removeConsultantSlotPersistent(consultantId, slotTime);
    return res.json({ success: true, data: updatedConsultant });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
