/**
 * FulfillmentService.js
 * Phase 5E - Order fulfillment, shipping, and tracking management
 */

const Order = require('../models/Order');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const EmailNotificationService = require('./EmailNotificationService');
const CarrierIntegrationService = require('./CarrierIntegrationService');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

class FulfillmentService {
  static instance;

  static getInstance() {
    if (!this.instance) {
      this.instance = new FulfillmentService();
    }
    return this.instance;
  }

  /**
   * Create shipment for order
   */
  async createShipment(orderId, items, shippingMethod = 'standard', trackingNumber = null) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const shipmentId = `SHP_${Date.now()}_${randomUUID().split('-')[0].toUpperCase()}`;

      const shipment = new Shipment({
        shipmentId,
        orderId,
        items,
        shippingMethod,
        trackingNumber: trackingNumber || this.generateTrackingNumber(),
        status: 'pending',
        estimatedDelivery: this.calculateEstimatedDelivery(shippingMethod),
        createdAt: new Date(),
      });

      await shipment.save();

      // Update order status
      order.shipmentId = shipment._id;
      order.status = 'Shipped';
      order.shippedAt = new Date();
      await order.save();

      // Send notification
      await Notification.create({
        userId: order.userId,
        type: 'order_shipped',
        title: 'Order Shipped!',
        message: `Your order is on its way! Tracking number: ${shipment.trackingNumber}`,
        data: {
          orderId,
          shipmentId,
          trackingNumber: shipment.trackingNumber,
        },
      });

      logger.info(`Shipment created: ${shipmentId} for order ${orderId}`);

