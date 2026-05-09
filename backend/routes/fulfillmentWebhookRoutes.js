/**
 * fulfillmentWebhookRoutes.js
 * Phase 5E: Fulfillment service webhook handlers
 * Receives order fulfillment updates from third-party fulfillment providers
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Shipment = require('../models/Shipment');
const Order = require('../models/Order');
const OrderNotificationService = require('../services/OrderNotificationService');
const logger = require('../utils/logger');

/**
 * Verify fulfillment service webhook signature
 */
const verifyFulfillmentSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-fulfillment-signature'];
    const timestamp = req.headers['x-fulfillment-timestamp'];
    const providerId = req.headers['x-provider-id'];

    if (!signature || !timestamp || !providerId) {
      return res.status(401).json({ error: 'Missing webhook headers' });
    }

    // Verify timestamp (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return res.status(401).json({ error: 'Webhook timestamp expired' });
    }

    // Get provider secret
    const providerSecret = process.env[`FULFILLMENT_${providerId.toUpperCase()}_SECRET`];
    if (!providerSecret) {
      logger.warn(`Unknown fulfillment provider: ${providerId}`);
      return res.status(401).json({ error: 'Unknown provider' });
    }

    // Verify signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', providerSecret)
      .update(`${payload}${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn(`Invalid fulfillment webhook signature: ${providerId}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    logger.error(`Fulfillment signature verification failed: ${error.message}`);
    res.status(500).json({ error: 'Signature verification failed' });
  }
};

router.use(verifyFulfillmentSignature);

/**
 * POST /webhooks/fulfillment/order-received
 * Fulfillment provider acknowledges order receipt
 * Body: { externalOrderId, internalOrderId, sku, quantity, status, estimatedPickDate, ... }
 */
