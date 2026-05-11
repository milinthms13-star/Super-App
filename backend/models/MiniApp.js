const mongoose = require('mongoose');

const MiniAppSchema = new mongoose.Schema(
  {
    miniAppId: {
      type: String,
      unique: true,
      required: true,
      default: () => `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'Draft'],
      default: 'Draft',
    },
    verificationStatus: {
      type: String,
      enum: ['Unverified', 'Pending', 'Verified'],
      default: 'Unverified',
    },
    branding: {
      logo: String,
      primaryColor: { type: String, default: '#3498db' },
      secondaryColor: { type: String, default: '#2ecc71' },
      description: { type: String, maxlength: 160 },
      banner: String,
      coverImage: String,
    },
    businessProfile: {
      phone: String,
      whatsapp: String,
      email: String,
      address: String,
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      businessHours: {
        monday: { open: String, close: String, closed: Boolean },
        tuesday: { open: String, close: String, closed: Boolean },
        wednesday: { open: String, close: String, closed: Boolean },
        thursday: { open: String, close: String, closed: Boolean },
        friday: { open: String, close: String, closed: Boolean },
        saturday: { open: String, close: String, closed: Boolean },
        sunday: { open: String, close: String, closed: Boolean },
      },
    },
    pages: {
      home: {
        enabled: { type: Boolean, default: true },
        heroTitle: String,
        heroSubtitle: String,
        heroImage: String,
        ctaText: String,
        ctaLink: String,
      },
      products: {
        enabled: { type: Boolean, default: true },
        layout: { type: String, enum: ['Grid', 'List', 'Card'], default: 'Grid' },
      },
      booking: {
        enabled: { type: Boolean, default: false },
        bookingType: String, // 'Appointment', 'Order', 'Reservation'
        formFields: [String],
      },
      offers: {
        enabled: { type: Boolean, default: true },
      },
      chat: {
        enabled: { type: Boolean, default: true },
      },
      reviews: {
        enabled: { type: Boolean, default: true },
      },
    },
    configuration: {
      enableChat: { type: Boolean, default: true },
      enableReviews: { type: Boolean, default: true },
      enableNotifications: { type: Boolean, default: true },
      enablePayments: { type: Boolean, default: true },
      paymentGateway: {
        type: String,
        enum: ['Razorpay', 'Stripe'],
        default: 'Razorpay',
      },
      timezone: { type: String, default: 'Asia/Kolkata' },
      language: { type: String, default: 'en' },
    },
    engagement: {
      followers: { type: Number, default: 0 },
      subscribers: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0 },
    },
    analytics: {
      totalViews: { type: Number, default: 0 },
      totalClicks: { type: Number, default: 0 },
      totalOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      lastViewDate: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
MiniAppSchema.index({ businessId: 1, createdAt: -1 });
MiniAppSchema.index({ slug: 1 }, { unique: true });
MiniAppSchema.index({ category: 1, status: 1 });
MiniAppSchema.index({ 'engagement.followers': -1 });

module.exports = mongoose.model('MiniApp', MiniAppSchema);
