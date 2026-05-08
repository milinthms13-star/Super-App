const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Variant Schema (half/full/large sizes)
const ItemVariantSchema = new Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true,
      enum: ['half', 'full', 'large', 'small', 'regular', '500ml', '1L'],
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
  },
  { _id: true }
);

// Addon Schema (Toppings, extra cheese, etc.)
const AddonSchema = new Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

// Menu Item Schema
const FoodDeliveryMenuItemSchema = new Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
    },

    // Restaurant Reference
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodDeliveryRestaurant',
      required: true,
      index: true,
    },

    // Categorization
    category: {
      type: String,
      enum: ['starter', 'main', 'bread', 'rice', 'dessert', 'beverage', 'combo', 'special', 'other'],
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },

    // Pricing
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    variants: [ItemVariantSchema], // Different sizes with different prices

    // Availability & Stock
    available: {
      type: Boolean,
      default: true,
      index: true,
    },
    outOfStock: {
      type: Boolean,
      default: false,
    },
    stockCount: {
      type: Number,
      default: null, // null means unlimited
    },

    // Preparation
    preparationTime: {
      type: Number, // minutes
      default: 15,
      min: 5,
      max: 120,
    },

    // Media
    imageUrl: String, // S3 URL
    images: [String], // Gallery images
    thumbnail: String, // S3 URL

    // Dietary & Nutrition Info
    vegetarian: {
      type: Boolean,
      default: false,
      index: true,
    },
    vegan: {
      type: Boolean,
      default: false,
    },
    glutenFree: {
      type: Boolean,
      default: false,
    },
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot', 'extra-hot', 'not-spicy'],
      default: 'medium',
    },

    // Nutrition
    nutritionInfo: {
      calories: Number,
      protein: Number, // grams
      carbs: Number, // grams
      fat: Number, // grams
      fiber: Number, // grams
    },

    // Allergens & Warnings
    allergens: [String], // e.g., ['peanuts', 'dairy', 'gluten']
    containsEgg: Boolean,
    containsDairy: Boolean,
    containsPeanuts: Boolean,
    containsNuts: Boolean,
    containsSesame: Boolean,

    // Customizations
    addons: [AddonSchema], // Extra toppings, sides, etc.
    maxAddons: {
      type: Number,
      default: 3,
    },
    isCustomizable: {
      type: Boolean,
      default: false,
    },

    // Ratings & Reviews
    ratings: {
      average: {
        type: Number,
        default: 4.0,
        min: 1,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
    },

    // Metadata
    popularity: {
      orderCount: {
        type: Number,
        default: 0,
      },
      orderCount30Days: {
        type: Number,
        default: 0,
      },
      orderCount7Days: {
        type: Number,
        default: 0,
      },
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isSpotlight: {
      type: Boolean,
      default: false,
    },
    isNewItem: {
      type: Boolean,
      default: false,
    },

    // Offers & Discounts
    discount: {
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      amount: {
        type: Number,
        default: 0,
        min: 0,
      },
      validUntil: Date,
    },

    // Admin Fields
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes
FoodDeliveryMenuItemSchema.index({ name: 'text', description: 'text' });
FoodDeliveryMenuItemSchema.index({ restaurantId: 1, category: 1 });
FoodDeliveryMenuItemSchema.index({ restaurantId: 1, isFeatured: 1, available: 1 });
FoodDeliveryMenuItemSchema.index({ vegetarian: 1, vegan: 1 });

// Virtual: Display price (with discount applied)
FoodDeliveryMenuItemSchema.virtual('displayPrice').get(function () {
  if (this.discount.percentage > 0) {
    return this.basePrice * (1 - this.discount.percentage / 100);
  }
  if (this.discount.amount > 0) {
    return Math.max(0, this.basePrice - this.discount.amount);
  }
  return this.basePrice;
});

// Virtual: Is discount active
FoodDeliveryMenuItemSchema.virtual('hasActiveDiscount').get(function () {
  if (!this.discount.validUntil) return false;
  if (this.discount.percentage === 0 && this.discount.amount === 0) return false;
  return new Date() < this.discount.validUntil;
});

// Methods

/**
 * Get all available variants
 */
FoodDeliveryMenuItemSchema.methods.getAvailableVariants = function () {
  return this.variants.filter((v) => v.available);
};

/**
 * Add variant
 */
FoodDeliveryMenuItemSchema.methods.addVariant = function (variantData) {
  const variant = {
    _id: new mongoose.Types.ObjectId(),
    name: variantData.name,
    price: variantData.price,
    available: variantData.available !== false,
  };
  this.variants.push(variant);
  return variant;
};

/**
 * Update variant availability
 */
FoodDeliveryMenuItemSchema.methods.updateVariantAvailability = function (variantId, available) {
  const variant = this.variants.id(variantId);
  if (variant) {
    variant.available = available;
  }
  return variant;
};

/**
 * Add addon
 */
FoodDeliveryMenuItemSchema.methods.addAddon = function (addonData) {
  const addon = {
    _id: new mongoose.Types.ObjectId(),
    name: addonData.name,
    price: addonData.price || 0,
  };
  this.addons.push(addon);
  return addon;
};

/**
 * Update addon
 */
FoodDeliveryMenuItemSchema.methods.updateAddon = function (addonId, addonData) {
  const addon = this.addons.id(addonId);
  if (addon) {
    addon.name = addonData.name || addon.name;
    addon.price = addonData.price !== undefined ? addonData.price : addon.price;
  }
  return addon;
};

/**
 * Record order for popularity metrics
 */
FoodDeliveryMenuItemSchema.methods.recordOrder = async function (quantity = 1) {
  this.popularity.orderCount += quantity;
  this.popularity.orderCount30Days += quantity;
  this.popularity.orderCount7Days += quantity;
  await this.save();
};

/**
 * Update ratings
 */
FoodDeliveryMenuItemSchema.methods.updateRating = async function (newRating) {
  const totalRatings = this.ratings.totalRatings + 1;
  this.ratings.average =
    (this.ratings.average * (totalRatings - 1) + newRating) / totalRatings;
  this.ratings.totalRatings = totalRatings;
  await this.save();
};

/**
 * Get discounted price
 */
FoodDeliveryMenuItemSchema.methods.getDiscountedPrice = function (basePrice = null) {
  const price = basePrice || this.basePrice;
  if (!this.hasActiveDiscount) return price;

  if (this.discount.percentage > 0) {
    return price * (1 - this.discount.percentage / 100);
  }
  if (this.discount.amount > 0) {
    return Math.max(0, price - this.discount.amount);
  }
  return price;
};

/**
 * Get item data for public display
 */
FoodDeliveryMenuItemSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  obj.displayPrice = this.displayPrice;
  obj.hasActiveDiscount = this.hasActiveDiscount;
  delete obj.createdBy;
  return obj;
};

/**
 * Check if item is available for ordering
 */
FoodDeliveryMenuItemSchema.methods.canOrder = function () {
  return this.available && !this.outOfStock && this.status === 'active';
};

module.exports = mongoose.model('FoodDeliveryMenuItem', FoodDeliveryMenuItemSchema);
