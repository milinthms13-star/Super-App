const crypto = require('crypto');
const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => crypto.randomUUID(),
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    default: '',
    trim: true,
  },
  priceModifier: {
    type: Number,
    default: 0,
  },
  prepTimeModifier: {
    type: Number,
    default: 0,
  },
  available: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const addonSchema = new mongoose.Schema({
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
    default: 0,
  },
  prepTimeModifier: {
    type: Number,
    default: 0,
  },
  available: {
    type: Boolean,
    default: true,
  },
  vegetarian: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
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
    enum: ['starter', 'main', 'dessert', 'beverage', 'other'],
    default: 'main',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  available: {
    type: Boolean,
    default: true,
  },
  prepTime: {
    type: Number, // minutes
    min: 1,
    default: 15,
  },
  imageUrl: String,
  calories: Number,
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'extra-hot'],
  },
  vegetarian: {
    type: Boolean,
    default: false,
  },
  allergens: [String],
  variants: {
    type: [variantSchema],
    default: [],
  },
  addons: {
    type: [addonSchema],
    default: [],
  },
  recommendationTags: {
    type: [String],
    default: [],
  },
  popularityScore: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

menuItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);

