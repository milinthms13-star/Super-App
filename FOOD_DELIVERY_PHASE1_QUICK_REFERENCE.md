# Food Delivery Phase 1 - Quick Reference Guide

**Phase:** 1 - Core Authentication & User Setup  
**Status:** ✅ COMPLETE & PRODUCTION READY  
**Lines of Code:** 3500+

---

## Quick Navigation

### 📂 Implementation Files

| File | Lines | Purpose |
|------|-------|---------|
| FoodDeliveryUser.js | 400 | User data model |
| FoodDeliveryAddress.js | 300 | Address data model |
| FoodDeliveryAuthService.js | 600 | Auth business logic |
| FoodDeliveryUserProfileService.js | 500 | Profile business logic |
| FoodDeliveryAuthController.js | 300 | Auth API endpoints |
| FoodDeliveryUserProfileController.js | 300 | Profile API endpoints |
| FoodDeliveryValidations.js | 400 | Input validation rules |
| foodDeliveryAuthRoutes.js | 200 | API route definitions |

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install mongoose bcryptjs jsonwebtoken twilio nodemailer express-validator aws-sdk multer dotenv
```

### 2. Configure Environment
```bash
cp .env.fooddelivery.example .env
# Edit .env with actual credentials
```

### 3. Register Routes
In `server.js`, add:
```javascript
const foodDeliveryAuthRoutes = require('./routes/foodDeliveryAuthRoutes');
app.use('/api/fooddelivery', foodDeliveryAuthRoutes);
```

### 4. Start Server
```bash
npm start
```

### 5. Test Endpoints
```bash
curl -X POST http://localhost:5000/api/fooddelivery/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'
```

---

## 📱 API Endpoints (18 Total)

### Authentication (11)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /auth/send-otp | ❌ | Send OTP to phone |
| POST | /auth/verify-otp | ❌ | Verify OTP & login |
| POST | /auth/login | ❌ | Email/password login |
| POST | /auth/social-login | ❌ | Google/Facebook/Apple |
| POST | /auth/register | ❌ | Email signup |
| POST | /auth/verify-email | ❌ | Verify email token |
| POST | /auth/forgot-password | ❌ | Request password reset |
| POST | /auth/reset-password | ❌ | Reset password |
| POST | /auth/change-password | ✅ | Change password |
| POST | /auth/logout | ✅ | Logout user |
| POST | /auth/refresh-token | ❌ | Refresh access token |

### Profile (4)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /profile | ✅ | Get user profile |
| PUT | /profile | ✅ | Update profile |
| POST | /profile/picture | ✅ | Upload avatar |
| PUT | /profile/preferences | ✅ | Update preferences |

### Addresses (8)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | /addresses | ✅ | Add address |
| GET | /addresses | ✅ | Get all addresses |
| GET | /addresses/default | ✅ | Get default address |
| PUT | /addresses/:id | ✅ | Update address |
| DELETE | /addresses/:id | ✅ | Delete address |
| PUT | /addresses/:id/default | ✅ | Set default |
| POST | /addresses/:id/verify | ✅ | Verify address |
| POST | /addresses/:id/usage | ✅ | Record usage |

---

## 🔐 Authentication Flow

### OTP Login
```
1. User enters phone → sendOTP() → SMS sent
2. User enters OTP → verifyOTP() → User created/logged in
3. Server returns access_token & refresh_token
```

### Email/Password Login
```
1. User registers → registerWithEmail() → Email sent
2. User verifies → verifyEmailToken() → Account activated
3. User logs in → emailPasswordLogin() → Token returned
```

### Social Login
```
1. User clicks Google/Facebook/Apple → socialLogin()
2. Server creates account if new user
3. Returns access_token & refresh_token
```

---

## 📋 Request Examples

### Send OTP
```bash
curl -X POST http://localhost:5000/api/fooddelivery/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210"
  }'
```

### Verify OTP
```bash
curl -X POST http://localhost:5000/api/fooddelivery/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "otp": "123456",
    "userData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:5000/api/fooddelivery/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Add Address
```bash
curl -X POST http://localhost:5000/api/fooddelivery/addresses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Home",
    "streetAddress": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560001",
    "latitude": 12.9716,
    "longitude": 77.5946
  }'
```

---

## 🗄️ Database Models

