const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const AstrologyConsultationBooking = require('../models/AstrologyConsultationBooking');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize Razorpay with keys from environment
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

// Transaction audit logging
const logTransaction = async (transactionData) => {
  try {
    logger.info(`[PAYMENT] ${JSON.stringify(transactionData)}`);
    // Could also save to database if needed
  } catch (error) {
    logger.error(`Failed to log transaction: ${error.message}`);
  }
};

// Retry mechanism for failed payments
const retryPaymentVerification = async (orderId, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const order = await razorpay.orders.fetch(orderId);
      logger.info(`Payment verification attempt ${attempt}/${maxRetries} for order ${orderId}`);
      return order;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Create payment order
router.post('/payment/create-order', authenticate, async (req, res) => {
  try {
    const { bookingId, consultantId, amountInr } = req.body;

    if (!bookingId || !amountInr || amountInr < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking or amount.',
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountInr * 100, // Convert to paise
      currency: 'INR',
      receipt: `booking-${bookingId}`,
      notes: {
        bookingId,
        consultantId,
        userId: String(req.user._id || req.user.id),
      },
    });

    return res.json({
      success: true,
      data: {
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

// Verify payment signature
router.post('/payment/verify', authenticate, async (req, res) => {
  const transactionId = `TXN-${Date.now()}`;
  try {
    const { orderId, paymentId, signature, bookingId } = req.body;
    const userId = String(req.user._id || req.user.id);

    // Validate inputs
    if (!orderId || !paymentId || !signature || !bookingId) {
      await logTransaction({
        id: transactionId,
        status: 'failed',
        reason: 'Missing required fields',
        userId,
        timestamp: new Date(),
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields.',
      });
    }

    // Verify signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret');
    shasum.update(`${orderId}|${paymentId}`);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      await logTransaction({
        id: transactionId,
        status: 'failed',
        reason: 'Invalid signature',
        orderId,
        paymentId,
        userId,
        timestamp: new Date(),
      });
      return res.status(400).json({
        success: false,
        message: 'Payment signature verification failed.',
      });
    }

    // Fetch payment details from Razorpay with retry
    const paymentDetails = await retryPaymentVerification(orderId);
    
    // Update booking with payment status
    const booking = await AstrologyConsultationBooking.findByIdAndUpdate(
      bookingId,
      {
        paymentStatus: 'completed',
        paymentId,
        paymentDate: new Date(),
        transactionId,
      },
      { new: true }
    );

    if (!booking) {
      await logTransaction({
        id: transactionId,
        status: 'failed',
        reason: 'Booking not found',
        bookingId,
        userId,
        timestamp: new Date(),
      });
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Send success notification
    try {
      await NotificationService.sendNotification(userId, {
        type: 'payment_success',
        title: 'Payment Confirmed',
        message: `Your consultation booking payment of ₹${booking.amountInr || 'N/A'} has been confirmed.`,
        channels: ['in-app', 'email'],
        data: { bookingId, transactionId },
      });
    } catch (notificationError) {
      logger.warn(`Failed to send payment success notification: ${notificationError.message}`);
    }

    await logTransaction({
      id: transactionId,
      status: 'success',
      orderId,
      paymentId,
      bookingId,
      amountInr: booking.amountInr,
      userId,
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      message: 'Payment verified successfully.',
      data: {
        ...booking.toObject?.() || booking,
        transactionId,
      },
    });
  } catch (error) {
    await logTransaction({
      id: transactionId,
      status: 'error',
      error: error.message,
      timestamp: new Date(),
    });
    logger.error(`Payment verification error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment.',
    });
  }
});

// Get payment status
router.get('/payment/:bookingId', authenticate, async (req, res) => {
  try {
    const booking = await AstrologyConsultationBooking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus || 'pending',
        amountInr: booking.amountInr,
        paymentId: booking.paymentId || null,
        transactionId: booking.transactionId || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch payment status.',
    });
  }
});

// Razorpay Webhook Handler
router.post('/payment/webhook', async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret';
  
  try {
    const signature = req.headers['x-razorpay-signature'];
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      logger.warn('Webhook signature verification failed');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    logger.info(`Webhook event received: ${event}`);

    switch (event) {
      case 'payment.authorized':
      case 'payment.captured': {
        const paymentEntity = payload.payment.entity;
        const bookingId = paymentEntity.notes.bookingId;
        const userId = paymentEntity.notes.userId;

        // Update booking status
        await AstrologyConsultationBooking.findByIdAndUpdate(bookingId, {
          paymentStatus: 'completed',
          paymentId: paymentEntity.id,
          paymentDate: new Date(),
        });

        // Send notification
        try {
          await NotificationService.sendNotification(userId, {
            type: 'payment_confirmed',
            title: 'Payment Successful',
            message: `Your payment of ₹${paymentEntity.amount / 100} has been successfully captured.`,
            channels: ['in-app', 'email'],
            data: { bookingId },
          });
        } catch (error) {
          logger.warn(`Webhook notification failed: ${error.message}`);
        }
        break;
      }

      case 'payment.failed': {
        const paymentEntity = payload.payment.entity;
        const bookingId = paymentEntity.notes.bookingId;
        const userId = paymentEntity.notes.userId;

        // Update booking status
        await AstrologyConsultationBooking.findByIdAndUpdate(bookingId, {
          paymentStatus: 'failed',
          paymentFailureReason: paymentEntity.error_description,
        });

        // Send failure notification
        try {
          await NotificationService.sendNotification(userId, {
            type: 'payment_failed',
            title: 'Payment Failed',
            message: `Your payment failed: ${paymentEntity.error_description}. Please try again.`,
            channels: ['in-app', 'email'],
            data: { bookingId },
          });
        } catch (error) {
          logger.warn(`Webhook failure notification failed: ${error.message}`);
        }
        break;
      }

      case 'refund.created':
      case 'refund.processed': {
        const refundEntity = payload.refund.entity;
        const paymentId = refundEntity.payment_id;

        // Find booking by payment ID and update
        const booking = await AstrologyConsultationBooking.findOne({ paymentId });
        if (booking) {
          await AstrologyConsultationBooking.findByIdAndUpdate(booking._id, {
            refundStatus: 'processed',
            refundId: refundEntity.id,
            refundAmount: refundEntity.amount / 100,
            refundDate: new Date(),
          });

          // Send refund notification
          try {
            await NotificationService.sendNotification(booking.userId, {
              type: 'refund_processed',
              title: 'Refund Processed',
              message: `Your refund of ₹${refundEntity.amount / 100} has been processed.`,
              channels: ['in-app', 'email'],
              data: { bookingId: booking._id },
            });
          } catch (error) {
            logger.warn(`Webhook refund notification failed: ${error.message}`);
          }
        }
        break;
      }

      default:
        logger.debug(`Unhandled webhook event: ${event}`);
    }

    return res.json({ success: true, received: true });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// Refund Endpoint
router.post('/payment/refund/:bookingId', authenticate, async (req, res) => {
  const transactionId = `REFUND-${Date.now()}`;
  try {
    const booking = await AstrologyConsultationBooking.findById(req.params.bookingId);

    if (!booking || !booking.paymentId) {
      return res.status(404).json({
        success: false,
        message: 'Booking or payment not found.',
      });
    }

    // Verify user is authorized (booking owner or admin)
    const userId = String(req.user._id || req.user.id);
    const bookingUserId = String(booking.userId || '');
    const isAdmin = req.user?.role === 'admin';

    if (userId !== bookingUserId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to refund this booking.',
      });
    }

    // Create refund
    const refund = await razorpay.payments.refund(booking.paymentId, {
      amount: booking.amountInr * 100,
      notes: {
        bookingId: req.params.bookingId,
        reason: req.body.reason || 'User requested',
      },
    });

    // Update booking
    await AstrologyConsultationBooking.findByIdAndUpdate(req.params.bookingId, {
      refundStatus: 'initiated',
      refundId: refund.id,
      refundReason: req.body.reason || 'User requested',
    });

    await logTransaction({
      id: transactionId,
      type: 'refund',
      status: 'initiated',
      bookingId: req.params.bookingId,
      refundId: refund.id,
      amountInr: booking.amountInr,
      userId,
      timestamp: new Date(),
    });

    // Send refund notification
    try {
      await NotificationService.sendNotification(bookingUserId, {
        type: 'refund_initiated',
        title: 'Refund Initiated',
        message: `Your refund of ₹${booking.amountInr} has been initiated and will be processed in 3-5 business days.`,
        channels: ['in-app', 'email'],
        data: { bookingId: req.params.bookingId },
      });
    } catch (error) {
      logger.warn(`Failed to send refund notification: ${error.message}`);
    }

    return res.json({
      success: true,
      message: 'Refund initiated successfully.',
      data: { refundId: refund.id, status: 'initiated' },
    });
  } catch (error) {
    logger.error(`Refund error: ${error.message}`);
    await logTransaction({
      id: transactionId,
      type: 'refund',
      status: 'error',
      error: error.message,
      timestamp: new Date(),
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to process refund.',
    });
  }
});

// Get refund status
router.get('/payment/refund/:bookingId', authenticate, async (req, res) => {
  try {
    const booking = await AstrologyConsultationBooking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    return res.json({
      success: true,
      data: {
        bookingId: booking._id,
        refundStatus: booking.refundStatus || 'not_initiated',
        refundId: booking.refundId || null,
        refundAmount: booking.refundAmount || null,
        refundDate: booking.refundDate || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch refund status.',
    });
  }
});

module.exports = router;
