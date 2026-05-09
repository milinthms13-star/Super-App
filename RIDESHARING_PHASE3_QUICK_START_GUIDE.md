# RideSharing Phase 3: Quick Start Guide 🚀

## 📌 Quick Overview

Phase 3 adds **Wallet**, **Referral Program**, and **Coupon** system to your ride-sharing app.

- **21 API endpoints** across 3 resource types
- **3 React components** with full styling
- **5 MongoDB models** for data persistence
- **Full integration** with authentication & payment flow

---

## ⚡ 30-Second Setup

### 1. Create Database Models

Create these 5 files in `backend/models/`:

**Wallet.js** - User wallet balance tracking
**WalletTransaction.js** - Transaction history
**ReferralProgram.js** - Referral codes & bonuses
**Coupon.js** - Discount coupons
**CouponUsage.js** - Coupon usage tracking

### 2. Create Services

Copy these 3 files to `backend/services/ridesharing/`:

**WalletService.js** (400+ lines)
**ReferralProgramService.js** (400+ lines)
**CouponService.js** (450+ lines)

### 3. Create Routes

Copy to `backend/routes/`:
**rideSharingPhase3Routes.js** (500+ lines, 21 endpoints)

### 4. Register Routes

In `backend/server.js` (after Phase 2 routes):
```javascript
app.use('/api/ridesharing/phase3', require('./routes/rideSharingPhase3Routes'));
```

### 5. Create Frontend Components

Copy to `src/modules/ridesharing/components/payment/`:
- **Wallet.js** + **Wallet.css**
- **ReferralProgram.js** + **ReferralProgram.css**
- **CouponManagement.js** + **CouponManagement.css**

### 6. Build & Test

```bash
npm run build
```

---

## 💰 Wallet API Reference

### Get Balance
```javascript
GET /api/ridesharing/phase3/wallet/balance
Headers: { Authorization: "Bearer {token}" }

Response: {
  balance: 5000,
  totalAdded: 10000,
  totalSpent: 5000,
  totalCashback: 1500
}
```

### Add Money (2-step process)
```javascript
// Step 1: Initiate
POST /api/ridesharing/phase3/wallet/add-money-initiate
Body: { amount: 500 }
Response: { transactionId: "txn_12345", paymentUrl: "..." }

// Step 2: Complete after payment
POST /api/ridesharing/phase3/wallet/add-money-complete
Body: { amount: 500, paymentId: "pay_12345" }
Response: { success: true, newBalance: 5500 }
```

### Deduct Payment
```javascript
POST /api/ridesharing/phase3/wallet/deduct
Body: { amount: 200, rideId: "rid_123", reason: "ride_payment" }
Response: { success: true, newBalance: 5300 }
```

### Get Transactions
```javascript
GET /api/ridesharing/phase3/wallet/transactions?limit=20&skip=0
Response: {
  transactions: [
    { type: "credit", amount: 500, source: "manual_addition", date: "..." },
    { type: "debit", amount: 200, source: "ride_payment", date: "..." }
  ]
}
```

### Set & Verify PIN
```javascript
POST /api/ridesharing/phase3/wallet/set-pin
Body: { pin: "1234" }

POST /api/ridesharing/phase3/wallet/verify-pin
Body: { pin: "1234" }
```

---

## 🎁 Referral API Reference

### Get Referral Code
```javascript
GET /api/ridesharing/phase3/referral/code
Response: {
  referralCode: "NH647A9B",
  totalReferrals: 5,
  totalBonus: 500,
  bonusBalance: 250,
  shareLink: "https://rideshare.app/join?ref=NH647A9B"
}
```

### Validate Code (Public - No Auth)
```javascript
POST /api/ridesharing/phase3/referral/validate
Body: { referralCode: "NH647A9B" }
Response: {
  valid: true,
  referrerName: "John Doe",
  bonus: 75
}
```

### Get Referral Stats
```javascript
GET /api/ridesharing/phase3/referral/stats
Response: {
  totalReferrals: 5,
  activeReferrals: 3,
  conversionRate: 60,
  totalEarned: 500
}
```

### Get Referral List
```javascript
GET /api/ridesharing/phase3/referral/list?limit=10&skip=0
Response: {
  referrals: [
    { userId: "...", name: "Jane Doe", joinedAt: "...", rideCount: 5, bonusEarned: 100 }
  ]
}
```

### Claim Bonus
```javascript
POST /api/ridesharing/phase3/referral/claim-bonus
Response: { success: true, amount: 250, newBalance: 5750 }
```

---

## 🎟️ Coupon API Reference

