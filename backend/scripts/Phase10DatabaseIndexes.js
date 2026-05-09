/**
 * Phase10DatabaseIndexes.js
 * MongoDB Indexes for Phase 10: Security & Encryption, Compliance, Data Protection, Audit Logging
 * Run: node backend/scripts/Phase10DatabaseIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/malabarbazaar');
    console.log('Connected to MongoDB');

    // Encryption Keys Indexes
    const EncryptionKeyCollection = mongoose.connection.collection('encryptionkeys');

    await EncryptionKeyCollection.createIndex({ keyType: 1, isActive: 1 });
    console.log('✓ Encryption Keys - keyType & active status index');

    await EncryptionKeyCollection.createIndex({ createdAt: -1 });
    console.log('✓ Encryption Keys - creation date index');

    await EncryptionKeyCollection.createIndex({ expiryDate: 1, isActive: 1 });
    console.log('✓ Encryption Keys - expiry & active index');

    // User Consents Indexes
    const UserConsentCollection = mongoose.connection.collection('userconsents');

    await UserConsentCollection.createIndex({ userId: 1, consentedAt: -1 });
    console.log('✓ User Consents - userId & date index');

    await UserConsentCollection.createIndex({ consentedAt: -1 });
    console.log('✓ User Consents - date index');

    await UserConsentCollection.createIndex({ isActive: 1 });
    console.log('✓ User Consents - active status index');

    // Data Requests (Access, Erasure, Rectification) Indexes
    const DataRequestCollection = mongoose.connection.collection('datarequests');

    await DataRequestCollection.createIndex({ userId: 1, status: 1 });
    console.log('✓ Data Requests - userId & status index');

    await DataRequestCollection.createIndex({ requestType: 1, status: 1 });
    console.log('✓ Data Requests - type & status index');

    await DataRequestCollection.createIndex({ processingDeadline: 1 });
    console.log('✓ Data Requests - deadline index');

    // Data Processing Agreements Indexes
    const DPACollection = mongoose.connection.collection('dataprocessingagreements');

    await DPACollection.createIndex({ userId: 1 });
    console.log('✓ Data Processing Agreements - userId index');

    // Data Processing Logs Indexes
    const ProcessingLogCollection = mongoose.connection.collection('dataprocessinglogs');

    await ProcessingLogCollection.createIndex({ userId: 1, timestamp: -1 });
    console.log('✓ Data Processing Logs - userId & date index');

    await ProcessingLogCollection.createIndex({ actionType: 1 });
    console.log('✓ Data Processing Logs - action type index');

    await ProcessingLogCollection.createIndex({ timestamp: -1 });
    console.log('✓ Data Processing Logs - date index');

    // Security Events Indexes
    const SecurityEventCollection = mongoose.connection.collection('securityevents');

    await SecurityEventCollection.createIndex({ userId: 1, timestamp: -1 });
    console.log('✓ Security Events - userId & date index');

    await SecurityEventCollection.createIndex({ eventType: 1, severity: 1 });
    console.log('✓ Security Events - type & severity index');

    await SecurityEventCollection.createIndex({ timestamp: -1 });
    console.log('✓ Security Events - date index');

    await SecurityEventCollection.createIndex({ severity: 1 });
    console.log('✓ Security Events - severity index');

    // Admin Audits Indexes
    const AdminAuditCollection = mongoose.connection.collection('adminaudits');

    await AdminAuditCollection.createIndex({ adminId: 1, timestamp: -1 });
    console.log('✓ Admin Audits - adminId & date index');

    await AdminAuditCollection.createIndex({ actionType: 1 });
    console.log('✓ Admin Audits - action type index');

    await AdminAuditCollection.createIndex({ targetResourceType: 1, targetResourceId: 1 });
    console.log('✓ Admin Audits - resource index');

    await AdminAuditCollection.createIndex({ reversible: 1 });
    console.log('✓ Admin Audits - reversible status index');

    // User Activity Logs Indexes
    const ActivityLogCollection = mongoose.connection.collection('useractivitylogs');

    await ActivityLogCollection.createIndex({ userId: 1, timestamp: -1 });
    console.log('✓ User Activity Logs - userId & date index');

    await ActivityLogCollection.createIndex({ activityType: 1 });
    console.log('✓ User Activity Logs - activity type index');

    await ActivityLogCollection.createIndex({ timestamp: -1 });
    console.log('✓ User Activity Logs - date index');

    // PCI DSS Audit Logs Indexes
    const PCIAuditCollection = mongoose.connection.collection('pciauditlogs');

    await PCIAuditCollection.createIndex({ type: 1, auditedAt: -1 });
    console.log('✓ PCI DSS Audit - type & date index');

    await PCIAuditCollection.createIndex({ status: 1 });
    console.log('✓ PCI DSS Audit - status index');

    // GDPR Audit Logs Indexes
    const GDPRAuditCollection = mongoose.connection.collection('gdprauditlogs');

    await GDPRAuditCollection.createIndex({ type: 1, auditedAt: -1 });
    console.log('✓ GDPR Audit - type & date index');

    await GDPRAuditCollection.createIndex({ status: 1 });
    console.log('✓ GDPR Audit - status index');

    // Compliance Events Indexes
    const ComplianceEventCollection = mongoose.connection.collection('complianceevents');

    await ComplianceEventCollection.createIndex({ type: 1, severity: 1 });
    console.log('✓ Compliance Events - type & severity index');

    await ComplianceEventCollection.createIndex({ status: 1, loggedAt: -1 });
    console.log('✓ Compliance Events - status & date index');

    // Sessions Indexes
    const SessionCollection = mongoose.connection.collection('sessions');

    await SessionCollection.createIndex({ userId: 1, createdAt: -1 });
    console.log('✓ Sessions - userId & date index');

    await SessionCollection.createIndex({ isActive: 1 });
    console.log('✓ Sessions - active status index');

    // TLS Configs Indexes
    const TLSCollection = mongoose.connection.collection('tlsconfigs');

    await TLSCollection.createIndex({ isActive: 1 });
    console.log('✓ TLS Configs - active status index');

    // TTL Indexes (Auto-delete expired records)
    await UserConsentCollection.createIndex({ expiryDate: 1 }, { expireAfterSeconds: 0 });
    console.log('✓ User Consents - TTL index (auto-expiry)');

    await SessionCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✓ Sessions - TTL index (auto-expiry)');

    // Privacy Policy Acceptance Indexes
    const PrivacyAcceptanceCollection = mongoose.connection.collection('privacypolicyacceptances');

    await PrivacyAcceptanceCollection.createIndex({ userId: 1, acceptedAt: -1 });
    console.log('✓ Privacy Policy Acceptance - userId & date index');

    await PrivacyAcceptanceCollection.createIndex({ validUntil: 1 }, { expireAfterSeconds: 0 });
    console.log('✓ Privacy Policy Acceptance - TTL index');

    // Summary
    console.log('\n========== Phase 10 Database Indexes Created Successfully ==========');
    console.log('✓ 3 Encryption Keys indexes');
    console.log('✓ 3 User Consents indexes');
    console.log('✓ 3 Data Requests indexes');
    console.log('✓ 1 Data Processing Agreements index');
    console.log('✓ 3 Data Processing Logs indexes');
    console.log('✓ 4 Security Events indexes');
    console.log('✓ 4 Admin Audits indexes');
    console.log('✓ 3 User Activity Logs indexes');
    console.log('✓ 2 PCI DSS Audit indexes');
    console.log('✓ 2 GDPR Audit indexes');
    console.log('✓ 2 Compliance Events indexes');
    console.log('✓ 2 Sessions indexes (+ 1 TTL)');
    console.log('✓ 1 TLS Configs index');
    console.log('✓ 2 Privacy Policy Acceptance indexes (+ 1 TTL)');
    console.log('Total: 38 indexes created (including TTL indexes)');
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
