const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema(
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
        vendorEmail: {
          type: String,
          default: null,
        },
        inStock: {
          type: Boolean,
          default: true,
        },
        quantity: {
          type: Number,
          default: 1,
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
        addedAt: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
          default: '', // User can add personal notes like "Buy for Mom's birthday"
        },
        notifyOnPriceChange: {
          type: Boolean,
          default: false,
        },
        notifyOnBackInStock: {
          type: Boolean,
          default: false,
        },
        lastPriceNotificationSent: {
          type: Date,
          default: null,
        },
        variants: [
          {
            name: String,
            value: String,
          },
        ],
      },
    ],
    totalItems: {
      type: Number,
      default: 0,
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicShareLink: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    sharedWith: [
      {
        email: {
          type: String,
          lowercase: true,
          trim: true,
        },
        name: String,
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        viewedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    tags: [
      {
        type: String,
        enum: ['gift', 'wishlist', 'need', 'want', 'urgent', 'later', 'seasonal', 'comparison'],
        default: 'wishlist',
      },
    ],
    lastModified: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'wishlists',
  }
);

// Auto-calculate totalItems and estimatedValue before save
WishlistSchema.pre('save', function (next) {
  this.totalItems = this.items.length;
  this.estimatedValue = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  this.lastModified = new Date();
  next();
});

// Create an index for quick lookups
WishlistSchema.index({ userEmail: 1, createdAt: -1 });
WishlistSchema.index({ isPublic: 1, publicShareLink: 1 });

// Instance methods
WishlistSchema.methods.addItem = function (product, notes = '', quantity = 1) {
  // Check if item already exists
  const existingItem = this.items.find(
    (item) => item.productId.toString() === product._id.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.addedAt = new Date();
  } else {
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
      vendorEmail: product.vendorEmail || null,
      inStock: product.stock > 0,
      quantity,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      notes,
      addedAt: new Date(),
    });
  }

  return this;
};

WishlistSchema.methods.removeItem = function (productId) {
  this.items = this.items.filter((item) => item.productId.toString() !== productId.toString());
  return this;
};

WishlistSchema.methods.updateItemNotes = function (productId, notes) {
  const item = this.items.find((item) => item.productId.toString() === productId.toString());
  if (item) {
    item.notes = notes;
  }
  return this;
};

WishlistSchema.methods.toggleNotification = function (productId, type = 'price') {
  const item = this.items.find((item) => item.productId.toString() === productId.toString());
  if (item) {
    if (type === 'price') {
      item.notifyOnPriceChange = !item.notifyOnPriceChange;
    } else if (type === 'stock') {
      item.notifyOnBackInStock = !item.notifyOnBackInStock;
    }
  }
  return this;
};

WishlistSchema.methods.generatePublicLink = function () {
  this.publicShareLink = `wishlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  this.isPublic = true;
  return this;
};

// Statics
WishlistSchema.statics.findByEmail = function (email) {
  return this.findOne({ userEmail: email.toLowerCase() });
};

WishlistSchema.statics.findByPublicLink = function (link) {
  return this.findOne({ publicShareLink: link, isPublic: true });
};

module.exports = mongoose.model('Wishlist', WishlistSchema);
