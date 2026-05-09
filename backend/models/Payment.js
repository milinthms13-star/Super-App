/**
 * Payment Model - Phase 11 Payment Processing
 * Core payment transaction and lifecycle management
 */

const { Schema } = require('mongoose');

const paymentSchema = new Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cod', 'bank_transfer'],
      index: true,
    },
    paymentGateway: {
      type: String,
      enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'wallet', 'cod', 'none'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'initiated', 'processing', 'captured', 'failed', 'cancelled', 'refunded', 'partial_refund'],
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    gatewayTransactionId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    gatewayOrderId: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    paymentDetails: {
      cardLast4: String,
      cardNetwork: String, // Visa, Mastercard, Amex
      cardExpiry: String,
      cardHolder: String,
      upiId: String,
      bankName: String,
      accountLast4: String,
      walletId: String,
      walletProvider: String,
      metadata: Schema.Types.Mixed,
    },
    riskAssessment: {
      riskScore: { type: Number, default: 0, min: 0, max: 100 },
      riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
      assessedAt: Date,
      flaggedReason: String,
      requiresVerification: { type: Boolean, default: false },
      verificationMethod: String, // otp, 3ds, kyc, manual
      verificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
    },
    reconciliation: {
      reconciled: { type: Boolean, default: false },
      reconciledAt: Date,
      reconciledBy: String,
      gatewaySettledAmount: Number,
      settlementDate: Date,
      settlementReference: String,
      discrepancyReason: String,
      discrepancyAmount: Number,
      autoReconciled: { type: Boolean, default: false },
    },
    fees: {
      gatewayFee: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      totalCharged: { type: Number, required: true },
      feeBreakdown: [
        {
          feeType: String,
          feeAmount: Number,
          feePercentage: Number,
          description: String,
        },
      ],
    },
    refund: {
      refundId: String,
      refundAmount: Number,
      refundReason: String,
      refundInitiatedAt: Date,
      refundCompletedAt: Date,
      refundStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'] },
      refundMethod: String,
      refundedToWallet: { type: Boolean, default: false },
      refundReference: String,
      autoRefund: { type: Boolean, default: false },
    },
    settlementInfo: {
      settlementCycle: String, // daily, weekly, monthly
      nextSettlementDate: Date,
      settled: { type: Boolean, default: false },
      settledAmount: Number,
      settlementDeductions: Number,
      settlementReferenceId: String,
    },
    dispute: {
      disputed: { type: Boolean, default: false },
      disputeReason: String,
      disputeInitiatedAt: Date,
      disputeStatus: { type: String, enum: ['raised', 'investigating', 'resolved', 'chargeback'] },
      disputeEvidenceFiles: [String],
      resolutionNotes: String,
    },
    metadata: {
      deviceInfo: {
        deviceId: String,
        deviceType: String,
        userAgent: String,
        ipAddress: String,
      },
      orderDetails: {
        orderAmount: Number,
        discountApplied: Number,
        taxAmount: Number,
        deliveryFee: Number,
        tipsAmount: Number,
      },
      customerInfo: {
        email: String,
        phone: String,
        savedCard: Boolean,
        firstTimePayment: Boolean,
      },
    },
    auditLog: [
      {
        timestamp: Date,
        action: String,
        details: Schema.Types.Mixed,
        performedBy: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ paymentMethod: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ gatewayTransactionId: 1 });

paymentSchema.methods.isPaymentSuccess = function () {
  return this.status === 'captured' || this.status === 'refunded' || this.status === 'partial_refund';
};

paymentSchema.methods.isPaymentFailed = function () {
  return this.status === 'failed' || this.status === 'cancelled';
};

paymentSchema.methods.canBeRefunded = function () {
  return this.isPaymentSuccess() && !this.refund.refundId;
};

paymentSchema.methods.isPending = function () {
  return this.status === 'pending' || this.status === 'initiated' || this.status === 'processing';
};

module.exports = require('mongoose').model('Payment', paymentSchema);
