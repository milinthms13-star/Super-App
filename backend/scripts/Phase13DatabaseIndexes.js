/**
 * Phase13DatabaseIndexes.js
 * MongoDB Indexes for Phase 13: Marketplace Features, Ratings & Compliance
 * Run: node backend/scripts/Phase13DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Ratings Indexes
    const RatingsCollection = mongoose.connection.collection('ratings');

    await RatingsCollection.createIndex({ ratingId: 1 });
    console.log('✓ Ratings - ratingId index');

    await RatingsCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Ratings - userId & date index');

    await RatingsCollection.createIndex({ driverId: 1, status: 1 });
    console.log('✓ Ratings - driverId & status index');

    await RatingsCollection.createIndex({ riderId: 1, status: 1 });
    console.log('✓ Ratings - riderId & status index');

    await RatingsCollection.createIndex({ rideId: 1 });
    console.log('✓ Ratings - rideId index');

    await RatingsCollection.createIndex({ status: 1, createdAt: -1 });
    console.log('✓ Ratings - status & date index');

    await RatingsCollection.createIndex({ tags: 1 });
    console.log('✓ Ratings - tags index');

    // User Reputation Indexes
    const ReputationCollection = mongoose.connection.collection('user_reputations');

    await ReputationCollection.createIndex({ userId: 1 });
    console.log('✓ User Reputations - userId index');

    await ReputationCollection.createIndex({ reputationScore: -1 });
    console.log('✓ User Reputations - score index');

    await ReputationCollection.createIndex({ level: 1 });
    console.log('✓ User Reputations - level index');

    await ReputationCollection.createIndex({ userType: 1, reputationScore: -1 });
    console.log('✓ User Reputations - type & score index');

    // Rating Flags Indexes
    const FlagsCollection = mongoose.connection.collection('rating_flags');

    await FlagsCollection.createIndex({ flagId: 1 });
    console.log('✓ Rating Flags - flagId index');

    await FlagsCollection.createIndex({ ratingId: 1 });
    console.log('✓ Rating Flags - ratingId index');

    await FlagsCollection.createIndex({ status: 1 });
    console.log('✓ Rating Flags - status index');

    // Tax Reports Indexes
    const TaxReportsCollection = mongoose.connection.collection('tax_reports');

    await TaxReportsCollection.createIndex({ taxReportId: 1 });
    console.log('✓ Tax Reports - reportId index');

    await TaxReportsCollection.createIndex({ userId: 1, year: 1, month: 1 });
    console.log('✓ Tax Reports - userId, year, month index');

    await TaxReportsCollection.createIndex({ createdAt: -1 });
    console.log('✓ Tax Reports - date index');

    // Audit Trail Indexes
    const AuditCollection = mongoose.connection.collection('audit_trail');

    await AuditCollection.createIndex({ auditId: 1 });
    console.log('✓ Audit Trail - auditId index');

    await AuditCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Audit Trail - userId & date index');

    await AuditCollection.createIndex({ action: 1 });
    console.log('✓ Audit Trail - action index');

    await AuditCollection.createIndex({ resourceType: 1, resourceId: 1 });
    console.log('✓ Audit Trail - resource index');

    await AuditCollection.createIndex({ createdAt: -1 });
    console.log('✓ Audit Trail - date index');

    // Regulatory Reports Indexes
    const RegReportsCollection = mongoose.connection.collection('regulatory_reports');

    await RegReportsCollection.createIndex({ reportId: 1 });
    console.log('✓ Regulatory Reports - reportId index');

    await RegReportsCollection.createIndex({ reportType: 1, createdAt: -1 });
    console.log('✓ Regulatory Reports - type & date index');

    await RegReportsCollection.createIndex({ createdAt: -1 });
    console.log('✓ Regulatory Reports - date index');

    // KYC Reports Indexes
    const KYCReportsCollection = mongoose.connection.collection('kyc_reports');

    await KYCReportsCollection.createIndex({ reportId: 1 });
    console.log('✓ KYC Reports - reportId index');

    await KYCReportsCollection.createIndex({ generatedAt: -1 });
    console.log('✓ KYC Reports - date index');

    // Summary
    console.log('\n========== Phase 13 Database Indexes Created Successfully ==========');
    console.log('✓ 7 Ratings indexes');
    console.log('✓ 4 User Reputations indexes');
    console.log('✓ 3 Rating Flags indexes');
    console.log('✓ 3 Tax Reports indexes');
    console.log('✓ 5 Audit Trail indexes');
    console.log('✓ 3 Regulatory Reports indexes');
    console.log('✓ 2 KYC Reports indexes');
    console.log('Total: 27 indexes created');
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
