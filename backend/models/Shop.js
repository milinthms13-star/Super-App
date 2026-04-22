const mongoose = require("mongoose");

const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["Grocery Store", "Supermarket", "Convenience Store", "Local Kirana", "Organic Store"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    deliveryCharge: {
      type: Number,
      default: 40,
    },
    minOrder: {
      type: Number,
      default: 150,
    },
    freeDeliveryAbove: {
      type: Number,
      default: 500,
    },
    location: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    contact: {
      phone: String,
      email: String,
    },
    licenseStatus: {
      type: String,
      enum: ["Verified License", "Pending Verification", "Certified Organic"],
      default: "Verified License",
    },
    avgDeliveryRating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LocalMarketProduct",
      },
    ],
    isOpen: {
      type: Boolean,
      default: true,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    reviews: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        rating: Number,
        comment: String,
        createdAt: Date,
      },
    ],
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

module.exports = mongoose.model("Shop", ShopSchema);
