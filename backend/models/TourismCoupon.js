const mongoose = require('mongoose');

const tourismCouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage',
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: Number,
    min: 0,
  },
  minAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDiscount: {
    type: Number,
    min: 0,
  },
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
  },
  usageLimit: {
    type: Number,
    min: 1,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  userUsageLimit: {
    type: Number,
    default: 1,
    min: 1,
  },
  applicableCategories: [{
    type: String,
  }],
  applicablePackages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismPackage',
  }],
  applicableVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TourismVendor',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: String,
  },
  terms: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
tourismCouponSchema.index({ code: 1 });
tourismCouponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
tourismCouponSchema.index({ createdAt: -1 });

// Method to validate coupon
tourismCouponSchema.methods.isValid = function(bookingAmount, packageId, vendorId, userId) {
  const now = new Date();
  
  // Check if active
  if (!this.isActive) return { valid: false, reason: 'Coupon is inactive' };
  
  // Check date validity
  if (this.validFrom && now < this.validFrom) return { valid: false, reason: 'Coupon not yet valid' };
  if (this.validUntil && now > this.validUntil) return { valid: false, reason: 'Coupon has expired' };
  
  // Check usage limit
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return { valid: false, reason: 'Coupon usage limit reached' };
  }
  
  // Check minimum amount
  if (bookingAmount < this.minAmount) {
    return { valid: false, reason: `Minimum booking amount is ₹${this.minAmount}` };
  }
  
  // Check package applicability
  if (this.applicablePackages.length > 0 && packageId) {
    const isApplicable = this.applicablePackages.some(id => id.toString() === packageId.toString());
    if (!isApplicable) return { valid: false, reason: 'Coupon not applicable for this package' };
  }
  
  // Check vendor applicability
  if (this.applicableVendors.length > 0 && vendorId) {
    const isApplicable = this.applicableVendors.some(id => id.toString() === vendorId.toString());
    if (!isApplicable) return { valid: false, reason: 'Coupon not applicable for this vendor' };
  }
  
  return { valid: true };
};

// Method to calculate discount
tourismCouponSchema.methods.calculateDiscount = function(bookingAmount) {
  let discount = 0;
  
  if (this.discountType === 'percentage') {
    discount = Math.round((bookingAmount * this.discountPercent) / 100);
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else {
    discount = this.discountAmount;
  }
  
  return Math.min(discount, bookingAmount);
};

// Method to increment usage count
tourismCouponSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  return this.save();
};

const TourismCoupon = mongoose.model('TourismCoupon', tourismCouponSchema);

module.exports = TourismCoupon;
