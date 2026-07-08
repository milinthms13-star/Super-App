const express = require('express');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { body, param, validationResult } = require('express-validator');
const logger = require('../../utils/logger');
const authMiddleware = require('../../middleware/auth');
const {
  sanitizeText,
  normalizeHexDigest,
  isValidHexDigest,
  secureDigestEquals,
  ensureBookingAccess,
  findConsultationBookingById,
  findConsultationBookingByPaymentOrderId,
  updateConsultationBookingByIdWithLocks,
  createWebhookAuditEvent,
  updateWebhookAuditEvent,
  recordAstrologyOperationalEvent,
  paymentLimiter,
  razorpay,
  getWebhookRawBodyBuffer,
  resolveRazorpaySecret,
} = require('../../services/astrologyBackendService');

const router = express.Router();
const { authenticate } = authMiddleware;

const isProduction = process.env.NODE_ENV === 'production';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  return res.status(400).json({
    success: false,
    message: 'Invalid request payload.',
    errors: errors.array().map((entry) => ({
      field: entry.path,
      message: entry.msg,
    })),
  });
};

const paymentCreateOrderValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  validateRequest,
];

const paymentVerifyValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  body('orderId').optional().isString().isLength({ min: 5, max: 120 }),
  body('paymentId').exists().isString().isLength({ min: 5, max: 120 }),
  body('signature').exists().isString().isLength({ min: 16, max: 256 }),
  validateRequest,
];

const paymentRefundValidators = [
  param('bookingId').isString().isLength({ min: 8, max: 80 }),
  body('reason').optional().isString().isLength({ max: 500 }),
  validateRequest,
];

/**
 * POST /api/astrology/payments/:bookingId/create-order
 * Create Razorpay payment order for booking
 */
router.post(
  '/:bookingId/create-order',
  authenticate,
  paymentLimiter,
  paymentCreateOrderValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    const amountInr = Number(booking.amountInr || 0);
    if (String(booking.status || '').toLowerCase() === 'cancelled') {
      return res.status(409).json({
        success: false,
        message: 'Cannot create payment order for a cancelled booking.',
      });
    }

    if (isProduction && (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)) {
      logger.error('Astrology payment order blocked: Razorpay credentials are not configured.');
      return res.status(503).json({
        success: false,
        message: 'Payment service temporarily unavailable. Please try again later.',
      });
    }
    if (String(booking.paymentStatus || '').toLowerCase() === 'completed') {
      return res.status(409).json({
        success: false,
        message: 'Payment is already completed for this booking.',
        data: booking,
      });
    }
    if (amountInr < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount for payment.',
      });
    }
    if (
      sanitizeText(booking.paymentOrderId, 120) &&
      String(booking.paymentStatus || '').toLowerCase() === 'pending'
    ) {
      return res.json({
        success: true,
        data: {
          bookingId: booking.id || booking._id || bookingId,
          orderId: booking.paymentOrderId,
          amountInr,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
          reused: true,
        },
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt: `astro-${booking.confirmationCode || bookingId}`,
      notes: {
        bookingId: String(booking.id || booking._id || bookingId),
        consultantId: booking.consultantId,
        userId: String(req.user._id || req.user.id),
      },
    });

    await updateConsultationBookingByIdWithLocks(booking.id || booking._id || bookingId, {
      paymentOrderId: order.id,
      paymentStatus: 'pending',
      status: 'pending_payment',
    });

    return res.json({
      success: true,
      data: {
        bookingId: booking.id || booking._id || bookingId,
        orderId: order.id,
        amountInr,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'test_key',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to create payment order.',
    });
  }
});

/**
 * POST /api/astrology/payments/:bookingId/verify
 * Verify Razorpay payment
 */
