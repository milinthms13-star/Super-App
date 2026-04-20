const mongoose = require('mongoose');
const crypto = require('crypto');

const PropertyLeadSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      default: 'Enquiry',
      trim: true,
    },
    priority: {
      type: String,
      default: 'Warm',
      trim: true,
    },
  },
  { _id: false }
);

const PropertyMessageSchema = new mongoose.Schema(
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
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const PropertyReviewSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => crypto.randomUUID(),
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    score: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const RealEstatePropertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    price: { type: String, default: '', trim: true },
    priceLabel: { type: String, default: '', trim: true },
    priceValue: { type: Number, default: 0, min: 0, index: true },
    area: { type: String, default: '', trim: true },
    areaSqft: { type: Number, default: 0, min: 0 },
    location: { type: String, required: true, trim: true, index: true },
    locality: { type: String, default: '', trim: true },
    type: { type: String, default: 'Flat', trim: true, index: true },
    intent: { type: String, default: 'sale', trim: true, index: true },
    image: { type: String, default: '', trim: true },
    bedrooms: { type: Number, default: 0, min: 0 },
    bathrooms: { type: Number, default: 0, min: 0 },
    furnishing: { type: String, default: 'Semi Furnished', trim: true },
    amenities: { type: [String], default: [] },
    sellerName: { type: String, default: '', trim: true },
    sellerRole: { type: String, default: 'Owner', trim: true },
    sellerEmail: { type: String, default: '', lowercase: true, trim: true, index: true },
    developer: { type: String, default: '', trim: true },
    listedBy: { type: String, default: 'Owner', trim: true },
    verified: { type: Boolean, default: false },
    verificationStatus: { type: String, default: 'Pending', trim: true },
    featured: { type: Boolean, default: false },
    postedOn: { type: String, default: () => new Date().toISOString().slice(0, 10), trim: true },
    possession: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    mapLabel: { type: String, default: '', trim: true },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    premiumPlan: { type: String, default: 'Featured Listing', trim: true },
    mediaCount: { type: Number, default: 0, min: 0 },
    hasVideoTour: { type: Boolean, default: false },
    projectUnits: { type: Number, default: 1, min: 0 },
    leads: { type: [PropertyLeadSchema], default: [] },
    chatPreview: { type: [PropertyMessageSchema], default: [] },
    similarTags: { type: [String], default: [] },
    reviews: { type: [PropertyReviewSchema], default: [] },
    disputeCount: { type: Number, default: 0, min: 0 },
    languageSupport: { type: [String], default: ['English', 'Malayalam'] },
    status: { type: String, default: 'available', trim: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RealEstateProperty', RealEstatePropertySchema);
