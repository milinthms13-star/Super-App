const mongoose = require("mongoose");

const LocalMarketProductSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Vegetables & Fruits",
        "Dairy & Eggs",
        "Pantry Staples",
        "Beverages",
        "Bakery",
        "Meat & Fish",
        "Personal Care",
        "Household",
        "Snacks & Confectionery",
        "Frozen Foods",
      ],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: String,
      required: true, // e.g., "1 KG", "500g", "1 Liter"
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String, // emoji or image URL
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
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

module.exports = mongoose.model("LocalMarketProduct", LocalMarketProductSchema);
