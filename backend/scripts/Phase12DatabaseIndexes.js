/**
 * Phase12DatabaseIndexes.js
 * MongoDB Indexes for Phase 12: Advanced Features & Optimization
 * Run: node backend/scripts/Phase12DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Payment Splits Indexes
    const PaymentSplitsCollection = mongoose.connection.collection('payment_splits');

    await PaymentSplitsCollection.createIndex({ splitConfigId: 1 });
    console.log('✓ Payment Splits - splitConfigId index');

    await PaymentSplitsCollection.createIndex({ transactionType: 1, isActive: 1 });
    console.log('✓ Payment Splits - transactionType & active index');

    // Payment Settlements Indexes
    const SettlementsCollection = mongoose.connection.collection('payment_settlements');

    await SettlementsCollection.createIndex({ recipientId: 1, status: 1, createdAt: -1 });
    console.log('✓ Payment Settlements - recipientId, status & date index');

    await SettlementsCollection.createIndex({ splitConfigId: 1, status: 1 });
    console.log('✓ Payment Settlements - splitConfigId & status index');

    await SettlementsCollection.createIndex({ transactionId: 1 });
    console.log('✓ Payment Settlements - transactionId index');

    await SettlementsCollection.createIndex({ settlementId: 1 });
    console.log('✓ Payment Settlements - settlementId index');

    // Commissions Indexes
    const CommissionsCollection = mongoose.connection.collection('commissions');

    await CommissionsCollection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    console.log('✓ Commissions - userId, status & date index');

    await CommissionsCollection.createIndex({ transactionId: 1 });
    console.log('✓ Commissions - transactionId index');

    await CommissionsCollection.createIndex({ commissionId: 1 });
    console.log('✓ Commissions - commissionId index');

    // Settlement Batches Indexes
    const BatchesCollection = mongoose.connection.collection('settlement_batches');

    await BatchesCollection.createIndex({ batchId: 1 });
    console.log('✓ Settlement Batches - batchId index');

    await BatchesCollection.createIndex({ status: 1, settledAt: -1 });
    console.log('✓ Settlement Batches - status & date index');

    // Reconciliation Records Indexes
    const ReconciliationCollection = mongoose.connection.collection('reconciliation_records');

    await ReconciliationCollection.createIndex({ reconciliationId: 1 });
    console.log('✓ Reconciliation Records - reconciliationId index');

    await ReconciliationCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Reconciliation Records - status & date index');

    // Notifications Indexes
    const NotificationsCollection = mongoose.connection.collection('notifications');

    await NotificationsCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Notifications - userId & date index');

    await NotificationsCollection.createIndex({ userId: 1, readAt: 1 });
    console.log('✓ Notifications - userId & readAt index');

    await NotificationsCollection.createIndex({ userId: 1, eventType: 1 });
    console.log('✓ Notifications - userId & eventType index');

    await NotificationsCollection.createIndex({ notificationId: 1 });
    console.log('✓ Notifications - notificationId index');

    await NotificationsCollection.createIndex({ status: 1 });
    console.log('✓ Notifications - status index');

    await NotificationsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✓ Notifications - TTL index (auto-expiry after 30 days)');

    // Notification Preferences Indexes
    const PreferencesCollection = mongoose.connection.collection('notification_preferences');

    await PreferencesCollection.createIndex({ userId: 1 });
    console.log('✓ Notification Preferences - userId index');

    // API Metrics Indexes
    const MetricsCollection = mongoose.connection.collection('api_metrics');

    await MetricsCollection.createIndex({ timestamp: -1 });
    console.log('✓ API Metrics - timestamp index');

    await MetricsCollection.createIndex({ endpoint: 1, timestamp: -1 });
    console.log('✓ API Metrics - endpoint & timestamp index');

    await MetricsCollection.createIndex({ statusCode: 1 });
    console.log('✓ API Metrics - statusCode index');

    await MetricsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✓ API Metrics - TTL index (auto-expiry after 30 days)');

    // Summary
    console.log('\n========== Phase 12 Database Indexes Created Successfully ==========');
    console.log('✓ 2 Payment Splits indexes');
    console.log('✓ 4 Payment Settlements indexes');
    console.log('✓ 3 Commissions indexes');
    console.log('✓ 2 Settlement Batches indexes');
    console.log('✓ 2 Reconciliation Records indexes');
    console.log('✓ 6 Notifications indexes (+ 1 TTL)');
    console.log('✓ 1 Notification Preferences index');
    console.log('✓ 4 API Metrics indexes (+ 1 TTL)');
    console.log('Total: 26 indexes created (including TTL indexes)');
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
