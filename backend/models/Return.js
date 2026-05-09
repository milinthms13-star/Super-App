/**
 * Return.js
 * Phase 5E - Return/RMA model
 */

const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    returnId: {
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'defective',
        'not_as_described',
        'wrong_item',
        'damaged_in_shipping',
        'changed_mind',
        'not_needed',
        'other',
      ],
      required: true,
    },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        condition: {
          type: String,
          enum: ['unopened', 'opened', 'used', 'damaged'],
          default: 'unopened',
        },
      },
    ],
    comments: String,
    status: {
      type: String,
      enum: ['initiated', 'approved', 'rejected', 'received', 'refunded'],
      default: 'initiated',
      index: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    receivedAt: Date,
    receivedItems: mongoose.Schema.Types.Mixed,
    refundedAt: Date,
    refundAmount: Number,
    refundTransactionId: String,
    shippingLabel: {
      labelId: String,
      shipmentType: String,
      trackingNumber: String,
      expiryDate: Date,
    },
    labelGeneratedAt: Date,
    adminNotes: String,
    metadata: {
      daysSinceDelivery: Number,
      refundable: Boolean,
      deductionAmount: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// Indexes
returnSchema.index({ orderId: 1 });
returnSchema.index({ userId: 1, status: 1 });
returnSchema.index({ initiatedAt: -1 });
returnSchema.index({ returnId: 1 });

module.exports = mongoose.model('Return', returnSchema);
