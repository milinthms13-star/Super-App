# Matrimonial Module - Developer Quick Reference

## 🚀 Getting Started

### Start Backend Server
```bash
cd backend
npm install  # if needed
npm start    # Starts on port 5000
```

### Verify All Files Are Syntactically Correct
```bash
cd backend
node -c models/Horoscope.js
node -c models/KYC.js
node -c models/BlueTick.js
node -c models/MatrimonialSubscription.js
node -c utils/horoscopeMatchingService.js
node -c utils/subscriptionService.js
node -c utils/blueTickService.js
node -c routes/matrimonial-kyc.js
node -c routes/matrimonial-subscription.js
node -c jobs/matrimonialScheduler.js
```

---

## 📖 Key Files Overview

### Models (Database Schema)
| File | Purpose | Fields |
|------|---------|--------|
| `models/Horoscope.js` | Astrology data | rashi, nakshatra, planets, doshas, birth details |
| `models/KYC.js` | Identity verification | documents, selfie, risk score, fraud flags |
| `models/BlueTick.js` | Verification badge | status, eligibility score, requirements met |
| `models/MatrimonialSubscription.js` | Premium tiers | tier, dates, entitlements, payment info |

### Services (Business Logic)
| File | Core Functions |
|------|----------------|
| `utils/horoscopeMatchingService.js` | `calculateCompatibilityScore()`, `calculateGunaScore()` |
| `utils/subscriptionService.js` | `createSubscription()`, `hasEntitlement()`, `renewSubscription()` |
| `utils/blueTickService.js` | `calculateEligibilityScore()`, `autoIssueBlueTick()` |

