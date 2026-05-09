/**
 * Payment Link Model - Phase 12
 * Shareable payment links with tracking
 */

const mongoose = require('mongoose');

const paymentLinkSchema = new mongoose.Schema(
  {
    linkId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    linkToken: {
      type: String,
      unique: true,
      required: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    createdByType: {
      type: String,
      enum: ['restaurant', 'admin', 'user'],
      required: true,
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    description: String,
    purpose: {
      type: String,
      enum: ['order_payment', 'invoice_payment', 'subscription', 'refund', 'adjustment', 'custom'],
      default: 'custom',
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    linkedOrderId: String,
    linkedInvoiceId: String,
    linkedSubscriptionId: String,
    linkedUserId: String,
    linkedRestaurantId: String,
    allowPartialPayment: {
      type: Boolean,
      default: false,
    },
    acceptedPaymentMethods: [
      {
        type: String,
        enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet'],
      },
    ],
    acceptedGateways: [String],
    customizations: {
      headerImage: String,
      displayName: String,
      shortDescription: String,
      customMessage: String,
    },
    qrCode: {
      enabled: {
        type: Boolean,
        default: true,
      },
      imageUrl: String,
      generatedAt: Date,
    },
    analytics: {
      viewCount: {
        type: Number,
        default: 0,
      },
      clickCount: {
        type: Number,
        default: 0,
      },
      paymentInitiatedCount: {
        type: Number,
        default: 0,
      },
      successfulPaymentCount: {
        type: Number,
        default: 0,
      },
      totalAmountPaid: {
        type: Number,
        default: 0,
      },
      lastViewedAt: Date,
      lastClickedAt: Date,
    },
    paymentHistory: [
      {
        paymentId: String,
        amount: Number,
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed'],
        },
        paymentDate: Date,
        paymentMethod: String,
        transactionId: String,
      },
    ],
    shareInfo: {
      sharedVia: [
        {
          method: {
            type: String,
            enum: ['email', 'sms', 'whatsapp', 'link_copy', 'qr_scan'],
          },
          sharedAt: Date,
          sharedWith: String,
        },
      ],
    },
    metadata: {
      tags: [String],
      customFields: mongoose.Schema.Types.Mixed,
    },
    notificationSettings: {
      sendOnView: Boolean,
      sendOnClick: Boolean,
      sendOnExpiry: Boolean,
      sendOnPayment: Boolean,
    },
    auditTrail: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'paymentLinks',
  }
);

// Indexes
paymentLinkSchema.index({ createdBy: 1, status: 1 });
paymentLinkSchema.index({ linkToken: 1 });
paymentLinkSchema.index({ expiryDate: 1, isExpired: 1 });
paymentLinkSchema.index({ linkedOrderId: 1 });
paymentLinkSchema.index({ linkedInvoiceId: 1 });

// Methods
paymentLinkSchema.methods.isActive = function () {
  return this.status === 'active' && !this.isExpired && !this.hasExpired();
};

paymentLinkSchema.methods.isUsed = function () {
  return this.status === 'used';
};

paymentLinkSchema.methods.hasExpired = function () {
  return this.expiryDate < new Date();
};

paymentLinkSchema.methods.getShareUrl = function () {
  // Construct shareable URL
  return `${process.env.APP_URL || 'http://localhost:3000'}/pay/${this.linkToken}`;
};

paymentLinkSchema.methods.trackView = function () {
  this.analytics.viewCount += 1;
  this.analytics.lastViewedAt = new Date();
};

paymentLinkSchema.methods.trackClick = function () {
  this.analytics.clickCount += 1;
  this.analytics.lastClickedAt = new Date();
};

paymentLinkSchema.methods.addPaymentRecord = function (paymentData) {
  this.paymentHistory.push({
    paymentId: paymentData.paymentId,
    amount: paymentData.amount,
    status: paymentData.status,
    paymentDate: new Date(),
    paymentMethod: paymentData.paymentMethod,
    transactionId: paymentData.transactionId,
  });
};

const PaymentLink = mongoose.model('PaymentLink', paymentLinkSchema);

module.exports = PaymentLink;
