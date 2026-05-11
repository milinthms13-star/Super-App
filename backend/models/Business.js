const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      unique: true,
      required: true,
      default: () => `biz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Other'],
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      sparse: true,
    },
    gstin: {
      type: String,
      sparse: true,
      uppercase: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
    logo: {
      type: String,
      sparse: true,
    },
    primaryColor: {
      type: String,
      default: '#3498db',
    },
    secondaryColor: {
      type: String,
      default: '#2ecc71',
    },
    subscription: {
      tier: {
        type: String,
        enum: ['Free', 'Growth', 'Pro', 'Enterprise'],
        default: 'Free',
      },
      startDate: Date,
      endDate: Date,
      autoRenew: { type: Boolean, default: true },
      paymentMethodId: String,
    },
    features: {
      invoiceGeneratorEnabled: { type: Boolean, default: true },
      posterMakerEnabled: { type: Boolean, default: false },
      captionGeneratorEnabled: { type: Boolean, default: false },
      websiteBuilderEnabled: { type: Boolean, default: false },
      miniAppEnabled: { type: Boolean, default: false },
    },
    invoiceSettings: {
      invoicePrefix: { type: String, default: 'INV' },
      invoiceStartNumber: { type: Number, default: 1001 },
      taxRate: { type: Number, default: 18 },
      termsConditions: String,
      notes: String,
    },
    apiKeys: {
      invoiceApi: String,
      posterApi: String,
      captionApi: String,
    },
    analytics: {
      invoicesGenerated: { type: Number, default: 0 },
      postersCreated: { type: Number, default: 0 },
      miniAppOrders: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
      lastActivityDate: Date,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended'],
      default: 'Active',
    },
    verificationStatus: {
      type: String,
      enum: ['Unverified', 'Pending', 'Verified'],
      default: 'Unverified',
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

module.exports = mongoose.model('Business', BusinessSchema);
