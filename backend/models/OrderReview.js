/**
 * Order Review Model - Phase 9 Feature B
 * Food quality reviews, photos, videos, quality assessment
 */

const mongoose = require('mongoose');

const OrderReviewSchema = new mongoose.Schema(
  {
    reviewId: { type: String, unique: true, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodOrder', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },

    // Overall Rating
    overallRating: { type: Number, min: 1, max: 5, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Category Ratings
    ratings: {
      foodQuality: { type: Number, min: 1, max: 5 },
      packaging: { type: Number, min: 1, max: 5 },
      delivery: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 }, // accuracy of order
      temperature: { type: Number, min: 1, max: 5 }, // food temperature
      taste: { type: Number, min: 1, max: 5 },
      freshness: { type: Number, min: 1, max: 5 },
      presentation: { type: Number, min: 1, max: 5 },
    },

    // Review Content
    title: String,
    description: String,
    tags: [
      {
        type: String,
        enum: [
          'delicious',
          'fresh',
          'hot',
          'cold',
          'good_packaging',
          'poor_packaging',
          'fast_delivery',
          'slow_delivery',
          'friendly_delivery_partner',
          'unprofessional',
          'incomplete_order',
          'extra_items',
          'reusable_packaging',
          'sustainable',
        ],
      },
    ],

    // Media Content
    media: [
      {
        mediaId: String,
        type: { type: String, enum: ['photo', 'video'] },
        url: String,
        thumbnail: String,
        uploadedAt: Date,
        fileSize: Number, // bytes
        duration: Number, // seconds (for videos)
        caption: String,
      },
    ],

    // Item-Level Reviews
    itemReviews: [
      {
        itemId: String,
        itemName: String,
        quantity: Number,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        wasAsExpected: Boolean,
        issues: [
          {
            type: String,
            enum: ['missing_item', 'wrong_item', 'damaged', 'insufficient_quantity', 'quality_issue'],
          },
        ],
        photo: String,
      },
    ],

    // Moderation
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifierNotes: String,
    isFlagged: { type: Boolean, default: false },
    flagReason: String,
    isHidden: { type: Boolean, default: false },
    visibilityScore: { type: Number, min: 0, max: 1 }, // 0-1 for ranking

    // Engagement
    helpfulCount: { type: Number, default: 0 },
    unhelpfulCount: { type: Number, default: 0 },
    responseCount: { type: Number, default: 0 },

    // Vendor Response
    vendorResponse: {
      respondedAt: Date,
      response: String,
      respondedBy: String, // vendor name
      acknowledgesIssue: Boolean,
      offersResolution: String,
    },

    // Recommendation
    wouldRecommend: { type: Boolean, default: null },
    wouldOrderAgain: { type: Boolean, default: null },
    recommendToFriends: { type: Number, min: 0, max: 10 }, // NPS score

    // Analytics
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    influencer: { type: Boolean, default: false }, // high-engagement reviewer
    trustScore: { type: Number, min: 0, max: 1 }, // review quality score

    // Moderator Notes
    moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'archived'], default: 'pending' },
    moderatedAt: Date,
    moderatorId: mongoose.Schema.Types.ObjectId,

    status: { type: String, enum: ['active', 'edited', 'deleted', 'archived'], default: 'active' },
  },
  { timestamps: true, collection: 'orderreviews' }
);

// Indexes
OrderReviewSchema.index({ restaurantId: 1, overallRating: -1 });
OrderReviewSchema.index({ userId: 1, createdAt: -1 });
OrderReviewSchema.index({ orderId: 1 });
OrderReviewSchema.index({ isVerified: 1, isFlagged: 1 });
OrderReviewSchema.index({ visibilityScore: -1 });
OrderReviewSchema.index({ createdAt: -1 });

// Instance Methods
OrderReviewSchema.methods.markHelpful = function (isHelpful = true) {
  if (isHelpful) {
    this.helpfulCount = (this.helpfulCount || 0) + 1;
  } else {
    this.unhelpfulCount = (this.unhelpfulCount || 0) + 1;
  }
  return this.save();
};

OrderReviewSchema.methods.addVendorResponse = function (response, vendorName, acknowledgesIssue, offersResolution) {
  this.vendorResponse = {
    respondedAt: new Date(),
    response,
    respondedBy: vendorName,
    acknowledgesIssue,
    offersResolution,
  };
  this.responseCount = (this.responseCount || 0) + 1;
  return this.save();
};

OrderReviewSchema.methods.calculateTrustScore = function () {
  let score = 0;
  const maxScore = 10;

  // Verified reviewer: +2 points
  if (this.isVerified) score += 2;

  // Media attachments: +2 points (max)
  if (this.media && this.media.length > 0) score += Math.min(2, this.media.length);

  // Item-level detail: +1 point
  if (this.itemReviews && this.itemReviews.length > 0) score += 1;

  // Helpful votes: +2 points
  if (this.helpfulCount > this.unhelpfulCount) score += 2;

  // NPS score: +3 points
  if (this.recommendToFriends >= 9) score += 3;

  this.trustScore = Math.min(1, score / maxScore);
  return this.trustScore;
};

module.exports = mongoose.model('OrderReview', OrderReviewSchema);
