/**
 * Monetization Configuration for Classified Listings
 */

const MONETIZATION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Listing',
    price: 0,
    duration: 30, // days
    features: [
      'Basic listing visibility',
      'Up to 4 images',
      'Chat with buyers',
      'Standard support',
    ],
    limits: {
      maxListingsPerMonth: 5,
      maxImagesPerListing: 4,
      maxCharactersDescription: 1000,
      promotionDuration: 30,
    },
  },
  featured: {
    id: 'featured',
    name: 'Featured Ad',
    price: 299,
    duration: 7, // days
    features: [
      'Top placement on home feed',
      'Up to 8 images + 1 video',
      'Highlighted badge',
      'Priority chat support',
      'Analytics dashboard',
    ],
    limits: {
      maxListingsPerMonth: 10,
      maxImagesPerListing: 8,
      maxCharactersDescription: 1500,
      promotionDuration: 7,
    },
  },
  urgent: {
    id: 'urgent',
    name: 'Urgent Tag',
    price: 149,
    duration: 3, // days
    features: [
      'Eye-catching urgent badge',
      'Search visibility boost',
      'Up to 6 images',
      'Quick response badge',
    ],
    limits: {
      maxListingsPerMonth: 8,
      maxImagesPerListing: 6,
      maxCharactersDescription: 1200,
      promotionDuration: 3,
    },
  },
  seller_pro: {
    id: 'seller_pro',
    name: 'Seller Pro',
    price: 999,
    duration: 30, // days
    features: [
      'Unlimited listings',
      'Up to 12 images + videos',
      '24/7 seller support',
      'Advanced analytics',
      'Price analytics',
      'Bulk upload tools',
      'Scheduled posting',
      'Auto-renewal option',
      'Featured placement rotation',
    ],
    limits: {
      maxListingsPerMonth: -1, // Unlimited
      maxImagesPerListing: 12,
      maxCharactersDescription: 1500,
      promotionDuration: 30,
    },
  },
};

const SUBSCRIPTION_TIERS = {
  none: {
    id: 'none',
    name: 'No Subscription',
    monthlyPrice: 0,
    monthlyLimit: 5,
    features: [],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 299,
    monthlyLimit: 20,
    features: [
      '20 listings per month',
      'Featured placement (5% of listings)',
      'Basic analytics',
      'Email support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 799,
    monthlyLimit: 100,
    features: [
      'Unlimited listings',
      'Featured placement (20% of listings)',
      'Advanced analytics',
      'Priority support',
      'Bulk upload',
      'Price history tracking',
      'Auto-renewal',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 2999,
    monthlyLimit: -1,
    features: [
      'Unlimited everything',
      'Always featured top 10',
      'Dedicated account manager',
      'Custom integrations',
      'API access',
      'White-label options',
    ],
  },
};

const PAYMENT_METHODS = {
  credit_card: {
    id: 'credit_card',
    name: 'Credit Card',
    icon: 'credit-card',
    enabled: true,
  },
  debit_card: {
    id: 'debit_card',
    name: 'Debit Card',
    icon: 'credit-card',
    enabled: true,
  },
  upi: {
    id: 'upi',
    name: 'UPI',
    icon: 'mobile-alt',
    enabled: true,
  },
  net_banking: {
    id: 'net_banking',
    name: 'Net Banking',
    icon: 'bank',
    enabled: true,
  },
  wallet: {
    id: 'wallet',
    name: 'Digital Wallet',
    icon: 'wallet',
    enabled: true,
  },
};

/**
 * Calculate effective plan based on listing data
 */
const getEffectivePlan = (listing = {}) => {
  if (listing.subscriptionTier && listing.subscriptionTier !== 'none') {
    return SUBSCRIPTION_TIERS[listing.subscriptionTier] || SUBSCRIPTION_TIERS.none;
  }

  if (listing.monetizationPlan === 'Featured') {
    return MONETIZATION_PLANS.featured;
  }

  if (listing.monetizationPlan === 'Urgent') {
    return MONETIZATION_PLANS.urgent;
  }

  if (listing.monetizationPlan === 'Seller Pro') {
    return MONETIZATION_PLANS.seller_pro;
  }

  return MONETIZATION_PLANS.free;
};

/**
 * Calculate total cost for listing promotion
 */
const calculatePromotionCost = (listing = {}, plan = 'free') => {
  const planData = MONETIZATION_PLANS[plan] || MONETIZATION_PLANS.free;
  return planData.price || 0;
};

/**
 * Get discount for subscription
 */
const getSubscriptionDiscount = (tier = 'none') => {
  const discounts = {
    starter: 0.1, // 10% discount on featured/urgent
    pro: 0.25, // 25% discount
    enterprise: 0.4, // 40% discount
  };

  return discounts[tier] || 0;
};

/**
 * Calculate listing expiry based on plan
 */
const calculateExpiryDate = (startDate = new Date(), plan = 'free') => {
  const planData = MONETIZATION_PLANS[plan] || MONETIZATION_PLANS.free;
  const durationMs = (planData.duration || 30) * 24 * 60 * 60 * 1000;
  return new Date(startDate.getTime() + durationMs);
};

/**
 * Check if listing is about to expire
 */
const isAboutToExpire = (expiryDate = new Date(), daysThreshold = 3) => {
  const now = new Date();
  const msThreshold = daysThreshold * 24 * 60 * 60 * 1000;
  return expiryDate.getTime() - now.getTime() <= msThreshold;
};

/**
 * Get revenue breakdown for admin dashboard
 */
const getRevenueBreakdown = (listings = []) => {
  const breakdown = {
    featured: 0,
    urgent: 0,
    seller_pro: 0,
    subscriptions: 0,
    total: 0,
  };

  listings.forEach((listing) => {
    if (listing.monetizationPlan === 'Featured') {
      breakdown.featured += MONETIZATION_PLANS.featured.price;
    } else if (listing.monetizationPlan === 'Urgent') {
      breakdown.urgent += MONETIZATION_PLANS.urgent.price;
    } else if (listing.monetizationPlan === 'Seller Pro') {
      breakdown.seller_pro += MONETIZATION_PLANS.seller_pro.price;
    }

    if (listing.subscriptionTier && listing.subscriptionTier !== 'none') {
      const tier = SUBSCRIPTION_TIERS[listing.subscriptionTier];
      if (tier) {
        breakdown.subscriptions += tier.monthlyPrice;
      }
    }
  });

  breakdown.total = breakdown.featured + breakdown.urgent + breakdown.seller_pro + breakdown.subscriptions;

  return breakdown;
};

module.exports = {
  MONETIZATION_PLANS,
  SUBSCRIPTION_TIERS,
  PAYMENT_METHODS,
  getEffectivePlan,
  calculatePromotionCost,
  getSubscriptionDiscount,
  calculateExpiryDate,
  isAboutToExpire,
  getRevenueBreakdown,
};
