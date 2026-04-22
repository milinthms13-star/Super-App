const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      unique: true,
      required: true,
      default: () => `rev-${Date.now()}`,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },
    productName: String,
    orderId: String,
    reviewerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    reviewerName: String,
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    images: [String], // URLs of review images
    verified: {
      type: Boolean,
      default: false, // True if purchase verified
    },
    helpful: {
      type: Number,
      default: 0, // Number of helpful votes
    },
    unhelpful: {
      type: Number,
      default: 0,
    },
    sellerResponse: {
      text: String,
      respondedAt: Date,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    rejectionReason: String,
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

// Index for average rating calculation
ReviewSchema.index({ productId: 1, rating: 1 });
ReviewSchema.index({ reviewerEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
