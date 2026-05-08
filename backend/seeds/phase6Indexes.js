/**
 * Phase 6 Database Index Seeding
 * Run: node backend/seeds/phase6Indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected for seeding');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

const createPhase6Indexes = async () => {
  try {
    logger.info('Creating Phase 6 indexes...');

    // PaymentAnalytics indexes
    const paymentAnalyticsDB = mongoose.connection.collection('paymentanalytics');
    await paymentAnalyticsDB.createIndex({ date: -1, period: 1 }, { background: true });
    await paymentAnalyticsDB.createIndex({ period: 1, date: -1 }, { background: true });
    await paymentAnalyticsDB.createIndex({ year: 1, month: 1, day: 1 }, { background: true });
    logger.info('✓ PaymentAnalytics indexes created');

    // WalletAnalytics indexes
    const walletAnalyticsDB = mongoose.connection.collection('walletanalytics');
    await walletAnalyticsDB.createIndex({ date: -1, period: 1 }, { background: true });
    await walletAnalyticsDB.createIndex({ period: 1, date: -1 }, { background: true });
    await walletAnalyticsDB.createIndex({ year: 1, month: 1, day: 1 }, { background: true });
    logger.info('✓ WalletAnalytics indexes created');

    // RefundAnalytics indexes
    const refundAnalyticsDB = mongoose.connection.collection('refundanalytics');
    await refundAnalyticsDB.createIndex({ date: -1, period: 1 }, { background: true });
    await refundAnalyticsDB.createIndex({ period: 1, date: -1 }, { background: true });
    await refundAnalyticsDB.createIndex({ year: 1, month: 1, day: 1 }, { background: true });
    logger.info('✓ RefundAnalytics indexes created');

    // CustomReport indexes
    const customReportDB = mongoose.connection.collection('customreports');
    await customReportDB.createIndex({ createdBy: 1, createdAt: -1 }, { background: true });
    await customReportDB.createIndex({ reportType: 1, status: 1 }, { background: true });
    await customReportDB.createIndex({ nextGenerationAt: 1, frequency: 1 }, { background: true });
    logger.info('✓ CustomReport indexes created');

    // FraudRisk indexes
    const fraudRiskDB = mongoose.connection.collection('fraudrisks');
    await fraudRiskDB.createIndex({ userId: 1, detectedAt: -1 }, { background: true });
    await fraudRiskDB.createIndex({ entityType: 1, riskLevel: 1 }, { background: true });
    await fraudRiskDB.createIndex({ overallRiskScore: -1, status: 1 }, { background: true });
    await fraudRiskDB.createIndex({ detectedAt: -1 }, { background: true });
    await fraudRiskDB.createIndex({ actionTaken: 1, status: 1 }, { background: true });
    // TTL index: auto-delete fraud records after 90 days
    await fraudRiskDB.createIndex({ detectedAt: 1 }, { expireAfterSeconds: 7776000, background: true });
    logger.info('✓ FraudRisk indexes created with TTL');

    logger.info('✓ All Phase 6 indexes created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating indexes:', error);
    process.exit(1);
  }
};

const main = async () => {
  await connectDB();
  await createPhase6Indexes();
};

main();
