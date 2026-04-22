const mongoose = require('mongoose');

const WishlistShareSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      unique: true,
      required: true,
      default: () => `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    wishlistItems: [
      {
        productId: String,
        productName: String,
        price: Number,
        image: String,
        category: String,
      },
    ],
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
        viewedAt: Date,
      },
    ],
    message: {
      type: String,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    publicUrl: String,
    expiresAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WishlistShare', WishlistShareSchema);
