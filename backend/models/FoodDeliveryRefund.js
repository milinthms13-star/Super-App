const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema(
  {
    // References
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryOrder',
      required: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryPayment',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Refund Details
    refundId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    gatewayRefundId: {
      type: String,
      sparse: true,
    },

    // Amount Details
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    originalAmount: {
      type: Number,
      required: true,
    },
    refundBreakup: {
      subtotal: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      walletUsed: { type: Number, default: 0 },
      tip: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    // Refund Reason
    reason: {
      type: String,
      enum: [
        'customer_request',
        'order_cancelled',
        'order_not_delivered',
        'poor_quality',
        'wrong_order',
        'restaurant_unavailable',
        'delivery_failed',
        'duplicate_charge',
        'system_error',
        'other',
      ],
      required: true,
      index: true,
    },
    reasonDescription: String,

    // Refund Status
    status: {
      type: String,
      enum: ['initiated', 'processing', 'approved', 'completed', 'failed', 'cancelled'],
      default: 'initiated',
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

    // Refund Method
    refundMethod: {
      type: String,
      enum: ['original_payment', 'wallet', 'bank_transfer'],
      default: 'original_payment',
    },

    // Refund Destination
    destination: {
      type: String, // wallet, card, bank account, etc.
      upiVpa: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },

    // Processing Details
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvalNotes: String,

    processedAt: Date,
    processedBy: String, // gateway name or system

    completedAt: Date,
    completionConfirmationId: String,

    // Rejection Details (if applicable)
    rejectedAt: Date,
    rejectionReason: String,
    rejectedBy: mongoose.Schema.Types.ObjectId,

    // Failure Details (if applicable)
    failureAt: Date,
    failureReason: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    nextRetryAt: Date,

    // Partial Refunds
    partialRefundOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRefund',
    },
    partialRefunds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodDeliveryRefund',
      },
    ],

    // Wallet Impact (if refunded to wallet)
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryWalletTransaction',
    },

    // Fraud & Risk Assessment
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    fraudFlags: [
      {
        type: String,
        enum: [
          'multiple_refunds',
          'high_amount',
          'quick_refund',
          'customer_dispute',
          'chargeback',
        ],
      },
    ],
    requiresApproval: {
      type: Boolean,
      default: false,
    },

    // Metadata
    metadata: {
      ip: String,
      userAgent: String,
      deviceId: String,
      orderValue: Number,
      daysSinceOrder: Number,
    },

    // Proof & Documentation
    proofs: [
      {
        type: String, // image URL
        description: String,
        uploadedAt: Date,
      },
    ],

    // Customer Communication
    communicationLog: [
      {
        type: String, // message/email sent
        timestamp: Date,
        channel: {
          type: String,
          enum: ['email', 'sms', 'push', 'in_app'],
        },
      },
    ],

    // Audit Trail
    auditLog: [
      {
        action: String,
        actor: mongoose.Schema.Types.ObjectId,
        timestamp: { type: Date, default: Date.now },
        changes: mongoose.Schema.Types.Mixed,
      },
    ],

    // Additional Notes
    internalNotes: String,
    customerNotes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Is refund completed
RefundSchema.virtual('isCompleted').get(function () {
  return this.status === 'completed';
});

// Virtual: Is refund pending
RefundSchema.virtual('isPending').get(function () {
  return ['initiated', 'processing', 'approved'].includes(this.status);
});

// Virtual: Days since initiated
RefundSchema.virtual('daysSinceInitiated').get(function () {
  return Math.floor((Date.now() - this.initiatedAt) / (1000 * 60 * 60 * 24));
});

// Method: Add status update
RefundSchema.methods.addStatusUpdate = function (status, reason = '', metadata = {}) {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    reason,
    metadata,
  });
  this.status = status;
};

// Method: Approve refund
RefundSchema.methods.approve = function (approvedBy, notes = '') {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approvedBy;
  this.approvalNotes = notes;
  this.addStatusUpdate('approved', notes);
};

// Method: Reject refund
RefundSchema.methods.reject = function (rejectedBy, reason) {
  this.status = 'cancelled';
  this.rejectedAt = new Date();
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.addStatusUpdate('cancelled', reason);
};

// Method: Mark processing
RefundSchema.methods.markProcessing = function (processedBy = 'system') {
  this.status = 'processing';
  this.processedAt = new Date();
  this.processedBy = processedBy;
  this.addStatusUpdate('processing', `Processing via ${processedBy}`);
};

// Method: Mark completed
RefundSchema.methods.markCompleted = function (confirmationId = '') {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completionConfirmationId = confirmationId;
  this.addStatusUpdate('completed', `Refund completed. Confirmation: ${confirmationId}`);
};

// Method: Mark failed
RefundSchema.methods.markFailed = function (reason) {
  if (this.retryCount < this.maxRetries) {
    this.status = 'processing';
    this.retryCount += 1;
    this.nextRetryAt = new Date(Date.now() + 60 * 60 * 1000); // Retry after 1 hour
    this.addStatusUpdate('processing', `Retry ${this.retryCount}/${this.maxRetries}: ${reason}`);
  } else {
    this.status = 'failed';
    this.failureAt = new Date();
    this.failureReason = reason;
    this.addStatusUpdate('failed', `Max retries exceeded: ${reason}`);
  }
};

// Method: Get refund summary
RefundSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    refundId: this.refundId,
    orderId: this.orderId,
    refundAmount: this.refundAmount,
    reason: this.reason,
    status: this.status,
    refundMethod: this.refundMethod,
    initiatedAt: this.initiatedAt,
    completedAt: this.completedAt,
    isCompleted: this.isCompleted,
    isPending: this.isPending,
  };
};

// Indexes
RefundSchema.index({ userId: 1, initiatedAt: -1 });
RefundSchema.index({ orderId: 1 });
RefundSchema.index({ paymentId: 1 });
RefundSchema.index({ status: 1, initiatedAt: -1 });
RefundSchema.index({ reason: 1 });
RefundSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 }); // 60 days TTL

module.exports = mongoose.model('FoodDeliveryRefund', RefundSchema);