router.post(
  '/:bookingId/verify',
  authenticate,
  paymentLimiter,
  paymentVerifyValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const { orderId, paymentId, signature } = req.body || {};
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }
    const normalizedPaymentId = sanitizeText(paymentId, 120);
    const normalizedSignature = normalizeHexDigest(signature, 200);
    if (!normalizedPaymentId || !normalizedSignature) {
      return res.status(400).json({
        success: false,
        message: 'paymentId and signature are required for verification.',
      });
    }

    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      booking.paymentId &&
      String(booking.paymentId) === normalizedPaymentId
    ) {
      return res.json({
        success: true,
        data: booking,
      });
    }
    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      booking.paymentId &&
      String(booking.paymentId) !== normalizedPaymentId
    ) {
      return res.status(409).json({
        success: false,
        message: 'Booking payment is already completed with a different payment reference.',
      });
    }

    const expectedOrderId = sanitizeText(orderId || booking.paymentOrderId, 120);
    if (!expectedOrderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required for verification.',
      });
    }
    if (booking.paymentOrderId && expectedOrderId !== String(booking.paymentOrderId)) {
      return res.status(400).json({
        success: false,
        message: 'Provided orderId does not match booking payment order.',
      });
    }
    const razorpaySecret = resolveRazorpaySecret({
      allowTestFallback: process.env.NODE_ENV !== 'production',
    });
    if (!razorpaySecret) {
      logger.error('Astrology payment verification blocked: RAZORPAY_KEY_SECRET is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Payment verification is temporarily unavailable.',
      });
    }
    const shasum = crypto.createHmac('sha256', razorpaySecret);
    shasum.update(`${expectedOrderId}|${normalizedPaymentId}`);
    const digest = shasum.digest('hex');

    if (!secureDigestEquals(digest, normalizedSignature)) {
      await recordAstrologyOperationalEvent({
        category: 'payment',
        eventType: 'payment_verification_failed',
        severity: 'warn',
        message: 'Payment signature verification failed.',
        consultantId: sanitizeText(booking.consultantId, 120),
        bookingId: String(booking.id || booking._id || bookingId),
        userId: String(req.user?._id || req.user?.id || ''),
        metadata: {
          orderId: expectedOrderId,
          paymentId: normalizedPaymentId,
        },
      });
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed.',
      });
    }

    const updatedBooking = await updateConsultationBookingByIdWithLocks(booking.id || booking._id || bookingId, {
      paymentStatus: 'completed',
      paymentOrderId: expectedOrderId,
      paymentId: normalizedPaymentId,
      paymentSignature: normalizedSignature,
      paymentDate: new Date(),
      status: booking.status === 'cancelled' ? 'cancelled' : 'confirmed',
    });

    return res.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment.',
    });
  }
});

/**
 * GET /api/astrology/payments/:bookingId/status
 * Get payment status for booking
 */
router.get('/:bookingId/status', authenticate, paymentLimiter, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking.id || booking._id || bookingId,
        paymentStatus: booking.paymentStatus || 'pending',
        bookingStatus: booking.status || 'pending_payment',
        paymentOrderId: booking.paymentOrderId || '',
        paymentId: booking.paymentId || '',
        amountInr: Number(booking.amountInr || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch payment status.',
    });
  }
});

/**
 * POST /api/astrology/payments/:bookingId/refund
 * Request payment refund for booking
 */