      return shipment;
    } catch (error) {
      logger.error('Error creating shipment:', error);
      throw error;
    }
  }

  /**
   * Update shipment tracking status
   */
  async updateShipmentStatus(trackingNumber, status, location = '', timestamp = null) {
    try {
      const shipment = await Shipment.findOne({ trackingNumber });
      if (!shipment) {
        throw new Error('Shipment not found');
      }

      // Add to tracking history
      shipment.trackingHistory = shipment.trackingHistory || [];
      shipment.trackingHistory.push({
        status,
        location,
        timestamp: timestamp || new Date(),
      });

      shipment.currentLocation = location;
      shipment.lastUpdated = new Date();

      // Check if delivered
      if (status === 'delivered' || status === 'Delivered') {
        shipment.status = 'delivered';
        shipment.deliveredAt = new Date();

        // Update order status
        const order = await Order.findById(shipment.orderId);
        if (order) {
          order.status = 'Delivered';
          order.deliveredAt = new Date();
          await order.save();
        }

        // Send delivery notification
        await Notification.create({
          userId: order.userId,
          type: 'order_delivered',
          title: 'Order Delivered!',
          message: 'Your order has been delivered. Thank you for your purchase!',
          data: { orderId: shipment.orderId },
        });
      } else if (status === 'out_for_delivery' || status === 'Out for Delivery') {
        shipment.status = 'out_for_delivery';

        // Send out for delivery notification
        const order = await Order.findById(shipment.orderId);
        if (order) {
          await Notification.create({
            userId: order.userId,
            type: 'order_out_for_delivery',
            title: 'Out for Delivery',
            message: 'Your order is out for delivery today!',
            data: { orderId: shipment.orderId },
          });
        }
      }

      await shipment.save();

      logger.info(`Shipment ${trackingNumber} status updated: ${status}`);

      return shipment;
    } catch (error) {
      logger.error('Error updating shipment status:', error);
      throw error;
    }
  }

  /**
   * Get shipment tracking details
   */
  async getShipmentTracking(trackingNumber, orderId = null) {
    try {
      const query = { trackingNumber };
      if (orderId) {
        query.orderId = orderId;
      }

      const shipment = await Shipment.findOne(query);
      if (!shipment) {
        throw new Error('Shipment not found');
      }

      return {
        shipmentId: shipment.shipmentId,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        currentLocation: shipment.currentLocation,
        estimatedDelivery: shipment.estimatedDelivery,
        shippingMethod: shipment.shippingMethod,
        trackingHistory: shipment.trackingHistory || [],
        createdAt: shipment.createdAt,
        deliveredAt: shipment.deliveredAt,
      };
    } catch (error) {
      logger.error('Error fetching shipment tracking:', error);
      throw error;
    }
  }

  /**
   * Get order tracking (unified view)
   */
  async getOrderTracking(orderId, userId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized');
      }

      const shipment = await Shipment.findOne({ orderId });

      return {
        orderId,
        orderStatus: order.status,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        shipment: shipment ? {
          shipmentId: shipment.shipmentId,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          currentLocation: shipment.currentLocation,
          estimatedDelivery: shipment.estimatedDelivery,
          trackingHistory: shipment.trackingHistory || [],
        } : null,
        timeline: await this.buildOrderTimeline(order, shipment),
      };
    } catch (error) {
      logger.error('Error fetching order tracking:', error);
      throw error;
    }
  }

  /**
   * Build order timeline
   */
  async buildOrderTimeline(order, shipment) {
    try {
      const timeline = [];

      // Order confirmed
      timeline.push({
        stage: 'Confirmed',
        status: 'completed',
        timestamp: order.createdAt,
        icon: '✓',
      });

      // Processing
      const processingDate = new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000);
      timeline.push({
        stage: 'Processing',
        status: ['Processing', 'Shipped', 'Delivered'].includes(order.status) ? 'completed' : 'pending',
        timestamp: processingDate,
        icon: '📦',
      });

      // Shipped
      if (shipment) {
        timeline.push({
          stage: 'Shipped',
          status: ['Shipped', 'Delivered'].includes(order.status) ? 'completed' : 'pending',
          timestamp: shipment.createdAt,
          trackingNumber: shipment.trackingNumber,
          icon: '🚚',
        });
      }

      // Out for delivery
      if (shipment && shipment.trackingHistory) {
        const outForDelivery = shipment.trackingHistory.find(
          h => h.status.toLowerCase().includes('out') || h.status.toLowerCase().includes('delivery')
        );
        if (outForDelivery) {
          timeline.push({
            stage: 'Out for Delivery',
            status: order.status === 'Delivered' ? 'completed' : 'in_progress',
            timestamp: outForDelivery.timestamp,
            location: outForDelivery.location,
            icon: '🏘️',
          });
        }
      }

      // Delivered
      if (order.status === 'Delivered') {
        timeline.push({
          stage: 'Delivered',
          status: 'completed',
          timestamp: order.deliveredAt || shipment?.deliveredAt || new Date(),
          icon: '🏠',
        });
      }

      return timeline;
    } catch (error) {
      logger.error('Error building order timeline:', error);
      return [];
    }
  }

  /**
   * Generate tracking number
   */
  generateTrackingNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK${timestamp}${random}`;
  }

  /**
   * Calculate estimated delivery date
   */
  calculateEstimatedDelivery(shippingMethod) {
    const deliveryDays = {
      'standard': 5,
      'express': 2,
      'overnight': 1,
      'scheduled': 7,
    };

    const days = deliveryDays[shippingMethod] || 5;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + days);

    return estimatedDate;
  }

  /**
   * Sync shipment status from carrier (mock implementation)
   */
  async syncShipmentFromCarrier(trackingNumber) {
    try {
      // This would call carrier API (Shiprocket, DHL, etc.)
      // For now, returning mock data
      const mockStatus = {
        status: 'in_transit',
        location: 'Mumbai Distribution Center',
        timestamp: new Date(),
      };

      await this.updateShipmentStatus(
        trackingNumber,
        mockStatus.status,
        mockStatus.location,
        mockStatus.timestamp
      );

      return mockStatus;
    } catch (error) {
      logger.error('Error syncing shipment status:', error);
      throw error;
    }
  }

  /**
   * Get shipments by status (admin)
   */
  async getShipmentsByStatus(status, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const shipments = await Shipment.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('shipmentId trackingNumber status currentLocation estimatedDelivery createdAt');

      const total = await Shipment.countDocuments({ status });

      return {
        shipments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Error fetching shipments by status:', error);
      throw error;
    }
  }

  /**
   * Get fulfillment statistics
   */
  async getFulfillmentStats(dateFrom, dateTo) {
    try {
      const stats = await Shipment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(dateFrom),
              $lte: new Date(dateTo),
            },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const totalShipments = stats.reduce((sum, stat) => sum + stat.count, 0);

      return {
        byStatus: stats,
        totalShipments,
        period: { from: dateFrom, to: dateTo },
      };
    } catch (error) {
      logger.error('Error fetching fulfillment stats:', error);
      throw error;
    }
  }

  /**
   * Process bulk shipment creation (admin)
   */
  async processBulkShipments(shipmentData) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const data of shipmentData) {
        try {
          await this.createShipment(
            data.orderId,
            data.items,
            data.shippingMethod,
            data.trackingNumber
          );
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            orderId: data.orderId,
            error: error.message,
          });
        }
      }

      logger.info(`Bulk shipment processing: ${results.success} success, ${results.failed} failed`);

      return results;
    } catch (error) {
      logger.error('Error processing bulk shipments:', error);
      throw error;
    }
  }
}

module.exports = FulfillmentService.getInstance();
