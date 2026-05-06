const mongoose = require('mongoose');

const InventoryAlertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
      required: true,
      default: () => `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productSku: {
      type: String,
      default: '',
      trim: true,
    },

    // Seller information
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sellerName: {
      type: String,
      default: '',
      trim: true,
    },

    // Alert rules
    alertType: {
      type: String,
      enum: ['low_stock', 'out_of_stock', 'overstock'],
      required: true,
      index: true,
    },
    threshold: {
      type: Number,
      required: true,
      min: 0,
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // Alert configuration
    settings: {
      enabled: {
        type: Boolean,
        default: true,
      },
      notifyThreshold: {
        type: Number,
        required: true,
        min: 0,
      },
      reorderQuantity: {
        type: Number,
        default: 0,
        min: 0,
      },
      maxStockLevel: {
        type: Number,
        default: null,
        min: 0,
      },
      leadTimeDays: {
        type: Number,
        default: 7,
        min: 1,
      },
    },

    // Alert status
    status: {
      type: String,
      enum: ['active', 'resolved', 'ignored', 'suppressed'],
      default: 'active',
      index: true,
    },
    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Contains: { action, quantity, reason }
    },

    // Notifications sent
    notifications: [
      {
        sentAt: Date,
        channel: {
          type: String,
          enum: ['dashboard', 'email', 'sms', 'whatsapp'],
          default: 'dashboard',
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed'],
          default: 'pending',
        },
        acknowledgedAt: Date,
        acknowledgedBy: String,
      },
    ],

    // Suggestions
    suggestions: [
      {
        action: String, // e.g., 'reorder', 'promote', 'discount'
        details: String,
        estimatedImpact: String,
      },
    ],

    // Metadata
    category: {
      type: String,
      default: '',
      trim: true,
    },
    profitMargin: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastRestockDate: {
      type: Date,
      default: null,
    },
    averageDailySales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InventoryAlertSchema.index({ sellerEmail: 1, status: 1 });
InventoryAlertSchema.index({ productId: 1, alertType: 1 });
InventoryAlertSchema.index({ triggeredAt: 1, status: 1 });

module.exports = mongoose.model('InventoryAlert', InventoryAlertSchema);