### Routes (API Endpoints)
| File | Endpoints |
|------|-----------|
| `routes/matrimonial-kyc.js` | POST/PATCH /kyc/*, GET /kyc/status |
| `routes/matrimonial-subscription.js` | POST/GET /subscription/*, PATCH /subscription/* |

### Jobs (Scheduled Tasks)
| File | Frequency | Tasks |
|------|-----------|-------|
| `jobs/matrimonialScheduler.js` | Every 6 hours | Expiry, KYC auto-verify, blue tick maintenance |

---

## 🔍 API Endpoint Reference

### KYC Upload & Status
```bash
# User uploads document
POST /api/matrimonial/kyc/upload
{
  "profileId": "user123",
  "documentType": "aadhaar|pan|passport|voterId|drivingLicense",
  "fileUrl": "s3://bucket/path/to/file"
}

# Check KYC status
GET /api/matrimonial/kyc/status?profileId=user123

# Admin approves
PATCH /api/matrimonial/kyc/{kycId}/approve
{ "notes": "Approved - all documents verified" }

# Admin rejects
PATCH /api/matrimonial/kyc/{kycId}/reject
{ "reason": "Document unclear", "notes": "Resubmit better quality" }
```

### Blue Tick Request & Status
```bash
# User requests blue tick
POST /api/matrimonial/blue-tick/request
{ "profileId": "user123" }

# Check blue tick status
GET /api/matrimonial/blue-tick/status?profileId=user123
```

### Subscription Management
```bash
# Create/upgrade subscription
POST /api/matrimonial/subscription/create
{
  "profileId": "user123",
  "tier": "gold|premium|vip",
  "billingCycle": "monthly|annual"
}

# Get current subscription
GET /api/matrimonial/subscription/current

# Check entitlement before action
POST /api/matrimonial/subscription/check-entitlement
{ "entitlement": "profileViews" }

# Consume entitlement (after action)
POST /api/matrimonial/subscription/consume
{ "entitlement": "profileViews" }

# Cancel subscription
PATCH /api/matrimonial/subscription/{subscriptionId}/cancel
{ "reason": "Too expensive" }

# Admin process refund
PATCH /api/matrimonial/subscription/{subscriptionId}/refund
{
  "amount": 999,
  "reason": "Customer requested cancellation"
}
```

---

## 💻 Common Code Patterns

### Check Entitlement Before Action
```javascript
const { subscriptionService } = require('../utils/subscriptionService');

// In your route handler
const hasAccess = await subscriptionService.hasEntitlement(
  userEmail,
  'profileViews'
);

if (!hasAccess) {
  return res.status(403).json({
    success: false,
    message: 'Upgrade subscription to view more profiles'
  });
}

// User has access - consume entitlement
await subscriptionService.consumeEntitlement(userEmail, 'profileViews');
// ... continue with action
```

### Calculate Horoscope Compatibility
```javascript
const { calculateCompatibilityScore } = require('../utils/horoscopeMatchingService');

const result = calculateCompatibilityScore(horoscope1, horoscope2);

// Result structure:
// {
//   overallScore: 72,
//   compatibilityLevel: 'very_good',
//   gunaScore: { score: 26, maxScore: 36, percentage: 72, isSuitable: true },
//   recommendation: 'Excellent match...'
// }
```

### Issue Blue Tick
```javascript
const { autoIssueBlueTick } = require('../utils/blueTickService');

const blueTick = await autoIssueBlueTick(profileId);

if (blueTick) {
  console.log(`Blue tick issued! Eligibility score: ${blueTick.eligibilityScore}`);
} else {
  console.log('Profile not eligible for auto blue tick');
}
```

### Handle Subscription Expiry
```javascript
const { subscriptionService } = require('../utils/subscriptionService');

// Should be called every 6 hours (scheduler does this)
await subscriptionService.handleSubscriptionExpiry();

// This will:
// 1. Auto-renew if enabled and payment was successful
// 2. Downgrade to free tier if expired and no auto-renewal
// 3. Send warning emails at 14, 7, 3, 1 days before expiry
```

---

## 🧪 Testing Commands

### Test Horoscope Matching
```bash
curl -X POST http://localhost:5000/api/matrimonial/horoscope/match \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId1": "user123",
    "profileId2": "user456"
  }'
```

### Test KYC Upload
```bash
curl -X POST http://localhost:5000/api/matrimonial/kyc/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "documentType": "aadhaar",
    "fileUrl": "https://s3.amazonaws.com/bucket/aadhaar.jpg"
  }'
```

### Test Subscription
```bash
curl -X POST http://localhost:5000/api/matrimonial/subscription/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "tier": "premium",
    "billingCycle": "monthly"
  }'
```

---

## 📊 Database Schema Quick Reference

### Horoscope Document
```javascript
{
  profileId: ObjectId,
  rashi: "Virgo",           // 12 zodiac signs
  nakshatra: "Hasta",       // 27 lunar mansions
  dateOfBirth: Date,
  birthTime: "14:30:00",    // hour:minute:second
  birthPlace: "Mumbai, India",
  planets: {
    sun: { sign: "Virgo", degree: 15.5, house: 1 },
    moon: { sign: "Libra", degree: 8.2, house: 2 },
    // ... 9 planets total
  },
  doshas: {
    mangalDosh: { present: false },
    kalasarpaDosh: { present: true, severity: "medium" },
    // ...
  }
}
```

### KYC Document
```javascript
{
  profileId: ObjectId,
  status: "approved",       // pending, approved, rejected, under_review, expired
  documents: {
    aadhaar: {
      status: "verified",
      uploadedAt: Date,
      url: "s3://...",
      verifiedAt: Date
    }
    // ... other docs
  },
  selfie: {
    livenessScore: 92,      // 0-100
    faceMatchScore: 88,     // percentage match with document
    status: "verified"
  },
  riskScore: 15,            // 0-100 (lower is better)
  flags: {
    duplicateProfile: false,
    suspiciousActivity: false,
    // ...
  },
  approvedAt: Date,
  approvedBy: "admin@nilahuб.com"
}
```

### BlueTick Document
```javascript
{
  profileId: ObjectId,
  status: "approved",       // not_eligible, pending_review, approved, rejected, revoked
  issuedAt: Date,
  issuedBy: "automatic",    // 'automatic' or admin email
  eligibilityScore: 68,     // 0-100
  requirementsMet: {
    kycVerified: true,
    kyc6MonthsOld: false,
    noFraudReports: true,
    // ... 8 requirements
  },
  expiryDate: Date,
  autoRenew: true
}
```

### MatrimonialSubscription Document
```javascript
{
  profileId: ObjectId,
  userEmail: "user@example.com",
  tier: "premium",          // free, gold, premium, vip
  startDate: Date,
  endDate: Date,
  isActive: true,
  entitlements: {
    profileViews: 2000,
    profileViewsUsed: 150,
    interestRequests: 500,
    interestRequestsUsed: 25,
    directMessages: 1000,
    horoscopeMatching: true,
    videoCalls: true
  },
  paymentStatus: "completed",
  autoRenew: true
}
```

---

## 🔧 Debugging Tips

### Check Logs
```bash
# If using Winston logger
tail -f logs/error.log
tail -f logs/combined.log
```

### MongoDB Queries
```javascript
// Check KYC records
db.kyc.find({ profileId: ObjectId("...") })

// Check subscriptions
db.matrimonialsubscription.find({ userEmail: "user@example.com" })

// Check blue ticks
db.bluetick.find({ status: "approved" })

// Check for expiring subscriptions
db.matrimonialsubscription.find({ 
  endDate: { $gte: new Date(), $lte: new Date(Date.now() + 14*24*60*60*1000) }
})
```

### Test Scheduler Manually
```javascript
// In your Node.js console or route
const { runMatrimonialScheduler } = require('../jobs/matrimonialScheduler');
await runMatrimonialScheduler();
```

---

## 📝 Common Tasks

### Add New Entitlement Type
1. Add field to `MatrimonialSubscription` model's `entitlements` schema
2. Update `subscriptionService.SUBSCRIPTION_TIERS` constant
3. Add check in relevant route handler before action
4. Update frontend component

### Approve a User's KYC
1. Admin calls: `PATCH /kyc/{kycId}/approve`
2. Backend updates KYC status to "approved"
3. Automatically calculates blue tick eligibility
4. Issues blue tick if eligible (score ≥50)
5. User is notified (add email notification)

### Handle Failed Payment
1. Payment webhook received with failure status
2. Update `MatrimonialSubscription.paymentStatus` to "failed"
3. On next scheduler run, will attempt retry or downgrade to free
4. Send notification to user about renewal failure

---

## 🎯 Integration Checklist for Frontend Developers

- [ ] Import all API endpoints in frontend service
- [ ] Create KYC verification component
- [ ] Add blue tick badge display
- [ ] Implement horoscope matching show
- [ ] Create subscription tier selector
- [ ] Add entitlement checking before actions
- [ ] Implement payment form integration
- [ ] Create admin approval dashboard
- [ ] Setup email notification templates
- [ ] Test all flows end-to-end

---

## 📞 Quick Support

### Issue: "Module not found"
```bash
# Ensure all dependencies installed
npm install
# Ensure route is registered in server.js
grep "matrimonial" backend/server.js
```

### Issue: "Database connection error"
```bash
# Check MongoDB is running
# Check connection string in .env
# Check authentication credentials
```

### Issue: "Authorization error"
```bash
# Ensure JWT token is passed in Authorization header
# Check token hasn't expired
# Verify user exists in database
```

---

## 🚀 Next Steps

1. **Frontend Integration** - Use components in `MATRIMONIAL_FRONTEND_INTEGRATION.md`
2. **Payment Gateway** - Integrate Razorpay/Stripe
3. **Email Notifications** - Setup SendGrid/AWS SES
4. **Admin Dashboard** - Build admin review interface
5. **Testing** - Use test guide in `MATRIMONIAL_TESTING_GUIDE.md`
6. **Deployment** - Follow deployment checklist

---

**Ready to build! Good luck! 🎉**
