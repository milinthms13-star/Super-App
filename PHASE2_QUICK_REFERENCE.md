# Phase 2 Messaging Module - Quick Reference Guide

**Print this guide or bookmark for easy access!**

---

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Start Backend Server
```bash
cd backend && npm start
# Server runs on http://localhost:5000
```

### Run Tests
```bash
npm test -- --testPathPattern="messaging/phase2" --runInBand
```

### View API Documentation
- OTP: `http://localhost:5000/api/messaging/otp`
- Encryption: `http://localhost:5000/api/messaging/encryption`
- Moderation: `http://localhost:5000/api/messaging/admin`
- Optimization: `http://localhost:5000/api/messaging/optimization`
- Reports: `http://localhost:5000/api/messaging/reports`

---

## 📋 File Locations

### Backend Services
```
backend/services/
├── otpService.js                 (OTP generation & verification)
├── encryptionService.js          (RSA-4096 + AES-256-GCM)
├── moderationService.js          (Report management & escalations)
├── messageBatcher.js             (Message batching optimization)
├── deltaSync.js                  (Delta sync for bandwidth)
├── compressionUtil.js            (Gzip compression)
└── abuseReportingService.js      (User reporting system)
```

### Backend Routes
```
backend/routes/
├── otpRoutes.js                  (OTP endpoints)
├── encryptionRoutes.js           (Encryption endpoints)
├── adminRoutes.js                (Moderation endpoints)
├── optimizationRoutes.js         (Optimization stats)
└── abuseReportingRoutes.js       (User report endpoints)
```

### Background Jobs
```
backend/jobs/
├── otpCleanupJob.js              (OTP cleanup & device reset)
├── encryptionCleanupJob.js       (Key rotation & cleanup)
├── moderationCleanupJob.js       (Queue & metrics)
├── optimizationCleanupJob.js     (Batch flush & memory)
└── abuseReportingJob.js          (Auto-detection & monitoring)
```

### Database Models
```
backend/models/
├── OtpSession.js                 (OTP tracking)
├── EncryptionKey.js              (Key management)
├── EncryptedMessage.js           (Encrypted messages)
├── AbuseReport.js                (Abuse reports)
├── ModerationQueue.js            (Task queue)
└── AdminLog.js                   (Audit trail)
```

### React Components
```
src/components/messaging/
├── AdminPanel.jsx                (Moderation dashboard)
├── AdminPanel.css
├── AbuseReportingWidget.jsx      (User reporting UI)
└── AbuseReportingWidget.css
```

### Documentation
```
root/
├── PHASE2_FEATURE1_OTP_AUTHENTICATION_COMPLETE.md
├── PHASE2_FEATURE2_ENCRYPTION_COMPLETE.md
├── PHASE2_FEATURE3_ADMIN_MODERATION_COMPLETE.md
├── PHASE2_FEATURE4_OPTIMIZATION_COMPLETE.md
├── PHASE2_FEATURE5_USER_ABUSE_REPORTING_COMPLETE.md
├── PHASE2_TESTING_GUIDE_COMPLETE.md
├── PHASE2_TO_PHASE3_TRANSITION.md
└── PHASE2_MESSAGING_MODULE_FINAL_SUMMARY.md
```

---

## 🔐 Feature 1: OTP Authentication

### Generate OTP
```javascript
const otpService = require('./services/otpService');

// Generate 6-digit OTP
const otp = await otpService.generateOtp(
  userId,           // 'user123'
  deliveryMethod,   // 'sms' | 'email' | 'in_app'
  recipient         // '+1234567890' or 'user@email.com'
);
```

### Verify OTP
```javascript
const result = await otpService.verifyOtp(recipient, otp);
// Returns: { verified: true, deviceTrusted: true }
```

### Check Device Trust
```javascript
const trusted = await otpService.isDeviceTrusted(userId, phoneNumber);
// Returns: true | false
```

### REST Endpoints
```bash
POST   /api/messaging/otp/send          # Send OTP
POST   /api/messaging/otp/verify        # Verify OTP
GET    /api/messaging/otp/status        # Check trust status
POST   /api/messaging/otp/resend        # Resend OTP
POST   /api/messaging/otp/cancel        # Cancel request
GET    /api/messaging/otp/is-trusted    # Device trust check
POST   /api/messaging/otp/revoke-trust  # Revoke device
GET    /api/messaging/otp/stats         # Statistics
```

