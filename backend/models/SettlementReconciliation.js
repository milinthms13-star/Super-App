// backend/models/SettlementReconciliation.js
const mongoose = require('mongoose');

const SettlementReconciliationSchema = new mongoose.Schema({
  reconciliationBatch: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  reconciliationDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  period: {
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'APPROVED', 'REJECTED', 'PARTIAL', 'ERROR'],
    default: 'PENDING',
    index: true
  },
  matches: [{
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InstantSettlement',
      required: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    },
    matchStatus: {
      type: String,
      enum: ['EXACT_MATCH', 'AMOUNT_MISMATCH', 'TIMING_DISCREPANCY', 'CURRENCY_MISMATCH', 'PARTIAL_MATCH'],
      required: true
    },
    settlementAmount: Number,
    paymentAmount: Number,
    amountDifference: Number,
    settlementDate: Date,
    paymentDate: Date,
    daysDifference: Number,
    matchedAt: {
      type: Date,
      default: Date.now
    },
    matchedBy: mongoose.Schema.Types.ObjectId
  }],
  discrepancies: [{
    discrepancyType: {
      type: String,
      enum: [
        'AMOUNT_MISMATCH',
        'MISSING_PAYMENT',
        'MISSING_SETTLEMENT',
        'DUPLICATE_SETTLEMENT',
        'TIMING_DISCREPANCY',
        'CURRENCY_MISMATCH',
        'DUPLICATE_PAYMENT',
        'REVERSED_TRANSACTION',
        'CANCELLED_SETTLEMENT',
        'PARTIAL_PAYMENT'
      ],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      default: 'MEDIUM'
    },
    settlementId: mongoose.Schema.Types.ObjectId,
    paymentId: mongoose.Schema.Types.ObjectId,
    description: String,
    expectedAmount: Number,
    actualAmount: Number,
    difference: Number,
    discoveredAt: {
      type: Date,
      default: Date.now
    },
    resolutionStatus: {
      type: String,
      enum: ['PENDING', 'INVESTIGATING', 'RESOLVED', 'IGNORED'],
      default: 'PENDING'
    },
    resolutionNotes: String,
    resolvedAt: Date,
    resolvedBy: mongoose.Schema.Types.ObjectId
  }],
  summary: {
    totalSettlements: { type: Number, default: 0 },
    totalPayments: { type: Number, default: 0 },
    matchedRecords: { type: Number, default: 0 },
    matchPercentage: { type: Number, default: 0 },
    totalSettlementAmount: { type: Number, default: 0 },
    totalPaymentAmount: { type: Number, default: 0 },
    totalDiscrepancies: { type: Number, default: 0 },
    criticalDiscrepancies: { type: Number, default: 0 },
    totalDifference: { type: Number, default: 0 },
    matchedAmount: { type: Number, default: 0 },
    unmatchedSettlements: { type: Number, default: 0 },
    unmatchedPayments: { type: Number, default: 0 }
  },
  approval: {
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,
    rejectedBy: mongoose.Schema.Types.ObjectId,
    rejectedAt: Date,
    rejectionReason: String,
    approvalNotes: String
  },
  unmatchedSettlements: [{
    settlementId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    date: Date,
    reason: String
  }],
  unmatchedPayments: [{
    paymentId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    date: Date,
    reason: String
  }],
  auditTrail: [{
    action: String,
    performedBy: mongoose.Schema.Types.ObjectId,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    processedBy: mongoose.Schema.Types.ObjectId,
    processingTime: Number, // milliseconds
    recordsAnalyzed: Number,
    automatedMatching: Boolean,
    manualReviewRequired: Boolean,
    reviewNotes: String,
    associatedReports: [mongoose.Schema.Types.ObjectId]
  },
  nextReconciliationDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'settlement_reconciliations'
});

SettlementReconciliationSchema.index({ reconciliationDate: -1 });
SettlementReconciliationSchema.index({ status: 1, reconciliationDate: -1 });
SettlementReconciliationSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

module.exports = mongoose.model('SettlementReconciliation', SettlementReconciliationSchema);
