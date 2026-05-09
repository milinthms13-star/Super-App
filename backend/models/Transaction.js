/**
 * Transaction Model - Phase 11 Payment Processing
 * Detailed transaction ledger and history tracking
 */

const { Schema } = require('mongoose');

const transactionSchema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['debit', 'credit', 'reversal', 'adjustment', 'chargeback', 'dispute'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    balanceAfter: Number,
    balanceBefore: Number,
    paymentMethod: String,
    gateway: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'pending',
      index: true,
    },
    description: String,
    reference: {
      gatewayTransactionId: String,
      orderId: String,
      refundId: String,
      disputeId: String,
      customReference: String,
    },
    metadata: {
      orderId: String,
      restaurantId: String,
      deliveryPartnerId: String,
      userType: String,
      source: String,
    },
    failureInfo: {
      errorCode: String,
      errorMessage: String,
      failureReason: String,
      failureTime: Date,
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
      canRetry: { type: Boolean, default: true },
    },
    auditLog: [
      {
        timestamp: Date,
        action: String,
        performedBy: String,
        details: Schema.Types.Mixed,
      },
    ],
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'transactions',
  }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionType: 1, status: 1 });
transactionSchema.index({ paymentId: 1 });
transactionSchema.index({ orderId: 1 });

transactionSchema.methods.isCompleted = function () {
  return this.status === 'completed';
};

transactionSchema.methods.canBeRetried = function () {
  return this.status === 'failed' && this.failureInfo.retryCount < this.failureInfo.maxRetries && this.failureInfo.canRetry;
};

transactionSchema.methods.isDebit = function () {
  return this.transactionType === 'debit';
};

transactionSchema.methods.isCredit = function () {
  return this.transactionType === 'credit';
};

module.exports = require('mongoose').model('Transaction', transactionSchema);
