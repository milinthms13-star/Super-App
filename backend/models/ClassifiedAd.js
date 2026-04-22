const mongoose = require('mongoose');
const crypto = require('crypto');

const ClassifiedMessageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    from: {
      type: String,
      required: true,
      trim: true,
    },
    senderEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [Object],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ClassifiedReportSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    reporterEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    reporterName: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'dismissed'],
      default: 'open',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ClassifiedReviewSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    buyerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    aspectRatings: {
      accuracy: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      condition: { type: Number, min: 1, max: 5 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const MediaItemSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    url: String,
    fileId: String,
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    order: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PriceHistorySchema = new mongoose.Schema(
  {
    price: Number,
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ClassifiedAdSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 140,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1500,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    priceHistory: {
      type: [PriceHistorySchema],
      default: [],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    seller: {
      type: String,
      required: true,
      trim: true,
    },
    sellerRole: {
      type: String,
      default: 'Seller',
      trim: true,
    },
    sellerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    sellerRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    sellerReviewCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    sellerVerificationLevel: {
      type: String,
      enum: ['unverified', 'email-verified', 'phone-verified', 'identity-verified'],
      default: 'unverified',
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    locality: {
      type: String,
      default: '',
      trim: true,
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    condition: {
      type: String,
      enum: ['New', 'Like New', 'Used', 'Refurbished'],
      default: 'Used',
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    urgent: {
      type: Boolean,
      default: false,
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    views: {
      type: Number,
      min: 0,
      default: 0,
    },
    favorites: {
      type: Number,
      min: 0,
      default: 0,
    },
    chats: {
      type: Number,
      min: 0,
      default: 0,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'flagged', 'rejected'],
      default: 'pending',
      index: true,
    },
    moderationNotes: {
      type: String,
      default: '',
      trim: true,
    },
    languageSupport: {
      type: [String],
      default: ['English', 'Malayalam'],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    mapLabel: {
      type: String,
      default: '',
      trim: true,
    },
    contactOptions: {
      type: [String],
      enum: ['Chat', 'Call', 'Email', 'WhatsApp'],
      default: ['Chat'],
    },
    mediaGallery: {
      type: [MediaItemSchema],
      default: [],
    },
    monetizationPlan: {
      type: String,
      enum: ['Free', 'Featured', 'Urgent', 'Seller Pro'],
      default: 'Free',
    },
    promotionPlanExpiry: Date,
    subscriptionTier: {
      type: String,
      enum: ['none', 'starter', 'pro', 'enterprise'],
      default: 'none',
    },
    subscriptionExpiryDate: Date,
    listedDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiryDate: Date,
    autoRenew: {
      type: Boolean,
      default: false,
    },
    scheduledPublishDate: Date,
    isDraft: {
      type: Boolean,
      default: false,
    },
    reviews: {
      type: [ClassifiedReviewSchema],
      default: [],
    },
    averageRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    totalReviews: {
      type: Number,
      min: 0,
      default: 0,
    },
    messages: {
      type: [ClassifiedMessageSchema],
      default: [],
    },
    reports: {
      type: [ClassifiedReportSchema],
      default: [],
    },
    blockedUsers: {
      type: [String],
      default: [],
      lowercase: true,
      trim: true,
    },
    analytics: {
      clickThroughRate: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      averageTimeOnListing: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
    },
    spamScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },
    flags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create geospatial index for distance queries
ClassifiedAdSchema.index({ coordinates: '2dsphere' });
// Composite indexes for common queries
ClassifiedAdSchema.index({ category: 1, location: 1, moderationStatus: 1 });
ClassifiedAdSchema.index({ sellerEmail: 1, createdAt: -1 });
ClassifiedAdSchema.index({ featured: 1, urgent: 1, createdAt: -1 });

module.exports = mongoose.model('ClassifiedAd', ClassifiedAdSchema);