router.post(
  '/:bookingId/refund',
  authenticate,
  paymentLimiter,
  paymentRefundValidators,
  async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const reason = sanitizeText(req.body?.reason || '', 500);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    if (String(booking.paymentStatus || '').toLowerCase() !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund payment that is not completed.',
      });
    }

    if (!booking.paymentId) {
      return res.status(400).json({
        success: false,
        message: 'No payment ID found for this booking.',
      });
    }

    // Check if refund already exists
    if (booking.refundId) {
      return res.status(409).json({
        success: false,
        message: 'Refund has already been initiated for this booking.',
        data: {
          refundId: booking.refundId,
          refundStatus: booking.refundStatus || 'processing',
        },
      });
    }

    const amountToRefund = Math.round(Number(booking.amountInr || 0) * 100);

    const refund = await razorpay.payments.refund(booking.paymentId, {
      amount: amountToRefund,
      notes: {
        bookingId: String(booking.id || booking._id || bookingId),
        reason: reason || 'Customer request',
      },
    });

    const updatedBooking = await updateConsultationBookingByIdWithLocks(booking.id || booking._id || bookingId, {
      refundId: refund.id,
      refundStatus: refund.status || 'processing',
      refundAmount: refund.amount / 100,
      refundReason: reason,
      refundDate: new Date(),
    });

    await recordAstrologyOperationalEvent({
      category: 'payment',
      eventType: 'refund_initiated',
      severity: 'info',
      message: 'Payment refund initiated',
      consultantId: sanitizeText(booking.consultantId, 120),
      bookingId: String(booking.id || booking._id || bookingId),
      userId: String(req.user?._id || req.user?.id || ''),
      metadata: {
        refundId: refund.id,
        amount: amountToRefund / 100,
        reason,
      },
    });

    return res.json({
      success: true,
      data: {
        refundId: refund.id,
        refundStatus: refund.status,
        refundAmount: refund.amount / 100,
        booking: updatedBooking,
      },
    });
  } catch (error) {
    logger.error(`Refund failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to process refund.',
    });
  }
});

/**
 * GET /api/astrology/payments/:bookingId/receipt
 * Download payment receipt PDF
 */
router.get('/:bookingId/receipt', authenticate, async (req, res) => {
  try {
    const bookingId = sanitizeText(req.params.bookingId, 80);
    const booking = await findConsultationBookingById(bookingId);

    if (!ensureBookingAccess(booking, req, res)) {
      return;
    }

    if (String(booking.paymentStatus || '').toLowerCase() !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Receipt only available for completed payments.',
      });
    }

    // Generate PDF receipt
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${bookingId}.pdf"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('AstroNila Consultation', { align: 'center' });
    doc.fontSize(16).text('Payment Receipt', { align: 'center' });
    doc.moveDown();

    // Receipt details
    doc.fontSize(12);
    doc.text(`Receipt ID: ${booking.paymentId || 'N/A'}`);
    doc.text(`Booking Code: ${booking.confirmationCode || bookingId}`);
    doc.text(`Date: ${booking.paymentDate ? new Date(booking.paymentDate).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    // Booking details
    doc.fontSize(14).text('Booking Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Consultant: ${booking.consultantName || 'N/A'}`);
    doc.text(`Slot: ${booking.slot || 'N/A'}`);
    doc.text(`Preferred Date: ${booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString() : 'N/A'}`);
    if (booking.notes) {
      doc.text(`Notes: ${booking.notes}`);
    }
    doc.moveDown();

    // Payment details
    doc.fontSize(14).text('Payment Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Amount: ₹${Number(booking.amountInr || 0).toFixed(2)}`);
    doc.text(`Currency: ${booking.currency || 'INR'}`);
    doc.text(`Payment Status: ${booking.paymentStatus || 'N/A'}`);
    doc.text(`Order ID: ${booking.paymentOrderId || 'N/A'}`);
    doc.moveDown();

    // Footer
    doc.fontSize(10).text('Thank you for choosing AstroNila!', { align: 'center' });
    doc.text('For support, contact: support@astronila.com', { align: 'center' });

    doc.end();
  } catch (error) {
    logger.error(`Receipt generation failed: ${error.message}`);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Unable to generate receipt.',
      });
    }
  }
});

/**
 * POST /api/astrology/payments/webhook/razorpay
 * Handle Razorpay webhook for payment events
 */
