const mongoose = require('mongoose');

const MiniAppSchema = new mongoose.Schema(
  {
    miniAppId: {
      type: String,
      unique: true,
      required: true,
      default: () => `mini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    appName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    appDescription: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    appType: {
      type: String,
      enum: ['Business Card', 'Product Showcase', 'Service Booking', 'Store Locator', 'Contact Form'],
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
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Unpublished', 'Suspended'],
      default: 'Draft',
    },
    branding: {
      primaryColor: {
        type: String,
        default: '#0f766e',
        match: /^#[0-9A-F]{6}$/i,
      },
      secondaryColor: {
        type: String,
        default: '#10b981',
        match: /^#[0-9A-F]{6}$/i,
      },
      logo: String,
      banner: String,
    },
    content: {
      heroTitle: { type: String, trim: true },
      heroSubtitle: { type: String, trim: true },
      aboutText: { type: String, trim: true },
      services: [{
        title: { type: String, trim: true },
        description: { type: String, trim: true },
        price: Number,
        image: String,
      }],
      contactInfo: {
        phone: String,
        email: String,
        address: String,
        whatsapp: String,
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
    features: {
      whatsappIntegration: { type: Boolean, default: true },
      callIntegration: { type: Boolean, default: true },
      emailIntegration: { type: Boolean, default: true },
      locationIntegration: { type: Boolean, default: false },
      bookingSystem: { type: Boolean, default: false },
      paymentIntegration: { type: Boolean, default: false },
    },
    analytics: {
      views: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      contacts: { type: Number, default: 0 },
      lastViewed: Date,
    },
    qrCode: {
      data: String,
      imageUrl: String,
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
  {
    timestamps: true,
  }
);

// Indexes for performance
MiniAppSchema.index({ businessId: 1, status: 1 });
MiniAppSchema.index({ userId: 1, createdAt: -1 });
MiniAppSchema.index({ slug: 1 });
MiniAppSchema.index({ appType: 1 });

// Pre-save middleware to generate slug if not provided
MiniAppSchema.pre('save', function(next) {
  if (!this.slug && this.appName) {
    this.slug = this.appName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Instance method to generate QR code data
MiniAppSchema.methods.generateQRData = function(baseUrl = 'https://malabarbazaar.com') {
  const url = `${baseUrl}/miniapp/${this.slug}`;
  this.qrCode = {
    data: url,
    imageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
  };
  return this.save();
};

// Instance method to increment analytics
MiniAppSchema.methods.incrementView = function() {
  this.analytics.views += 1;
  this.analytics.lastViewed = new Date();
  return this.save();
};

// Static method to find published mini apps by business
MiniAppSchema.statics.findPublishedByBusiness = function(businessId) {
  return this.find({
    businessId,
    status: 'Published',
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('MiniApp', MiniAppSchema);
