const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    // Order Reference
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryOrder',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Payment Details
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'wallet', 'cod'],
      required: true,
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'paypal', 'stripe', 'internal'],
      default: 'razorpay',
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      sparse: true,
    },

    // Amount Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR'],
    },
    breakup: {
      subtotal: { type: Number, required: true },
      deliveryFee: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      walletUsed: { type: Number, default: 0 },
      tip: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    // Payment Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        reason: String,
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    // UPI Details (if applicable)
    upi: {
      vpa: String,
      provider: String, // google_pay, phonepe, paytm, etc.
    },

    // Card Details (if applicable)
    card: {
      last4: String,
      brand: String, // visa, mastercard, amex
      network: String,
      expiryMonth: Number,
      expiryYear: Number,
      cardHash: String, // Encrypted card hash (never store full card)
    },

    // Net Banking Details
    netbanking: {
      bank: String,
      accountNumber: String,
    },

    // Wallet Payment Details
    walletPayment: {
      walletId: mongoose.Schema.Types.ObjectId,
      walletUsedAmount: Number,
      remainingBalance: Number,
    },

    // COD Details
    cod: {
      payableAmount: Number,
      collectionMethod: String, // cash, upi, card
      collectionStatus: {
        type: String,
        enum: ['pending', 'collected', 'failed', 'partial'],
        default: 'pending',
      },
      collectionTimestamp: Date,
      collectedAmount: Number,
    },

    // Payment Metadata
    metadata: {
      ip: String,
      userAgent: String,
      deviceId: String,
      location: {
        latitude: Number,
        longitude: Number,
      },
    },

    // Fraud Detection
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    fraudFlags: [
      {
        type: String,
        enum: ['high_amount', 'unusual_time', 'new_card', 'velocity_check', 'location_mismatch'],
      },
    ],

    // Payment Confirmation
    paymentConfirmed: {
      type: Boolean,
      default: false,
    },
    confirmationTimestamp: Date,
    receiptUrl: String,

    // Retry Information
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryTimestamp: Date,
    nextRetryAt: Date,

    // Reconciliation
    reconciled: {
      type: Boolean,
      default: false,
    },
    reconciledAt: Date,
    reconciledBy: mongoose.Schema.Types.ObjectId,

    // Timestamps
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    authorizedAt: Date,
    capturedAt: Date,
    settledAt: Date,

    // Additional Info
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Is payment successful
PaymentSchema.virtual('isSuccessful').get(function () {
  return this.status === 'success';
});

// Virtual: Is payment refundable
PaymentSchema.virtual('isRefundable').get(function () {
  return this.status === 'success' || this.status === 'pending';
});

// Virtual: Payment age in seconds
PaymentSchema.virtual('ageInSeconds').get(function () {
  return (Date.now() - this.initiatedAt) / 1000;
});

// Method: Add status update
PaymentSchema.methods.addStatusUpdate = function (status, reason = '', metadata = {}) {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    reason,
    metadata,
  });
  this.status = status;
};

// Method: Mark as authorized
PaymentSchema.methods.markAuthorized = function () {
  this.authorizedAt = new Date();
  this.addStatusUpdate('processing', 'Payment authorized');
};

// Method: Capture payment
PaymentSchema.methods.capture = function () {
  this.capturedAt = new Date();
  this.status = 'success';
  this.paymentConfirmed = true;
  this.confirmationTimestamp = new Date();
  this.addStatusUpdate('success', 'Payment captured successfully');
};

// Method: Mark failed
PaymentSchema.methods.markFailed = function (reason = '') {
  this.status = 'failed';
  this.addStatusUpdate('failed', reason);
};

// Method: Get payment summary
PaymentSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    transactionId: this.transactionId,
    orderId: this.orderId,
    amount: this.amount,
    paymentMethod: this.paymentMethod,
    status: this.status,
    initiatedAt: this.initiatedAt,
    capturedAt: this.capturedAt,
    isSuccessful: this.isSuccessful,
    receiptUrl: this.receiptUrl,
  };
};

// Method: Mask sensitive data
PaymentSchema.methods.maskSensitiveData = function () {
  const sanitized = this.toObject();
  if (sanitized.card) {
    sanitized.card = {
      last4: this.card.last4,
      brand: this.card.brand,
    };
  }
  if (sanitized.upi) {
    const [name, provider] = (sanitized.upi.vpa || '').split('@');
    sanitized.upi = {
      vpa: name ? `${name[0]}***@${provider}` : '***',
    };
  }
  if (sanitized.netbanking) {
    sanitized.netbanking = {
      bank: this.netbanking.bank,
      accountNumber: this.netbanking.accountNumber
        ? `***${this.netbanking.accountNumber.slice(-4)}`
        : '***',
    };
  }
  delete sanitized.metadata;
  return sanitized;
};

// Indexes
PaymentSchema.index({ userId: 1, initiatedAt: -1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1, initiatedAt: -1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ 'card.last4': 1, userId: 1 });
PaymentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL for old records

module.exports = mongoose.model('FoodDeliveryPayment', PaymentSchema);