router.post('/webhook/razorpay', async (req, res) => {
  let webhookAudit = null;
  let normalizedEventName = '';
  let normalizedEventId = '';
  let normalizedOrderId = '';
  let normalizedPaymentId = '';
  let normalizedBookingId = '';
  let payloadText = '';
  try {
    const signatureHeader = normalizeHexDigest(
      req.headers['x-razorpay-signature'] || req.headers['X-Razorpay-Signature'],
      256
    );
    const webhookSecret =
      String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim() ||
      resolveRazorpaySecret({ allowTestFallback: process.env.NODE_ENV !== 'production' });
    if (!webhookSecret) {
      logger.error('Astrology webhook blocked: Razorpay webhook secret is not configured.');
      return res.status(503).json({
        success: false,
        message: 'Webhook processing is temporarily unavailable.',
      });
    }

    const rawBodyBuffer = getWebhookRawBodyBuffer(req);
    payloadText = rawBodyBuffer.toString('utf8');
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');
    let eventPayload = {};
    try {
      eventPayload = payloadText ? JSON.parse(payloadText) : {};
    } catch (_error) {
      eventPayload = {};
    }
    const paymentEntity = eventPayload?.payload?.payment?.entity || {};
    const orderEntity = eventPayload?.payload?.order?.entity || {};
    normalizedEventName = sanitizeText(eventPayload?.event, 80).toLowerCase();
    normalizedOrderId = sanitizeText(
      paymentEntity?.order_id || paymentEntity?.orderId || orderEntity?.id || '',
      120
    );
    normalizedPaymentId = sanitizeText(paymentEntity?.id || paymentEntity?.payment_id || '', 120);
    const notesBookingId = sanitizeText(
      (paymentEntity?.notes && paymentEntity?.notes?.bookingId) ||
        (paymentEntity?.notes && paymentEntity?.notes?.booking_id) ||
        '',
      80
    );
    normalizedBookingId = notesBookingId;
    normalizedEventId = sanitizeText(
      req.headers['x-razorpay-event-id'] ||
        eventPayload?.payload?.payment?.entity?.id ||
        `${normalizedEventName || 'unknown'}:${normalizedOrderId || 'no-order'}:${normalizedPaymentId || 'no-payment'}`,
      160
    );

    webhookAudit = await createWebhookAuditEvent({
      provider: 'razorpay',
      eventId: normalizedEventId,
      eventName: normalizedEventName || 'unknown',
      signature: signatureHeader,
      signatureValid: secureDigestEquals(computedSignature, signatureHeader),
      status: 'received',
      requestPath: req.originalUrl || req.path || '',
      orderId: normalizedOrderId,
      paymentId: normalizedPaymentId,
      bookingId: normalizedBookingId,
      payloadText,
      headersSnapshot: {
        'x-razorpay-signature': sanitizeText(req.headers['x-razorpay-signature'], 256),
        'x-razorpay-event-id': sanitizeText(req.headers['x-razorpay-event-id'], 160),
        'content-type': sanitizeText(req.headers['content-type'], 80),
      },
      sourceIp: sanitizeText(req.ip || req.socket?.remoteAddress || '', 80),
    });

    if (webhookAudit?.status === 'duplicate') {
      return res.status(200).json({
        success: true,
        message: 'Duplicate webhook ignored.',
      });
    }

    if (!signatureHeader || !secureDigestEquals(computedSignature, signatureHeader)) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'invalid_signature',
        signatureValid: false,
        failureReason: 'Invalid Razorpay webhook signature.',
      });
      await recordAstrologyOperationalEvent({
        category: 'webhook',
        eventType: 'webhook_signature_invalid',
        severity: 'critical',
        message: 'Rejected webhook due to signature mismatch.',
        bookingId: normalizedBookingId,
        metadata: {
          eventId: normalizedEventId,
          eventName: normalizedEventName || 'unknown',
          orderId: normalizedOrderId,
          paymentId: normalizedPaymentId,
        },
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay webhook signature.',
      });
    }

    if (!normalizedEventName) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'invalid_payload',
        signatureValid: true,
        failureReason: 'Webhook event name is required.',
      });
      return res.status(400).json({
        success: false,
        message: 'Webhook event name is required.',
      });
    }

    let booking = notesBookingId ? await findConsultationBookingById(notesBookingId) : null;
    if (!booking && normalizedOrderId) {
      booking = await findConsultationBookingByPaymentOrderId(normalizedOrderId);
    }

    if (!booking) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'ignored',
        signatureValid: true,
        failureReason: 'Webhook received without booking mapping.',
      });
      logger.warn(
        `Astrology webhook ignored: no booking mapped for event=${normalizedEventName} orderId=${normalizedOrderId}`
      );
      return res.status(202).json({
        success: true,
        message: 'Webhook received. No matching booking found.',
      });
    }
    normalizedBookingId = String(booking.id || booking._id || '');
    if (
      String(booking.paymentStatus || '').toLowerCase() === 'completed' &&
      normalizedPaymentId &&
      String(booking.paymentId || '') === normalizedPaymentId
    ) {
      await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
        status: 'processed',
        signatureValid: true,
        bookingId: normalizedBookingId,
      });
      return res.json({
        success: true,
        message: 'Duplicate webhook ignored.',
        data: booking,
      });
    }

    const normalizedEvent = normalizedEventName || 'unknown';
    const bookingId = booking.id || booking._id;
    const updates = {};
    if (normalizedOrderId) {
      updates.paymentOrderId = normalizedOrderId;
    }
    if (normalizedPaymentId) {
      updates.paymentId = normalizedPaymentId;
    }

    if (normalizedEvent === 'payment.captured' || normalizedEvent === 'payment.authorized') {
      updates.paymentStatus = 'completed';
      updates.paymentDate = new Date();
      updates.status = String(booking.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
    } else if (normalizedEvent === 'payment.failed') {
      updates.paymentStatus = 'failed';
      if (String(booking.status || '').toLowerCase() !== 'cancelled') {
        updates.status = 'pending_payment';
      }
    } else if (normalizedEvent === 'order.paid') {
      updates.paymentStatus = 'completed';
      updates.paymentDate = new Date();
      updates.status = String(booking.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'confirmed';
    } else if (normalizedEvent === 'refund.processed') {
      updates.refundStatus = 'processed';
    } else {
      updates.paymentStatus = booking.paymentStatus || 'pending';
      updates.status = booking.status || 'pending_payment';
    }

    const updatedBooking = await updateConsultationBookingByIdWithLocks(bookingId, updates);
    await updateWebhookAuditEvent(webhookAudit?._id || webhookAudit?.id, {
      status: 'processed',
      signatureValid: true,
      bookingId: String(bookingId),
      orderId: normalizedOrderId,
      paymentId: normalizedPaymentId,
      metadata: {
        reconciledStatus: updates.status,
        reconciledPaymentStatus: updates.paymentStatus,
      },
    });
    logger.info(
      `Astrology webhook reconciled booking=${bookingId} event=${normalizedEvent} paymentStatus=${updates.paymentStatus}`
    );

    return res.json({
      success: true,
      data: updatedBooking || booking,
    });
  } catch (error) {
    if (webhookAudit?._id || webhookAudit?.id) {
      try {
        await updateWebhookAuditEvent(webhookAudit._id || webhookAudit.id, {
          status: 'error',
          signatureValid: true,
          failureReason: sanitizeText(error.message, 280),
          bookingId: normalizedBookingId,
          orderId: normalizedOrderId,
          paymentId: normalizedPaymentId,
          metadata: {
            eventId: normalizedEventId,
            eventName: normalizedEventName || 'unknown',
          },
        });
      } catch (_auditError) {
        logger.error(`Astrology webhook audit update failed: ${_auditError.message}`);
      }
    }
    await recordAstrologyOperationalEvent({
      category: 'webhook',
      eventType: 'webhook_processing_error',
      severity: 'critical',
      message: sanitizeText(error.message, 280) || 'Webhook reconciliation error.',
      bookingId: normalizedBookingId,
      metadata: {
        eventId: normalizedEventId,
        eventName: normalizedEventName || 'unknown',
        orderId: normalizedOrderId,
        paymentId: normalizedPaymentId,
      },
    });
    logger.error(`Astrology webhook reconciliation failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Unable to process webhook.',
    });
  }
});

module.exports = router;