---

## 🔒 Feature 2: End-to-End Encryption

### Generate Keypair
```javascript
const encryptionService = require('./services/encryptionService');

const keypair = await encryptionService.generateKeyPair(
  userId,     // 'user123'
  deviceId    // 'device1'
);
// Returns: { publicKey, privateKey, fingerprint, expiresAt }
```

### Encrypt Message
```javascript
const encrypted = await encryptionService.encryptMessage(
  plaintext,      // 'Secret message'
  publicKey       // Public key string
);
// Returns: { encryptedContent, contentIv, contentTag, keyFingerprint }
```

### Decrypt Message
```javascript
const decrypted = await encryptionService.decryptMessage(
  encryptedData,  // { encryptedContent, contentIv, contentTag, ... }
  privateKey      // Private key string
);
// Returns: 'Secret message'
```

### REST Endpoints
```bash
POST   /api/messaging/encryption/keys           # Create keypair
POST   /api/messaging/encryption/rotate         # Rotate key
GET    /api/messaging/encryption/status         # Key status
POST   /api/messaging/encryption/messages/encrypt
POST   /api/messaging/encryption/messages/decrypt
GET    /api/messaging/encryption/verify         # Verify signature
GET    /api/messaging/encryption/stats          # Statistics
DELETE /api/messaging/encryption/keys/:id       # Delete key
```

---

## 👮 Feature 3: Admin Moderation

### Submit Report (Admin)
```javascript
const moderationService = require('./services/moderationService');

const report = await moderationService.submitReport({
  reportedBy: 'admin123',
  reportedUser: 'user456',
  reason: 'harassment',      // enum: harassment, spam, nsfw, etc
  description: 'User sent threats',
  priority: 'high'           // auto-calculated if omitted
});
```

### Get Pending Reports
```javascript
const reports = await moderationService.getPendingReports(
  moderatorId,
  limit // optional, default 20
);
// Returns: sorted by priority, oldest first
```

### Resolve Report
```javascript
const resolved = await moderationService.resolveReport(
  reportId,
  action,         // 'warn_user' | 'suspend_user' | 'ban_user' | etc
  resolution,     // Explanation
  moderatorId
);
```

### Warn User
```javascript
await moderationService.warnUser(
  userId,
  reason,         // Warning reason
  moderatorId
  // User suspended after 3 warnings
);
```

### REST Endpoints
```bash
POST   /api/messaging/admin/reports                    # Create report
GET    /api/messaging/admin/reports                    # List pending
GET    /api/messaging/admin/reports/:id                # Get details
POST   /api/messaging/admin/reports/:id/resolve        # Resolve
POST   /api/messaging/admin/reports/:id/dismiss        # Dismiss
POST   /api/messaging/admin/reports/:id/escalate       # Escalate
POST   /api/messaging/admin/users/:id/warn             # Warn user
POST   /api/messaging/admin/users/:id/suspend          # Suspend
POST   /api/messaging/admin/users/:id/ban              # Ban user
GET    /api/messaging/admin/queue                      # Queue status
POST   /api/messaging/admin/queue/:id/claim            # Claim task
GET    /api/messaging/admin/users/:id/history          # History
GET    /api/messaging/admin/analytics                  # Stats
POST   /api/messaging/admin/appeals/:id/respond        # Appeal response
```

---

## ⚡ Feature 4: Real-Time Optimization

### Message Batching
```javascript
const messageBatcher = require('./services/messageBatcher');

// Add message to batch
messageBatcher.addMessageToBatch(userId, messageData);

// Get stats
const stats = messageBatcher.getStats();
// { totalBatches, totalMessages, reductionPercentage }
```

### Delta Sync
```javascript
const deltaSync = require('./services/deltaSync');

// Calculate delta (vs previous state)
const delta = deltaSync.calculateDelta(
  messageId,
  currentState,      // { isRead: true, status: 'delivered' }
  previousState      // { isRead: false, status: 'sent' }
);
// Returns: { type: 'full' | 'delta', data, savings }
```

### Compression
```javascript
const compressionUtil = require('./services/compressionUtil');

// Compress data
const compressed = await compressionUtil.compress(JSON.stringify(data));
// { compressed, originalSize, compressedSize, ratio, isCompressed }

// Decompress
const original = await compressionUtil.decompress(compressed.compressed);
```