### Validate Coupon (Public)
```javascript
POST /api/ridesharing/phase3/coupon/validate
Body: { code: "SAVE20", rideType: "auto", rideAmount: 500 }
Response: {
  valid: true,
  discount: 100,
  description: "20% off on auto rides"
}
```

### Apply Coupon
```javascript
POST /api/ridesharing/phase3/coupon/apply
Body: { code: "SAVE20", rideId: "rid_123", rideAmount: 500, rideType: "auto" }
Response: {
  success: true,
  discount: 100,
  finalAmount: 400
}
```

### Get Available Coupons
```javascript
GET /api/ridesharing/phase3/coupon/available?rideType=auto
Response: {
  coupons: [
    { code: "SAVE20 - 20% off", discount: "Up to ₹100", minAmount: 200 }
  ]
}
```

### Get Coupon Details
```javascript
GET /api/ridesharing/phase3/coupon/details/SAVE20
Response: {
  code: "SAVE20",
  discount: "20%",
  validFrom: "2024-01-01",
  validTo: "2024-12-31",
  minAmount: 200
}
```

### Get Coupon History
```javascript
GET /api/ridesharing/phase3/coupon/history?limit=10
Response: {
  history: [
    { code: "SAVE20", discount: 100, usedAt: "..." }
  ]
}
```

---

## 🎨 Component Usage Examples

### Wallet Component
```javascript
import Wallet from './modules/ridesharing/components/payment/Wallet';

function PaymentPage() {
  return (
    <div>
      <Wallet />
    </div>
  );
}
```

### Referral Program Component
```javascript
import ReferralProgram from './modules/ridesharing/components/payment/ReferralProgram';

function ReferralPage() {
  return (
    <div>
      <ReferralProgram />
    </div>
  );
}
```

### Coupon Management Component
```javascript
import CouponManagement from './modules/ridesharing/components/payment/CouponManagement';

function RideBooking() {
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const handleCouponApply = (coupon) => {
    setAppliedCoupon(coupon);
    // Calculate final ride cost: rideAmount - coupon.discount
  };

  return (
    <div>
      <CouponManagement 
        rideType="auto" 
        rideAmount={500}
        onCouponApply={handleCouponApply}
      />
      {appliedCoupon && (
        <p>Final Price: ₹{appliedCoupon.finalAmount}</p>
      )}
    </div>
  );
}
```

---

## 📊 Database Schemas (Quick Reference)

### Wallet
```javascript
{
  userId: ObjectId,
  balance: Number,
  totalAdded: Number,
  totalSpent: Number,
  totalCashback: Number,
  pin: String (hashed),
  pinSet: Boolean
}
```

### Referral Program
```javascript
{
  userId: ObjectId,
  referralCode: String (unique),
  referredUsers: [
    { userId, joinedAt, rideCount, bonusEarned, active }
  ],
  totalReferrals: Number,
  totalBonus: Number,
  bonusBalance: Number
}
```

### Coupon
```javascript
{
  code: String (unique),
  discountType: String ('percentage' | 'fixed'),
  discountValue: Number,
  maxUsage: Number,
  usedCount: Number,
  validFrom: Date,
  validTo: Date,
  minRideAmount: Number,
  maxDiscountAmount: Number,
  applicableRideTypes: [String],
  active: Boolean,
  description: String
}
```

---

## 🔑 Key Constants

### Wallet Limits
- Minimum add: ₹50
- Maximum add: ₹1,00,000
- PIN digits: 4

### Referral Bonuses
- Referrer bonus: ₹100 (immediate)
- Referee bonus: ₹75 (on first ride)
- Conversion criteria: ≥1 completed ride

### Coupon Validation
- Percentage max: 100%
- One coupon per ride (no stacking)
- Usage limit enforced
- Expiry date checked

---

## 🔐 Authentication

All endpoints except these require JWT token:

**Public Endpoints** (No Auth):
- `POST /coupon/validate`
- `GET /coupon/details/:code`
- `GET /coupon/active`
- `POST /referral/validate`

**Token Format**:
```javascript
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...'
}
```

---

## 🧪 Quick Test Commands

### Test Wallet
```bash
# Get balance
curl -X GET http://localhost:5000/api/ridesharing/phase3/wallet/balance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add money
curl -X POST http://localhost:5000/api/ridesharing/phase3/wallet/add-money-initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 500}'
```

### Test Referral
```bash
# Get code
curl -X GET http://localhost:5000/api/ridesharing/phase3/referral/code \
  -H "Authorization: Bearer YOUR_TOKEN"

# Validate code (public)
curl -X POST http://localhost:5000/api/ridesharing/phase3/referral/validate \
  -H "Content-Type: application/json" \
  -d '{"referralCode": "NH647A9B"}'
```

