const mongoose = require('mongoose');

const MiniAppProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
      default: () => `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    miniAppId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MiniApp',
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      sparse: true,
      min: 0,
    },
    images: [String],
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    trackStock: {
      type: Boolean,
      default: true,
    },
    sku: {
      type: String,
      sparse: true,
    },
    variants: [
      {
        name: String, // 'Size', 'Color', 'Material'
        options: [String], // ['S', 'M', 'L'], ['Red', 'Blue']
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Archived'],
      default: 'Active',
    },
    visibility: {
      type: String,
      enum: ['Public', 'Private', 'Draft'],
      default: 'Public',
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
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

// Indexes
MiniAppProductSchema.index({ miniAppId: 1, status: 1 });
MiniAppProductSchema.index({ businessId: 1, createdAt: -1 });
MiniAppProductSchema.index({ category: 1, miniAppId: 1 });
MiniAppProductSchema.index({ sku: 1, businessId: 1 });

module.exports = mongoose.model('MiniAppProduct', MiniAppProductSchema);
