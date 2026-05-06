const mongoose = require('mongoose');

const AbandonedCartSchema = new mongoose.Schema(
  {
    cartId: {
      type: String,
      unique: true,
      required: true,
      default: () => `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },

    // Cart items and totals at abandonment
    items: [
      {
        productId: String,
        productName: String,
        quantity: Number,
        price: Number,
        sellerEmail: String,
        sellerName: String,
      },
    ],
    cartValue: {
      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      deliveryFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Abandonment tracking
    abandonedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    recoveryAttempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // Reminder status
    reminders: [
      {
        sentAt: Date,
        channel: {
          type: String,
          enum: ['email', 'sms', 'whatsapp', 'push'],
          default: 'email',
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'opened', 'clicked'],
          default: 'pending',
        },
        recipientAddress: String, // Email, phone, or push token
        openedAt: Date,
        clickedAt: Date,
        conversionUrl: String,
        notes: String,
      },
    ],

    // Recovery status
    status: {
      type: String,
      enum: ['abandoned', 'recovered', 'expired', 'cancelled'],
      default: 'abandoned',
      index: true,
    },
    recoveredAt: {
      type: Date,
      default: null,
    },
    recoveryOrderId: {
      type: String,
      default: null,
    },

    // Incentive
    incentive: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Contains: { couponCode, discount, validUntil }
    },

    // Metadata
    source: {
      type: String,
      enum: ['web', 'mobile', 'app'],
      default: 'web',
    },
    deviceInfo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for queries
AbandonedCartSchema.index({ customerEmail: 1, status: 1 });
AbandonedCartSchema.index({ abandonedAt: 1, status: 1 });
AbandonedCartSchema.index({ recoveryAttempts: 1, status: 1 });

module.exports = mongoose.model('AbandonedCart', AbandonedCartSchema);
