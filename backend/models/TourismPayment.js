const mongoose = require('mongoose');

const tourismPaymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismBooking',
    required: true,
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  provider: {
    type: String,
    enum: ['razorpay', 'stripe', 'manual', 'bank_transfer'],
    default: 'razorpay',
  },
  providerOrderId: {
    type: String,
  },
  providerPaymentId: {
    type: String,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  currency: {
    type: String,
    default: 'INR',
  },
  paymentType: {
    type: String,
    enum: ['advance', 'full', 'balance'],
    default: 'advance',
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'created',
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'cash'],
  },
  reference: {
    type: String,
  },
  signature: {
    type: String,
  },
  failureReason: {
    type: String,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundReference: {
    type: String,
  },
  refundedAt: {
    type: Date,
  },
  capturedAt: {
    type: Date,
  },
  metadata: {
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    packageTitle: String,
    travelDate: String,
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
  },
  notes: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
tourismPaymentSchema.index({ bookingId: 1 });
tourismPaymentSchema.index({ orderId: 1 });
tourismPaymentSchema.index({ providerOrderId: 1 });
tourismPaymentSchema.index({ providerPaymentId: 1 });
tourismPaymentSchema.index({ status: 1 });
tourismPaymentSchema.index({ createdAt: -1 });

// Generate order ID
tourismPaymentSchema.pre('save', function(next) {
  if (this.isNew && !this.orderId) {
    this.orderId = `TOUR-PAY-${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

// Method to mark payment as success
tourismPaymentSchema.methods.markSuccess = function(providerPaymentId, signature) {
  this.status = 'success';
  this.providerPaymentId = providerPaymentId;
  this.signature = signature;
  this.capturedAt = new Date();
  return this.save();
};

// Method to mark payment as failed
tourismPaymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Method to process refund
tourismPaymentSchema.methods.processRefund = function(amount, reference) {
  this.status = 'refunded';
  this.refundAmount = amount;
  this.refundReference = reference;
  this.refundedAt = new Date();
  return this.save();
};

const TourismPayment = mongoose.model('TourismPayment', tourismPaymentSchema);

module.exports = TourismPayment;
