const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryAddress: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    items: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    sellerFulfillments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    paymentSecurity: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    invoice: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    notifications: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    coupon: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      default: 'Confirmed',
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: '',
      trim: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deliveryProof: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Contains: { imageUrl, uploadedAt, uploadedBy, notes }
    },
    deliveryOTP: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Contains: { otp, verified, verifiedAt, attempts, maxAttempts }
    },
    deliveryLocation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Contains: { lat, lng, address, googleMapsLink, capturedAt }
    },
    commission: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Contains: { platformCommissionPercentage, items: [{ vendorEmail, revenue, commission, netPayable }] }
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', OrderSchema);
