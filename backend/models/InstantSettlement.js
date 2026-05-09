/**
 * Instant Settlement Model - Phase 12
 * On-demand settlement requests and tracking
 */

const mongoose = require('mongoose');

const instantSettlementSchema = new mongoose.Schema(
  {
    settlementId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    requestedBy: {
      type: String,
      required: true,
      index: true,
    },
    requestedByType: {
      type: String,
      enum: ['restaurant', 'admin', 'system'],
      required: true,
    },
    paymentGateway: {
      type: String,
      required: true,
    },
    settlementAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    settlementFee: {
      type: Number,
      default: 0,
    },
    settlementFeePercentage: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'processing', 'completed', 'failed', 'rejected'],
      default: 'pending',
      index: true,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      verified: {
        type: Boolean,
        default: false,
      },
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'wallet', 'check', 'card'],
      default: 'bank_transfer',
    },
    referencePayments: [
      {
        paymentId: String,
        amount: Number,
      },
    ],
    settlementDate: Date,
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    gatewayReferenceId: String,
    gatewayTransactionId: String,
    rejectionReason: String,
    failureReason: String,
    approvedBy: String,
    approvalDate: Date,
    approvalNotes: String,
    processingStartedAt: Date,
    processingCompletedAt: Date,
    processingStatus: {
      currentStep: String,
      stepDetails: mongoose.Schema.Types.Mixed,
      lastUpdated: Date,
    },
    verification: {
      bankAccountVerified: Boolean,
      documentsVerified: Boolean,
      complianceVerified: Boolean,
      verifiedAt: Date,
      verifiedBy: String,
    },
    documents: [
      {
        documentId: String,
        documentType: {
          type: String,
          enum: ['bank_statement', 'proof_of_ownership', 'id_proof', 'address_proof'],
        },
        documentUrl: String,
        uploadedAt: Date,
        verified: Boolean,
      },
    ],
    auditTrail: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: String,
        performedBy: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    notifications: [
      {
        notificationType: String,
        sentAt: Date,
        sentVia: {
          type: String,
          enum: ['email', 'sms', 'push'],
        },
        recipient: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'instantSettlements',
  }
);

// Indexes
instantSettlementSchema.index({ requestedBy: 1, status: 1 });
instantSettlementSchema.index({ paymentGateway: 1, createdAt: -1 });
instantSettlementSchema.index({ settlementDate: 1, status: 1 });
instantSettlementSchema.index({ status: 1, createdAt: -1 });

// Methods
instantSettlementSchema.methods.isPending = function () {
  return this.status === 'pending';
};

instantSettlementSchema.methods.isApproved = function () {
  return this.status === 'approved';
};

instantSettlementSchema.methods.isCompleted = function () {
  return this.status === 'completed';
};

instantSettlementSchema.methods.canBeApproved = function () {
  return (
    this.status === 'pending' &&
    this.bankDetails.verified &&
    this.verification.documentsVerified
  );
};

instantSettlementSchema.methods.approve = function (approvedBy, notes) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  this.approvalNotes = notes;
};

instantSettlementSchema.methods.reject = function (reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
};

instantSettlementSchema.methods.markAsCompleted = function (gatewayTransactionId) {
  this.status = 'completed';
  this.gatewayTransactionId = gatewayTransactionId;
  this.processingCompletedAt = new Date();
};

instantSettlementSchema.methods.getDaysToDeliver = function () {
  if (!this.expectedDeliveryDate) return null;
  return Math.ceil((this.expectedDeliveryDate - new Date()) / (1000 * 60 * 60 * 24));
};

const InstantSettlement = mongoose.model('InstantSettlement', instantSettlementSchema);

module.exports = InstantSettlement;
