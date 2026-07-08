const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessBuilderOrder'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  // Razorpay payment details
  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  razorpaySignature: String,
  // Payment details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  status: {
    type: String,
    enum: [
      'created',
      'authorized',
      'captured',
      'refunded',
      'partial_refund',
      'failed',
      'cancelled'
    ],
    default: 'created',
    index: true
  },
  method: {
    type: String,
    enum: ['card', 'netbanking', 'wallet', 'upi', 'emi', 'cardless_emi', 'paylater', 'other'],
    index: true
  },
  // Customer details
  customerName: String,
  customerEmail: {
    type: String,
    lowercase: true
  },
  customerContact: String,
  // Payment gateway fees
  fee: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  // Refund details
  refundAmount: {
    type: Number,
    default: 0
  },
  refundStatus: {
    type: String,
    enum: ['none', 'partial', 'full'],
    default: 'none'
  },
  refunds: [{
    refundId: String,
    amount: Number,
    status: String,
    processedAt: Date,
    reason: String
  }],
  // Error details (for failed payments)
  errorCode: String,
  errorDescription: String,
  errorSource: String,
  errorStep: String,
  errorReason: String,
  // Payment link details (if payment was made via link)
  paymentLinkId: String,
  paymentLinkUrl: String,
  // Subscription details (if payment is for subscription)
  subscriptionId: String,
  subscriptionPeriod: String,
  // Metadata
  description: String,
  notes: mongoose.Schema.Types.Mixed,
  receipt: String,
  // Timestamps for various events
  authorizedAt: Date,
  capturedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  // IP and device info
  ipAddress: String,
  userAgent: String,
  deviceType: String,
  // Verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  // Webhook status
  webhookProcessed: {
    type: Boolean,
    default: false
  },
  webhookProcessedAt: Date
}, {
  timestamps: true
});

// Indexes for common queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ businessId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ method: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1, razorpayPaymentId: 1 });

// Virtual for net amount (amount - refundAmount)
paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.refundAmount;
});

// Instance methods
paymentSchema.methods.markAsAuthorized = function(paymentId, signature) {
  this.razorpayPaymentId = paymentId;
  this.razorpaySignature = signature;
  this.status = 'authorized';
  this.authorizedAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsCaptured = function(captureData = {}) {
  this.status = 'captured';
  this.capturedAt = new Date();
  if (captureData.method) this.method = captureData.method;
  if (captureData.fee) this.fee = captureData.fee;
  if (captureData.tax) this.tax = captureData.tax;
  return this.save();
};

paymentSchema.methods.markAsFailed = function(errorData = {}) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorCode = errorData.code;
  this.errorDescription = errorData.description;
  this.errorSource = errorData.source;
  this.errorStep = errorData.step;
  this.errorReason = errorData.reason;
  return this.save();
};

paymentSchema.methods.addRefund = function(refundData) {
  this.refunds.push({
    refundId: refundData.id,
    amount: refundData.amount,
    status: refundData.status,
    processedAt: new Date(),
    reason: refundData.reason
  });
  
  this.refundAmount += refundData.amount;
  
  if (this.refundAmount >= this.amount) {
    this.refundStatus = 'full';
    this.status = 'refunded';
  } else {
    this.refundStatus = 'partial';
    this.status = 'partial_refund';
  }
  
  this.refundedAt = new Date();
  return this.save();
};

paymentSchema.methods.verify = function() {
  this.verified = true;
  this.verifiedAt = new Date();
  return this.save();
};

paymentSchema.methods.markWebhookProcessed = function() {
  this.webhookProcessed = true;
  this.webhookProcessedAt = new Date();
  return this.save();
};

// Static methods
paymentSchema.statics.findByRazorpayOrderId = function(orderId) {
  return this.findOne({ razorpayOrderId: orderId });
};

paymentSchema.statics.findByRazorpayPaymentId = function(paymentId) {
  return this.findOne({ razorpayPaymentId: paymentId });
};

paymentSchema.statics.getPaymentStats = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.userId) matchStage.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.businessId) matchStage.businessId = mongoose.Types.ObjectId(filters.businessId);
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }
  if (filters.status) matchStage.status = filters.status;

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalRefunded: { $sum: '$refundAmount' },
        successfulPayments: {
          $sum: { $cond: [{ $in: ['$status', ['captured', 'authorized']] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalTransactions: 0,
      totalAmount: 0,
      totalRefunded: 0,
      netAmount: 0,
      successfulPayments: 0,
      failedPayments: 0,
      successRate: 0,
      averageAmount: 0
    };
  }

  const result = stats[0];
  return {
    totalTransactions: result.totalTransactions,
    totalAmount: result.totalAmount,
    totalRefunded: result.totalRefunded,
    netAmount: result.totalAmount - result.totalRefunded,
    successfulPayments: result.successfulPayments,
    failedPayments: result.failedPayments,
    successRate: result.totalTransactions > 0 
      ? ((result.successfulPayments / result.totalTransactions) * 100).toFixed(2)
      : 0,
    averageAmount: result.averageAmount
  };
};

paymentSchema.statics.getPaymentsByMethod = async function(filters = {}) {
  const matchStage = {};
  
  if (filters.userId) matchStage.userId = mongoose.Types.ObjectId(filters.userId);
  if (filters.businessId) matchStage.businessId = mongoose.Types.ObjectId(filters.businessId);
  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

paymentSchema.statics.getRecentPayments = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('businessId', 'name')
    .populate('orderId', 'orderNumber')
    .lean();
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
