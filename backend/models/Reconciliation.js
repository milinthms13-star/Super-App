/**
 * Reconciliation Model - Phase 11 Payment Processing
 * Payment reconciliation and settlement tracking
 */

const { Schema } = require('mongoose');

const reconciliationSchema = new Schema(
  {
    reconciliationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    gateway: {
      type: String,
      required: true,
      enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'flutterwave', 'square', 'paypal'],
      index: true,
    },
    reconciliationType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'manual', 'custom'],
      index: true,
    },
    startDate: Date,
    endDate: Date,
    reconciliationDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'manual_review', 'approved'],
      default: 'pending',
      index: true,
    },
    gatewayData: {
      gatewaySettledAmount: Number,
      gatewayFees: Number,
      gatewayRefunds: Number,
      gatewayChargebacks: Number,
      gatewayTransactionCount: Number,
      settlementRefNumber: String,
      settlementDate: Date,
    },
    internalData: {
      internalAmount: Number,
      internalFees: Number,
      internalRefunds: Number,
      internalChargebacks: Number,
      internalTransactionCount: Number,
    },
    discrepancies: [
      {
        transactionId: String,
        discrepancyType: String, // missing, extra, amount_mismatch, status_mismatch
        gatewayAmount: Number,
        internalAmount: Number,
        difference: Number,
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        resolved: { type: Boolean, default: false },
        resolution: String,
      },
    ],
    summary: {
      matchedTransactions: { type: Number, default: 0 },
      unmatchedTransactions: { type: Number, default: 0 },
      totalDiscrepancy: { type: Number, default: 0 },
      discrepancyPercentage: { type: Number, default: 0 },
      reconciliationRate: { type: Number, default: 0 },
    },
    adjustments: [
      {
        adjustmentId: String,
        type: String, // reversal, manual_adjustment, fee_waiver, chargeback
        amount: Number,
        reason: String,
        approvedBy: String,
        appliedAt: Date,
      },
    ],
    approvalWorkflow: {
      approvalRequired: { type: Boolean, default: true },
      approvedBy: String,
      approvalNotes: String,
      approvedAt: Date,
      rejectionReason: String,
    },
    paymentMatching: {
      matchingAlgorithm: String,
      unmatchedPayments: [
        {
          paymentId: String,
          gatewayTransactionId: String,
          amount: Number,
          reason: String,
        },
      ],
      orphanedTransactions: [
        {
          gatewayTransactionId: String,
          amount: Number,
          gatewayTimestamp: Date,
          description: String,
        },
      ],
    },
    reports: {
      summaryReport: Schema.Types.Mixed,
      detailedReport: String,
      csvExport: String,
      reportGeneratedAt: Date,
    },
    auditLog: [
      {
        timestamp: Date,
        action: String,
        performedBy: String,
        details: Schema.Types.Mixed,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'reconciliations',
  }
);

reconciliationSchema.index({ gateway: 1, reconciliationDate: -1 });
reconciliationSchema.index({ status: 1, createdAt: -1 });
reconciliationSchema.index({ startDate: 1, endDate: 1 });

reconciliationSchema.methods.isCompleted = function () {
  return this.status === 'completed' || this.status === 'approved';
};

reconciliationSchema.methods.hasDiscrepancies = function () {
  return this.discrepancies.length > 0;
};

reconciliationSchema.methods.getDiscrepancyPercentage = function () {
  if (this.summary.matchedTransactions === 0) return 0;
  return (this.summary.discrepancyPercentage || 0);
};

module.exports = require('mongoose').model('Reconciliation', reconciliationSchema);
