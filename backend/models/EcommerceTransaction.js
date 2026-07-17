/**
 * Ecommerce Transaction Model
 * Tracks all financial transactions and commissions
 */

const mongoose = require('mongoose');

const EcommerceTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Reference IDs
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
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
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    buyerEmail: {
      type: String,
      required: true,
    },
    
    // Transaction Details
    type: {
      type: String,
      enum: ['sale', 'refund', 'commission', 'payout', 'subscription', 'penalty', 'adjustment'],
      required: true,
      index: true,
    },
    
    // Amounts
    orderAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    productAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    
    // Commission Details
    commission: {
      type: {
        type: String,
        enum: ['percentage', 'flat', 'tiered'],
        default: 'percentage',
      },
      rate: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
      calculationBase: {
        type: Number,
        default: 0,
      },
      gst: {
        rate: {
          type: Number,
          default: 18,
        },
        amount: {
          type: Number,
          default: 0,
        },
      },
      totalCommission: {
        type: Number,
        default: 0,
      },
      category: String,
      subscriptionPlan: String,
    },
    
    // Seller Settlement
    settlement: {
      grossAmount: {
        type: Number,
        default: 0,
      },
      netAmount: {
        type: Number,
        default: 0,
      },
      deductions: [
        {
          type: String,
          amount: Number,
          description: String,
        },
      ],
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'on_hold'],
        default: 'pending',
        index: true,
      },
      scheduledDate: Date,
      processedDate: Date,
      payoutId: String,
      payoutMethod: String,
      bankAccount: String,
    },
    
    // Product Details
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        productName: String,
        quantity: Number,
        price: Number,
        subtotal: Number,
        commission: Number,
        category: String,
      },
    ],
    
    // Payment Gateway Details
    paymentGateway: {
      gateway: String,
      transactionId: String,
      status: String,
      method: String,
      timestamp: Date,
      fees: {
        type: Number,
        default: 0,
      },
    },
    
    // Transaction Status
    status: {
      type: String,
      enum: ['initiated', 'pending', 'completed', 'failed', 'cancelled', 'refunded', 'disputed'],
      default: 'pending',
      index: true,
    },
    
    // Refund Information
    refund: {
      requested: {
        type: Boolean,
        default: false,
      },
      requestedAt: Date,
      reason: String,
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processed'],
      },
      processedAt: Date,
      refundId: String,
    },
    
    // Notes & Metadata
    notes: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Audit Trail
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
    
    // Reconciliation
    reconciled: {
      type: Boolean,
      default: false,
      index: true,
    },
    reconciledAt: Date,
    reconciledBy: String,
    
    // Financial Period
    financialPeriod: {
      month: Number,
      year: Number,
      quarter: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
EcommerceTransactionSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
EcommerceTransactionSchema.index({ orderId: 1 });
EcommerceTransactionSchema.index({ type: 1, status: 1 });
EcommerceTransactionSchema.index({ 'settlement.status': 1, 'settlement.scheduledDate': 1 });
EcommerceTransactionSchema.index({ 'financialPeriod.year': 1, 'financialPeriod.month': 1 });
EcommerceTransactionSchema.index({ reconciled: 1, createdAt: -1 });

// Pre-save hook to calculate financial period
EcommerceTransactionSchema.pre('save', function (next) {
  if (this.isNew) {
    const date = new Date();
    this.financialPeriod = {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      quarter: Math.floor(date.getMonth() / 3) + 1,
    };
  }
  next();
});

// Methods
EcommerceTransactionSchema.methods.calculateCommission = function (sellerProfile, category) {
  if (!sellerProfile) return 0;
  
  const baseAmount = this.productAmount;
  const commissionRate = sellerProfile.getCommissionRate(category, baseAmount);
  
  let commissionAmount = 0;
  if (sellerProfile.commissionConfig.type === 'flat') {
    commissionAmount = commissionRate;
  } else {
    commissionAmount = (baseAmount * commissionRate) / 100;
  }
  
  // Calculate GST on commission
  const gstRate = 18; // 18% GST on commission
  const gstAmount = (commissionAmount * gstRate) / 100;
  
  this.commission = {
    type: sellerProfile.commissionConfig.type,
    rate: commissionRate,
    amount: commissionAmount,
    calculationBase: baseAmount,
    gst: {
      rate: gstRate,
      amount: gstAmount,
    },
    totalCommission: commissionAmount + gstAmount,
    category: category,
    subscriptionPlan: sellerProfile.subscription.plan,
  };
  
  // Calculate settlement
  const grossAmount = this.productAmount;
  const deductions = this.commission.totalCommission;
  
  this.settlement = {
    ...this.settlement,
    grossAmount: grossAmount,
    netAmount: grossAmount - deductions,
    deductions: [
      {
        type: 'commission',
        amount: this.commission.totalCommission,
        description: `Platform commission (${commissionRate}%) + GST`,
      },
    ],
  };
  
  return this.commission.totalCommission;
};

EcommerceTransactionSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  this.auditLog.push({
    action: 'status_changed',
    details: { from: this.status, to: 'completed' },
  });
};

EcommerceTransactionSchema.methods.markSettlementCompleted = function (payoutId, payoutMethod) {
  this.settlement.status = 'completed';
  this.settlement.processedDate = new Date();
  this.settlement.payoutId = payoutId;
  this.settlement.payoutMethod = payoutMethod;
  
  this.auditLog.push({
    action: 'settlement_completed',
    details: { payoutId, payoutMethod },
  });
};

EcommerceTransactionSchema.methods.initiateRefund = function (reason, amount) {
  this.refund = {
    requested: true,
    requestedAt: new Date(),
    reason: reason,
    amount: amount || this.totalAmount,
    status: 'pending',
  };
  
  this.status = 'disputed';
  
  this.auditLog.push({
    action: 'refund_initiated',
    details: { reason, amount: this.refund.amount },
  });
};

// Static methods
EcommerceTransactionSchema.statics.getSellerRevenue = async function (sellerId, startDate, endDate) {
  const match = {
    sellerId: mongoose.Types.ObjectId(sellerId),
    status: 'completed',
    type: 'sale',
  };
  
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$productAmount' },
        totalCommission: { $sum: '$commission.totalCommission' },
        netRevenue: { $sum: '$settlement.netAmount' },
        transactionCount: { $sum: 1 },
      },
    },
  ]);
  
  return result[0] || {
    totalRevenue: 0,
    totalCommission: 0,
    netRevenue: 0,
    transactionCount: 0,
  };
};

EcommerceTransactionSchema.statics.getPendingSettlements = function (sellerId) {
  return this.find({
    sellerId,
    status: 'completed',
    'settlement.status': { $in: ['pending', 'processing'] },
  }).sort({ createdAt: 1 });
};

EcommerceTransactionSchema.statics.getCommissionReport = async function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        type: 'sale',
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          sellerId: '$sellerId',
          subscriptionPlan: '$commission.subscriptionPlan',
        },
        totalRevenue: { $sum: '$productAmount' },
        totalCommission: { $sum: '$commission.totalCommission' },
        transactionCount: { $sum: 1 },
        avgCommissionRate: { $avg: '$commission.rate' },
      },
    },
    {
      $lookup: {
        from: 'ecommercesellerprofiles',
        localField: '_id.sellerId',
        foreignField: '_id',
        as: 'seller',
      },
    },
    {
      $unwind: '$seller',
    },
    {
      $sort: { totalCommission: -1 },
    },
  ]);
};

module.exports = mongoose.model('EcommerceTransaction', EcommerceTransactionSchema);
