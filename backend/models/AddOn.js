/**
 * AddOn Schema
 * Toppings, extras, and add-on items for menu items
 * Enables customization like extra cheese, sauces, spice levels
 */

const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema(
  {
    addOnId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRestaurant',
      required: true,
      index: true,
    },

    addOnName: {
      type: String,
      required: true,
    },

    description: String,

    category: {
      type: String,
      enum: ['cheese', 'sauce', 'topping', 'spice', 'drink', 'dessert', 'extra', 'other'],
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    isVegetarian: {
      type: Boolean,
      default: true,
    },

    calories: Number,

    popularity: {
      orderCount: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
    },

    restrictions: {
      allergens: [String],
      containsGluten: Boolean,
      containsNuts: Boolean,
      containsDairy: Boolean,
      spiceLevel: {
        type: String,
        enum: ['mild', 'medium', 'hot', 'extra_hot'],
      },
    },

    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      startTime: String,
      endTime: String,
      availableOn: [Number],
    },

    itemsCompatible: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodDeliveryMenuItem',
      },
    ],

    maxQuantity: {
      type: Number,
      default: 1,
      description: 'Max number of this add-on per item',
    },

    sequenceOrder: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'addons',
  }
);

// Indexes
addOnSchema.index({ restaurantId: 1, status: 1 });
addOnSchema.index({ category: 1, status: 1 });
addOnSchema.index({ 'popularity.orderCount': -1 });

// Methods
addOnSchema.methods.incrementOrderCount = function () {
  this.popularity.orderCount += 1;
  return this.save();
};

addOnSchema.methods.updateRating = function (newRating) {
  const totalRating = this.popularity.averageRating * (this.popularity.orderCount - 1) + newRating;
  this.popularity.averageRating = totalRating / this.popularity.orderCount;
  return this.save();
};

module.exports = mongoose.model('AddOn', addOnSchema);
