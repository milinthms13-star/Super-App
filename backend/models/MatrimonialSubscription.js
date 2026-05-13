/**
 * Matrimonial Subscription Schema
 * Premium tiers: Gold, Premium, VIP
 */

const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatrimonialProfile',
      required: true,
      index: true,
    },

    userEmail: {
      type: String,
      required: true,
      index: true,
    },

    // Subscription Tier
    tier: {
      type: String,
      enum: ['free', 'gold', 'premium', 'vip'],
      default: 'free',
      required: true,
    },

    // Billing Cycle
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'monthly',
    },

    // Subscription Period
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    endDate: {
      type: Date,
      required: true,
    },

    nextRenewalDate: Date,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Payment Info
    paymentMethod: String, // 'razorpay', 'stripe', 'upi', 'wallet'
    transactionId: String,
    amount: {
      type: mongoose.Decimal128,
      required: true,
    },

    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    lastPaymentAttemptAt: Date,
    lastPaymentError: { type: String, default: '' },
    paymentHistory: [
      {
        gateway: String,
        orderId: String,
        paymentId: String,
        status: String,
        amount: Number,
        currency: { type: String, default: 'INR' },
        invoiceNumber: String,
        invoiceUrl: String,
        createdAt: Date,
        verifiedAt: Date,
        failureReason: String,
        retryOf: String,
        refundStatus: String,
        refundId: String,
      },
    ],

    // Auto-Renewal
    autoRenew: { type: Boolean, default: true },
    renewalAttempts: { type: Number, default: 0 },
    lastRenewalAttempt: Date,

    // Refund Info
    refundDetails: {
      refundedAt: Date,
      refundReason: String,
      refundAmount: mongoose.Decimal128,
      refundStatus: String, // 'pending', 'completed', 'failed'
      refundedBy: String, // Admin email
      refundNotes: String,
    },

    // Entitlements (what user can access with this tier)
    entitlements: {
      profileViews: { type: Number, default: 100 },
      profileViewsUsed: { type: Number, default: 0 },
      interestRequests: { type: Number, default: 50 },
      interestRequestsUsed: { type: Number, default: 0 },
      directMessages: { type: Number, default: 100 },
      directMessagesUsed: { type: Number, default: 0 },
      premiumFilter: { type: Boolean, default: false },
      horoscopeMatching: { type: Boolean, default: false },
      priority: { type: Boolean, default: false },
      profileBadge: { type: Boolean, default: false },
      videoCalls: { type: Boolean, default: false },
    },

    // Cancellation
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: String, // 'user', 'system', 'admin'

    // Expiry Warning
    expiryWarningsSent: [
      {
        sentAt: Date,
        daysRemaining: Number,
        method: String, // 'email', 'sms', 'push'
      },
    ],

    // Audit Trail
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'matrimonial_subscriptions',
  }
);

// Index for active subscriptions
SubscriptionSchema.index({ userEmail: 1, isActive: 1 });
SubscriptionSchema.index({ endDate: 1, autoRenew: 1 });

module.exports = mongoose.model('MatrimonialSubscription', SubscriptionSchema);
