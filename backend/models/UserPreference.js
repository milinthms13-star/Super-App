/**
 * UserPreference Schema
 * User food preferences for AI recommendations
 * Tracks dietary preferences, cuisine favorites, price ranges, and past orders
 */

const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema(
  {
    preferenceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    dietaryPreferences: {
      vegetarian: {
        type: Boolean,
        default: false,
      },
      vegan: {
        type: Boolean,
        default: false,
      },
      glutenFree: {
        type: Boolean,
        default: false,
      },
      dairyFree: {
        type: Boolean,
        default: false,
      },
      kosher: {
        type: Boolean,
        default: false,
      },
      halal: {
        type: Boolean,
        default: false,
      },
      keto: {
        type: Boolean,
        default: false,
      },
      paleo: {
        type: Boolean,
        default: false,
      },
    },

    allergies: [
      {
        allergen: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
        },
      },
    ],

    cuisinePreferences: {
      favorites: [
        {
          cuisine: String,
          preferenceScore: {
            type: Number,
            min: 0,
            max: 1,
          },
        },
      ],
      disliked: [String],
      exploring: [String],
    },

    pricePreference: {
      budget: {
        type: String,
        enum: ['budget', 'mid-range', 'premium', 'luxury'],
        default: 'mid-range',
      },
      averageOrderValue: Number,
      maxPricePerItem: Number,
      minPricePerItem: Number,
    },

    spiceLevel: {
      preference: {
        type: String,
        enum: ['no_spice', 'mild', 'medium', 'hot', 'very_hot', 'varies'],
        default: 'medium',
      },
      preferenceScore: {
        type: Number,
        min: 0,
        max: 5,
        default: 2,
      },
    },

    mealTypes: {
      breakfast: Boolean,
      lunch: Boolean,
      dinner: Boolean,
      snacks: Boolean,
      desserts: Boolean,
      beverages: Boolean,
    },

    favoriteRestaurants: [
      {
        restaurantId: mongoose.Schema.Types.ObjectId,
        rating: Number,
        orderCount: Number,
        lastOrderDate: Date,
      },
    ],

    favoriteItems: [
      {
        itemId: mongoose.Schema.Types.ObjectId,
        itemName: String,
        restaurantId: mongoose.Schema.Types.ObjectId,
        orderCount: Number,
        lastOrderedDate: Date,
        rating: Number,
        preferenceScore: {
          type: Number,
          min: 0,
          max: 1,
        },
      },
    ],

    orderingPatterns: {
      preferredOrderingDays: [Number],
      preferredOrderingTimes: [String],
      averageOrderFrequency: Number,
      avgOrdersPerWeek: Number,
      avgOrdersPerMonth: Number,
      busySeasons: [String],
    },

    deliveryPreferences: {
      preferredDeliveryTimes: [String],
      acceptDelayedDelivery: Boolean,
      maxDeliveryTime: Number,
      preferredDeliveryAreas: [
        {
          area: String,
          latitude: Number,
          longitude: Number,
          radius: Number,
        },
      ],
    },

    paymentPreferences: {
      preferredMethods: [
        {
          method: {
            type: String,
            enum: ['wallet', 'card', 'upi', 'cod'],
          },
          usageFrequency: Number,
        },
      ],
      preferCashback: Boolean,
      preferDiscounts: Boolean,
    },

    seasonalPreferences: {
      summer: [String],
      monsoon: [String],
      winter: [String],
      spring: [String],
    },

    healthGoals: [
      {
        goal: {
          type: String,
          enum: ['weight_loss', 'muscle_gain', 'balance', 'energy_boost'],
        },
        active: Boolean,
        startDate: Date,
      },
    ],

    calorieGoal: {
      active: Boolean,
      dailyLimit: Number,
    },

    notificationPreferences: {
      recommendedDishes: Boolean,
      newRestaurants: Boolean,
      specialOffers: Boolean,
      loyaltyRewards: Boolean,
      orderReminders: Boolean,
    },

    mlFeatures: {
      engagementScore: {
        type: Number,
        min: 0,
        max: 1,
      },
      loyaltyScore: {
        type: Number,
        min: 0,
        max: 1,
      },
      priceElasticity: {
        type: Number,
        min: -2,
        max: 2,
      },
      diversityIndex: {
        type: Number,
        min: 0,
        max: 1,
      },
      predictedChurnRisk: {
        type: Number,
        min: 0,
        max: 1,
      },
    },

    preferences: [
      {
        category: String,
        value: String,
        weight: Number,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'userpreferences',
  }
);

// Indexes
userPreferenceSchema.index({ userId: 1 });
userPreferenceSchema.index({ 'cuisinePreferences.favorites': 1 });
userPreferenceSchema.index({ 'pricePreference.budget': 1 });
userPreferenceSchema.index({ 'healthGoals.goal': 1 });

// Methods
userPreferenceSchema.methods.addFavoriteRestaurant = function (restaurantId, rating) {
  const existing = this.favoriteRestaurants.find((r) => r.restaurantId.toString() === restaurantId.toString());
  if (existing) {
    existing.orderCount += 1;
    existing.lastOrderDate = new Date();
    existing.rating = rating;
  } else {
    this.favoriteRestaurants.push({
      restaurantId,
      rating,
      orderCount: 1,
      lastOrderDate: new Date(),
    });
  }
  return this.save();
};

userPreferenceSchema.methods.addFavoriteItem = function (itemData) {
  const existing = this.favoriteItems.find((i) => i.itemId.toString() === itemData.itemId.toString());
  if (existing) {
    existing.orderCount += 1;
    existing.lastOrderedDate = new Date();
    existing.preferenceScore = Math.min(1, existing.preferenceScore + 0.05);
  } else {
    this.favoriteItems.push({
      itemId: itemData.itemId,
      itemName: itemData.itemName,
      restaurantId: itemData.restaurantId,
      orderCount: 1,
      lastOrderedDate: new Date(),
      rating: itemData.rating,
      preferenceScore: 0.5,
    });
  }
  return this.save();
};

userPreferenceSchema.methods.getTopCuisines = function (limit = 5) {
  return this.cuisinePreferences.favorites.sort((a, b) => b.preferenceScore - a.preferenceScore).slice(0, limit);
};

userPreferenceSchema.methods.getFavoriteItemsByRestaurant = function (restaurantId) {
  return this.favoriteItems.filter((i) => i.restaurantId.toString() === restaurantId.toString());
};

userPreferenceSchema.methods.updateHealthGoal = function (goal, active) {
  const existing = this.healthGoals.find((g) => g.goal === goal);
  if (existing) {
    existing.active = active;
  } else {
    this.healthGoals.push({
      goal,
      active,
      startDate: new Date(),
    });
  }
  return this.save();
};

module.exports = mongoose.model('UserPreference', userPreferenceSchema);
