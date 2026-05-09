/**
 * Commission Model - Phase 12
 * Commission tracking and payouts
 */

const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    commissionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    linkedPaymentId: {
      type: String,
      required: true,
      index: true,
    },
    linkedOrderId: String,
    linkedRestaurantId: {
      type: String,
      required: true,
      index: true,
    },
    linkedDeliveryPartnerId: String,
    linkedUserId: String,
    commissionType: {
      type: String,
      enum: ['restaurant', 'delivery_partner', 'promo', 'platform', 'other'],
      required: true,
    },
    orderAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumCommission: Number,
    maximumCommission: Number,
    discountApplied: {
      type: Number,
      default: 0,
    },
    discountReason: String,
    netCommission: {
      type: Number,
      required: true,
    },
    taxBreakdown: {
      gst: {
        rate: Number,
        amount: Number,
      },
      otherTax: Number,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    payableAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'settled', 'rejected', 'hold'],
      default: 'pending',
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: ['not_paid', 'processing', 'paid'],
      default: 'not_paid',
    },
    approvedBy: String,
    approvalDate: Date,
    approvalNotes: String,
    settlementId: String,
    settledAt: Date,
    payoutDate: Date,
    rejectionReason: String,
    holdReason: String,
    holdUntilDate: Date,
    commissionPeriod: {
      startDate: Date,
      endDate: Date,
    },
    rules: {
      ruleName: String,
      ruleVersion: String,
      applicableAmount: mongoose.Schema.Types.Mixed,
      conditions: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      tags: [String],
      customFields: mongoose.Schema.Types.Mixed,
    },
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
  },
  {
    timestamps: true,
    collection: 'commissions',
  }
);

// Indexes
commissionSchema.index({ linkedPaymentId: 1 });
commissionSchema.index({ linkedOrderId: 1 });
commissionSchema.index({ linkedRestaurantId: 1, status: 1 });
commissionSchema.index({ status: 1, createdAt: -1 });
commissionSchema.index({ payoutStatus: 1, settlementId: 1 });
commissionSchema.index({ 'commissionPeriod.startDate': 1, 'commissionPeriod.endDate': 1 });

// Methods
commissionSchema.methods.isPending = function () {
  return this.status === 'pending';
};

commissionSchema.methods.isApproved = function () {
  return this.status === 'approved';
};

commissionSchema.methods.isSettled = function () {
  return this.status === 'settled';
};

commissionSchema.methods.isPaid = function () {
  return this.payoutStatus === 'paid';
};

commissionSchema.methods.isOnHold = function () {
  return this.status === 'hold' && this.holdUntilDate && this.holdUntilDate > new Date();
};

commissionSchema.methods.canBeSettled = function () {
  return this.status === 'approved' && this.payoutStatus !== 'paid';
};

commissionSchema.methods.approve = function (approvedBy, notes) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvalDate = new Date();
  this.approvalNotes = notes;
};

commissionSchema.methods.reject = function (reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
};

commissionSchema.methods.hold = function (reason, holdDays) {
  this.status = 'hold';
  this.holdReason = reason;
  this.holdUntilDate = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);
};

commissionSchema.methods.markAsSettled = function (settlementId) {
  this.status = 'settled';
  this.settlementId = settlementId;
  this.settledAt = new Date();
};

commissionSchema.methods.markAsPaid = function (payoutDate) {
  this.payoutStatus = 'paid';
  this.payoutDate = payoutDate || new Date();
};

const Commission = mongoose.model('Commission', commissionSchema);

module.exports = Commission;
