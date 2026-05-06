# Matrimonial Module - Quick Testing Reference

## 1. Testing KYC Verification

### Step 1: Upload Document
```bash
curl -X POST http://localhost:5000/api/matrimonial/kyc/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "documentType": "aadhaar",
    "fileUrl": "https://s3.amazonaws.com/...image.jpg"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "aadhaar uploaded for verification",
  "data": {
    "_id": "kyc_id",
    "profileId": "user123",
    "status": "under_review",
    "documents": {
      "aadhaar": {
        "status": "pending",
        "uploadedAt": "2024-01-15T10:00:00Z"
      }
    }
  }
}
```

### Step 2: Check KYC Status
```bash
curl -X GET http://localhost:5000/api/matrimonial/kyc/status?profileId=user123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "under_review",
    "riskScore": 25,
    "verifiedDocuments": [],
    "isApproved": false
  }
}
```

### Step 3: Admin Approves KYC
```bash
curl -X PATCH http://localhost:5000/api/matrimonial/kyc/kyc_id/approve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "All documents verified. Low risk profile."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "KYC approved",
  "data": {
    "status": "approved",
    "approvedAt": "2024-01-15T10:30:00Z",
    "approvedBy": "admin@nilahuб.com"
  },
  "blueTick": {
    "status": "approved",
    "issuedAt": "2024-01-15T10:30:00Z",
    "eligibilityScore": 65
  }
}
```

---

## 2. Testing Blue Tick Badge

### Check Blue Tick Status
```bash
curl -X GET http://localhost:5000/api/matrimonial/blue-tick/status?profileId=user123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**If Blue Tick is Approved:**
```json
{
  "success": true,
  "data": {
    "hasBlueTick": true,
    "status": "approved",
    "issuedAt": "2024-01-15T10:30:00Z",
    "expiryDate": "2025-01-15T10:30:00Z",
    "eligibilityScore": 68
  }
}
```

**If Not Eligible Yet:**
```json
{
  "success": true,
  "data": {
    "hasBlueTick": false,
    "status": "not_issued"
  }
}
```

### Request Blue Tick (Manual Review)
```bash
curl -X POST http://localhost:5000/api/matrimonial/blue-tick/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123"
  }'
```

---

## 3. Testing Horoscope Matching

### Create Horoscope Profile
```bash
curl -X POST http://localhost:5000/api/matrimonial/horoscope/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "rashi": "Virgo",
    "nakshatra": "Hasta",
    "dateOfBirth": "1995-09-15",
    "birthTime": "14:30:00",
    "birthPlace": "Mumbai, India"
  }'
```

### Check Horoscope Matching Between Two Profiles
```bash
curl -X POST http://localhost:5000/api/matrimonial/horoscope/match \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId1": "user123",
    "profileId2": "user456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 72,
    "compatibilityLevel": "very_good",
    "gunaScore": {
      "score": 26,
      "maxScore": 36,
      "percentage": 72,
      "minAcceptable": 18,
      "isSuitable": true
    },
    "recommendation": "Excellent match with good compatibility...",
    "details": {
      "nadiCompatible": true,
      "rashiCompatible": true,
      "dasha": "Favorable"
    }
  }
}
```

---

## 4. Testing Subscriptions

### Create Subscription (User Upgrades)
```bash
curl -X POST http://localhost:5000/api/matrimonial/subscription/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "user123",
    "tier": "premium",
    "billingCycle": "monthly"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "premium subscription created",
  "data": {
    "_id": "sub_id",
    "profileId": "user123",
    "tier": "premium",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "isActive": true,
    "entitlements": {
      "profileViews": 2000,
      "interestRequests": 500,
      "directMessages": 1000,
      "horoscopeMatching": true,
      "videoCalls": true
    }
  },
  "paymentRequired": true
}
```

### Check Current Subscription
```bash
curl -X GET http://localhost:5000/api/matrimonial/subscription/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "tier": "premium",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-02-15T00:00:00Z",
    "daysRemaining": 28,
    "isActive": true,
    "autoRenew": true,
    "entitlements": {
      "profileViews": 2000,
      "profileViewsUsed": 150,
      "interestRequests": 500,
      "directMessages": 1000,
      "horoscopeMatching": true
    }
  }
}
```

### Check Entitlement Before Action
```bash
curl -X POST http://localhost:5000/api/matrimonial/subscription/check-entitlement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entitlement": "profileViews"
  }'
