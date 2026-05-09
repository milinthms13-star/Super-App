/**
 * Phase8DatabaseIndexes.js
 * MongoDB Indexes for Phase 8: Safety, Insurance, Premium, Analytics
 * Run: node backend/scripts/Phase8DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Emergency Contact Indexes
    const EmergencyContactCollection = mongoose.connection.collection('emergencycontacts');

    await EmergencyContactCollection.createIndex({ userId: 1, isPrimary: -1 });
    console.log('✓ Emergency Contact - userId & primary index');

    await EmergencyContactCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Emergency Contact - userId & date index');

    // SOS Alert Indexes
    const SOSAlertCollection = mongoose.connection.collection('sosalerts');

    await SOSAlertCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ SOS Alert - userId & date index');

    await SOSAlertCollection.createIndex({ status: 1, severity: 1 });
    console.log('✓ SOS Alert - status & severity index');

    await SOSAlertCollection.createIndex({ 'location': '2dsphere' });
    console.log('✓ SOS Alert - geospatial index');

    // Safety Rating Indexes
    const SafetyRatingCollection = mongoose.connection.collection('safetyratingss');

    await SafetyRatingCollection.createIndex({ ratedUserId: 1, createdAt: -1 });
    console.log('✓ Safety Rating - ratedUserId & date index');

    await SafetyRatingCollection.createIndex({ raterId: 1, rideId: 1 });
    console.log('✓ Safety Rating - raterId & rideId index');

    await SafetyRatingCollection.createIndex({ reportViolation: 1, status: 1 });
    console.log('✓ Safety Rating - violation & status index');

    // Insurance Plan Indexes
    const InsurancePlanCollection = mongoose.connection.collection('insuranceplans');

    await InsurancePlanCollection.createIndex({ status: 1 });
    console.log('✓ Insurance Plan - status index');

    await InsurancePlanCollection.createIndex({ coverage: 1, monthlyPremium: 1 });
    console.log('✓ Insurance Plan - coverage & price index');

    // Insurance Policy Indexes
    const InsurancePolicyCollection = mongoose.connection.collection('insurancepolicies');

    await InsurancePolicyCollection.createIndex({ userId: 1, status: 1 });
    console.log('✓ Insurance Policy - userId & status index');

    await InsurancePolicyCollection.createIndex({ policyNumber: 1 });
    console.log('✓ Insurance Policy - policyNumber index');

    await InsurancePolicyCollection.createIndex({ startDate: 1, endDate: 1 });
    console.log('✓ Insurance Policy - date range index');

    await InsurancePolicyCollection.createIndex(
      { endDate: 1 },
      { expireAfterSeconds: 7776000 } // 90 days TTL
    );
    console.log('✓ Insurance Policy - expiration TTL index');

    // Insurance Claim Indexes
    const InsuranceClaimCollection = mongoose.connection.collection('insuranceclaims');

    await InsuranceClaimCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Insurance Claim - userId & date index');

    await InsuranceClaimCollection.createIndex({ claimNumber: 1 });
    console.log('✓ Insurance Claim - claimNumber index');

    await InsuranceClaimCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Insurance Claim - status & date index');

    await InsuranceClaimCollection.createIndex({ policyId: 1, status: 1 });
    console.log('✓ Insurance Claim - policyId & status index');

    // Premium Tier Indexes
    const PremiumTierCollection = mongoose.connection.collection('premiumtiers');

    await PremiumTierCollection.createIndex({ status: 1, monthlyPrice: 1 });
    console.log('✓ Premium Tier - status & price index');

    // Premium Subscription Indexes
    const PremiumSubscriptionCollection = mongoose.connection.collection('premiumsubscriptions');

    await PremiumSubscriptionCollection.createIndex({ userId: 1, status: 1 });
    console.log('✓ Premium Subscription - userId & status index');

    await PremiumSubscriptionCollection.createIndex({ startDate: 1, endDate: 1 });
    console.log('✓ Premium Subscription - date range index');

    await PremiumSubscriptionCollection.createIndex(
      { endDate: 1 },
      { expireAfterSeconds: 7776000 } // 90 days TTL
    );
    console.log('✓ Premium Subscription - expiration TTL index');

    // VIP Ride Request Indexes
    const VIPRideRequestCollection = mongoose.connection.collection('vipridrequests');

    await VIPRideRequestCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ VIP Ride - userId & date index');

    await VIPRideRequestCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ VIP Ride - status & date index');

    // User Analytics Indexes
    const UserAnalyticsCollection = mongoose.connection.collection('useranalytics');

    await UserAnalyticsCollection.createIndex({ userId: 1 });
    console.log('✓ User Analytics - userId index');

    await UserAnalyticsCollection.createIndex({ lastRideAt: -1 });
    console.log('✓ User Analytics - lastRideAt index');

    // Summary
    console.log('\n========== Phase 8 Database Indexes Created Successfully ==========');
    console.log('✓ 2 Emergency Contact indexes');
    console.log('✓ 3 SOS Alert indexes');
    console.log('✓ 3 Safety Rating indexes');
    console.log('✓ 2 Insurance Plan indexes');
    console.log('✓ 4 Insurance Policy indexes');
    console.log('✓ 4 Insurance Claim indexes');
    console.log('✓ 1 Premium Tier index');
    console.log('✓ 3 Premium Subscription indexes');
    console.log('✓ 2 VIP Ride Request indexes');
    console.log('✓ 2 User Analytics indexes');
    console.log('Total: 26 indexes created');
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
