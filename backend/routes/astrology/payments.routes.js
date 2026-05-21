const express = require('express');

const authMiddleware = require('../../middleware/auth');
const {
  razorpay,
  findConsultationBookingById,
  updateConsultationBookingByIdWithLocks,
  createWebhookAuditEvent,
  ensureBookingAccess,
  paymentLimiter,
  sanitizeText,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate } = authMiddleware;

// POST /api/astrology/payments/create-order
router.post('/create-order', authenticate, paymentLimiter, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.body.bookingId, 80);
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    const booking = await findConsultationBookingById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (!ensureBookingAccess(booking, req, res)) return undefined;

    const amountInr = Number(booking.amountInr || booking.amount || 0);
    if (!Number.isFinite(amountInr) || amountInr <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking amount.' });
    }

    const options = {
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: `receipt_${bookingId}`,
      notes: {
        bookingId,
        userId: String(req.user?._id || req.user?.id || ''),
      },
    };

    const order = await razorpay.orders.create(options);
    await updateConsultationBookingByIdWithLocks(bookingId, { paymentOrderId: order.id });

    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/astrology/payments/webhook/razorpay
router.post('/webhook/razorpay', async (req, res) => {
  try {
    await createWebhookAuditEvent({
      provider: 'razorpay',
      eventType: sanitizeText(req.body?.event, 120) || 'unknown',
      payload: req.body || {},
      source: 'payments.routes',
    });
    return res.status(202).json({ success: true, message: 'Webhook event queued for processing.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
