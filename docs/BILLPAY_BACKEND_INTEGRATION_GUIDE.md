# BillPay Backend Integration Guide

## Overview
This guide covers integrating the complete BillPay backend into your existing Express.js application.

## What's Included

### Database Models
- `backend/models/Bill.js` - Bill records with user scoping
- `backend/models/BillpayTransaction.js` - Payment transaction ledger
- `backend/models/Dispute.js` - Dispute/complaint records
- `backend/models/Mandate.js` - Autopay mandate tracking

### Middleware
- `backend/middleware/billpayValidation.js` - Input validation (15+ validators)
- Authentication middleware (uses existing `authenticate` middleware)
- Rate limiting (express-rate-limit)

### Services
- `backend/services/billpayService.js` - Business logic layer with 12+ methods

### API Routes
- `backend/routes/billpay.js` - Complete API with 12 endpoints

### Tests
- `tests/billpay.test.js` - Comprehensive test suite (30+ test cases)

---

## Step 1: Install Dependencies

```bash
npm install razorpay express-rate-limit
npm install --save-dev jest supertest
```

### Verify in package.json:
```json
{
  "dependencies": {
    "express": "^4.x",
    "mongoose": "^5.x",
    "razorpay": "^2.x",
    "express-rate-limit": "^6.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "jest": "^29.x",
    "supertest": "^6.x"
  }
}
```

---

## Step 2: Environment Configuration

1. Copy `.env.billpay.example` to `.env.billpay` (or add to existing `.env`):
   ```bash
   cp .env.billpay.example .env.billpay
   ```

2. **Critical:** Add Razorpay keys:
   - Get from https://dashboard.razorpay.com/
   - Add to `.env`:
     ```
     RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
     RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
     ```

3. Configure MongoDB connection:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/malabarbazaar
   ```

4. Set JWT secret:
   ```
   JWT_SECRET=your-super-secret-key-change-this
   ```

---

## Step 3: Update Main Express App

### In your main `app.js` or `server.js`:

```javascript
const express = require('express');
const mongoose = require('mongoose');
const billpayRoutes = require('./backend/routes/billpay');
const authenticate = require('./backend/middleware/authenticate');

const app = express();

// Existing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ... other middleware ...

// ============================================
// REGISTER BILLPAY ROUTES (ADD THIS)
// ============================================
app.use('/api/billpay', billpayRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'billpay' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ BillPay API running on port ${PORT}`);
  console.log(`✓ Routes available at http://localhost:${PORT}/api/billpay`);
});

module.exports = app;
```

---

## Step 4: MongoDB Connection

Ensure your MongoDB connection is established before the app starts:

```javascript
// In app.js or separate db.js
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✓ MongoDB connected');
  console.log('✓ Collections available:');
  console.log('  - Bill');
  console.log('  - BillpayTransaction');
  console.log('  - Dispute');
  console.log('  - Mandate');
})
.catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});
```

---

## Step 5: Frontend Integration

### Update `src/services/astrologyService.js` → Create `src/services/billpayService.js`:

```javascript
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const billpayAPI = axios.create({
  baseURL: `${API_BASE}/billpay`,
});

