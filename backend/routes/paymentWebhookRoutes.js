/**
 * paymentWebhookRoutes.js
 * Phase 5D - Payment gateway webhook handlers (Razorpay, Stripe)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const PaymentService = require('../services/PaymentService');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

// ============================================
// RAZORPAY WEBHOOKS
// ============================================

/**
 * POST /webhooks/razorpay
 * Handle Razorpay payment webhook events
 */
router.post('/razorpay', async (req, res) => {
  try {
    const secretKey = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify Razorpay signature
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      logger.warn('Razorpay: Invalid signature received');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    logger.info(`Razorpay webhook: ${event}`);

    switch (event) {
      case 'payment.authorized':
        await handleRazorpayPaymentAuthorized(payload);
        break;

      case 'payment.captured':
        await handleRazorpayPaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handleRazorpayPaymentFailed(payload);
        break;

      case 'refund.created':
        await handleRazorpayRefundCreated(payload);
        break;

      case 'refund.failed':
        await handleRazorpayRefundFailed(payload);
        break;

      default:
        logger.info(`Razorpay: Unhandled event type: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle Razorpay payment authorized
 */
async function handleRazorpayPaymentAuthorized(payload) {
  try {
    const { payment } = payload;
    const paymentId = payment.id;
    const orderId = payment.notes.orderId;
    const userId = payment.notes.userId;

    const dbPayment = await Payment.findOne({ gatewayTransactionId: paymentId });
    if (!dbPayment) {
      logger.warn(`Payment not found for transaction: ${paymentId}`);
      return;
    }

    // Update payment status
    dbPayment.status = 'processing';
    dbPayment.authorizedAt = new Date();
    await dbPayment.save();

    logger.info(`Payment authorized: ${paymentId}`);
  } catch (error) {
    logger.error('Error handling Razorpay payment authorized:', error);
  }
}

/**
 * Handle Razorpay payment captured
 */
async function handleRazorpayPaymentCaptured(payload) {
  try {
    const { payment } = payload;
    const paymentId = payment.id;
    const orderId = payment.notes.orderId;
    const userId = payment.notes.userId;
    const amount = payment.amount / 100; // Razorpay amounts in paise

    // Find payment record
    const dbPayment = await Payment.findOne({ gatewayTransactionId: paymentId });
    if (!dbPayment) {
      logger.warn(`Payment not found for transaction: ${paymentId}`);
      return;
    }

    // Update payment status
    dbPayment.status = 'captured';
    dbPayment.amount = amount;
    dbPayment.capturedAt = new Date();
    dbPayment.metadata = {
      ...dbPayment.metadata,
      razorpayPaymentId: payment.id,
      razorpayMethod: payment.method,
      razorpayDescription: payment.description,
    };
    await dbPayment.save();

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.status = 'Payment Confirmed';
      order.paymentDetails = {
        ...order.paymentDetails,
        status: 'captured',
        capturedAt: new Date(),
        amount,
      };
      await order.save();
    }

    // Send confirmation notification
    await NotificationService.sendPaymentConfirmedEmail(userId, orderId, amount);
    
    logger.info(`Payment captured: ${paymentId} for order: ${orderId}`);
  } catch (error) {
    logger.error('Error handling Razorpay payment captured:', error);
  }
}

/**
 * Handle Razorpay payment failed
 */
async function handleRazorpayPaymentFailed(payload) {
  try {
    const { payment } = payload;
    const paymentId = payment.id;
    const orderId = payment.notes.orderId;
    const userId = payment.notes.userId;

    // Find payment record
    const dbPayment = await Payment.findOne({ gatewayTransactionId: paymentId });
    if (!dbPayment) {
      logger.warn(`Payment not found for transaction: ${paymentId}`);
      return;
    }

    // Update payment status
    dbPayment.status = 'failed';
    dbPayment.failedAt = new Date();
    dbPayment.failureReason = payment.error_description || 'Payment failed';
    await dbPayment.save();

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.status = 'Payment Failed';
      await order.save();
    }

    // Send failure notification
    await NotificationService.sendPaymentFailedEmail(userId, orderId, dbPayment.failureReason);

    logger.warn(`Payment failed: ${paymentId} - ${dbPayment.failureReason}`);
  } catch (error) {
    logger.error('Error handling Razorpay payment failed:', error);
  }
}

/**
 * Handle Razorpay refund created
 */
async function handleRazorpayRefundCreated(payload) {
  try {
    const { refund } = payload;
    const paymentId = refund.payment_id;
    const refundAmount = refund.amount / 100;

    // Find payment record
    const dbPayment = await Payment.findOne({ gatewayTransactionId: paymentId });
    if (!dbPayment) {
      logger.warn(`Payment not found for refund: ${paymentId}`);
      return;
    }

    // Update payment with refund info
    if (dbPayment.amount === refundAmount) {
      dbPayment.status = 'refunded';
    } else {
      dbPayment.status = 'partial_refund';
    }

    dbPayment.refunds = dbPayment.refunds || [];
    dbPayment.refunds.push({
      refundId: refund.id,
      amount: refundAmount,
      status: refund.status,
      createdAt: new Date(),
      reason: refund.notes?.reason || 'Customer requested refund',
    });
    await dbPayment.save();

    logger.info(`Refund created: ${refund.id} for payment: ${paymentId}`);
  } catch (error) {
    logger.error('Error handling Razorpay refund created:', error);
  }
}

/**
 * Handle Razorpay refund failed
 */
async function handleRazorpayRefundFailed(payload) {
  try {
    const { refund } = payload;
    const paymentId = refund.payment_id;

    logger.warn(`Refund failed: ${refund.id} for payment: ${paymentId} - ${refund.notes?.reason}`);
    
    // Notify admin of failed refund
    await NotificationService.sendAdminAlert(
      `Refund Failed: ${refund.id}`,
      `Refund for payment ${paymentId} failed: ${refund.notes?.reason}`
    );
  } catch (error) {
    logger.error('Error handling Razorpay refund failed:', error);
  }
}

// ============================================
// STRIPE WEBHOOKS
// ============================================

/**
 * POST /webhooks/stripe
 * Handle Stripe payment webhook events
 */
router.post('/stripe', async (req, res) => {
  try {
    const secretKey = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers['stripe-signature'];

    // Verify Stripe signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, secretKey);
    } catch (error) {
      logger.warn(`Stripe: Invalid signature - ${error.message}`);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    logger.info(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleStripePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handleStripePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleStripeRefund(event.data.object);
        break;

      default:
        logger.info(`Stripe: Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle Stripe payment succeeded
 */
async function handleStripePaymentSucceeded(paymentIntent) {
  try {
    const { id: paymentId, amount, currency, metadata } = paymentIntent;
    const orderId = metadata.orderId;
    const userId = metadata.userId;
    const finalAmount = amount / 100; // Stripe amounts in cents

    // Find payment record
    const dbPayment = await Payment.findOne({ gatewayTransactionId: paymentId });
    if (!dbPayment) {
      logger.warn(`Payment not found for Stripe transaction: ${paymentId}`);
      return;
    }

    // Update payment status
    dbPayment.status = 'captured';
    dbPayment.amount = finalAmount;
    dbPayment.capturedAt = new Date();
    dbPayment.metadata = {
      ...dbPayment.metadata,
      stripePaymentIntentId: paymentId,
      stripeCurrency: currency,
    };
    await dbPayment.save();

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.status = 'Payment Confirmed';
      order.paymentDetails = {
        ...order.paymentDetails,
        status: 'captured',
        capturedAt: new Date(),
        amount: finalAmount,
        gateway: 'stripe',
      };
      await order.save();
    }

    // Send confirmation notification
    await NotificationService.sendPaymentConfirmedEmail(userId, orderId, finalAmount);

    logger.info(`Stripe payment succeeded: ${paymentId} for order: ${orderId}`);
  } catch (error) {
    logger.error('Error handling Stripe payment succeeded:', error);
  }
}

/**
 * Handle Stripe payment failed
 */
async function handleStripePaymentFailed(paymentIntent) {
  try {
    const { id: paymentId, amount, last_payment_error, metadata } = paymentIntent;
    const orderId = metadata.orderId;
    const userId = metadata.userId;

    // Find payment record
    const dbPayment = await Payment.findOne({ gatewayTransactionId: paymentId });
    if (!dbPayment) {
      logger.warn(`Payment not found for Stripe transaction: ${paymentId}`);
      return;
    }

    // Update payment status
    dbPayment.status = 'failed';
    dbPayment.failedAt = new Date();
    dbPayment.failureReason = last_payment_error?.message || 'Payment failed';
    await dbPayment.save();

    // Update order status
    const order = await Order.findById(orderId);
    if (order) {
      order.status = 'Payment Failed';
      await order.save();
    }

    // Send failure notification
    await NotificationService.sendPaymentFailedEmail(userId, orderId, dbPayment.failureReason);

    logger.warn(`Stripe payment failed: ${paymentId} - ${dbPayment.failureReason}`);
  } catch (error) {
    logger.error('Error handling Stripe payment failed:', error);
  }
}

/**
 * Handle Stripe refund
 */
async function handleStripeRefund(charge) {
  try {
    const { id: chargeId, amount, refunded, refunds } = charge;
    const refundAmount = amount / 100;

    // Find payment by Stripe charge ID
    const dbPayment = await Payment.findOne({ metadata: { stripeChargeId: chargeId } });
    if (!dbPayment) {
      logger.warn(`Payment not found for Stripe charge: ${chargeId}`);
      return;
    }

    // Update payment with refund info
    if (refunded && dbPayment.amount === refundAmount) {
      dbPayment.status = 'refunded';
    } else if (refunded) {
      dbPayment.status = 'partial_refund';
    }

    dbPayment.refunds = refunds.data.map(refund => ({
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      createdAt: new Date(refund.created * 1000),
      reason: refund.reason || 'Refund processed',
    }));

    await dbPayment.save();

    logger.info(`Stripe refund processed: ${chargeId}`);
  } catch (error) {
    logger.error('Error handling Stripe refund:', error);
  }
}

module.exports = router;
