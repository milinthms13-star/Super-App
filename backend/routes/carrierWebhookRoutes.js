/**
 * carrierWebhookRoutes.js
 * Phase 5E: Carrier webhook handlers for tracking updates
 * Receives real-time shipment status updates from courier partners
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const FulfillmentService = require('../services/FulfillmentService');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const User = require('../models/User');
const OrderNotificationService = require('../services/OrderNotificationService');
const logger = require('../utils/logger');

/**
 * Webhook signature verification middleware
 * Verifies that the webhook is coming from the carrier using shared secret
 */
const verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-carrier-signature'];
    const timestamp = req.headers['x-carrier-timestamp'];
    const carrier = req.headers['x-carrier-id'];

    if (!signature || !timestamp || !carrier) {
      return res.status(401).json({ error: 'Missing webhook headers' });
    }

    // Verify timestamp (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Webhook timestamp expired' });
    }

    // Get carrier secret from env
    const carrierSecret = process.env[`CARRIER_${carrier.toUpperCase()}_SECRET`];
    if (!carrierSecret) {
      logger.warn(`Unknown carrier in webhook: ${carrier}`);
      return res.status(401).json({ error: 'Unknown carrier' });
    }

    // Verify signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', carrierSecret)
      .update(`${payload}${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn(`Invalid webhook signature from carrier: ${carrier}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    logger.error(`Webhook signature verification failed: ${error.message}`);
    res.status(500).json({ error: 'Signature verification failed' });
  }
};

// Apply signature verification to all carrier webhooks
router.use(verifyWebhookSignature);

/**
 * POST /webhooks/carrier/tracking-update
 * Receives tracking updates from carrier
 * Body: { trackingNumber, status, location, timestamp, estimatedDelivery, ... }
 */
router.post('/tracking-update', async (req, res) => {
  try {
    const {
      trackingNumber,
      status,
      location,
      timestamp,
      estimatedDelivery,
      carrierName,
      events = [],
    } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    // Find shipment
    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
      logger.warn(`Webhook received for unknown tracking number: ${trackingNumber}`);
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const oldStatus = shipment.status;

    // Update shipment status
    shipment.status = status;
    shipment.currentLocation = location;
    shipment.lastLocationUpdate = new Date(timestamp);

    if (estimatedDelivery) {
      shipment.estimatedDelivery = new Date(estimatedDelivery);
    }

    // Add to tracking history
    if (!shipment.trackingHistory) {
      shipment.trackingHistory = [];
    }

    shipment.trackingHistory.push({
      status,
      location,
      timestamp: new Date(timestamp),
      eventDetails: events,
    });

    if (status === 'delivered') {
      shipment.deliveredAt = new Date();
    }

    await shipment.save();

    // Update related order
    const order = await Order.findById(shipment.orderId)
      .populate('userId', 'email name');

    if (order && order.userId) {
      // Update order status if shipment is delivered
      if (status === 'delivered' && order.status !== 'delivered') {
        order.status = 'delivered';
        order.deliveredAt = new Date();
        await order.save();

        // Send delivery notification
        try {
          await OrderNotificationService.notifyShipmentDelivered(
            shipment,
            order,
            order.userId
          );
        } catch (emailError) {
          logger.error(`Failed to send delivery notification: ${emailError.message}`);
        }

        // Broadcast via WebSocket
        const OrderTrackingWebSocket = require('../websocket/orderTrackingWebSocket');
        // This will be initialized in server.js
      }

      // Send tracking update notification
      if (status !== oldStatus) {
        try {
          await OrderNotificationService.notifyTrackingUpdate(
            shipment,
            order,
            order.userId,
            oldStatus
          );
        } catch (emailError) {
          logger.error(`Failed to send tracking notification: ${emailError.message}`);
        }
      }
    }

    logger.info(`Carrier webhook processed: ${trackingNumber} -> ${status}`);

    res.json({
      success: true,
      message: 'Tracking update processed',
      trackingNumber,
      status,
    });
  } catch (error) {
    logger.error(`Carrier webhook processing failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to process tracking update' });
  }
});

/**
 * POST /webhooks/carrier/delivery-attempt
 * Receives delivery attempt notifications
 * Body: { trackingNumber, attemptNumber, reason, nextAttemptDate, ... }
 */
router.post('/delivery-attempt', async (req, res) => {
  try {
    const {
      trackingNumber,
      attemptNumber,
      reason,
      nextAttemptDate,
    } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Add delivery attempt to history
    if (!shipment.deliveryAttempts) {
      shipment.deliveryAttempts = [];
    }

    shipment.deliveryAttempts.push({
      attemptNumber,
      reason,
      timestamp: new Date(),
      nextAttemptDate: nextAttemptDate ? new Date(nextAttemptDate) : null,
    });

    await shipment.save();

    logger.info(
      `Delivery attempt recorded: ${trackingNumber} (Attempt ${attemptNumber})`
    );

    res.json({
      success: true,
      message: 'Delivery attempt recorded',
      trackingNumber,
      attemptNumber,
    });
  } catch (error) {
    logger.error(`Delivery attempt webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to record delivery attempt' });
  }
});

/**
 * POST /webhooks/carrier/exception
 * Receives exception notifications (lost, damaged, etc.)
 * Body: { trackingNumber, exceptionType, description, resolution, ... }
 */
router.post('/exception', async (req, res) => {
  try {
    const {
      trackingNumber,
      exceptionType,
      description,
      resolution,
      severity,
    } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Add exception
    if (!shipment.exceptions) {
      shipment.exceptions = [];
    }

    shipment.exceptions.push({
      type: exceptionType,
      description,
      resolution,
      severity: severity || 'medium',
      reportedAt: new Date(),
      resolved: false,
    });

    // Update shipment status
    shipment.status = 'exception';
    await shipment.save();

    // Alert admin and customer
    const order = await Order.findById(shipment.orderId)
      .populate('userId', 'email name');

    if (order && order.userId) {
      logger.warn(
        `Exception on shipment ${trackingNumber}: ${exceptionType} - ${description}`
      );

      // TODO: Send alert email to admin
      // TODO: Send notification to customer
    }

    res.json({
      success: true,
      message: 'Exception recorded',
      trackingNumber,
      exceptionType,
    });
  } catch (error) {
    logger.error(`Exception webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to record exception' });
  }
});

module.exports = router;
