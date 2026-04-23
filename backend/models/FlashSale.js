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
  reservationWindowMinutes: {
    type: Number,
    default: 15,
    min: 1,
    max: 120,
  },
  notifyBeforeMinutes: {
    type: Number,
    default: 10,
    min: 0,
    max: 120,
  },
  totalUsesLimit: Number,
  // Track uses per user for abuse prevention
  userUses: [{
    userId: String,
    uses: {
      type: Number,
      default: 0
    },
    reserved: {
      type: Number,
      default: 0
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    reservedAt: {
      type: Date,
      default: null,
    }
  }],
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    originalPrice: Number,
    salePrice: Number,
    stockLimit: Number,
    reservedStock: {
      type: Number,
      default: 0
    },
    uses: {
      type: Number,
      default: 0
    }
  }],
  reservations: [{
    reservationId: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'consumed', 'released', 'expired'],
      default: 'active',
    },
  }],
  bannerImage: String,
  createdBy: {
    type: String, // admin/seller email
    required: true
  }
}, {
  timestamps: true
});

FlashSaleSchema.index({ startTime: 1, endTime: 1 });
FlashSaleSchema.index({ status: 1, startTime: 1 });
FlashSaleSchema.index({ 'products.productId': 1 });
FlashSaleSchema.index({ 'userUses.userId': 1 });
FlashSaleSchema.index({ 'reservations.userId': 1, 'reservations.status': 1 });
FlashSaleSchema.index({ 'reservations.expiresAt': 1 });

module.exports = mongoose.model('FlashSale', FlashSaleSchema);