### REST Endpoints (Admin)
```bash
GET    /api/messaging/optimization/stats                # Get all stats
GET    /api/messaging/optimization/batching/stats       # Batch stats
GET    /api/messaging/optimization/delta-sync/stats     # Delta stats
GET    /api/messaging/optimization/compression/stats    # Compression stats
POST   /api/messaging/optimization/batching/reset       # Reset batch stats
```

---

## 📢 Feature 5: User Abuse Reporting

### Submit Report (User)
```javascript
const abuseReportingService = require('./services/abuseReportingService');

const report = await abuseReportingService.submitUserReport(
  userId,
  {
    reportedUser: 'target_user_id',
    reportedMessage: 'message_id',        // optional
    reason: 'harassment',                  // enum
    description: 'User sent threats',      // 10+ chars required
    relationship: 'stranger',              // stranger | contact | friend
    previousIncidents: false               // Has this happened before?
  }
);
```

### Appeal Decision
```javascript
const appeal = await abuseReportingService.submitAppeal(
  reportId,
  userId,
  appealReason           // 'The report was incorrect because...'
);
```

### Get User Stats
```javascript
const stats = await abuseReportingService.getUserAbuseStats(userId);
// { reportsSubmitted, reportsReceived, accountStatus, warnings, accountHealth }
```

### Auto-Detection
```javascript
const detected = await abuseReportingService.autoDetectAbuse(
  userId,
  messages[]  // Array of messages to scan
);
// Returns: [{ messageId, detectedType, confidence }, ...]
```

### REST Endpoints (User)
```bash
POST   /api/messaging/reports/report                    # Submit report
GET    /api/messaging/reports/my-reports                # My reports
GET    /api/messaging/reports/report/:id/status         # Check status
POST   /api/messaging/reports/report/:id/appeal         # Appeal
GET    /api/messaging/reports/my-stats                  # My stats

GET    /api/messaging/reports/trending-reasons          # Public: Trends
GET    /api/messaging/reports/insights                  # Public: Insights
```

---

## 🧪 Testing Commands

### Run All Phase 2 Tests
```bash
npm test -- --testPathPattern="phase2" --runInBand --verbose
```

### Run Specific Feature Tests
```bash
npm test -- messaging/phase2/otpAuthentication.test.js
npm test -- messaging/phase2/encryption.test.js
npm test -- messaging/phase2/moderation.test.js
npm test -- messaging/phase2/optimization.test.js
npm test -- messaging/phase2/abuseReporting.test.js
```

### Run with Coverage
```bash
npm test -- --testPathPattern="phase2" --coverage --runInBand
```

### Watch Mode
```bash
npm test -- --testPathPattern="phase2" --watch
```

---

## 📊 Background Jobs

### Job Frequencies

| Job | Frequency | Purpose |
|-----|-----------|---------|
| OTP Cleanup | Hourly | Remove expired OTPs |
| Device Trust Reset | 30 min | Reset lock after timeout |
| Encryption Key Rotation | 6 hours | Check for expired keys |
| Moderation Escalation | Hourly | Escalate SLA violations |
| Queue Optimization | Daily 3:00 UTC | Clean stuck tasks |
| Spam Detection | Every 30 min | Scan for spam patterns |
| Harassment Detection | Every 1 hour | Detect threats |
| Repeat Offender Check | Every 6 hours | Find spam accounts |
| Appeal Backlog Check | Every 2 hours | Monitor pending appeals |

### Job Monitoring
```bash
# View job logs
tail -f backend/logs/jobs.log

# Check job status
curl http://localhost:5000/api/messaging/jobs/status
```

---

## 🔍 Database Queries

### Find Pending Reports
```javascript
const AbuseReport = require('./models/AbuseReport');
const pending = await AbuseReport.find({ status: 'pending' })
  .sort({ priority: -1, createdAt: 1 });
```

### Get User Moderation History
```javascript
const adminLogs = await AdminLog.find({ targetUser: userId })
  .sort({ createdAt: -1 })
  .limit(50);
```

### Find Active OTP Sessions
```javascript
const activeSessions = await OtpSession.find({
  expiresAt: { $gt: new Date() },
  locked: false
});
```

### Check Encryption Key Status
```javascript
const keys = await EncryptionKey.find({
  userId: userId,
  expiresAt: { $lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }  // Expiring in 7 days
});
```

