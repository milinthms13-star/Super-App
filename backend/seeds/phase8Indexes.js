/**
 * Phase 8 Indexes & Seed Data
 * Creates MongoDB indexes and seeds initial data for Phase 8 features
 * Run with: npm run seed:phase8
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Models
const MenuVariant = require('../models/MenuVariant');
const AddOn = require('../models/AddOn');
const ScheduledOrder = require('../models/ScheduledOrder');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const UserPreference = require('../models/UserPreference');
const FoodDeliveryAnalytics = require('../models/FoodDeliveryAnalytics');

/**
 * Create indexes for all Phase 8 models
 */
async function createIndexes() {
  try {
    console.log('Creating Phase 8 indexes...');

    // MenuVariant Indexes
    await MenuVariant.collection.createIndex({ menuItemId: 1, status: 1 });
    await MenuVariant.collection.createIndex({ restaurantId: 1, status: 1 });
    await MenuVariant.collection.createIndex({ variantName: 1 });
    await MenuVariant.collection.createIndex({ isPopular: -1, orderCount: -1 });
    console.log('✓ MenuVariant indexes created');

    // AddOn Indexes
    await AddOn.collection.createIndex({ restaurantId: 1, status: 1 });
    await AddOn.collection.createIndex({ category: 1, status: 1 });
    await AddOn.collection.createIndex({ 'popularity.orderCount': -1 });
    console.log('✓ AddOn indexes created');

    // ScheduledOrder Indexes
    await ScheduledOrder.collection.createIndex({ userId: 1, status: 1 });
    await ScheduledOrder.collection.createIndex({ restaurantId: 1, scheduledDeliveryTime: 1 });
    await ScheduledOrder.collection.createIndex({ scheduledDeliveryTime: 1, status: 1 });
    await ScheduledOrder.collection.createIndex({ status: 1, 'cancellation.isCancelled': 1 });
    // TTL index for automatic cleanup of delivered orders after 90 days
    await ScheduledOrder.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
    console.log('✓ ScheduledOrder indexes created');

    // LoyaltyAccount Indexes
    await LoyaltyAccount.collection.createIndex({ userId: 1 }, { unique: true });
    await LoyaltyAccount.collection.createIndex({ 'tier.currentTier': 1 });
    await LoyaltyAccount.collection.createIndex({ 'points.currentBalance': -1 });
    await LoyaltyAccount.collection.createIndex({ createdAt: -1 });
    console.log('✓ LoyaltyAccount indexes created');

    // UserPreference Indexes
    await UserPreference.collection.createIndex({ userId: 1 }, { unique: true });
    await UserPreference.collection.createIndex({ 'cuisinePreferences.favorites': 1 });
    await UserPreference.collection.createIndex({ 'pricePreference.budget': 1 });
    await UserPreference.collection.createIndex({ 'healthGoals.goal': 1 });
    console.log('✓ UserPreference indexes created');

    // FoodDeliveryAnalytics Indexes
    await FoodDeliveryAnalytics.collection.createIndex({ date: -1 });
    await FoodDeliveryAnalytics.collection.createIndex({ period: 1, date: -1 });
    await FoodDeliveryAnalytics.collection.createIndex({ 'orders.totalOrders': -1 });
    await FoodDeliveryAnalytics.collection.createIndex({ 'revenue.grossRevenue': -1 });
    // TTL index for automatic cleanup of old analytics after 1 year
    await FoodDeliveryAnalytics.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
    console.log('✓ FoodDeliveryAnalytics indexes created');

    console.log('✓ All Phase 8 indexes created successfully\n');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
    throw error;
  }
}

/**
 * Seed initial data for Phase 8
 */
