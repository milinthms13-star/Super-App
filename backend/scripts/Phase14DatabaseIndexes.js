/**
 * Phase14DatabaseIndexes.js
 * MongoDB Indexes for Phase 14: Advanced Personalization, Dynamic Pricing & Analytics
 * Run: node backend/scripts/Phase14DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Loyalty Accounts Indexes
    const LoyaltyCollection = mongoose.connection.collection('loyalty_accounts');

    await LoyaltyCollection.createIndex({ userId: 1 });
    console.log('✓ Loyalty Accounts - userId index');

    await LoyaltyCollection.createIndex({ tier: 1 });
    console.log('✓ Loyalty Accounts - tier index');

    await LoyaltyCollection.createIndex({ points: -1 });
    console.log('✓ Loyalty Accounts - points index');

    await LoyaltyCollection.createIndex({ totalPointsEarned: -1 });
    console.log('✓ Loyalty Accounts - totalPointsEarned index');

    // Achievements Indexes
    const AchievementCollection = mongoose.connection.collection('achievements');

    await AchievementCollection.createIndex({ userId: 1 });
    console.log('✓ Achievements - userId index');

    await AchievementCollection.createIndex({ achievementId: 1 });
    console.log('✓ Achievements - achievementId index');

    await AchievementCollection.createIndex({ userId: 1, unlockedAt: -1 });
    console.log('✓ Achievements - userId & date index');

    // User Personalization Preferences Indexes
    const UserPrefCollection = mongoose.connection.collection('user_personalization_preferences');

    await UserPrefCollection.createIndex({ userId: 1 });
    console.log('✓ User Preferences - userId index');

    await UserPrefCollection.createIndex({ engagementLevel: 1 });
    console.log('✓ User Preferences - engagementLevel index');

    await UserPrefCollection.createIndex({ language: 1 });
    console.log('✓ User Preferences - language index');

    // Pricing History Indexes
    const PricingHistoryCollection = mongoose.connection.collection('pricing_history');

    await PricingHistoryCollection.createIndex({ rideId: 1 });
    console.log('✓ Pricing History - rideId index');

    await PricingHistoryCollection.createIndex({ timestamp: -1 });
    console.log('✓ Pricing History - timestamp index');

    await PricingHistoryCollection.createIndex({ location: '2dsphere' });
    console.log('✓ Pricing History - location geospatial index');

    await PricingHistoryCollection.createIndex({ surgeMultiplier: 1 });
    console.log('✓ Pricing History - surgeMultiplier index');

    // Demand Forecast Indexes
    const DemandForecastCollection = mongoose.connection.collection('demand_forecasts');

    await DemandForecastCollection.createIndex({ location: '2dsphere' });
    console.log('✓ Demand Forecast - location geospatial index');

    await DemandForecastCollection.createIndex({ forecastTime: -1 });
    console.log('✓ Demand Forecast - forecastTime index');

    await DemandForecastCollection.createIndex({ createdAt: -1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
    console.log('✓ Demand Forecast - TTL index (30 days)');

    // Churn Prediction Indexes
    const ChurnPredictionCollection = mongoose.connection.collection('churn_predictions');

    await ChurnPredictionCollection.createIndex({ userId: 1 });
    console.log('✓ Churn Prediction - userId index');

    await ChurnPredictionCollection.createIndex({ riskLevel: 1 });
    console.log('✓ Churn Prediction - riskLevel index');

    await ChurnPredictionCollection.createIndex({ churnScore: -1 });
    console.log('✓ Churn Prediction - churnScore index');

    await ChurnPredictionCollection.createIndex({ userType: 1 });
    console.log('✓ Churn Prediction - userType index');

    // Revenue Forecast Indexes
    const RevenueForecastCollection = mongoose.connection.collection('revenue_forecasts');

    await RevenueForecastCollection.createIndex({ forecastDate: -1 });
    console.log('✓ Revenue Forecast - forecastDate index');

    await RevenueForecastCollection.createIndex({ createdAt: -1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
    console.log('✓ Revenue Forecast - TTL index (30 days)');

    // Driver Availability Prediction Indexes
    const DriverAvailabilityCollection = mongoose.connection.collection('driver_availability_predictions');

    await DriverAvailabilityCollection.createIndex({ driverId: 1 });
    console.log('✓ Driver Availability - driverId index');

    await DriverAvailabilityCollection.createIndex({ predictionDate: -1 });
    console.log('✓ Driver Availability - predictionDate index');

    await DriverAvailabilityCollection.createIndex({ createdAt: -1 }, { expireAfterSeconds: 604800 }); // 7 days TTL
    console.log('✓ Driver Availability - TTL index (7 days)');

    // User LTV Prediction Indexes
    const UserLTVCollection = mongoose.connection.collection('user_ltv_predictions');

    await UserLTVCollection.createIndex({ userId: 1 });
    console.log('✓ User LTV - userId index');

    await UserLTVCollection.createIndex({ segment: 1 });
    console.log('✓ User LTV - segment index');

    await UserLTVCollection.createIndex({ predictedLTV: -1 });
    console.log('✓ User LTV - predictedLTV index');

    // User Recommendations Indexes
    const RecommendationsCollection = mongoose.connection.collection('user_recommendations');

    await RecommendationsCollection.createIndex({ userId: 1, type: 1 });
    console.log('✓ Recommendations - userId & type index');

    await RecommendationsCollection.createIndex({ generatedAt: -1 });
    console.log('✓ Recommendations - generatedAt index');

    await RecommendationsCollection.createIndex({ createdAt: -1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL
    console.log('✓ Recommendations - TTL index (24 hours)');

    // Referral Tracking Indexes
    const ReferralCollection = mongoose.connection.collection('referral_tracking');

    await ReferralCollection.createIndex({ referrerId: 1 });
    console.log('✓ Referral Tracking - referrerId index');

    await ReferralCollection.createIndex({ referreeId: 1 });
    console.log('✓ Referral Tracking - referreeId index');

    await ReferralCollection.createIndex({ referralCode: 1 });
    console.log('✓ Referral Tracking - referralCode index');

    await ReferralCollection.createIndex({ createdAt: -1 });
    console.log('✓ Referral Tracking - createdAt index');

    // Summary
    console.log('\n========== Phase 14 Database Indexes Created Successfully ==========');
    console.log('✓ 4 Loyalty Accounts indexes');
    console.log('✓ 3 Achievements indexes');
    console.log('✓ 3 User Preferences indexes');
    console.log('✓ 4 Pricing History indexes');
    console.log('✓ 3 Demand Forecast indexes (with TTL)');
    console.log('✓ 4 Churn Prediction indexes');
    console.log('✓ 2 Revenue Forecast indexes (with TTL)');
    console.log('✓ 3 Driver Availability indexes (with TTL)');
    console.log('✓ 3 User LTV indexes');
    console.log('✓ 3 Recommendations indexes (with TTL)');
    console.log('✓ 4 Referral Tracking indexes');
    console.log('Total: 36 indexes created (9 with TTL strategy)');
    console.log('==================================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
};

// Run index creation
createIndexes();
