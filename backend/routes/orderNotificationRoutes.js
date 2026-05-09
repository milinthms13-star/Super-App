/**
 * orderNotificationRoutes.js
 * Phase 5E: Notification preferences and manual notification endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const OrderNotificationService = require('../services/OrderNotificationService');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const preferences = user.notificationPreferences || {
      orderConfirmation: true,
      shipmentUpdates: true,
      deliveryNotification: true,
      returnUpdates: true,
      refundNotification: true,
      promotionalEmails: false,
      smsNotifications: false,
      trackingUpdates: true,
    };

    res.json(preferences);
  } catch (error) {
    logger.error(`Failed to fetch notification preferences: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const {
      orderConfirmation,
      shipmentUpdates,
      deliveryNotification,
      returnUpdates,
      refundNotification,
      promotionalEmails,
      smsNotifications,
      trackingUpdates,
    } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.notificationPreferences = {
      orderConfirmation: orderConfirmation !== undefined ? orderConfirmation : user.notificationPreferences?.orderConfirmation ?? true,
      shipmentUpdates: shipmentUpdates !== undefined ? shipmentUpdates : user.notificationPreferences?.shipmentUpdates ?? true,
      deliveryNotification: deliveryNotification !== undefined ? deliveryNotification : user.notificationPreferences?.deliveryNotification ?? true,
      returnUpdates: returnUpdates !== undefined ? returnUpdates : user.notificationPreferences?.returnUpdates ?? true,
      refundNotification: refundNotification !== undefined ? refundNotification : user.notificationPreferences?.refundNotification ?? true,
      promotionalEmails: promotionalEmails !== undefined ? promotionalEmails : user.notificationPreferences?.promotionalEmails ?? false,
      smsNotifications: smsNotifications !== undefined ? smsNotifications : user.notificationPreferences?.smsNotifications ?? false,
      trackingUpdates: trackingUpdates !== undefined ? trackingUpdates : user.notificationPreferences?.trackingUpdates ?? true,
    };

    await user.save();

    res.json({
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences,
    });
  } catch (error) {
    logger.error(`Failed to update notification preferences: ${error.message}`);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/notifications/test
 * Send test notification email
 */
router.post('/test', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const html = `
      <h2>Test Email from Malabarbazaar</h2>
      <p>Hi ${user.name},</p>
      <p>This is a test notification email to verify your email address is correctly configured.</p>
      <p>If you received this email, your notification settings are working properly!</p>
    `;

    const EmailNotificationService = require('../services/EmailNotificationService');
    await EmailNotificationService.getInstance().sendEmail({
      to: user.email,
      subject: 'Test Email - Malabarbazaar Notifications',
      html,
    });

    res.json({
      message: 'Test email sent successfully',
      recipientEmail: user.email,
    });
  } catch (error) {
    logger.error(`Failed to send test notification: ${error.message}`);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * GET /api/notifications/unsubscribe/:token
 * Unsubscribe from all emails (public endpoint)
 */
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify and decode token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Disable all notifications
    user.notificationPreferences = {
      orderConfirmation: false,
      shipmentUpdates: false,
      deliveryNotification: false,
      returnUpdates: false,
      refundNotification: false,
      promotionalEmails: false,
      smsNotifications: false,
      trackingUpdates: false,
    };

    await user.save();

    res.json({
      message: 'You have been unsubscribed from all email notifications',
      status: 'unsubscribed',
    });
  } catch (error) {
    logger.error(`Failed to unsubscribe: ${error.message}`);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * GET /api/notifications/tracking/:orderId
 * Get real-time tracking info for order
 */
router.get('/tracking/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const Shipment = require('../models/Shipment');
    const shipment = order.shipmentId
      ? await Shipment.findById(order.shipmentId)
      : null;

    res.json({
      orderId,
      orderStatus: order.status,
      shipment: shipment
        ? {
            trackingNumber: shipment.trackingNumber,
            status: shipment.status,
            currentLocation: shipment.currentLocation,
            estimatedDelivery: shipment.estimatedDelivery,
            trackingHistory: shipment.trackingHistory || [],
            deliveredAt: shipment.deliveredAt,
          }
        : null,
    });
  } catch (error) {
    logger.error(`Failed to fetch tracking info: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tracking information' });
  }
});

/**
 * POST /api/notifications/resend/:type/:orderId
 * Resend a notification email
 */
router.post('/resend/:type/:orderId', verifyToken, async (req, res) => {
  try {
    const { type, orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('userId', 'email name');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = order.userId;
    let message = '';

    switch (type) {
      case 'confirmation':
        await OrderNotificationService.notifyOrderPlaced(order, user);
        message = 'Order confirmation email resent';
        break;

      case 'shipment':
        const Shipment = require('../models/Shipment');
        const shipment = await Shipment.findById(order.shipmentId);
        if (shipment) {
          await OrderNotificationService.notifyShipmentCreated(
            shipment,
            order,
            user
          );
          message = 'Shipment notification resent';
        } else {
          return res.status(400).json({ error: 'Order not yet shipped' });
        }
        break;

      case 'delivery':
        const deliveryShipment = await Shipment.findById(order.shipmentId);
        if (deliveryShipment?.deliveredAt) {
          await OrderNotificationService.notifyShipmentDelivered(
            deliveryShipment,
            order,
            user
          );
          message = 'Delivery confirmation resent';
        } else {
          return res.status(400).json({ error: 'Order not yet delivered' });
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    res.json({
      message,
      orderId,
      type,
    });
  } catch (error) {
    logger.error(`Failed to resend notification: ${error.message}`);
    res.status(500).json({ error: 'Failed to resend notification' });
  }
});

module.exports = router;
