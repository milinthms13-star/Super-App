/**
 * Phase11DatabaseIndexes.js
 * MongoDB Indexes for Phase 11: Payment Processing & Analytics
 * Run: node backend/scripts/Phase11DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Payment Methods Indexes
    const PaymentMethodCollection = mongoose.connection.collection('payment_methods');

    await PaymentMethodCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Payment Methods - userId & date index');

    await PaymentMethodCollection.createIndex({ methodType: 1, isActive: 1 });
    console.log('✓ Payment Methods - type & active index');

    await PaymentMethodCollection.createIndex({ isDefault: 1, userId: 1 });
    console.log('✓ Payment Methods - default & userId index');

    // Payment Transactions Indexes
    const TransactionCollection = mongoose.connection.collection('payment_transactions');

    await TransactionCollection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    console.log('✓ Payment Transactions - userId, status & date index');

    await TransactionCollection.createIndex({ transactionId: 1 });
    console.log('✓ Payment Transactions - transactionId index');

    await TransactionCollection.createIndex({ orderId: 1 });
    console.log('✓ Payment Transactions - orderId index');

    await TransactionCollection.createIndex({ rideId: 1 });
    console.log('✓ Payment Transactions - rideId index');

    await TransactionCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Payment Transactions - status & date index');

    // Recurring Billing Indexes
    const RecurringCollection = mongoose.connection.collection('recurring_billing');

    await RecurringCollection.createIndex({ userId: 1, isActive: 1 });
    console.log('✓ Recurring Billing - userId & active index');

    await RecurringCollection.createIndex({ nextChargeDate: 1, isActive: 1 });
    console.log('✓ Recurring Billing - nextChargeDate & active index');

    await RecurringCollection.createIndex({ billingCycle: 1 });
    console.log('✓ Recurring Billing - billingCycle index');

    // Refunds Indexes
    const RefundCollection = mongoose.connection.collection('refunds');

    await RefundCollection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    console.log('✓ Refunds - userId, status & date index');

    await RefundCollection.createIndex({ transactionId: 1 });
    console.log('✓ Refunds - transactionId index');

    await RefundCollection.createIndex({ refundType: 1 });
    console.log('✓ Refunds - refundType index');

    await RefundCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Refunds - status & date index');

    // Invoices Indexes
    const InvoiceCollection = mongoose.connection.collection('invoices');

    await InvoiceCollection.createIndex({ userId: 1, issuedAt: -1 });
    console.log('✓ Invoices - userId & date index');

    await InvoiceCollection.createIndex({ transactionId: 1 });
    console.log('✓ Invoices - transactionId index');

    await InvoiceCollection.createIndex({ status: 1 });
    console.log('✓ Invoices - status index');

    // Return Policies Indexes
    const PolicyCollection = mongoose.connection.collection('return_policies');

    await PolicyCollection.createIndex({ serviceType: 1, isActive: 1 });
    console.log('✓ Return Policies - serviceType & active index');

    // Exchanges Indexes
    const ExchangeCollection = mongoose.connection.collection('exchanges');

    await ExchangeCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Exchanges - userId & date index');

    await ExchangeCollection.createIndex({ originalTransactionId: 1 });
    console.log('✓ Exchanges - originalTransactionId index');

    await ExchangeCollection.createIndex({ status: 1 });
    console.log('✓ Exchanges - status index');

    // Chargebacks Indexes
    const ChargebackCollection = mongoose.connection.collection('chargebacks');

    await ChargebackCollection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    console.log('✓ Chargebacks - userId, status & date index');

    await ChargebackCollection.createIndex({ transactionId: 1 });
    console.log('✓ Chargebacks - transactionId index');

    await ChargebackCollection.createIndex({ dueDate: 1 });
    console.log('✓ Chargebacks - dueDate index');

    // Chargeback Responses Indexes
    const ChargebackResponseCollection = mongoose.connection.collection('chargeback_responses');

    await ChargebackResponseCollection.createIndex({ chargebackId: 1 });
    console.log('✓ Chargeback Responses - chargebackId index');

    await ChargebackResponseCollection.createIndex({ status: 1 });
    console.log('✓ Chargeback Responses - status index');

    await ChargebackResponseCollection.createIndex({ responseDeadline: 1 });
    console.log('✓ Chargeback Responses - responseDeadline index');

    // Fraud Monitoring Indexes
    const FraudMonitoringCollection = mongoose.connection.collection('fraud_monitoring');

    await FraudMonitoringCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Fraud Monitoring - userId & date index');

    await FraudMonitoringCollection.createIndex({ transactionId: 1 });
    console.log('✓ Fraud Monitoring - transactionId index');

    await FraudMonitoringCollection.createIndex({ riskLevel: 1 });
    console.log('✓ Fraud Monitoring - riskLevel index');

    // Fraud Reports Indexes
    const FraudReportCollection = mongoose.connection.collection('fraud_reports');

    await FraudReportCollection.createIndex({ userId: 1, status: 1, createdAt: -1 });
    console.log('✓ Fraud Reports - userId, status & date index');

    await FraudReportCollection.createIndex({ transactionId: 1 });
    console.log('✓ Fraud Reports - transactionId index');

    await FraudReportCollection.createIndex({ fraudType: 1 });
    console.log('✓ Fraud Reports - fraudType index');

    await FraudReportCollection.createIndex({ investigationDeadline: 1 });
    console.log('✓ Fraud Reports - investigationDeadline index');

    // Blacklist Indexes
    const BlacklistCollection = mongoose.connection.collection('blacklist');

    await BlacklistCollection.createIndex({ entryType: 1, value: 1 });
    console.log('✓ Blacklist - entryType & value index');

    await BlacklistCollection.createIndex({ severity: 1 });
    console.log('✓ Blacklist - severity index');

    await BlacklistCollection.createIndex({ expiryDate: 1 }, { sparse: true });
    console.log('✓ Blacklist - expiryDate index (sparse)');

    // Whitelist Indexes
    const WhitelistCollection = mongoose.connection.collection('whitelist');

    await WhitelistCollection.createIndex({ entryType: 1, value: 1 });
    console.log('✓ Whitelist - entryType & value index');

    // Analytics Reports Indexes
    const AnalyticsCollection = mongoose.connection.collection('analytics_reports');

    await AnalyticsCollection.createIndex({ reportType: 1, generatedAt: -1 });
    console.log('✓ Analytics Reports - reportType & date index');

    await AnalyticsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✓ Analytics Reports - TTL index (auto-expiry after 30 days)');

    // Payment Receipts Indexes
    const ReceiptCollection = mongoose.connection.collection('payment_receipts');

    await ReceiptCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Payment Receipts - userId & date index');

    await ReceiptCollection.createIndex({ transactionId: 1 });
    console.log('✓ Payment Receipts - transactionId index');

    // Summary
    console.log('\n========== Phase 11 Database Indexes Created Successfully ==========');
    console.log('✓ 3 Payment Methods indexes');
    console.log('✓ 5 Payment Transactions indexes');
    console.log('✓ 3 Recurring Billing indexes');
    console.log('✓ 4 Refunds indexes');
    console.log('✓ 3 Invoices indexes');
    console.log('✓ 1 Return Policies index');
    console.log('✓ 3 Exchanges indexes');
    console.log('✓ 3 Chargebacks indexes');
    console.log('✓ 3 Chargeback Responses indexes');
    console.log('✓ 3 Fraud Monitoring indexes');
    console.log('✓ 4 Fraud Reports indexes');
    console.log('✓ 3 Blacklist indexes');
    console.log('✓ 1 Whitelist index');
    console.log('✓ 2 Analytics Reports indexes (+ 1 TTL)');
    console.log('✓ 2 Payment Receipts indexes');
    console.log('Total: 43 indexes created (including TTL indexes)');
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
