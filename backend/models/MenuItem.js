const mongoose = require('mongoose');

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

