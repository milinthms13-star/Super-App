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

const ClassifiedAdSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      required: true,
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
    image: {
      type: String,
      default: '',
      trim: true,
    },
    posted: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
      trim: true,
    },
    condition: {
      type: String,
      default: 'Used',
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    urgent: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
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
    languageSupport: {
      type: [String],
      default: ['English', 'Malayalam'],
    },
    tags: {
      type: [String],
      default: [],
    },
    mapLabel: {
      type: String,
      default: '',
      trim: true,
    },
    contactOptions: {
      type: [String],
      default: ['Chat'],
    },
    mediaGallery: {
      type: [String],
      default: [],
    },
    monetizationPlan: {
      type: String,
      default: 'Free',
      trim: true,
    },
    messages: {
      type: [ClassifiedMessageSchema],
      default: [],
    },
    reports: {
      type: [ClassifiedReportSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ClassifiedAd', ClassifiedAdSchema);
