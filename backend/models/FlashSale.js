const mongoose = require('mongoose');

const FlashSaleSchema = new mongoose.Schema({
  saleId: {
    type: String,
    unique: true,
    default: () => `flash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'expired'],
    default: 'draft'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed_amount'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  maxUsesPerUser: {
    type: Number,
    default: 1
  },
  totalUsesLimit: Number,
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    originalPrice: Number,
    salePrice: Number,
    stockLimit: Number,
    uses: {
      type: Number,
      default: 0
    }
  }],
  bannerImage: String,
  createdBy: {
    type: String, // admin/seller email
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

FlashSaleSchema.index({ startTime: 1, endTime: 1 });
FlashSaleSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model('FlashSale', FlashSaleSchema);