### Test Coupon
```bash
# Validate coupon (public)
curl -X POST http://localhost:5000/api/ridesharing/phase3/coupon/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE20", "rideType": "auto", "rideAmount": 500}'

# Get available
curl -X GET "http://localhost:5000/api/ridesharing/phase3/coupon/available?rideType=auto"
```

---

## 📱 Component Props Reference

### Wallet Component
```javascript
<Wallet />
// No props required - reads token from localStorage
```

### ReferralProgram Component
```javascript
<ReferralProgram />
// No props required - reads token from localStorage
```

### CouponManagement Component
```javascript
<CouponManagement 
  rideType="auto"           // Filter coupons by type (optional)
  rideAmount={500}          // Used for validation (optional)
  onCouponApply={function}  // Callback when coupon applied (optional)
/>
```

---

## 🐛 Common Issues & Fixes

**Issue**: Wallet balance not updating
- Check: Token is valid in localStorage
- Check: `POST /wallet/add-money-complete` called after payment

**Issue**: Referral code not showing
- Check: `GET /referral/code` called on component mount
- Check: ReferralProgram model exists in database

**Issue**: Coupon validation fails
- Check: Coupon code is uppercase in database
- Check: Coupon is active (active: true)
- Check: Current date is between validFrom and validTo

**Issue**: Build fails
- Check: All 3 service files imported correctly in routes
- Check: All models required at top of services
- Check: Component imports use correct paths

---

## 📈 Performance Tips

1. **Pagination**: Use limit/skip for large data sets
   ```javascript
   GET /referral/list?limit=20&skip=40  // Page 3
   ```

2. **Caching**: Cache referral code after first fetch
   ```javascript
   const code = sessionStorage.getItem('referralCode') || await fetchCode();
   ```

3. **Lazy Loading**: Load transaction history on demand
   ```javascript
   onClick={() => fetchTransactions()}
   ```

4. **Batch Operations**: Process multiple transactions in one request
   ```javascript
   // Instead of multiple deduct calls
   POST /wallet/batch-deduct
   ```

---

## 🚀 Deployment Checklist

- [ ] All 5 models created & imported
- [ ] All 3 services created & working
- [ ] Routes file created & registered in server.js
- [ ] All 6 component files created (3 JS + 3 CSS)
- [ ] Build passes: `npm run build`
- [ ] Wallet endpoints tested
- [ ] Referral endpoints tested
- [ ] Coupon endpoints tested
- [ ] Token stored correctly in localStorage
- [ ] Mobile responsive verified
- [ ] Error handling tested

---

## 📞 API Endpoints Summary (21 total)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/wallet/balance` | ✅ | Get balance |
| POST | `/wallet/add-money-initiate` | ✅ | Start payment |
| POST | `/wallet/add-money-complete` | ✅ | Complete payment |
| GET | `/wallet/transactions` | ✅ | Get history |
| POST | `/wallet/set-pin` | ✅ | Set PIN |
| POST | `/wallet/verify-pin` | ✅ | Verify PIN |
| GET | `/wallet/summary` | ✅ | Get summary |
| GET | `/wallet/stats` | ✅ | Get stats |
| GET | `/referral/code` | ✅ | Get code |
| POST | `/referral/validate` | ❌ | Validate code |
| GET | `/referral/stats` | ✅ | Get stats |
| GET | `/referral/list` | ✅ | Get list |
| POST | `/referral/claim-bonus` | ✅ | Claim bonus |
| GET | `/referral/dashboard` | ✅ | Get dashboard |
| GET | `/referral/active` | ✅ | Get active |
| POST | `/coupon/validate` | ❌ | Validate |
| POST | `/coupon/apply` | ✅ | Apply |
| GET | `/coupon/available` | ✅ | Get available |
| GET | `/coupon/details/:code` | ❌ | Get details |
| GET | `/coupon/active` | ❌ | Get active |
| GET | `/coupon/history` | ✅ | Get history |

---

## 🎯 Next Steps

1. **Setup Database**: Create MongoDB collections for 5 models
2. **Copy Files**: Add all backend services and routes
3. **Register Routes**: Add line to server.js
4. **Import Components**: Add to React pages
5. **Test APIs**: Use curl or Postman
6. **Deploy**: Run build and deploy

---

**Status**: ✅ Phase 3 Complete
**Next**: Phase 4 - Advanced Ride Features
**Support**: All files in `/backend/services/ridesharing/` and `/src/modules/ridesharing/components/payment/`
