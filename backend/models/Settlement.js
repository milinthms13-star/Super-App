const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema(
  {
    settlementId: {
      type: String,
      unique: true,
      required: true,
      default: () => `settlement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    // Vendor information
    vendorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    vendorName: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },

    // Settlement period
    periodStartDate: {
      type: Date,
      required: true,
      index: true,
    },
    periodEndDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Financial summary
    summary: {
      totalOrderCount: {
        type: Number,
        default: 0,
      },
      deliveredOrderCount: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
        min: 0,
      },
      platformCommission: {
        type: Number,
        default: 0,
        min: 0,
      },
      commissionPercentage: {
        type: Number,
        default: 15, // 15% default
        min: 0,
        max: 100,
      },
      netPayable: {
        type: Number,
        default: 0,
        min: 0,
      },
      deductions: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Order details included in this settlement
    orders: [
      {
        orderId: String,
        orderDate: Date,
        customerEmail: String,
        itemCount: Number,
        itemRevenue: Number, // Revenue from items in this order (for this vendor)
        commissionAmount: Number,
        netPayable: Number,
        status: String, // Order fulfillment status at settlement time
      },
    ],

    // Settlement status
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed', 'OnHold'],
      default: 'Pending',
      index: true,
    },

    // Payment details
    payment: {
      method: {
        type: String,
        enum: ['bank_transfer', 'wallet_credit', 'check', 'manual'],
        default: null,
      },
      accountDetails: {
        type: mongoose.Schema.Types.Mixed, // { accountNumber, ifsc, bankName, accountHolder }
        default: null,
      },
      transactionId: {
        type: String,
        default: null,
      },
      completedAt: {
        type: Date,
        default: null,
      },
      notes: {
        type: String,
        default: '',
        trim: true,
      },
    },

    // Admin notes
    adminNotes: {
      type: String,
      default: '',
      trim: true,
    },

    // Audit trail
    createdBy: {
      type: String, // admin email or system
      default: 'system',
    },
    processedBy: {
      type: String, // admin email who processed the settlement
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for common queries
SettlementSchema.index({ vendorEmail: 1, status: 1 });
SettlementSchema.index({ vendorEmail: 1, periodStartDate: 1, periodEndDate: 1 });
SettlementSchema.index({ status: 1, periodEndDate: 1 });

module.exports = mongoose.model('Settlement', SettlementSchema);