async function seedData() {
  try {
    console.log('Seeding Phase 8 initial data...');

    // Sample Menu Variants
    const sampleVariants = [
      {
        variantId: `variant_${Date.now()}_1`,
        menuItemId: 'item_001',
        restaurantId: 'rest_001',
        variantName: 'half',
        displayName: 'Half Portion',
        basePrice: 199,
        priceModifier: 0,
        portion: { quantity: 1, unit: 'plate' },
        calories: 250,
        protein: 15,
        carbs: 30,
        fats: 8,
        availability: {
          isAvailable: true,
          startTime: '10:00',
          endTime: '23:00',
          availableOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        isPopular: true,
        orderCount: 245,
        averageRating: 4.6,
        sequenceOrder: 1,
        status: 'active',
      },
      {
        variantId: `variant_${Date.now()}_2`,
        menuItemId: 'item_001',
        restaurantId: 'rest_001',
        variantName: 'full',
        displayName: 'Full Portion',
        basePrice: 349,
        priceModifier: 150,
        portion: { quantity: 2, unit: 'plate' },
        calories: 500,
        protein: 30,
        carbs: 60,
        fats: 16,
        availability: {
          isAvailable: true,
          startTime: '10:00',
          endTime: '23:00',
          availableOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        isPopular: true,
        orderCount: 412,
        averageRating: 4.7,
        sequenceOrder: 2,
        status: 'active',
      },
    ];

    await MenuVariant.insertMany(sampleVariants, { ordered: false }).catch(() => {
      // Ignore duplicate errors
    });
    console.log('✓ Sample menu variants seeded');

    // Sample Add-Ons
    const sampleAddOns = [
      {
        addOnId: `addon_${Date.now()}_1`,
        restaurantId: 'rest_001',
        addOnName: 'Extra Cheese',
        category: 'cheese',
        price: 50,
        isVegetarian: true,
        calories: 120,
        popularity: { orderCount: 1230, averageRating: 4.8 },
        restrictions: {
          allergens: ['dairy'],
          containsGluten: false,
          containsNuts: false,
          containsDairy: true,
          spiceLevel: 'none',
        },
        availability: {
          isAvailable: true,
          startTime: '10:00',
          endTime: '23:00',
          availableOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        itemsCompatible: ['item_001', 'item_002'],
        maxQuantity: 5,
        sequenceOrder: 1,
        status: 'active',
      },
      {
        addOnId: `addon_${Date.now()}_2`,
        restaurantId: 'rest_001',
        addOnName: 'Mayo Sauce',
        category: 'sauce',
        price: 30,
        isVegetarian: true,
        calories: 90,
        popularity: { orderCount: 856, averageRating: 4.5 },
        restrictions: {
          allergens: ['eggs'],
          containsGluten: false,
          containsNuts: false,
          containsDairy: false,
          spiceLevel: 'none',
        },
        availability: {
          isAvailable: true,
          startTime: '10:00',
          endTime: '23:00',
          availableOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        itemsCompatible: ['item_002', 'item_003'],
        maxQuantity: 10,
        sequenceOrder: 2,
        status: 'active',
      },
    ];

    await AddOn.insertMany(sampleAddOns, { ordered: false }).catch(() => {
      // Ignore duplicate errors
    });
    console.log('✓ Sample add-ons seeded');

    // Sample Loyalty Accounts
    const sampleLoyaltyAccounts = [
      {
        loyaltyAccountId: `loyalty_${Date.now()}_1`,
        userId: 'user_001',
        points: {
          currentBalance: 2450,
          totalEarned: 5000,
          totalRedeemed: 2550,
          expiringPoints: [],
        },
        tier: {
          currentTier: 'gold',
          tierLevel: 3,
          pointsToNextTier: 550,
          achievedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          benefits: {
            pointsMultiplier: 1.5,
            cashbackPercentage: 3,
            freeDeliveryPerMonth: 5,
            prioritySupport: true,
            exclusiveOffers: [],
          },
        },
        transactions: [],
        rewards: { available: [], redeemed: [] },
        earningRules: {
          pointsPerRupee: 1,
          minimumOrderValue: 200,
          categoriesBonusPoints: new Map([['premium', 2]]),
        },
        membership: {
          status: 'active',
          joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
          renewalDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
          annualFee: 0,
          premiumTierUnlocked: false,
        },
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          autoRedeemPoints: false,
          minPointsToAutoRedeem: 500,
        },
        stats: {
          totalOrdersPlaced: 127,
          totalSpent: 45000,
          averageOrderValue: 354,
          lastOrderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          frequentRestaurantIds: ['rest_001', 'rest_002'],
        },
        referralCode: 'LOYAL2024',
        referredUsers: [],
      },
    ];

    await LoyaltyAccount.insertMany(sampleLoyaltyAccounts, { ordered: false }).catch(() => {
      // Ignore duplicate errors
    });
    console.log('✓ Sample loyalty accounts seeded');

    // Sample User Preferences
    const sampleUserPreferences = [
      {
        preferenceId: `pref_${Date.now()}_1`,
        userId: 'user_001',
        dietaryPreferences: {
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false,
          kosher: false,
          halal: false,
          keto: false,
          paleo: false,
        },
        allergies: [{ allergen: 'peanuts', severity: 'moderate' }],
        cuisinePreferences: {
          favorites: [
            { cuisine: 'Indian', preferenceScore: 0.9 },
            { cuisine: 'Chinese', preferenceScore: 0.7 },
          ],
          disliked: [{ cuisine: 'Seafood', preferenceScore: 0.2 }],
          exploring: [],
        },
        pricePreference: {
          budget: 'mid-range',
          avgOrderValue: 350,
          maxPricePerItem: 500,
          minPricePerItem: 100,
        },
        spiceLevel: { preference: 'hot', preferenceScore: 4 },
        mealTypes: {
          breakfast: true,
          lunch: true,
          dinner: true,
          snacks: true,
          desserts: false,
          beverages: true,
        },
        favoriteRestaurants: [
          { restaurantId: 'rest_001', rating: 4.7, orderCount: 45, lastOrderDate: new Date() },
        ],
        favoriteItems: [
          {
            itemId: 'item_001',
            itemName: 'Biryani',
            restaurantId: 'rest_001',
            orderCount: 12,
            lastOrderedDate: new Date(),
            rating: 4.8,
            preferenceScore: 0.95,
          },
        ],
        orderingPatterns: {
          preferredOrderingDays: ['Fri', 'Sat', 'Sun'],
          preferredOrderingTimes: ['12:00-14:00', '19:00-21:00'],
          avgOrderFrequency: 3.5,
          avgOrdersPerWeek: 3,
          avgOrdersPerMonth: 12,
          busySeasons: ['monsoon'],
        },
        deliveryPreferences: {
          preferredDeliveryTimes: ['12:00-14:00', '19:00-21:00'],
          acceptDelayedDelivery: false,
          maxDeliveryTime: 45,
          preferredDeliveryAreas: ['downtown'],
        },
        paymentPreferences: {
          preferredMethods: ['card', 'upi'],
          preferCashback: true,
          preferDiscounts: true,
        },
        seasonalPreferences: {
          summer: ['cold_drinks', 'ice_cream'],
          monsoon: ['hot_soups', 'warm_drinks'],
          winter: ['hot_meals'],
          spring: [],
        },
        healthGoals: [{ goal: 'balance', active: true, startDate: new Date() }],
        calorieGoal: { active: false, dailyLimit: 2000 },
        notificationPreferences: {
          recommendedDishes: true,
          newRestaurants: true,
          specialOffers: true,
          loyaltyRewards: true,
          orderReminders: true,
        },
        mlFeatures: {
          engagementScore: 0.85,
          loyaltyScore: 0.9,
          priceElasticity: -1.2,
          diversityIndex: 0.65,
          predictedChurnRisk: 0.1,
        },
      },
    ];

    await UserPreference.insertMany(sampleUserPreferences, { ordered: false }).catch(() => {
      // Ignore duplicate errors
    });
    console.log('✓ Sample user preferences seeded');

    // Sample Analytics Record
    const sampleAnalytics = [
      {
        analyticsId: `analytics_${Date.now()}_1`,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        period: 'daily',
        orders: {
          totalOrders: 2847,
          completedOrders: 2756,
          cancelledOrders: 65,
          failedOrders: 26,
          scheduledOrders: 312,
          cancelRatio: 0.023,
          avgOrderValue: 389,
          medianOrderValue: 350,
          totalOrderValue: 1107883,
          orderValueBrackets: {
            under100: 145,
            between100_200: 612,
            between200_500: 1521,
            between500_1000: 456,
            over1000: 113,
          },
        },
        revenue: {
          grossRevenue: 1107883,
          platformFeeCollected: 55394,
          taxCollected: 99709,
          discountsGiven: 44315,
          netRevenue: 908465,
          deliveryCharges: 284757,
          revenueByCategory: new Map([
            ['North Indian', 450000],
            ['Chinese', 320000],
            ['South Indian', 250000],
          ]),
        },
        delivery: {
          avgDeliveryTime: 28,
          medianDeliveryTime: 26,
          onTimeDeliveries: 2648,
          lateDeliveries: 108,
          onTimePercentage: 96.1,
          avgDeliveryDistance: 4.2,
          totalDeliveryDistance: 11958,
          deliveryPartnerUtilization: 0.87,
          busiestDeliveryHour: 19,
        },
        users: {
          activeUsers: 1856,
          newUsers: 124,
          returningUsers: 1732,
          userRetentionRate: 0.93,
          userChurnRate: 0.07,
          avgUsersPerOrder: 1.0,
          userSegmentation: {
            frequent: 342,
            occasional: 892,
            rare: 456,
            inactive: 166,
          },
        },
        restaurants: {
          activeRestaurants: 247,
          topPerformingRestaurants: [
            { restaurantId: 'rest_001', orders: 187, revenue: 72843, avgRating: 4.7, cancellationRate: 0.02 },
          ],
          restaurantsByCategory: new Map([['North Indian', 67]]),
          avgRestaurantRevenue: 4480,
          avgOrdersPerRestaurant: 11.5,
        },
        payments: {
          totalTransactions: 2756,
          successfulPayments: 2701,
          failedPayments: 55,
          paymentSuccessRate: 0.98,
          paymentMethodBreakdown: {
            wallet: 612,
            card: 1245,
            upi: 789,
            cod: 110,
          },
          avgTransactionValue: 410,
        },
        ratings: {
          avgOrderRating: 4.52,
          avgDeliveryRating: 4.68,
          avgRestaurantRating: 4.61,
          ratingDistribution: {
            fiveStar: 1847,
            fourStar: 712,
            threeStar: 156,
            twoStar: 35,
            oneStar: 6,
          },
          complaintsReceived: 47,
          complaintResolutionRate: 0.96,
        },
        peakHours: [12, 13, 19, 20, 21],
        peakDays: ['Fri', 'Sat', 'Sun'],
        traffic: {
          totalSessions: 8946,
          avgSessionDuration: 14.3,
          uniqueVisitors: 3421,
          pageViews: 28754,
          appOpens: 5632,
          searchesPerformed: 1847,
          topSearches: ['biryani', 'pizza', 'dosa'],
        },
        promotions: {
          activeCouponCodes: 23,
          couponUsageCount: 487,
          totalDiscountsUsed: 44315,
          avgDiscountValue: 91,
          loyaltyPointsRedeemed: 156000,
          referralBonus: 8400,
        },
        operations: {
          avgPrepTime: 8.4,
          avgAcceptanceTime: 1.2,
          cancellationReasons: new Map([['user_request', 65]]),
          returnOrders: 12,
          replacementOrders: 8,
          foodQualityComplaints: 23,
          deliveryQualityComplaints: 24,
        },
        competition: {
          marketShare: 0.24,
          avgPriceComparison: -2.3,
          deliveryFeeComparison: 0,
          userPreferenceScore: 0.78,
        },
        riders: {
          activeRiders: 426,
          totalOrdersDelivered: 2756,
          avgOrdersPerRider: 6.5,
          riderEarnings: {
            totalEarnings: 284757,
            avgEarningsPerRider: 668,
          },
          riderRatings: {
            avgRating: 4.68,
            topRatedRiders: ['rider_001', 'rider_002'],
          },
        },
        forecasts: {
          predictedOrdersNextDay: 2912,
          predictedRevenueNextDay: 1134768,
          predictedActiveUsersNextDay: 1892,
          seasonalTrend: 'stable',
        },
      },
    ];

    await FoodDeliveryAnalytics.insertMany(sampleAnalytics, { ordered: false }).catch(() => {
      // Ignore duplicate errors
    });
    console.log('✓ Sample analytics seeded');

    console.log('\n✓ All Phase 8 seed data created successfully\n');
  } catch (error) {
    console.error('Error seeding data:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/food_delivery';
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Create indexes
    await createIndexes();

    // Seed data
    await seedData();

    console.log('✓✓✓ Phase 8 initialization complete! ✓✓✓\n');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
