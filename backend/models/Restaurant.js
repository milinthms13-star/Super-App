const mongoose = require('mongoose');
const crypto = require('crypto');

const MenuItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      default: 'Mains',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    prepTag: {
      type: String,
      default: '',
      trim: true,
    },
    customizable: {
      type: Boolean,
      default: false,
    },
    vegetarian: {
      type: Boolean,
      default: false,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const RestaurantReviewSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const RestaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    cuisine: { type: String, default: '', trim: true, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    deliveryTime: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    imageLabel: { type: String, default: '', trim: true },
    discount: { type: String, default: '', trim: true },
    distanceKm: { type: Number, default: 0, min: 0 },
    priceForTwo: { type: Number, default: 0, min: 0 },
    promoted: { type: Boolean, default: false },
    open: { type: Boolean, default: true },
    licenseStatus: { type: String, default: '', trim: true },
    avgPreparationTime: { type: String, default: '', trim: true },
    walletOffers: { type: String, default: '', trim: true },
    cuisineTags: { type: [String], default: [] },
    menu: { type: [MenuItemSchema], default: [] },
    reviews: { type: [RestaurantReviewSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Restaurant', RestaurantSchema);