```

**Response (Has Access):**
```json
{
  "success": true,
  "hasAccess": true,
  "entitlement": "profileViews"
}
```

**Response (Limit Exceeded):**
```json
{
  "success": true,
  "hasAccess": false,
  "entitlement": "profileViews"
}
```

### Consume Entitlement (Decrement Usage)
```bash
curl -X POST http://localhost:5000/api/matrimonial/subscription/consume \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entitlement": "profileViews"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "profileViews consumed"
}
```

### Cancel Subscription
```bash
curl -X PATCH http://localhost:5000/api/matrimonial/subscription/sub_id/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Too expensive"
  }'
```

---

## 5. Testing Scheduler Jobs (Admin Only)

### Manually Trigger Scheduler
```bash
curl -X POST http://localhost:5000/api/admin/jobs/matrimonial-scheduler \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Jobs that run every 6 hours:**
1. Enforce partner preferences
2. Auto-verify low-risk KYC
3. Handle subscription expirations
4. Maintain blue ticks
5. Monitor fake profiles
6. Generate analytics

---

## 6. Test Scenarios

### Scenario A: Free User → Gold Tier
1. User creates profile (free tier)
2. Check subscription → Returns free tier with 50 views
3. User upgrades to gold → Create subscription
4. Check subscription → Returns gold tier with 500 views
5. At day 14 before expiry → System sends renewal warning
6. At expiry → Auto-renews if payment successful

### Scenario B: KYC Approval → Blue Tick
1. User uploads KYC documents
2. Admin reviews and approves
3. System automatically issues blue tick
4. User profile now shows verified badge
5. Blue tick renews annually if profile remains active

### Scenario C: Horoscope Matching Filter
1. User views search results
2. For each profile, calculate horoscope score
3. Filter by minimum compatibility (40+)
4. Show scores in search results
5. Show detailed match analysis on profile view

### Scenario D: Image Watermarking
1. User uploads profile photo
2. System applies watermark with email & ID
3. Creates low-res preview for list views
4. Checks for fake/AI-generated indicators
5. Logs access whenever photo is viewed

---

## Troubleshooting

### "Profile not eligible for blue tick"
- Check KYC status (must be approved)
- Check eligibility score (must be 50+)
- Ensure profile is 3+ months old
- Check for user complaints or fraud flags

### "Subscription limit exceeded"
- Check remaining entitlements
- Upgrade to higher tier
- Wait for subscription renewal
- Contact support

### "KYC status: under_review"
- System is checking documents
- Takes 24-48 hours for admin review
- Keep an eye on email for updates
- Can check status anytime

### "Horoscope matching not available"
- User doesn't have subscription with matching
- Must be Gold tier or above
- Ensure both profiles have horoscope data
- Contact support if horoscope missing

---

## Performance Monitoring

### Monitor Scheduler Logs
```bash
tail -f logs/matrimonial-scheduler.log
```

### Monitor API Response Times
```bash
# Check average response time for KYC approval
curl -X GET http://localhost:5000/api/admin/metrics/matrimonial \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Monitor Database Indexes
```javascript
// Check if indexes are being used
db.kyc.find().explain("executionStats")
db.bluetick.find().explain("executionStats")
db.matrimonialsubscription.find().explain("executionStats")
```

---

## Summary

All matrimonial high-priority features are production-ready:
- ✅ KYC verification with biometric checks
- ✅ Blue tick badges with automatic issuance
- ✅ Horoscope matching with vedic astrology
- ✅ Premium subscriptions with entitlements
- ✅ Image security with watermarking
- ✅ Automated maintenance scheduler
- ✅ Comprehensive error handling
- ✅ Audit trails for all actions

**Ready for user testing!** 🎉
