/**
 * Order Tracking Model - Phase 9 Feature A
 * Real-time order tracking, status updates, delivery timeline
 */

const mongoose = require('mongoose');

const OrderTrackingSchema = new mongoose.Schema(
  {
    trackingId: { type: String, unique: true, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },

    // Order Status Timeline
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'confirmed',
        'preparing',
        'ready',
        'picked_up',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'failed',
      ],
      default: 'placed',
    },
    statusTimeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        location: {
          latitude: Number,
          longitude: Number,
          address: String,
        },
        notes: String,
        updatedBy: { type: String, enum: ['system', 'restaurant', 'delivery_partner', 'user'] },
      },
    ],

    // Delivery Tracking
    deliveryTracking: {
      assignedAt: Date,
      pickedUpAt: Date,
      outForDeliveryAt: Date,
      estimatedDeliveryTime: Date,
      actualDeliveryTime: Date,
      deliveryDuration: Number, // in minutes
      deliveryDistance: Number, // in km
      currentLocation: {
        latitude: Number,
        longitude: Number,
        updatedAt: { type: Date, default: Date.now },
        accuracy: Number, // in meters
      },
      routeOptimized: { type: Boolean, default: false },
      alternateRoutes: [
        {
          routeId: String,
          distance: Number,
          estimatedTime: Number,
          trafficCondition: String, // light, moderate, heavy
        },
      ],
    },

    // Preparation Tracking
    preparationTracking: {
      startedAt: Date,
      estimatedReadyTime: Date,
      actualReadyTime: Date,
      preparationDuration: Number, // in minutes
      items: [
        {
          itemId: String,
          itemName: String,
          status: { type: String, enum: ['pending', 'preparing', 'ready', 'packed'] },
          startedAt: Date,
          completedAt: Date,
        },
      ],
      specialInstructions: String,
    },

    // Real-time Notifications
    notifications: [
      {
        notificationId: String,
        type: {
          type: String,
          enum: [
            'order_confirmed',
            'order_preparing',
            'order_ready',
            'order_picked',
            'delivery_assigned',
            'delivery_on_way',
            'delivery_arriving',
            'delivery_completed',
            'delivery_delayed',
            'delivery_issue',
          ],
        },
        message: String,
        sentAt: { type: Date, default: Date.now },
        delivered: { type: Boolean, default: false },
        deliveredAt: Date,
        read: { type: Boolean, default: false },
        readAt: Date,
      },
    ],

    // Estimated Times
    estimatedTimes: {
      preparationTime: Number, // minutes
      pickupTime: Number, // minutes (from confirmation)
      deliveryTime: Number, // minutes (from pickup)
      totalTime: Number, // minutes (from order to delivery)
      confidence: { type: Number, min: 0, max: 1 }, // 0-1 confidence score
    },

    // Issues & Delays
    issues: [
      {
        issueId: String,
        type: {
          type: String,
          enum: [
            'restaurant_delay',
            'traffic_delay',
            'partner_issue',
            'weather_delay',
            'item_unavailable',
            'quality_issue',
          ],
        },
        description: String,
        reportedAt: Date,
        resolvedAt: Date,
        resolution: String,
        compensation: {
          type: { type: String, enum: ['refund', 'credit', 'discount', 'replacement'] },
          amount: Number,
        },
      },
    ],

    // Quality Metrics
    qualityMetrics: {
      onTimeDelivery: { type: Boolean, default: null },
      delayMinutes: { type: Number, default: 0 },
      foodTemperature: { type: String, enum: ['hot', 'warm', 'cold', 'unknown'] },
      packagingIntegrity: { type: String, enum: ['intact', 'minor_damage', 'damaged', 'unknown'] },
      completeness: { type: String, enum: ['complete', 'missing_items', 'extra_items', 'unknown'] },
    },

    // Communication
    communications: [
      {
        communicationId: String,
        type: { type: String, enum: ['chat', 'call', 'sms', 'push'] },
        initiatedBy: { type: String, enum: ['user', 'delivery_partner', 'restaurant', 'system'] },
        content: String,
        sentAt: Date,
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    // Refunds & Cancellations
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancelledBy: { type: String, enum: ['user', 'restaurant', 'delivery_partner', 'system'] },
      cancelledAt: Date,
      reason: String,
      refundStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
      refundAmount: Number,
      refundInitiatedAt: Date,
      refundCompletedAt: Date,
    },

    // Batch Tracking (for group orders)
    batchTracking: {
      batchId: String,
      totalOrdersInBatch: Number,
      currentOrderNumber: Number,
      estimatedBatchDeliveryTime: Date,
    },

    status: { type: String, enum: ['active', 'completed', 'cancelled', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'ordertracks' }
);

// Indexes for performance
OrderTrackingSchema.index({ orderId: 1, status: 1 });
OrderTrackingSchema.index({ userId: 1, createdAt: -1 });
OrderTrackingSchema.index({ deliveryPartnerId: 1, orderStatus: 1 });
OrderTrackingSchema.index({ 'deliveryTracking.currentLocation': '2dsphere' });
OrderTrackingSchema.index({ trackingId: 1 });
OrderTrackingSchema.index({ status: 1, createdAt: -1 });

// Instance Methods
OrderTrackingSchema.methods.updateOrderStatus = function (newStatus, location, notes, updatedBy) {
  this.orderStatus = newStatus;
  this.statusTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    location,
    notes,
    updatedBy,
  });
  return this.save();
};

OrderTrackingSchema.methods.updateCurrentLocation = function (latitude, longitude, accuracy) {
  if (this.deliveryTracking) {
    this.deliveryTracking.currentLocation = {
      latitude,
      longitude,
      updatedAt: new Date(),
      accuracy,
    };
  }
  return this.save();
};

OrderTrackingSchema.methods.addNotification = function (type, message) {
  this.notifications.push({
    notificationId: `notif_${Date.now()}_${Math.random()}`,
    type,
    message,
    sentAt: new Date(),
  });
  return this.save();
};

OrderTrackingSchema.methods.markNotificationRead = function (notificationId) {
  const notif = this.notifications.find((n) => n.notificationId === notificationId);
  if (notif) {
    notif.read = true;
    notif.readAt = new Date();
  }
  return this.save();
};

OrderTrackingSchema.methods.reportIssue = function (issueType, description) {
  this.issues.push({
    issueId: `issue_${Date.now()}`,
    type: issueType,
    description,
    reportedAt: new Date(),
  });
  return this.save();
};

module.exports = mongoose.model('OrderTracking', OrderTrackingSchema);