router.post('/order-received', async (req, res) => {
  try {
    const {
      externalOrderId,
      internalOrderId,
      status,
      estimatedPickDate,
      warehouseId,
      providerId,
    } = req.body;

    // Find order by external ID
    const order = await Order.findOne({ externalOrderId })
      .populate('userId', 'email name');

    if (!order) {
      logger.warn(`Webhook received for unknown external order: ${externalOrderId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order fulfillment details
    if (!order.fulfillmentDetails) {
      order.fulfillmentDetails = {};
    }

    order.fulfillmentDetails = {
      ...order.fulfillmentDetails,
      externalOrderId,
      internalOrderId,
      status,
      warehouseId,
      providerId,
      receivedAt: new Date(),
      estimatedPickDate: new Date(estimatedPickDate),
    };

    // Update order status
    if (status === 'received' && order.status === 'confirmed') {
      order.status = 'processing';
      await OrderNotificationService.notifyOrderStatusChanged(
        order,
        order.userId,
        'confirmed',
        'processing'
      );
    }

    await order.save();

    logger.info(
      `Fulfillment order received: ${internalOrderId} (External: ${externalOrderId})`
    );

    res.json({
      success: true,
      message: 'Order received by fulfillment provider',
      externalOrderId,
      internalOrderId,
    });
  } catch (error) {
    logger.error(`Fulfillment order-received webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to process order receipt' });
  }
});

/**
 * POST /webhooks/fulfillment/shipment-created
 * Fulfillment provider creates shipment
 * Body: { externalOrderId, trackingNumber, carrier, estimatedDelivery, items, ... }
 */
router.post('/shipment-created', async (req, res) => {
  try {
    const {
      externalOrderId,
      trackingNumber,
      carrier,
      estimatedDelivery,
      items,
      shippingAddress,
    } = req.body;

    // Find order
    const order = await Order.findOne({ externalOrderId })
      .populate('userId', 'email name');

    if (!order) {
      logger.warn(
        `Shipment webhook received for unknown order: ${externalOrderId}`
      );
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create or update shipment
    let shipment = await Shipment.findOne({ trackingNumber });

    if (!shipment) {
      shipment = new Shipment({
        orderId: order._id,
        trackingNumber,
        carrier,
        status: 'pending',
        estimatedDelivery: new Date(estimatedDelivery),
        shippingAddress,
        trackingHistory: [
          {
            status: 'pending',
            location: 'Fulfillment Center',
            timestamp: new Date(),
          },
        ],
      });
      await shipment.save();
    }

    // Update order
    order.shipmentId = shipment._id;
    order.status = 'shipped';
    order.shippedAt = new Date();

    await order.save();

    // Send shipment notification
    try {
      await OrderNotificationService.notifyShipmentCreated(
        shipment,
        order,
        order.userId
      );
    } catch (emailError) {
      logger.error(`Failed to send shipment notification: ${emailError.message}`);
    }

    logger.info(
      `Shipment created from fulfillment: ${trackingNumber} for order ${externalOrderId}`
    );

    res.json({
      success: true,
      message: 'Shipment created',
      trackingNumber,
      estimatedDelivery,
    });
  } catch (error) {
    logger.error(`Fulfillment shipment-created webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

/**
 * POST /webhooks/fulfillment/shipment-status
 * Fulfillment provider updates shipment status
 * Body: { trackingNumber, status, location, timestamp, ... }
 */
router.post('/shipment-status', async (req, res) => {
  try {
    const {
      trackingNumber,
      status,
      location,
      timestamp,
      estimatedDelivery,
    } = req.body;

    const shipment = await Shipment.findOne({ trackingNumber });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const oldStatus = shipment.status;
    shipment.status = status;
    shipment.currentLocation = location;
    shipment.lastLocationUpdate = new Date(timestamp);

    if (estimatedDelivery) {
      shipment.estimatedDelivery = new Date(estimatedDelivery);
    }

    if (status === 'delivered') {
      shipment.deliveredAt = new Date();
    }

    // Add to tracking history
    if (!shipment.trackingHistory) {
      shipment.trackingHistory = [];
    }

    shipment.trackingHistory.push({
      status,
      location,
      timestamp: new Date(timestamp),
    });

    await shipment.save();

    // Update and notify order
    const order = await Order.findById(shipment.orderId)
      .populate('userId', 'email name');

    if (order && order.userId) {
      if (status === 'delivered' && order.status !== 'delivered') {
        order.status = 'delivered';
        order.deliveredAt = new Date();
        await order.save();

        try {
          await OrderNotificationService.notifyShipmentDelivered(
            shipment,
            order,
            order.userId
          );
        } catch (emailError) {
          logger.error(
            `Failed to send delivery notification: ${emailError.message}`
          );
        }
      } else if (status !== oldStatus) {
        try {
          await OrderNotificationService.notifyTrackingUpdate(
            shipment,
            order,
            order.userId,
            oldStatus
          );
        } catch (emailError) {
          logger.error(
            `Failed to send tracking notification: ${emailError.message}`
          );
        }
      }
    }

    logger.info(`Fulfillment shipment status updated: ${trackingNumber} -> ${status}`);

    res.json({
      success: true,
      message: 'Shipment status updated',
      trackingNumber,
      status,
    });
  } catch (error) {
    logger.error(`Fulfillment shipment-status webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to update shipment status' });
  }
});

/**
 * POST /webhooks/fulfillment/return-received
 * Fulfillment provider acknowledges returned items
 * Body: { returnId, trackingNumber, receivedAt, itemsReceived, condition, ... }
 */
router.post('/return-received', async (req, res) => {
  try {
    const {
      returnId,
      trackingNumber,
      receivedAt,
      itemsReceived,
      condition,
    } = req.body;

    // Find return request
    const Return = require('../models/Return');
    const returnRequest = await Return.findById(returnId)
      .populate({
        path: 'orderId',
        populate: { path: 'userId', select: 'email name' },
      });

    if (!returnRequest) {
      logger.warn(`Return received webhook for unknown return: ${returnId}`);
      return res.status(404).json({ error: 'Return not found' });
    }

    // Update return
    returnRequest.status = 'received';
    returnRequest.receivedAt = new Date(receivedAt);
    returnRequest.receivedItems = itemsReceived;
    returnRequest.itemsCondition = condition;

    await returnRequest.save();

    // Trigger refund processing
    const ReturnService = require('../services/ReturnService');
    try {
      await ReturnService.processReturnRefund(returnId);
    } catch (refundError) {
      logger.error(`Failed to process return refund: ${refundError.message}`);
    }

    logger.info(`Return received: ${returnId} via fulfillment webhook`);

    res.json({
      success: true,
      message: 'Return acknowledged',
      returnId,
      status: 'received',
    });
  } catch (error) {
    logger.error(`Fulfillment return-received webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to process return receipt' });
  }
});

/**
 * POST /webhooks/fulfillment/inventory-update
 * Fulfillment provider updates inventory levels
 * Body: { sku, warehouseId, quantity, reserved, available, ... }
 */
router.post('/inventory-update', async (req, res) => {
  try {
    const {
      sku,
      warehouseId,
      quantity,
      reserved,
      available,
      timestamp,
    } = req.body;

    const Product = require('../models/Product');
    const InventoryManagement = require('../models/InventoryManagement');

    // Update inventory record
    let inventory = await InventoryManagement.findOne({ sku, warehouseId });

    if (!inventory) {
      inventory = new InventoryManagement({
        sku,
        warehouseId,
        totalQuantity: quantity,
        reserved,
        available,
        lastSyncAt: new Date(timestamp),
      });
    } else {
      inventory.totalQuantity = quantity;
      inventory.reserved = reserved;
      inventory.available = available;
      inventory.lastSyncAt = new Date(timestamp);
    }

    await inventory.save();

    logger.info(`Inventory updated: ${sku} at warehouse ${warehouseId}`);

    res.json({
      success: true,
      message: 'Inventory updated',
      sku,
      available,
    });
  } catch (error) {
    logger.error(`Fulfillment inventory-update webhook failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

module.exports = router;
