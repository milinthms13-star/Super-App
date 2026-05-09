/**
 * Shipment.js
 * Phase 5E - Shipment tracking model
 */

const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'scheduled'],
      default: 'standard',
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    carrier: {
      type: String,
      enum: ['domestic', 'international', 'local'],
      default: 'domestic',
    },
    status: {
      type: String,
      enum: ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'returned'],
      default: 'pending',
      index: true,
    },
    currentLocation: {
      type: String,
      default: null,
    },
    estimatedDelivery: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    shippedAt: Date,
    deliveredAt: Date,
    trackingHistory: [
      {
        status: String,
        location: String,
        timestamp: Date,
      },
    ],
    lastUpdated: Date,
    shippingAddress: {
      name: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
  },
  { timestamps: true }
);

// Indexes
shipmentSchema.index({ orderId: 1, createdAt: -1 });
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