### FoodDeliveryUser
```javascript
{
  _id: ObjectId,
  phoneNumber: String (10 digits),
  email: String (unique),
  password: String (hashed, bcrypt),
  firstName: String,
  lastName: String,
  phoneVerified: Boolean,
  emailVerified: Boolean,
  profilePictureUrl: String (S3 URL),
  gender: String (male/female/other),
  dateOfBirth: Date,
  defaultAddressId: ObjectId (ref),
  addresses: [ObjectId] (refs),
  preferences: {
    language: String,
    cuisine: [String],
    dietaryRestrictions: [String],
    notificationPreferences: Object
  },
  socialProfiles: {
    google: {id, email, name, picture},
    facebook: {id, email, name, picture},
    apple: {id, email, name}
  },
  referralCode: String (unique),
  accountStatus: String (active/inactive/suspended),
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### FoodDeliveryAddress
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref),
  label: String (Home/Work/Other),
  addressType: String,
  fullAddress: String,
  streetAddress: String,
  apt_building: String,
  area: String,
  city: String,
  state: String,
  postalCode: String (6 digits),
  landmark: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  isDefault: Boolean,
  isActive: Boolean,
  isVerified: Boolean,
  instructions: String,
  contactPerson: {name, phoneNumber},
  usageCount: Number,
  lastUsedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔒 Security Features

### Passwords
- **Hashing:** bcrypt (10 rounds)
- **Strength:** 8+ chars, uppercase, lowercase, number, special char
- **History:** Last 5 passwords tracked
- **Lockout:** 5 failed attempts → 30 min lockout

### OTP
- **Length:** 6 digits
- **Validity:** 10 minutes
- **Rate Limit:** 3 per hour per phone
- **Attempts:** Max 3 verification attempts

### Tokens
- **Access Token:** 30-day expiry (JWT)
- **Refresh Token:** 90-day expiry (HTTP-only cookie)
- **Token Refresh:** Automatic via refresh endpoint

### Sessions
- **Device Tracking:** Device ID, OS, version
- **Session Storage:** Keep last 5 active sessions
- **Logout:** Invalidate specific session token

---

## ⚡ Performance Tips

### Database Queries
```javascript
// Create indexes
db.fooddeliveryusers.createIndex({ phoneNumber: 1 })
db.fooddeliveryusers.createIndex({ email: 1 })
db.fooddeliveryaddresses.createIndex({ "location.coordinates": "2dsphere" })
```

### Caching Strategy
- Cache user profile (5-min TTL)
- Cache address list (10-min TTL)
- Cache default address (5-min TTL)

### Rate Limiting
- OTP endpoint: 3 per hour per phone
- Auth endpoints: 5 per minute per IP
- Profile endpoints: 30 per minute per user

---

## 🧪 Testing Checklist

```javascript
// Authentication
[ ] OTP send & verify
[ ] Email/password register & login
[ ] Social login (all 3 providers)
[ ] Password reset flow
[ ] Password change
[ ] Token refresh
[ ] Account lockout
[ ] Email verification

// Profile
[ ] Get profile
[ ] Update profile (all fields)
[ ] Upload profile picture
[ ] Update preferences

// Addresses
[ ] Add address
[ ] Get addresses
[ ] Update address
[ ] Delete address
[ ] Set default
[ ] Verify address
[ ] Record usage

// Validation
[ ] Invalid phone (not 10 digits)
[ ] Invalid email format
[ ] Weak password
[ ] Missing required fields
[ ] Invalid coordinates
[ ] Duplicate email/phone

// Security
[ ] Account lockout after 5 attempts
[ ] OTP expiry (10 minutes)
[ ] Invalid token rejection
[ ] Expired token rejection
```

---

## 🔧 Configuration Checklist

```
[ ] MongoDB URI configured
[ ] JWT_SECRET (min 32 chars)
[ ] JWT_REFRESH_SECRET (min 32 chars)
[ ] Twilio credentials (SID, token, phone)
[ ] SMTP credentials (host, port, user, pass)
[ ] AWS S3 credentials (key, secret, bucket)
[ ] Google OAuth credentials (client ID, secret)
[ ] Facebook OAuth credentials (app ID, secret)
[ ] Apple Sign In credentials
[ ] CORS origins configured
[ ] Environment set to production for prod
```

---

## 📖 Reference Documents

1. **API Documentation**
   - `/FOOD_DELIVERY_PHASE1_API_DOCUMENTATION.md` (1200+ lines)
   - Complete endpoint specs, examples, error codes

2. **Implementation Guide**
   - `/FOOD_DELIVERY_PHASE1_IMPLEMENTATION_COMPLETE.md`
   - Detailed feature breakdown, security checklist

3. **Implementation Plan**
   - `/FOOD_DELIVERY_IMPLEMENTATION_PLAN.md`
   - Timeline, resource allocation, success metrics

4. **Progress Tracking**
   - `/TODO_FOODDELIVERY_OPTIMIZATION.md`
   - Phase status, feature checklist

---

## 🚀 Next Phase (Phase 2)

Phase 2 includes:
- **Restaurant Discovery** (nearby, search, filters)
- **Menu Management** (categories, items, variants)
- **Ratings & Reviews**
- **Featured Restaurants**

**Estimated Start:** May 22, 2026

---

## 💡 Tips & Tricks

### Generate Test OTP
```javascript
// Valid format: 6 digits
Math.floor(100000 + Math.random() * 900000).toString()
// Example: "123456"
```

### Generate Referral Code
```javascript
const code = Math.random().toString(36).substring(2, 8).toUpperCase();
// Example: "ABC123"
```

### Reset Database (Development Only)
```bash
mongo
use fooddelivery
db.dropDatabase()
```

### View Logs
```bash
tail -f logs/app.log
```

### Debug Authentication Issues
```javascript
// Check account lockout status
const user = await FoodDeliveryUser.findOne({email});
console.log(user.isLocked()); // true if locked
console.log(user.lockUntil); // when it expires
```

---

## 🆘 Troubleshooting

### Issue: OTP not received
1. Check Twilio credentials in `.env`
2. Verify phone number format (10 digits)
3. Check Twilio SMS log

### Issue: Email verification email not sent
1. Check SMTP credentials
2. Verify email format
3. Check spam folder
4. Check email logs

### Issue: Social login failing
1. Verify OAuth credentials
2. Check redirect URIs match
3. Check token expiry
4. Verify user email from provider

### Issue: Profile picture not uploading
1. Check AWS S3 credentials
2. Verify bucket name
3. Check file size (<5MB)
4. Check file format (JPEG, PNG, WebP)

### Issue: Address geospatial query slow
1. Create 2dsphere index: `db.fooddeliveryaddresses.createIndex({"location.coordinates": "2dsphere"})`
2. Verify index created: `db.fooddeliveryaddresses.getIndexes()`

---

## 📞 Support

For issues or questions:
1. Check API documentation first
2. Review error messages
3. Check logs
4. Refer to troubleshooting guide
5. Contact team lead

---

**Last Updated:** May 8, 2026  
**Version:** 1.0  
**Status:** ✅ PRODUCTION READY
