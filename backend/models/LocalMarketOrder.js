const mongoose = require("mongoose");

const LocalMarketOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        productName: String,
        price: Number,
        quantity: Number,
        category: String,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Order Confirmed", "Being Prepared", "Ready for Pickup", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Order Confirmed",
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Card", "Wallet", "Cash on Delivery", "Net Banking"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },
    deliveryType: {
      type: String,
      enum: ["Home Delivery", "Store Pickup"],
      default: "Home Delivery",
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    promoCode: String,
    specialInstructions: String,
    estimatedDelivery: String,
    deliveredAt: Date,
    review: {
      rating: Number,
      comment: String,
      createdAt: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LocalMarketOrder", LocalMarketOrderSchema);