---

## 🐛 Common Issues & Solutions

### Issue: OTP verification fails
**Solution:** Check OtpSession TTL hasn't expired (15 min max)
```bash
db.OtpSession.findOne({ recipient: '+1234567890' })
# Check expiresAt < now
```

### Issue: Encryption key not found
**Solution:** Keys may have been rotated
```javascript
// Use old key from 90-day grace period
const oldKey = await EncryptionKey.findOne({
  userId: userId,
  gracePeriodExpires: { $gt: new Date() }
});
```

### Issue: Moderation queue growing
**Solution:** Check SLA enforcement job is running
```bash
# Restart job
pm2 restart optimizationCleanupJob
# Or check logs for errors
tail -f backend/logs/jobs.log
```

### Issue: High memory usage
**Solution:** Clear old states from deltaSync
```javascript
const deltaSync = require('./services/deltaSync');
deltaSync.clearAllStates();
```

---

## 📈 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:5000/health
# Returns: { status: 'OK', timestamp: '2024-05-07T...' }
```

### Key Metrics to Monitor
```javascript
// OTP Service
const otpStats = require('./services/otpService').getStats();
// { generated, verified, failed, avgVerificationTime }

// Encryption Service
const encStats = require('./services/encryptionService').getStats();
// { keysGenerated, messagesEncrypted, avgEncryptionTime }

// Optimization
const batchStats = require('./services/messageBatcher').getStats();
const deltaStats = require('./services/deltaSync').getStats();
const compressionStats = require('./services/compressionUtil').getStats();
```

### Database Health
```bash
# Check connections
mongosh --eval "db.serverStatus().connections"

# Check index usage
db.Message.aggregate([
  { $indexStats: {} }
])
```

---

## 🚀 Deployment Checklist

- [ ] All tests passing: `npm test -- --testPathPattern="phase2"`
- [ ] No ESLint warnings: `npm run lint -- backend/`
- [ ] Code reviewed and approved
- [ ] Security audit passed
- [ ] Database migrations tested
- [ ] Staging deployment successful
- [ ] Load testing passed (10K concurrent)
- [ ] Monitoring alerts configured
- [ ] Runbook created
- [ ] Team trained on operations

---

## 📞 Support & Escalation

### Urgent Issues
- **Security Breach:** Page on-call engineer immediately
- **Data Loss:** Stop all services, contact DBA
- **Service Down:** Check health endpoint, restart if needed

### Non-Urgent Issues
- Create GitHub issue with:
  - Reproduction steps
  - Error logs
  - Expected vs actual behavior
- Tag: `messaging-phase2`

### Documentation Links
- Feature 1: [OTP Authentication](./PHASE2_FEATURE1_OTP_AUTHENTICATION_COMPLETE.md)
- Feature 2: [Encryption](./PHASE2_FEATURE2_ENCRYPTION_COMPLETE.md)
- Feature 3: [Moderation](./PHASE2_FEATURE3_ADMIN_MODERATION_COMPLETE.md)
- Feature 4: [Optimization](./PHASE2_FEATURE4_OPTIMIZATION_COMPLETE.md)
- Feature 5: [Abuse Reporting](./PHASE2_FEATURE5_USER_ABUSE_REPORTING_COMPLETE.md)
- Testing: [Test Guide](./PHASE2_TESTING_GUIDE_COMPLETE.md)
- Transition: [Phase 3 Roadmap](./PHASE2_TO_PHASE3_TRANSITION.md)
- Summary: [Final Summary](./PHASE2_MESSAGING_MODULE_FINAL_SUMMARY.md)

---

## ✅ Quick Checklist

**Before Deploying Phase 2:**
- [ ] Read Final Summary
- [ ] Review Quick Reference Guide
- [ ] Run all tests
- [ ] Check monitoring setup
- [ ] Verify database backups
- [ ] Brief team on features
- [ ] Update runbook

**After Deploying Phase 2:**
- [ ] Monitor for 24 hours
- [ ] Check error rates
- [ ] Verify moderation queue
- [ ] Test user workflows
- [ ] Collect feedback
- [ ] Plan Phase 3 kickoff

---

**Last Updated:** May 7, 2024  
**Version:** 1.0 (Phase 2 Final)  
**Next Update:** Phase 3 Kickoff
