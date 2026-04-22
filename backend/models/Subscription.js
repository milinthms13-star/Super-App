const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: String,
      unique: true,
      required: true,
      default: () => `sub-${Date.now()}`,
    },
    customerEmail: {
      type: String,
      required: true,
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
          required: true,
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
      required: true,
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
      enum: ['Active', 'Paused', 'Cancelled', 'Expired'],
      default: 'Active',
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
