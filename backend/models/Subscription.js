const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: String,
      unique: true,
      required: true,
      default: () => `sub-${Date.now()}`,
    },
    // Plan subscription fields (Phase 5B)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
    },
    planTier: String,
    planName: String,
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
    },
    amount: Number,
    renewalDate: Date,
    startDate: Date,
    paymentMethodId: mongoose.Schema.Types.ObjectId,
    cancellationType: String,
    cancellationReason: String,
    cancellationDate: Date,

    // Recurring product subscription fields (legacy)
    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: String,
    items: [
      {
        productId: String,
        productName: String,
        quantity: {
          type: Number,
          min: 1,
        },
        price: Number,
        sellerId: String,
        sellerName: String,
      },
    ],
    frequency: {
      type: String,
      enum: ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly'],
    },
    deliveryDay: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    deliveryAddress: String,
    nextDeliveryDate: Date,
    totalPrice: Number,
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired', 'Active', 'Paused', 'Cancelled', 'Expired'],
      default: 'active',
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    endDate: Date,
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    deliveryHistory: [
      {
        deliveryDate: Date,
        status: String,
        orderId: String,
        amount: Number,
      },
    ],
    paymentMethod: {
      type: String,
      enum: ['Card', 'UPI', 'Wallet', 'Bank Transfer'],
      default: 'Card',
    },
    discount: {
      type: Number,
      default: 0, // Subscription discount percentage
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);
