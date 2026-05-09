/**
 * Phase 9 Indexes & Seed Data
 * MongoDB indexes and initial seed data for all Phase 9 models
 * Run: npm run seed:phase9
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const OrderTracking = require('../models/OrderTracking');
const DeliveryPartnerLocation = require('../models/DeliveryPartnerLocation');
const OrderReview = require('../models/OrderReview');
const FoodSafetyCertification = require('../models/FoodSafetyCertification');
const UserBadge = require('../models/UserBadge');
const Challenge = require('../models/Challenge');
const DynamicPricingRule = require('../models/DynamicPricingRule');
const Promotion = require('../models/Promotion');
const Vendor = require('../models/Vendor');
const InventoryManagement = require('../models/InventoryManagement');

/**
 * Create all indexes
 */
async function createIndexes() {
  try {
    console.log('Creating indexes for Phase 9 models...');

    // OrderTracking indexes
    console.log('Creating OrderTracking indexes...');
    await OrderTracking.collection.createIndex({ orderId: 1, status: 1 });
    await OrderTracking.collection.createIndex({ userId: 1, createdAt: -1 });
    await OrderTracking.collection.createIndex({ deliveryPartnerId: 1, orderStatus: 1 });
    await OrderTracking.collection.createIndex({ 'currentLocation.coordinates': '2dsphere' });
    await OrderTracking.collection.createIndex({ status: 1, createdAt: -1 });

    // DeliveryPartnerLocation indexes
    console.log('Creating DeliveryPartnerLocation indexes...');
    await DeliveryPartnerLocation.collection.createIndex({ 'location.coordinates': '2dsphere' });
    await DeliveryPartnerLocation.collection.createIndex({ deliveryPartnerId: 1, onlineStatus: 1 });
    await DeliveryPartnerLocation.collection.createIndex({ updatedAt: -1 });
    await DeliveryPartnerLocation.collection.createIndex({ 'activeOrder.orderId': 1 });

    // OrderReview indexes
    console.log('Creating OrderReview indexes...');
    await OrderReview.collection.createIndex({ restaurantId: 1, 'ratings.overallRating': -1 });
    await OrderReview.collection.createIndex({ userId: 1, createdAt: -1 });
    await OrderReview.collection.createIndex({ orderId: 1 });
    await OrderReview.collection.createIndex({ isVerified: 1, isFlagged: 1 });
    await OrderReview.collection.createIndex({ visibilityScore: -1 });

    // FoodSafetyCertification indexes
    console.log('Creating FoodSafetyCertification indexes...');
    await FoodSafetyCertification.collection.createIndex({ restaurantId: 1 });
    await FoodSafetyCertification.collection.createIndex({ complianceStatus: 1 });
    await FoodSafetyCertification.collection.createIndex({ createdAt: -1 });

    // UserBadge indexes
    console.log('Creating UserBadge indexes...');
    await UserBadge.collection.createIndex({ userId: 1 });
    await UserBadge.collection.createIndex({ 'gamificationScores.overallGameScore': -1 });
    await UserBadge.collection.createIndex({ 'level.currentLevel': -1 });

    // Challenge indexes
    console.log('Creating Challenge indexes...');
    await Challenge.collection.createIndex({ startDate: 1, endDate: 1 });
    await Challenge.collection.createIndex({ isActive: 1 });
    await Challenge.collection.createIndex({ type: 1 });

    // DynamicPricingRule indexes
    console.log('Creating DynamicPricingRule indexes...');
    await DynamicPricingRule.collection.createIndex({ restaurantId: 1, effectiveFrom: 1 });
    await DynamicPricingRule.collection.createIndex({ strategyType: 1 });
    await DynamicPricingRule.collection.createIndex({ effectiveTo: -1 });

    // Promotion indexes
    console.log('Creating Promotion indexes...');
    await Promotion.collection.createIndex({ restaurantId: 1, startDate: 1 });
    await Promotion.collection.createIndex({ promotionType: 1, isFeatured: 1 });
    await Promotion.collection.createIndex({ 'couponCode.code': 1 });
    await Promotion.collection.createIndex({ endDate: -1 });

    // Vendor indexes
    console.log('Creating Vendor indexes...');
    await Vendor.collection.createIndex({ 'location.coordinates': '2dsphere' });
    await Vendor.collection.createIndex({ restaurantName: 'text', description: 'text' });
    await Vendor.collection.createIndex({ 'ratings.overallRating': -1, status: 1 });
    await Vendor.collection.createIndex({ status: 1, city: 1 });
    await Vendor.collection.createIndex({ cuisine: 1, priceRange: 1 });
    await Vendor.collection.createIndex({ isFeatured: 1 });
    await Vendor.collection.createIndex({ verificationStatus: 1, onboardingStatus: 1 });

    // InventoryManagement indexes
    console.log('Creating InventoryManagement indexes...');
    await InventoryManagement.collection.createIndex({ restaurantId: 1, menuItemId: 1 });
    await InventoryManagement.collection.createIndex({ stockStatus: 1 });
    await InventoryManagement.collection.createIndex({ 'expiryTracking.expiryDate': 1 });
    await InventoryManagement.collection.createIndex({ lastUpdated: -1 });

    console.log('✓ All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

/**
 * Seed initial data
 */
async function seedData() {
  try {
    console.log('\nSeeding initial data for Phase 9 models...');

    // Check if data already exists
    const existingVendor = await Vendor.findOne();
    if (existingVendor) {
      console.log('✓ Data already exists. Skipping seed.');
      return;
    }

    // Seed Vendors
    console.log('Seeding vendors...');
    const vendors = await Vendor.insertMany([
      {
        vendorId: `VENDOR-${Date.now()}-pizza`,
        restaurantName: 'Pizza Paradise',
        displayName: 'Pizza Paradise',
        description: 'Premium wood-fired pizzas',
        cuisine: ['Italian', 'Continental'],
        cuisineCategory: ['Pizza', 'Pasta'],
        priceRange: '$$',
        restaurantType: ['Restaurant', 'Takeaway'],
        phoneNumber: '+91-9876543210',
        email: 'pizzaparadise@example.com',
        address: '123 Pizza Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        location: {
          type: 'Point',
          coordinates: [72.8479, 19.0760],
        },
        operatingHours: [
          {
            dayOfWeek: 'Monday',
            openTime: '10:00',
            closeTime: '23:00',
            isClosed: false,
          },
          {
            dayOfWeek: 'Tuesday',
            openTime: '10:00',
            closeTime: '23:00',
            isClosed: false,
          },
          {
            dayOfWeek: 'Wednesday',
            openTime: '10:00',
            closeTime: '23:00',
            isClosed: false,
          },
          {
            dayOfWeek: 'Thursday',
            openTime: '10:00',
            closeTime: '23:00',
            isClosed: false,
          },
          {
            dayOfWeek: 'Friday',
            openTime: '10:00',
            closeTime: '00:00',
            isClosed: false,
          },
          {
            dayOfWeek: 'Saturday',
            openTime: '10:00',
            closeTime: '00:00',
            isClosed: false,
          },
          {
            dayOfWeek: 'Sunday',
            openTime: '11:00',
            closeTime: '23:00',
            isClosed: false,
          },
        ],
        ratings: {
          overallRating: 4.5,
          foodQuality: 4.6,
          delivery: 4.4,
          cleanliness: 4.5,
          service: 4.3,
          value: 4.2,
          totalRatings: 1250,
          totalReviews: 850,
        },
        performance: {
          onTimeDeliveryPercentage: 94,
          acceptanceRate: 96,
          cancellationRate: 2,
          averagePreparationTime: 20,
          totalOrdersCompleted: 5420,
          monthlySales: 450000,
          averageOrderValue: 450,
          customerRetentionRate: 78,
        },
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        onboardingStatus: 'completed',
        onboardingDate: new Date('2023-01-15'),
        isFeatured: true,
        commissioPercentage: 18,
        settlementCycle: 'daily',
      },
      {
        vendorId: `VENDOR-${Date.now()}-burger`,
        restaurantName: 'Burger Bliss',
        displayName: 'Burger Bliss',
        description: 'Gourmet burgers and shakes',
        cuisine: ['American', 'Fast Food'],
        cuisineCategory: ['Burgers', 'Fries'],
        priceRange: '$',
        restaurantType: ['QSR', 'Takeaway'],
        phoneNumber: '+91-9876543211',
        email: 'burgerbliss@example.com',
        address: '456 Burger Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400002',
        country: 'India',
        location: {
          type: 'Point',
          coordinates: [72.8580, 19.0835],
        },
        operatingHours: [
          {
            dayOfWeek: 'Everyday',
            openTime: '09:00',
            closeTime: '23:30',
            isClosed: false,
          },
        ],
        ratings: {
          overallRating: 4.2,
          foodQuality: 4.3,
          delivery: 4.0,
          cleanliness: 4.1,
          service: 4.2,
          value: 4.4,
          totalRatings: 2100,
          totalReviews: 1520,
        },
        performance: {
          onTimeDeliveryPercentage: 92,
          acceptanceRate: 98,
          cancellationRate: 1,
          averagePreparationTime: 15,
          totalOrdersCompleted: 8750,
          monthlySales: 520000,
          averageOrderValue: 280,
          customerRetentionRate: 82,
        },
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        onboardingStatus: 'completed',
        onboardingDate: new Date('2023-02-20'),
        isFeatured: true,
        commissionPercentage: 16,
        settlementCycle: 'daily',
      },
    ]);
    console.log(`✓ Seeded ${vendors.length} vendors`);

    // Seed Promotions
    console.log('Seeding promotions...');
    const promotions = await Promotion.insertMany([
      {
        promotionId: `PROMO-${Date.now()}-pizza-discount`,
        restaurantId: vendors[0]._id,
        promotionName: 'Pizza Paradise Special',
        promotionType: 'percentage_discount',
        category: 'restaurant',
        couponCode: {
          code: 'PIZZA20',
          isUnique: true,
          usageLimit: 500,
          usedCount: 45,
          perUserLimit: 2,
          codeStatus: 'active',
        },
        discount: {
          discountType: 'percentage',
          discountValue: 20,
          discountCap: 200,
          minOrderValue: 300,
          maxDiscountAmount: 200,
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isRecurring: false,
        approvalStatus: 'approved',
        approvedAt: new Date(),
      },
      {
        promotionId: `PROMO-${Date.now()}-burger-deal`,
        restaurantId: vendors[1]._id,
        promotionName: 'Burger Bonanza',
        promotionType: 'buy_one_get_one',
        category: 'category',
        couponCode: {
          code: 'BURGER50',
          isUnique: true,
          usageLimit: 1000,
          usedCount: 320,
          perUserLimit: 1,
          codeStatus: 'active',
        },
        discount: {
          discountType: 'percentage',
          discountValue: 50,
          minOrderValue: 250,
          maxDiscountAmount: 150,
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isRecurring: true,
        recurringSchedule: {
          frequency: 'weekly',
          daysOfWeek: ['Friday', 'Saturday', 'Sunday'],
        },
        approvalStatus: 'approved',
        approvedAt: new Date(),
        isFeatured: true,
      },
    ]);
    console.log(`✓ Seeded ${promotions.length} promotions`);

    // Seed Inventory Items
    console.log('Seeding inventory items...');
    const inventoryItems = await InventoryManagement.insertMany([
      {
        inventoryId: `INV-${Date.now()}-mozzarella`,
        restaurantId: vendors[0]._id,
        menuItemId: 'ITEM-pizza-mozzarella',
        itemName: 'Mozzarella Cheese',
        currentStock: 150,
        unit: 'kg',
        minimumStock: 50,
        maximumStock: 300,
        reorderPoint: 75,
        reorderQuantity: 100,
        safetyStock: 40,
        unitCost: 150,
        sellingPrice: 0,
        stockStatus: 'in_stock',
        expiryTracking: {
          hasExpiryDate: true,
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          shelfLifeDays: 60,
          expiryAlertDays: 7,
          batchNumber: 'BATCH-001',
          storageTemperature: 4,
        },
        movementAnalytics: {
          averageDailySales: 25,
          averageWeeklySales: 175,
          averageMonthlySales: 750,
          salesTrend: 'increasing',
          stockTurnoverRatio: 6,
        },
        primarySupplier: {
          supplierId: 'SUP-dairy-001',
          supplierName: 'Fresh Dairy Co',
          contactNumber: '+91-9999999999',
          leadTimeDays: 2,
          minimumOrderQuantity: 50,
          pricePerUnit: 120,
        },
      },
      {
        inventoryId: `INV-${Date.now()}-tomato-sauce`,
        restaurantId: vendors[0]._id,
        menuItemId: 'ITEM-pizza-sauce',
        itemName: 'Tomato Sauce',
        currentStock: 200,
        unit: 'liters',
        minimumStock: 80,
        maximumStock: 400,
        reorderPoint: 120,
        reorderQuantity: 150,
        safetyStock: 60,
        unitCost: 40,
        sellingPrice: 0,
        stockStatus: 'in_stock',
        expiryTracking: {
          hasExpiryDate: true,
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          shelfLifeDays: 365,
          expiryAlertDays: 14,
          batchNumber: 'BATCH-002',
          storageTemperature: 25,
        },
        movementAnalytics: {
          averageDailySales: 15,
          averageWeeklySales: 105,
          averageMonthlySales: 450,
          salesTrend: 'stable',
          stockTurnoverRatio: 3,
        },
      },
    ]);
    console.log(`✓ Seeded ${inventoryItems.length} inventory items`);

    // Seed Challenges
    console.log('Seeding challenges...');
    const challenges = await Challenge.insertMany([
      {
        challengeId: `CHAL-${Date.now()}-order-master`,
        name: 'Order Master',
        description: 'Place 10 orders to become an Order Master',
        category: 'ordering',
        type: 'weekly',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        objective: 'Complete 10 food orders',
        instructions: 'Place orders from any restaurant to complete this challenge',
        requirements: {
          targetType: 'orders',
          targetValue: 10,
          minOrderValue: 100,
        },
        completionReward: 100,
        rewardValue: 100,
        rewardDescription: 'Experience Points + Badge',
        leaderboard: {
          enabled: true,
          scope: 'global',
          maxDisplayRank: 100,
        },
        participation: {
          totalEnrolled: 5000,
          totalCompleted: 1200,
          completionRate: 0.24,
        },
      },
    ]);
    console.log(`✓ Seeded ${challenges.length} challenges`);

    console.log('\n✓ All seed data created successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    // Create indexes
    await createIndexes();

    // Seed data
    await seedData();

    console.log('\n✓✓✓ Phase 9 initialization complete! ✓✓✓\n');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
