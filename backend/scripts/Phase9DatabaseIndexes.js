/**
 * Phase9DatabaseIndexes.js
 * MongoDB Indexes for Phase 9: Fraud Detection, Dynamic Pricing, AI Recommendations, Multi-Region
 * Run: node backend/scripts/Phase9DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Risk Score Indexes (Fraud Detection)
    const RiskScoreCollection = mongoose.connection.collection('riskscores');

    await RiskScoreCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Risk Score - userId & date index');

    await RiskScoreCollection.createIndex({ riskLevel: 1, createdAt: -1 });
    console.log('✓ Risk Score - riskLevel & date index');

    await RiskScoreCollection.createIndex({ riskScore: -1, createdAt: -1 });
    console.log('✓ Risk Score - score & date index');

    // Fraud Case Indexes
    const FraudCaseCollection = mongoose.connection.collection('fraudcases');

    await FraudCaseCollection.createIndex({ suspectId: 1, status: 1 });
    console.log('✓ Fraud Case - suspectId & status index');

    await FraudCaseCollection.createIndex({ reporterId: 1, createdAt: -1 });
    console.log('✓ Fraud Case - reporterId & date index');

    await FraudCaseCollection.createIndex({ caseType: 1, severity: 1 });
    console.log('✓ Fraud Case - type & severity index');

    await FraudCaseCollection.createIndex({ status: 1, severity: 1 });
    console.log('✓ Fraud Case - status & severity index');

    // Price Calculation Indexes (Dynamic Pricing)
    const PriceCalculationCollection = mongoose.connection.collection('pricecalculations');

    await PriceCalculationCollection.createIndex({ location: '2dsphere' });
    console.log('✓ Price Calculation - geospatial location index');

    await PriceCalculationCollection.createIndex({ createdAt: -1 });
    console.log('✓ Price Calculation - date index');

    await PriceCalculationCollection.createIndex({ surgeMultiplier: -1, createdAt: -1 });
    console.log('✓ Price Calculation - surge & date index');

    // Surge Pricing Event Indexes
    const SurgePricingEventCollection = mongoose.connection.collection('surgepricingevents');

    await SurgePricingEventCollection.createIndex({ status: 1, startTime: 1, endTime: 1 });
    console.log('✓ Surge Event - status & time index');

    await SurgePricingEventCollection.createIndex({ reason: 1 });
    console.log('✓ Surge Event - reason index');

    // Offer Engine Indexes (AI Recommendations)
    const OfferEngineCollection = mongoose.connection.collection('offerenginessss');

    await OfferEngineCollection.createIndex({ userId: 1, timestamp: -1 });
    console.log('✓ Offer Engine - userId & date index');

    // User Travel History Indexes
    const UserTravelHistoryCollection = mongoose.connection.collection('usertravelhistories');

    await UserTravelHistoryCollection.createIndex({ userId: 1, timestamp: -1 });
    console.log('✓ User Travel History - userId & date index');

    // Region Indexes (Multi-Region)
    const RegionCollection = mongoose.connection.collection('regions');

    await RegionCollection.createIndex({ name: 1 });
    console.log('✓ Region - name index');

    await RegionCollection.createIndex({ status: 1 });
    console.log('✓ Region - status index');

    await RegionCollection.createIndex({ 'boundaries': '2dsphere' });
    console.log('✓ Region - geospatial boundaries index');

    // Regional Pricing Rule Indexes
    const RegionalPricingRuleCollection = mongoose.connection.collection('regionalpricingrules');

    await RegionalPricingRuleCollection.createIndex({ region: 1, type: 1 });
    console.log('✓ Regional Pricing Rule - region & type index');

    await RegionalPricingRuleCollection.createIndex({ fromRegion: 1, toRegion: 1 });
    console.log('✓ Regional Pricing Rule - cross-region index');

    // Multi-Region Settings Indexes
    const MultiRegionSettingsCollection = mongoose.connection.collection('multiregionsettings');

    await MultiRegionSettingsCollection.createIndex({ userId: 1 });
    console.log('✓ Multi-Region Settings - userId index');

    // Payment Transaction Indexes (for chargeback detection)
    const PaymentTransactionCollection = mongoose.connection.collection('paymenttransactionssss');

    await PaymentTransactionCollection.createIndex({ userId: 1, status: 1 });
    console.log('✓ Payment Transaction - userId & status index');

    await PaymentTransactionCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Payment Transaction - status & date index');

    // Promo Code Indexes
    const PromoCodeCollection = mongoose.connection.collection('promocodes');

    await PromoCodeCollection.createIndex({ code: 1 });
    console.log('✓ Promo Code - code index');

    await PromoCodeCollection.createIndex({ isActive: 1, expiryDate: 1 });
    console.log('✓ Promo Code - active & expiry index');

    // Summary
    console.log('\n========== Phase 9 Database Indexes Created Successfully ==========');
    console.log('✓ 3 Risk Score indexes');
    console.log('✓ 4 Fraud Case indexes');
    console.log('✓ 3 Price Calculation indexes');
    console.log('✓ 2 Surge Pricing Event indexes');
    console.log('✓ 1 Offer Engine index');
    console.log('✓ 1 User Travel History index');
    console.log('✓ 3 Region indexes');
    console.log('✓ 2 Regional Pricing Rule indexes');
    console.log('✓ 1 Multi-Region Settings index');
    console.log('✓ 2 Payment Transaction indexes');
    console.log('✓ 2 Promo Code indexes');
    console.log('Total: 24 indexes created');
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
