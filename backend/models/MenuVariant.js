/**
 * MenuVariant Schema
 * Menu item variants (half/full, sizes, portions)
 * Enables restaurants to offer customizable portions/sizes
 */

const mongoose = require('mongoose');

const menuVariantSchema = new mongoose.Schema(
  {
    variantId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryMenuItem',
      required: true,
      index: true,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRestaurant',
      required: true,
      index: true,
    },

    variantName: {
      type: String,
      required: true,
      enum: ['half', 'full', 'small', 'medium', 'large', 'xlarge', 'single', 'double', 'combo'],
    },

    displayName: {
      type: String,
      required: true,
    },

    description: String,

    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    priceModifier: {
      type: Number,
      default: 0,
      description: 'Additional price on top of base item price',
    },

    portion: {
      quantity: Number,
      unit: {
        type: String,
        enum: ['grams', 'ml', 'pieces', 'bowl', 'plate', 'cup'],
      },
    },

    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number,

    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      startTime: String,
      endTime: String,
      availableOn: [Number],
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

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
    collection: 'menuvariants',
  }
);

// Indexes
menuVariantSchema.index({ menuItemId: 1, status: 1 });
menuVariantSchema.index({ restaurantId: 1, status: 1 });
menuVariantSchema.index({ variantName: 1 });

// Methods
menuVariantSchema.methods.incrementOrderCount = function () {
  this.orderCount += 1;
  return this.save();
};

menuVariantSchema.methods.updateRating = async function (newRating) {
  const totalRating = this.averageRating * (this.orderCount - 1) + newRating;
  this.averageRating = totalRating / this.orderCount;
  return this.save();
};

module.exports = mongoose.model('MenuVariant', menuVariantSchema);
