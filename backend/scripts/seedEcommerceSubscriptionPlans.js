/**
 * Seed Ecommerce Subscription Plans
 * Run this script to initialize the subscription plans in the database
 * 
 * Usage: node backend/scripts/seedEcommerceSubscriptionPlans.js
 */

const mongoose = require('mongoose');
const EcommerceSubscriptionPlan = require('../models/EcommerceSubscriptionPlan');

const plans = [
  {
    planId: 'ecom-free',
    name: 'Free',
    slug: 'free',
    description: 'Perfect for getting started with online selling',
    tagline: 'Start selling today - No credit card required',
    pricing: {
      monthly: {
        amount: 0,
        currency: 'INR',
      },
      quarterly: {
        amount: 0,
        currency: 'INR',
        discount: 0,
      },
      yearly: {
        amount: 0,
        currency: 'INR',
        discount: 0,
      },
    },
    features: {
      productListingLimit: 10,
      imagePerProduct: 3,
      bulkUpload: false,
      advancedAnalytics: false,
      prioritySupport: false,
      customStorefront: false,
      promotionalBanner: false,
      featuredListing: {
        count: 0,
      },
      apiAccess: false,
      multiUserAccess: false,
      warehouseManagement: false,
      dedicatedAccountManager: false,
    },
    commission: {
      type: 'percentage',
      defaultRate: 15,
      minimumAmount: 10,
      categoryRates: [],
    },
    trial: {
      available: true,
      durationDays: 14,
    },
    isActive: true,
    isPublic: true,
    displayOrder: 1,
    isRecommended: false,
    benefits: [
      {
        title: 'List up to 10 products',
        description: 'Start with a curated product selection',
        icon: '📦',
      },
      {
        title: '3 images per product',
        description: 'Showcase your products with multiple angles',
        icon: '📸',
      },
      {
        title: 'Basic analytics',
        description: 'Track your sales and performance',
        icon: '📊',
      },
      {
        title: 'Email support',
        description: 'Get help when you need it',
        icon: '📧',
      },
    ],
  },
  {
    planId: 'ecom-basic',
    name: 'Basic',
    slug: 'basic',
    description: 'Ideal for growing businesses looking to expand their reach',
    tagline: 'Most Popular - Scale your business',
    pricing: {
      monthly: {
        amount: 999,
        currency: 'INR',
      },
      quarterly: {
        amount: 2697,
        currency: 'INR',
        discount: 10,
      },
      yearly: {
        amount: 9590,
        currency: 'INR',
        discount: 20,
      },
    },
    features: {
      productListingLimit: 100,
      imagePerProduct: 8,
      bulkUpload: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customStorefront: false,
      promotionalBanner: true,
      featuredListing: {
        count: 5,
      },
      apiAccess: false,
      multiUserAccess: false,
      warehouseManagement: false,
      dedicatedAccountManager: false,
    },
    commission: {
      type: 'percentage',
      defaultRate: 10,
      minimumAmount: 5,
      categoryRates: [],
    },
    trial: {
      available: true,
      durationDays: 7,
    },
    isActive: true,
    isPublic: true,
    displayOrder: 2,
    isRecommended: true,
    benefits: [
      {
        title: 'List up to 100 products',
        description: 'Expand your product catalog',
        icon: '📦',
      },
      {
        title: '8 images per product',
        description: 'Show every detail to customers',
        icon: '📸',
      },
      {
        title: 'Bulk product upload',
        description: 'Save time with CSV imports',
        icon: '⚡',
      },
      {
        title: 'Advanced analytics',
        description: 'Deep insights into your business',
        icon: '📈',
      },
      {
        title: 'Priority support',
        description: '24/7 email and chat support',
        icon: '🎯',
      },
      {
        title: 'Featured listings',
        description: 'Promote 5 products on homepage',
        icon: '⭐',
      },
      {
        title: 'Lower commission - 10%',
        description: 'Keep more of your revenue',
        icon: '💰',
      },
    ],
  },
  {
    planId: 'ecom-premium',
    name: 'Premium',
    slug: 'premium',
    description: 'For established businesses seeking maximum visibility and features',
    tagline: 'Best Value - Maximum features',
    pricing: {
      monthly: {
        amount: 2999,
        currency: 'INR',
      },
      quarterly: {
        amount: 8097,
        currency: 'INR',
        discount: 10,
      },
      yearly: {
        amount: 28790,
        currency: 'INR',
        discount: 20,
      },
    },
    features: {
      productListingLimit: 1000,
      imagePerProduct: 15,
      bulkUpload: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customStorefront: true,
      promotionalBanner: true,
      featuredListing: {
        count: 20,
      },
      apiAccess: true,
      multiUserAccess: true,
      warehouseManagement: true,
      dedicatedAccountManager: false,
    },
    commission: {
      type: 'percentage',
      defaultRate: 5,
      minimumAmount: 0,
      categoryRates: [],
    },
    trial: {
      available: true,
      durationDays: 7,
    },
    isActive: true,
    isPublic: true,
    displayOrder: 3,
    isRecommended: false,
    benefits: [
      {
        title: 'List up to 1000 products',
        description: 'Build a comprehensive catalog',
        icon: '📦',
      },
      {
        title: '15 images per product',
        description: 'Complete product showcase',
        icon: '📸',
      },
      {
        title: 'Custom storefront',
        description: 'Brand your own online store',
        icon: '🏪',
      },
      {
        title: 'API access',
        description: 'Integrate with your systems',
        icon: '🔌',
      },
      {
        title: 'Multi-user access',
        description: 'Collaborate with your team',
        icon: '👥',
      },
      {
        title: 'Warehouse management',
        description: 'Manage inventory across locations',
        icon: '🏭',
      },
      {
        title: 'Featured listings (20)',
        description: 'Maximum product visibility',
        icon: '⭐',
      },
      {
        title: 'Lowest commission - 5%',
        description: 'Maximize your profit margins',
        icon: '💎',
      },
    ],
  },
  {
    planId: 'ecom-enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Tailored solutions for large-scale operations',
    tagline: 'Custom solutions for your business',
    pricing: {
      monthly: {
        amount: 9999,
        currency: 'INR',
      },
      quarterly: {
        amount: 26997,
        currency: 'INR',
        discount: 10,
      },
      yearly: {
        amount: 95990,
        currency: 'INR',
        discount: 20,
      },
    },
    features: {
      productListingLimit: -1, // Unlimited
      imagePerProduct: 25,
      bulkUpload: true,
      advancedAnalytics: true,
      prioritySupport: true,
      customStorefront: true,
      promotionalBanner: true,
      featuredListing: {
        count: -1, // Unlimited
      },
      apiAccess: true,
      multiUserAccess: true,
      warehouseManagement: true,
      dedicatedAccountManager: true,
    },
    commission: {
      type: 'percentage',
      defaultRate: 3,
      minimumAmount: 0,
      categoryRates: [],
    },
    trial: {
      available: false,
      durationDays: 0,
    },
    isActive: true,
    isPublic: true,
    displayOrder: 4,
    isRecommended: false,
    benefits: [
      {
        title: 'Unlimited products',
        description: 'No limits on your catalog',
        icon: '∞',
      },
      {
        title: '25 images per product',
        description: 'Premium product presentation',
        icon: '📸',
      },
      {
        title: 'Dedicated account manager',
        description: 'Personalized business support',
        icon: '👔',
      },
      {
        title: 'White-label storefront',
        description: 'Complete brand customization',
        icon: '🎨',
      },
      {
        title: 'Priority fulfillment',
        description: 'Faster order processing',
        icon: '⚡',
      },
      {
        title: 'Custom integrations',
        description: 'Tailored API solutions',
        icon: '🔧',
      },
      {
        title: 'Unlimited featured listings',
        description: 'Maximum market exposure',
        icon: '🌟',
      },
      {
        title: 'Minimum commission - 3%',
        description: 'Enterprise-level pricing',
        icon: '💰',
      },
    ],
  },
];

async function seedPlans() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/superapp';
    await mongoose.connect(mongoUri);

    console.log('Connected to MongoDB');

    // Clear existing plans
    await EcommerceSubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    // Insert new plans
    const createdPlans = await EcommerceSubscriptionPlan.insertMany(plans);
    console.log(`Seeded ${createdPlans.length} subscription plans successfully`);

    // Display created plans
    createdPlans.forEach((plan) => {
      console.log(`  ✓ ${plan.name} (${plan.slug}) - ₹${plan.pricing.monthly.amount}/month`);
    });

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    process.exit(1);
  }
}

// Run the seed function
seedPlans();
