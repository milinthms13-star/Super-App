const mongoose = require('mongoose');

const BusinessBuilderAssetSchema = new mongoose.Schema(
  {
    assetId: {
      type: String,
      unique: true,
      required: true,
      default: () => `bbasset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
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
    assetType: {
      type: String,
      enum: ['poster', 'caption', 'website'],
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    content: {
      type: String,
      trim: true,
      maxlength: 40000,
      default: '',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    attributionStats: {
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      leads: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      paidOrders: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

BusinessBuilderAssetSchema.index({ businessId: 1, createdAt: -1 });
BusinessBuilderAssetSchema.index({ businessId: 1, assetType: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessBuilderAsset', BusinessBuilderAssetSchema);
