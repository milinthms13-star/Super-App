const mongoose = require('mongoose');

const RecentlyViewedSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        originalPrice: {
          type: Number,
          default: null,
        },
        discount: {
          type: Number,
          default: 0,
        },
        image: {
          type: String,
          default: null,
        },
        description: {
          type: String,
          default: '',
        },
        category: {
          type: String,
          required: true,
        },
        vendor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vendor',
          default: null,
        },
        rating: {
          type: Number,
          min: 0,
          max: 5,
          default: 0,
        },
        reviews: {
          type: Number,
          default: 0,
        },
        timeSpent: {
          type: Number,
          default: 0, // in seconds
        },
        viewedAt: {
          type: Date,
          default: Date.now,
          index: true,
        },
        lastViewedAt: {
          type: Date,
          default: Date.now,
        },
        viewCount: {
          type: Number,
          default: 1,
        },
        deviceType: {
          type: String,
          enum: ['mobile', 'tablet', 'desktop'],
          default: 'mobile',
        },
      },
    ],
    totalViews: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'recently_viewed',
  }
);

// Auto-calculate totalViews
RecentlyViewedSchema.pre('save', function (next) {
  this.totalViews = this.items.reduce((sum, item) => sum + item.viewCount, 0);
  this.lastUpdated = new Date();
  next();
});

// Indexes for performance
RecentlyViewedSchema.index({ userEmail: 1, 'items.viewedAt': -1 });
RecentlyViewedSchema.index({ userEmail: 1, lastUpdated: -1 });

// Instance methods
RecentlyViewedSchema.methods.addView = function (product, deviceType = 'mobile', timeSpent = 0) {
  // Check if product already viewed
  const existingItem = this.items.find(
    (item) => item.productId.toString() === product._id.toString()
  );

  if (existingItem) {
    existingItem.viewCount += 1;
    existingItem.lastViewedAt = new Date();
    existingItem.timeSpent += timeSpent;
  } else {
    // Keep only last 50 items viewed
    if (this.items.length >= 50) {
      this.items.shift(); // Remove oldest
    }

    this.items.push({
      productId: product._id,
      productName: product.name,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      discount: product.discount || 0,
      image: product.image || null,
      description: product.description || '',
      category: product.category,
      vendor: product.vendor || null,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      timeSpent,
      deviceType,
      viewedAt: new Date(),
      lastViewedAt: new Date(),
      viewCount: 1,
    });
  }

  return this;
};

RecentlyViewedSchema.methods.getRecentlyViewed = function (limit = 12) {
  // Sort by viewedAt descending
  const sorted = [...this.items].sort((a, b) => {
    return new Date(b.viewedAt) - new Date(a.viewedAt);
  });

  return sorted.slice(0, limit);
};

RecentlyViewedSchema.methods.getRecommendations = function (limit = 10) {
  // Return products from same categories as recently viewed
  const categories = [...new Set(this.items.map((item) => item.category))];
  return { categories, viewCount: this.items.length };
};

// Statics
RecentlyViewedSchema.statics.findByEmail = function (email) {
  return this.findOne({ userEmail: email.toLowerCase() });
};

RecentlyViewedSchema.statics.getOrCreate = async function (userId, userEmail) {
  let viewed = await this.findOne({ userEmail: userEmail.toLowerCase() });

  if (!viewed) {
    viewed = new this({
      userId,
      userEmail: userEmail.toLowerCase(),
      items: [],
    });
    await viewed.save();
  }

  return viewed;
};

module.exports = mongoose.model('RecentlyViewed', RecentlyViewedSchema);
