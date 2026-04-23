const mongoose = require('mongoose');

const PaymentAttemptSchema = new mongoose.Schema(
  {
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    gateway: {
      type: String,
      required: true,
      trim: true,
    },
    amountInPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    orderData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paymentStatus: {
      type: String,
      default: 'pending',
      trim: true,
    },
    status: {
      type: String,
      default: 'created',
      trim: true,
    },
    externalOrderId: {
      type: String,
      default: '',
      trim: true,
    },
    orderId: {
      type: String,
      default: '',
      trim: true,
    },
    securityProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PaymentAttempt', PaymentAttemptSchema);
