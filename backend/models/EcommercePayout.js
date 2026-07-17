/**
 * Ecommerce Payout Model
 * Manages seller payouts and settlements
 */

const mongoose = require('mongoose');

const EcommercePayoutSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Seller Information
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EcommerceSellerProfile',
      required: true,
      index: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      index: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
    
    // Period Information
    period: {
      type: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'custom'],
        required: true,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    
    // Financial Summary
    summary: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      totalCommission: {
        type: Number,
        default: 0,
      },
      totalGST: {
        type: Number,
        default: 0,
      },
      totalDeductions: {
        type: Number,
        default: 0,
      },
      netPayable: {
        type: Number,
        required: true,
      },
    },
    
    // Transaction References
    transactions: [
      {
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'EcommerceTransaction',
        },
        orderId: String,
        amount: Number,
        commission: Number,
        date: Date,
      },
    ],
    
    // Deductions
    deductions: [
      {
        type: {
          type: String,
          enum: ['commission', 'penalty', 'refund', 'chargeback', 'adjustment', 'tax', 'other'],
        },
        amount: Number,
        description: String,
        reference: String,
      },
    ],
    
    // Bank Details
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      upiId: String,
    },
    
    // Payout Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'on_hold', 'cancelled'],
      default: 'pending',
      index: true,
    },
    
    // Payment Method
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'upi', 'cheque', 'wallet'],
      default: 'bank_transfer',
    },
    
    // Processing Details
    processing: {
      initiatedAt: Date,
      initiatedBy: String,
      processingStartedAt: Date,
      completedAt: Date,
      gatewayTransactionId: String,
      gatewayResponse: mongoose.Schema.Types.Mixed,
      utr: String, // Unique Transaction Reference
    },
    
    // Failure Information
    failure: {
      reason: String,
      code: String,
      timestamp: Date,
      retryCount: {
        type: Number,
        default: 0,
      },
      lastRetryAt: Date,
    },
    
    // Hold Information
    hold: {
      reason: String,
      placedAt: Date,
      placedBy: String,
      releaseScheduled: Date,
    },
    
    // Invoice
    invoice: {
      invoiceNumber: String,
      invoiceDate: Date,
      invoiceUrl: String,
      generated: {
        type: Boolean,
        default: false,
      },
    },
    
    // Notifications
    notifications: {
      seller: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
        method: [String],
      },
      admin: {
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
    },
    
    // Reconciliation
    reconciliation: {
      reconciled: {
        type: Boolean,
        default: false,
      },
      reconciledAt: Date,
      reconciledBy: String,
      notes: String,
    },
    
    // Approval Workflow
    approval: {
      required: {
        type: Boolean,
        default: false,
      },
      approvedBy: String,
      approvedAt: Date,
      rejectedBy: String,
      rejectedAt: Date,
      rejectionReason: String,
    },
    
    // Audit Log
    auditLog: [
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
    
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
EcommercePayoutSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
EcommercePayoutSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
EcommercePayoutSchema.index({ status: 1, 'processing.completedAt': 1 });
EcommercePayoutSchema.index({ 'reconciliation.reconciled': 1 });

// Pre-save hook to generate payout ID
EcommercePayoutSchema.pre('save', function (next) {
  if (this.isNew && !this.payoutId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.payoutId = `PAYOUT-${timestamp}-${random}`;
  }
  next();
});

// Methods
EcommercePayoutSchema.methods.calculateNetPayable = function () {
  const totalDeductions = this.deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
  this.summary.totalDeductions = totalDeductions;
  this.summary.netPayable = this.summary.totalRevenue - this.summary.totalCommission - totalDeductions;
  return this.summary.netPayable;
};

EcommercePayoutSchema.methods.addDeduction = function (type, amount, description, reference) {
  this.deductions.push({
    type,
    amount,
    description,
    reference,
  });
  this.calculateNetPayable();
};

EcommercePayoutSchema.methods.markAsProcessing = function (initiatedBy) {
  this.status = 'processing';
  this.processing.processingStartedAt = new Date();
  this.processing.initiatedBy = initiatedBy;
  
  this.auditLog.push({
    action: 'payout_processing_started',
    performedBy: initiatedBy,
    details: { status: 'processing' },
  });
};

EcommercePayoutSchema.methods.markAsCompleted = function (utr, gatewayTransactionId, performedBy) {
  this.status = 'completed';
  this.processing.completedAt = new Date();
  this.processing.utr = utr;
  this.processing.gatewayTransactionId = gatewayTransactionId;
  
  this.auditLog.push({
    action: 'payout_completed',
    performedBy: performedBy,
    details: { utr, gatewayTransactionId },
  });
};

EcommercePayoutSchema.methods.markAsFailed = function (reason, code, performedBy) {
  this.status = 'failed';
  this.failure = {
    reason,
    code,
    timestamp: new Date(),
    retryCount: (this.failure?.retryCount || 0) + 1,
  };
  
  this.auditLog.push({
    action: 'payout_failed',
    performedBy: performedBy,
    details: { reason, code },
  });
};

EcommercePayoutSchema.methods.retry = function (performedBy) {
  if (this.status !== 'failed') {
    throw new Error('Can only retry failed payouts');
  }
  
  this.status = 'pending';
  this.failure.lastRetryAt = new Date();
  
  this.auditLog.push({
    action: 'payout_retry',
    performedBy: performedBy,
    details: { retryCount: this.failure.retryCount },
  });
};

EcommercePayoutSchema.methods.placeOnHold = function (reason, releaseDate, performedBy) {
  this.status = 'on_hold';
  this.hold = {
    reason,
    placedAt: new Date(),
    placedBy: performedBy,
    releaseScheduled: releaseDate,
  };
  
  this.auditLog.push({
    action: 'payout_on_hold',
    performedBy: performedBy,
    details: { reason, releaseScheduled: releaseDate },
  });
};

EcommercePayoutSchema.methods.releaseHold = function (performedBy) {
  if (this.status !== 'on_hold') {
    throw new Error('Payout is not on hold');
  }
  
  this.status = 'pending';
  this.hold = {};
  
  this.auditLog.push({
    action: 'payout_hold_released',
    performedBy: performedBy,
  });
};

EcommercePayoutSchema.methods.approve = function (approvedBy) {
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  
  this.auditLog.push({
    action: 'payout_approved',
    performedBy: approvedBy,
  });
};

EcommercePayoutSchema.methods.reject = function (rejectedBy, reason) {
  this.approval.rejectedBy = rejectedBy;
  this.approval.rejectedAt = new Date();
  this.approval.rejectionReason = reason;
  this.status = 'cancelled';
  
  this.auditLog.push({
    action: 'payout_rejected',
    performedBy: rejectedBy,
    details: { reason },
  });
};

// Static methods
EcommercePayoutSchema.statics.getPendingPayouts = function (limit = 50) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('sellerId', 'storeName sellerEmail businessName');
};

EcommercePayoutSchema.statics.getSellerPayouts = function (sellerId, limit = 20) {
  return this.find({ sellerId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

EcommercePayoutSchema.statics.getPayoutsByPeriod = function (startDate, endDate) {
  return this.find({
    'period.startDate': { $gte: startDate },
    'period.endDate': { $lte: endDate },
  }).sort({ createdAt: -1 });
};

EcommercePayoutSchema.statics.getTotalPayoutAmount = async function (sellerId, startDate, endDate) {
  const match = {
    sellerId: mongoose.Types.ObjectId(sellerId),
    status: 'completed',
  };
  
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: '$summary.netPayable' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  return result[0] || { totalPaid: 0, count: 0 };
};

module.exports = mongoose.model('EcommercePayout', EcommercePayoutSchema);
