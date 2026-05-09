# 🔗 Phase 1 Integration Guide

**How to integrate Phase 1 components into your existing codebase**

---

## Step 1: Register Auth Routes in Server

### In `backend/server.js` or `backend/app.js`:

Find the section where routes are registered (usually after middleware setup):

```javascript
// Add this import at the top with other route imports
const rideSharingAuthRoutes = require('./routes/rideSharingAuthRoutes');

// Add this in the app.use() section
// Ride Sharing Authentication Routes
app.use('/api/ridesharing/auth', rideSharingAuthRoutes);

// Keep existing ridesharing routes
app.use('/api/ridesharing', require('./routes/ridesharing'));
```

---

## Step 2: Add Environment Variables

### Create/Update `.env` file:

```bash
# === RIDE SHARING - PHASE 1 ===

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars_long

# Firebase Configuration (for OTP)
FIREBASE_API_KEY=AIzaSyD...
FIREBASE_AUTH_DOMAIN=rideshare-app.firebaseapp.com
FIREBASE_PROJECT_ID=rideshare-app
FIREBASE_STORAGE_BUCKET=rideshare-app.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcd1234

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abcdefghijklmno.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_secret

# Apple OAuth
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_BUNDLE_ID=com.yourcompany.rideshare

# AWS Configuration (for KYC Phase 2)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/malabarbazaar

# Server
NODE_ENV=development
PORT=5000
```

---

## Step 3: Ensure Required Middleware

### Auth Middleware - `backend/middleware/auth.js`

Make sure this exists and works correctly:

```javascript
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = { authenticate };
```

---

## Step 4: Import LoginFlow Component

### In `src/modules/ridesharing/RideSharing.js`:

At the top of the file:

```javascript
import LoginFlow from './components/auth/LoginFlow';
```

Then modify the render to check authentication state:

```javascript
const RideSharing = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const role = localStorage.getItem('userRole');
    
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <LoginFlow 
        role="rider" 
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setUserRole(user.role);
        }} 
      />
    );
  }

  // Rest of your existing RideSharing component code...
  return (
    <div className="rideshare-page">
      {/* Your existing JSX */}
    </div>
  );
};
```

---

## Step 5: Update Ride Booking Service

### In `src/modules/ridesharing/services/rideSharingService.js`:

Add auth token to all API calls:

```javascript
import axios from 'axios';

const getAuthHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
  }
});

export const bookRide = async (rideData) => {
  try {
    const response = await axios.post(
      '/api/ridesharing/rides',
      rideData,
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const estimateFare = async (pickup, dropoff, rideType) => {
  try {
    const response = await axios.post(
      '/api/ridesharing/rides/estimate-fare',
      { pickup, dropoff, rideType },
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add to all other API calls...
```

---

## Step 6: Test the Integration

### 1. Start Backend Server:
```bash
cd backend
npm install
npm run dev
```

### 2. Test OTP Endpoint in Postman:

**POST** `http://localhost:5000/api/ridesharing/auth/otp-send`

Body (JSON):
```json
{
  "phone": "9876543210"
}
```

Expected Response:
```json
{
  "success": true,
  "message": "OTP sent to 919876543210",
  "expiresIn": 300
}
```

### 3. Verify OTP:

**POST** `http://localhost:5000/api/ridesharing/auth/otp-verify`

Body (JSON):
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "role": "rider"
}
```

Expected Response:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "phone": "919876543210",
    "role": "rider"
  }
}
```

### 4. Get User Profile:

**GET** `http://localhost:5000/api/ridesharing/auth/profile`

Headers:
```
Authorization: Bearer <accessToken>
```

Expected Response:
```json
{
  "success": true,
  "profile": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "phone": "919876543210",
    "email": "",
    "firstName": "User",
    "verificationStatus": "unverified",
    "walletBalance": 0,
    "trustScore": 100
  }
}
```

---

## Step 7: Frontend Testing

### 1. Start Frontend:
```bash
npm start
```

### 2. Test Login Flow:
- Navigate to ride-sharing page
- Should see LoginFlow component
- Enter phone number (test: 9999999999)
- Click "Send OTP"
- Enter OTP from Firebase console
- Complete profile
- Should redirect to main app

### 3. Test Fare Calculation:
```javascript
import FareCalculationService from '../services/FareCalculationService';

const fare = FareCalculationService.calculateFare({
  rideType: 'auto',
  pickupLat: 10.0444,
  pickupLng: 76.2751,
  dropoffLat: 10.1456,
  dropoffLng: 76.3456,
  demandLevel: 'normal'
});

console.log(fare);
// Output: { distance: 14.5, baseFare: 42, distanceCharge: 130.5, ... total: 205.25 }
```

---

## Step 8: Database Setup

### Create Indexes in MongoDB:

```javascript
// Run in MongoDB shell or in your DB init script
db.riderprofiles.createIndex({ "userId": 1 }, { unique: true });
db.riderprofiles.createIndex({ "phone": 1 }, { unique: true });
db.riderprofiles.createIndex({ "riderStatus": 1, "createdAt": -1 });
db.riderprofiles.createIndex({ "trustScore": 1 });

db.driverprofiles.createIndex({ "userId": 1 }, { unique: true });
db.driverprofiles.createIndex({ "phone": 1 }, { unique: true });
db.driverprofiles.createIndex({ "currentLocation": "2dsphere" });
db.driverprofiles.createIndex({ "availability.status": 1, "statistics.averageRating": -1 });
db.driverprofiles.createIndex({ "kyc.status": 1 });
```

---

## Step 9: Configure Ride Booking Routes

### In `backend/routes/ridesharing.js`:

Add fareestimation endpoint:

```javascript
const FareCalculationService = require('../services/FareCalculationService');

// POST /api/ridesharing/rides/estimate-fare
router.post('/rides/estimate-fare', authenticate, async (req, res) => {
  try {
    const { rideType, pickup, dropoff } = req.body;

    if (!rideType || !pickup || !dropoff) {
      return res.status(400).json({
        success: false,
        message: 'rideType, pickup, and dropoff are required'
      });
    }

    const fare = FareCalculationService.calculateFare({
      rideType,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      demandLevel: 'normal'
    });

    res.json({
      success: true,
      fare
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});
```

---

## Step 10: Verify Everything Works

### Checklist:

- [ ] Server starts without errors
- [ ] Auth routes registered successfully
- [ ] OTP endpoint responds
- [ ] JWT verification works
- [ ] Frontend shows LoginFlow
- [ ] OTP verification successful
- [ ] Profile creation on first login
- [ ] Tokens stored in localStorage
- [ ] Fare calculation returns correct values
- [ ] Database indexes created
- [ ] No console errors

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'RideSharingAuthService'"
**Solution:** Check file path is correct in require statement
```javascript
// Correct path
const RideSharingAuthService = require('../services/RideSharingAuthService');
```

### Issue: "JWT_SECRET is undefined"
**Solution:** Add to .env file
```bash
JWT_SECRET=your_secret_here
```

### Issue: "Firebase is not configured"
**Solution:** Add all FIREBASE variables to .env

### Issue: "CORS error when sending OTP"
**Solution:** Check CORS middleware in server.js
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

---

## 🚀 Next Phase: Week 2 KYC

Once Phase 1 is working:
1. Create DriverKYCService.js
2. Create KYCUpload.js component
3. Setup AWS S3 integration
4. Test KYC workflow end-to-end

---

**Integration Time:** ~2 hours
**Testing Time:** ~2-3 hours
**Total:** ~4-5 hours to full working Phase 1

**Questions?** Check PHASE1_WEEK1_COMPLETE.md for detailed documentation.