// Add auth token to requests
billpayAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const billpayService = {
  // Get user's bills
  async getBills() {
    const response = await billpayAPI.get('/bills');
    return response.data.bills;
  },

  // Discover bill
  async discoverBill(identifierType, identifierValue, preferredCategory) {
    const response = await billpayAPI.post('/discover', {
      identifierType,
      identifierValue,
      preferredCategory,
    });
    return response.data;
  },

  // Create payment order
  async createPaymentOrder(billId, amount, method, authMode) {
    const response = await billpayAPI.post('/pay/create-order', {
      billId,
      amount,
      method,
      authMode,
    });
    return response.data;
  },

  // Verify payment
  async verifyPayment(orderId, paymentId, signature, billId, amount, method, authMode, otp, pin) {
    const response = await billpayAPI.post('/pay/verify', {
      orderId,
      paymentId,
      signature,
      billId,
      amount,
      method,
      authMode,
      otp,
      pin,
    });
    return response.data;
  },

  // Get transaction history
  async getTransactionHistory(limit = 50, offset = 0) {
    const response = await billpayAPI.get(`/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get receipt
  async getReceipt(transactionId) {
    const response = await billpayAPI.get(`/receipts/${transactionId}`);
    return response.data.receipt;
  },

  // File dispute
  async fileDispute(transactionId, type, description) {
    const response = await billpayAPI.post('/disputes', {
      transactionId,
      type,
      description,
    });
    return response.data.dispute;
  },

  // Get disputes
  async getUserDisputes(limit = 20, offset = 0) {
    const response = await billpayAPI.get(`/disputes?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Set up mandate
  async setupMandate(billId, maxAmount, frequency, paymentMethod) {
    const response = await billpayAPI.post('/mandates', {
      billId,
      maxAmount,
      frequency,
      paymentMethod,
    });
    return response.data.mandate;
  },

  // Get mandates
  async getUserMandates() {
    const response = await billpayAPI.get('/mandates');
    return response.data.mandates;
  },

  // Update mandate
  async updateMandate(mandateId, status, reason) {
    const response = await billpayAPI.patch(`/mandates/${mandateId}`, {
      status,
      reason,
    });
    return response.data.mandate;
  },

  // Get admin analytics
  async getAdminAnalytics(dateRange = 'thisMonth') {
    const response = await billpayAPI.get(`/admin/analytics?dateRange=${dateRange}`);
    return response.data;
  },
};

export default billpayService;
```

### Update `BillPayHub.js` to use real backend:

```javascript
// Replace local state with API calls
import billpayService from '../../../services/billpayService';

const BillPayHub = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch bills on mount
  useEffect(() => {
    const loadBills = async () => {
      try {
        setLoading(true);
        const bills = await billpayService.getBills();
        setBills(bills);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBills();
  }, []);

  // Replace handleDiscovery with:
  const handleDiscovery = async (event) => {
    event.preventDefault();
    try {
      const result = await billpayService.discoverBill(
        discoveryForm.identifierType,
        discoveryForm.identifierValue,
        discoveryForm.preferredCategory
      );
      setDiscoveryResult(result);
      // Pre-select bill for payment
      setPayForm(current => ({
        ...current,
        billId: result.bill._id,
        amount: String(result.bill.amount),
      }));
    } catch (err) {
      setDiscoveryResult({ error: err.message });
    }
  };

  // Handle actual payment with Razorpay
  const handlePayBill = async (event) => {
    event.preventDefault();
    try {
      // Step 1: Create order
      const orderResponse = await billpayService.createPaymentOrder(
        payForm.billId,
        Number(payForm.amount),
        payForm.method,
        payForm.authMode
      );

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderResponse.razorpayKeyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        order_id: orderResponse.orderId,
        handler: async (response) => {
          // Step 3: Verify payment on backend
          const verifyResponse = await billpayService.verifyPayment(
            orderResponse.orderId,
            response.razorpay_payment_id,
            response.razorpay_signature,
            payForm.billId,
            Number(payForm.amount),
            payForm.method,
            payForm.authMode,
            payForm.otp,
            payForm.pin
          );

          setPaymentMessage(
            `Payment successful! Receipt: ${verifyResponse.receiptId}`
          );
          // Reload bills
          const updatedBills = await billpayService.getBills();
          setBills(updatedBills);
        },
        prefill: {
          email: currentUser?.email,
          contact: currentUser?.phone,
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setPaymentMessage(`Error: ${err.message}`);
    }
  };

  // ... rest of component
};
```

---

## Step 6: Run Tests

```bash
# Run test suite
npm test tests/billpay.test.js

# Run with coverage
npm test -- --coverage tests/billpay.test.js
```

Expected output:
```
 PASS  tests/billpay.test.js
  BillPay Service
    Bill Discovery
      ✓ should discover bill by mobile number
      ✓ should discover bill by consumer ID
      ✓ should reject invalid mobile number
      ✓ should reject invalid consumer ID format
    Payment Validation
      ✓ should validate payment amount is within range
      ✓ should reject payment amount exceeding bill by >10%
    ...
  Test Suites: 1 passed, 1 total
  Tests: 30 passed, 30 total
```

---

## Step 7: API Endpoints Reference

### Bill Management
```
GET    /api/billpay/bills                    - List user's bills
POST   /api/billpay/discover                 - Discover bill by mobile/ID
```

### Payments
```
POST   /api/billpay/pay/create-order         - Create Razorpay order
POST   /api/billpay/pay/verify               - Verify payment & record transaction
GET    /api/billpay/history                  - Get payment history
GET    /api/billpay/receipts/:transactionId  - Download receipt
```

### Disputes
```
POST   /api/billpay/disputes                 - File dispute
GET    /api/billpay/disputes                 - Get user's disputes
```

### Autopay
```
POST   /api/billpay/mandates                 - Set up mandate
GET    /api/billpay/mandates                 - Get active mandates
PATCH  /api/billpay/mandates/:mandateId      - Update mandate (pause/resume/cancel)
```

### Admin
```
GET    /api/billpay/admin/analytics          - Admin analytics dashboard
```

---

## Step 8: Security Checklist

- [x] All routes require JWT authentication (except health check)
- [x] User data scoped to authenticated user (userId validation)
- [x] Input validation on all endpoints (15+ validators)
- [x] Razorpay signature verification (HMAC-SHA256)
- [x] Rate limiting on sensitive endpoints
  - Discovery: 20 per hour per IP
  - Payments: 10 per hour per user
  - Disputes: 5 per day per user
- [x] SQL injection protection (MongoDB + mongoose)
- [x] XSS protection (input sanitization)
- [x] CSRF protection recommended: Add csrf middleware
- [ ] HTTPS enforcement (configure in production)
- [ ] CORS configuration (customize for your domain)

---

## Step 9: Error Handling & Logging

Add logging to track issues:

```javascript
// backend/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

module.exports = logger;
```

---

## Step 10: Production Deployment

### Before going live:

1. **Razorpay Setup:**
   ```
   - Create production account at https://razorpay.com
   - Get production keys
   - Add to environment variables
   - Test with test cards: 4111111111111111
   ```

2. **Database:**
   ```
   - Use MongoDB Atlas (managed cloud database)
   - Enable authentication
   - Whitelist IP addresses
   - Regular backups
   ```

3. **Environment Variables:**
   ```
   - Never commit .env files
   - Use secure secret management (AWS Secrets Manager, etc.)
   - Rotate keys regularly
   ```

4. **Monitoring:**
   ```
   - Set up error tracking (Sentry)
   - Monitor payment failures
   - Track API response times
   - Alert on high dispute rates
   ```

5. **Testing:**
   ```
   - Run full test suite
   - Load test endpoints
   - Test with real Razorpay sandbox first
   - Run penetration testing
   ```

---

## Troubleshooting

### Razorpay errors:
- "Invalid request" → Check key_id and key_secret
- "Signature mismatch" → Verify RAZORPAY_KEY_SECRET matches
- "Order not found" → Ensure orderId is created successfully

### Database errors:
- "Connection refused" → Check MongoDB is running
- "Authentication failed" → Verify MONGO_URI credentials
- "Document not found" → Check userId scoping

### Payment verification:
- Always verify signature server-side
- Never skip OTP validation
- Log all payment attempts

---

## Support & Documentation

- Razorpay Docs: https://razorpay.com/docs/
- Mongoose Docs: https://mongoosejs.com/
- Express Rate Limit: https://github.com/nfriedly/express-rate-limit
- BillPay Assessment: See `BILLPAY_PRODUCTION_READINESS_ASSESSMENT.md`

---

**Status:** ✅ Backend Implementation Complete  
**Ready for:** Integration testing → UAT → Production  
**Estimated Effort:** 2-3 hours for integration (with existing Express setup)
