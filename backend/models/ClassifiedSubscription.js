/**
 * ClassifiedSubscription Model
 * Manages subscription plans for classified ads module
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const PaymentHistorySchema = new mongoose.Schema(
  {
    gateway: {
      type: String,
      enum: ['razorpay', 'upi', 'manual', 'free'],
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'retry_created'],
      default: 'pending',
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    invoiceNumber: {
      type: String,
      default: '',
    },
    invoiceUrl: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: '',
    },
    retryOf: {
      type: String,
      default: '',
    },
    refundStatus: {
      type: String,
      enum: ['', 'pending', 'completed', 'failed'],
      default: '',
    },
    refundId: {
      type: String,
      default: '',
    },
    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const UnlockedAdSchema = new mongoose.Schema(
  {
    adId: {
      type: String,
      required: true,
    },
    adTitle: {
      type: String,
      default: '',
    },
    adCategory: {
      type: String,
      default: '',
    },
    sellerEmail: {
      type: String,
      default: '',
      lowercase: true,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    contactDetails: {
      phone: String,
      email: String,
      whatsapp: String,
    },
  },
  { _id: false }
);

const UsageHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['contact_unlock', 'featured_ad', 'ad_boost', 'bulk_upload'],
      required: true,
    },
    resourceId: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

const ClassifiedSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      default: '',
      trim: true,
    },
    tier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'business'],
      default: 'free',
      required: true,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    nextRenewalDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    
    // Payment details
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'upi', 'manual', 'free', ''],
      default: '',
    },
    transactionId: {
      type: String,
      default: '',
      index: true,
    },
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    lastPaymentAttemptAt: {
      type: Date,
      default: null,
    },
    lastPaymentError: {
      type: String,
      default: '',
    },
    
    // Usage tracking
    contactUnlocksUsed: {
      type: Number,
      min: 0,
      default: 0,
    },
    contactUnlocksLimit: {
      type: Number,
      min: 0,
      default: 0,
    },
    unlockedAds: {
      type: [UnlockedAdSchema],
      default: [],
    },
    usageHistory: {
      type: [UsageHistorySchema],
      default: [],
    },
    
    // Features/Entitlements (based on tier)
    entitlements: {
      unlimitedContactAccess: { type: Boolean, default: false },
      featuredAdSlots: { type: Number, default: 0 },
      adBoosts: { type: Number, default: 0 },
      verifiedBadge: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      bulkUpload: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      adFree: { type: Boolean, default: false },
      dedicatedStorefront: { type: Boolean, default: false },
    },
    
    // Payment history
    paymentHistory: {
      type: [PaymentHistorySchema],
      default: [],
    },
    
    // Cancellation
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
      trim: true,
    },
    cancelledBy: {
      type: String,
      enum: ['', 'user', 'admin', 'system'],
      default: '',
    },
    
    // Refund details
    refundDetails: {
      refundId: { type: String, default: '' },
      refundAmount: { type: Number, min: 0, default: 0 },
      refundReason: { type: String, default: '' },
      refundedAt: { type: Date, default: null },
      processedBy: { type: String, default: '' },
    },
    
    // Trial
    isTrialPeriod: {
      type: Boolean,
      default: false,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    
    // Promo codes
    promoCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    discountApplied: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    
    // Metadata
    source: {
      type: String,
      default: 'web',
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ClassifiedSubscriptionSchema.index({ userId: 1, isActive: 1 });
ClassifiedSubscriptionSchema.index({ userEmail: 1, isActive: 1 });
ClassifiedSubscriptionSchema.index({ tier: 1, isActive: 1 });
ClassifiedSubscriptionSchema.index({ endDate: 1, isActive: 1 });
ClassifiedSubscriptionSchema.index({ nextRenewalDate: 1, autoRenew: 1 });
ClassifiedSubscriptionSchema.index({ paymentStatus: 1, tier: 1 });
ClassifiedSubscriptionSchema.index({ createdAt: -1 });

// Virtual for days remaining
ClassifiedSubscriptionSchema.virtual('daysRemaining').get(function () {
  if (!this.endDate) {
    return 0;
  }
  const now = new Date();
  const diffMs = new Date(this.endDate) - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
});

// Virtual for is expired
ClassifiedSubscriptionSchema.virtual('isExpired').get(function () {
  if (!this.endDate) {
    return false;
  }
  return new Date() > new Date(this.endDate);
});

// Virtual for can use features
ClassifiedSubscriptionSchema.virtual('canUseFeatures').get(function () {
  return this.isActive && !this.isExpired;
});

// Virtual for remaining unlocks
ClassifiedSubscriptionSchema.virtual('remainingUnlocks').get(function () {
  if (this.entitlements.unlimitedContactAccess) {
    return Infinity;
  }
  return Math.max(0, this.contactUnlocksLimit - this.contactUnlocksUsed);
});

// Method to check if user can unlock contact
ClassifiedSubscriptionSchema.methods.canUnlockContact = function () {
  if (!this.isActive || this.isExpired) {
    return false;
  }
  
  if (this.entitlements.unlimitedContactAccess) {
    return true;
  }
  
  return this.contactUnlocksUsed < this.contactUnlocksLimit;
};

// Method to unlock a contact
ClassifiedSubscriptionSchema.methods.unlockContact = async function (adId, adTitle, adCategory, sellerEmail, contactDetails) {
  if (!this.canUnlockContact()) {
    throw new Error('Contact unlock limit reached or subscription inactive');
  }
  
  // Check if already unlocked
  const alreadyUnlocked = this.unlockedAds.some(
    (ad) => String(ad.adId) === String(adId)
  );
  
  if (alreadyUnlocked) {
    return { alreadyUnlocked: true, unlocked: true };
  }
  
  // Add to unlocked ads
  this.unlockedAds.push({
    adId: String(adId),
    adTitle: adTitle || '',
    adCategory: adCategory || '',
    sellerEmail: sellerEmail || '',
    unlockedAt: new Date(),
    contactDetails: contactDetails || {},
  });
  
  // Increment usage counter (only if not unlimited)
  if (!this.entitlements.unlimitedContactAccess) {
    this.contactUnlocksUsed += 1;
  }
  
  // Add to usage history
  this.usageHistory.push({
    action: 'contact_unlock',
    resourceId: String(adId),
    timestamp: new Date(),
    metadata: {
      adTitle: adTitle || '',
      adCategory: adCategory || '',
      sellerEmail: sellerEmail || '',
    },
  });
  
  await this.save();
  
  return { alreadyUnlocked: false, unlocked: true };
};

// Method to check if ad already unlocked
ClassifiedSubscriptionSchema.methods.isAdUnlocked = function (adId) {
  return this.unlockedAds.some((ad) => String(ad.adId) === String(adId));
};

// Method to get unlocked contact details
ClassifiedSubscriptionSchema.methods.getUnlockedContactDetails = function (adId) {
  const unlockedAd = this.unlockedAds.find(
    (ad) => String(ad.adId) === String(adId)
  );
  return unlockedAd ? unlockedAd.contactDetails : null;
};

// Static method to get tier limits
ClassifiedSubscriptionSchema.statics.getTierLimits = function (tier) {
  const limits = {
    free: {
      contactUnlocksLimit: 0,
      unlimitedContactAccess: false,
      featuredAdSlots: 0,
      adBoosts: 0,
      verifiedBadge: false,
      prioritySupport: false,
      advancedAnalytics: false,
      bulkUpload: false,
      apiAccess: false,
      adFree: false,
      dedicatedStorefront: false,
    },
    basic: {
      contactUnlocksLimit: 10,
      unlimitedContactAccess: false,
      featuredAdSlots: 1,
      adBoosts: 2,
      verifiedBadge: false,
      prioritySupport: false,
      advancedAnalytics: false,
      bulkUpload: false,
      apiAccess: false,
      adFree: false,
      dedicatedStorefront: false,
    },
    pro: {
      contactUnlocksLimit: 0,
      unlimitedContactAccess: true,
      featuredAdSlots: 3,
      adBoosts: 10,
      verifiedBadge: false,
      prioritySupport: true,
      advancedAnalytics: true,
      bulkUpload: false,
      apiAccess: false,
      adFree: true,
      dedicatedStorefront: false,
    },
    business: {
      contactUnlocksLimit: 0,
      unlimitedContactAccess: true,
      featuredAdSlots: 10,
      adBoosts: 50,
      verifiedBadge: true,
      prioritySupport: true,
      advancedAnalytics: true,
      bulkUpload: true,
      apiAccess: true,
      adFree: true,
      dedicatedStorefront: true,
    },
  };
  
  return limits[tier] || limits.free;
};

// Static method to get tier pricing
ClassifiedSubscriptionSchema.statics.getTierPricing = function (tier, billingCycle = 'monthly') {
  const pricing = {
    free: { monthly: 0, quarterly: 0, yearly: 0 },
    basic: { monthly: 99, quarterly: 267, yearly: 950 }, // 10% discount quarterly, 20% yearly
    pro: { monthly: 299, quarterly: 807, yearly: 2870 },
    business: { monthly: 999, quarterly: 2697, yearly: 9590 },
  };
  
  return pricing[tier]?.[billingCycle] || 0;
};

// Static method to calculate end date
ClassifiedSubscriptionSchema.statics.calculateEndDate = function (startDate, billingCycle) {
  const start = new Date(startDate);
  const end = new Date(start);
  
  switch (billingCycle) {
    case 'monthly':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'quarterly':
      end.setMonth(end.getMonth() + 3);
      break;
    case 'yearly':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
  }
  
  return end;
};

// Pre-save middleware to set entitlements based on tier
ClassifiedSubscriptionSchema.pre('save', function (next) {
  if (this.isModified('tier') || this.isNew) {
    const tierLimits = this.constructor.getTierLimits(this.tier);
    this.entitlements = tierLimits;
    this.contactUnlocksLimit = tierLimits.contactUnlocksLimit;
  }
  next();
});

// Pre-save middleware to update user model
ClassifiedSubscriptionSchema.post('save', async function (doc) {
  try {
    const User = mongoose.model('User');
    
    if (doc.isActive && !doc.isExpired) {
      await User.findByIdAndUpdate(doc.userId, {
        classifiedsSubscriptionTier: doc.tier,
        classifiedsSubscriptionExpiry: doc.endDate,
        classifiedsContactUnlocksRemaining: doc.remainingUnlocks === Infinity 
          ? 999999 
          : doc.remainingUnlocks,
        classifiedsContactUnlocksUsed: doc.contactUnlocksUsed,
      });
    }
  } catch (error) {
    console.error('Error updating user subscription info:', error);
  }
});

ClassifiedSubscriptionSchema.set('toJSON', { virtuals: true });
ClassifiedSubscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ClassifiedSubscription', ClassifiedSubscriptionSchema);
