# eCommerce Module - Integration Guide

## 🔌 How to Integrate into Your Super-App

This guide will help you integrate the new professional eCommerce module into your existing Super-App.

---

## Step 1: Server.js Integration

Add these lines to your `backend/server.js` or main server file:

```javascript
// Import eCommerce routes
const ecommerceRoutes = require('./routes/ecommerceIntegration');

// Mount routes (add this after your existing routes)
app.use('/api', ecommerceRoutes);

// OR mount with a prefix
app.use('/api/v2', ecommerceRoutes);
```

**Alternative: Individual Route Mounting**
```javascript
// If you prefer granular control
app.use('/api/ecommerce/subscription', require('./routes/ecommerceSubscriptionRoutes'));
app.use('/api/ecommerce/commission', require('./routes/ecommerceCommissionRoutes'));
app.use('/api/ecommerce/categories', require('./routes/ecommerceCategoryRoutes'));
app.use('/api/products/listing', require('./routes/productListingRoutes'));
app.use('/api/marketplace', require('./routes/marketplaceRoutes'));
app.use('/api/payouts', require('./routes/payoutRoutes'));
```

---

## Step 2: Frontend Routing Integration

Add routes to your React Router configuration:

```javascript
// In your main App.js or routes file
import SellerSubscription from './modules/ecommerce/SellerSubscription';
import CommissionDashboard from './modules/ecommerce/CommissionDashboard';
import CategoryManager from './modules/ecommerce/CategoryManager';
import ProductListing from './modules/ecommerce/ProductListing';
import Marketplace from './modules/ecommerce/Marketplace';

// Add these routes
<Route path="/seller/subscription" element={<SellerSubscription />} />
<Route path="/seller/commission" element={<CommissionDashboard />} />
<Route path="/seller/products" element={<ProductListing />} />
<Route path="/marketplace" element={<Marketplace />} />
<Route path="/admin/categories" element={<CategoryManager />} />
```

---

## Step 3: Navigation Menu Updates

### For Sellers
Add these menu items to your seller dashboard:

```javascript
const sellerMenu = [
  { title: 'Dashboard', path: '/seller/dashboard', icon: '📊' },
  { title: 'Products', path: '/seller/products', icon: '📦' },
  { title: 'Orders', path: '/seller/orders', icon: '🛒' },
  { title: 'Commission', path: '/seller/commission', icon: '💰' },
  { title: 'Subscription', path: '/seller/subscription', icon: '⭐' },
  { title: 'Payouts', path: '/seller/payouts', icon: '💳' }
];
```

### For Buyers
```javascript
const buyerMenu = [
  { title: 'Marketplace', path: '/marketplace', icon: '🛍️' },
  { title: 'My Orders', path: '/orders', icon: '📦' },
  { title: 'Wishlist', path: '/wishlist', icon: '❤️' },
  { title: 'Cart', path: '/cart', icon: '🛒' }
];
```

### For Admins
```javascript
const adminMenu = [
  { title: 'Dashboard', path: '/admin/dashboard', icon: '🏠' },
  { title: 'Sellers', path: '/admin/sellers', icon: '👥' },
  { title: 'Products', path: '/admin/products', icon: '📦' },
  { title: 'Categories', path: '/admin/categories', icon: '📁' },
  { title: 'Payouts', path: '/admin/payouts', icon: '💸' },
  { title: 'Statistics', path: '/admin/stats', icon: '📈' }
];
```

---

## Step 4: Database Setup

### Run Seed Scripts
```bash
# Navigate to your project root
cd /path/to/Super-App

# Seed subscription plans
node backend/scripts/seedEcommerceSubscriptionPlans.js

# Seed categories
node backend/scripts/seedEcommerceCategories.js

# Optional: Migrate existing products
node backend/scripts/migrateToNewEcommerce.js
```

### Manual MongoDB Setup (Alternative)
If scripts don't work, manually insert data via MongoDB Compass or shell:

```javascript
// Connect to your MongoDB
use super-app

// Insert subscription plans (see seedEcommerceSubscriptionPlans.js)
db.ecommercesubscriptionplans.insertMany([...])

// Insert categories (see seedEcommerceCategories.js)
db.ecommercecategories.insertMany([...])
```

---

## Step 5: Environment Variables

Add to your `.env` file:

```env
# Existing variables
MONGODB_URI=mongodb://localhost:27017/super-app
JWT_SECRET=your_secret_key
PORT=5000

# New eCommerce variables
UPLOAD_PATH=uploads/products
MAX_FILE_SIZE=5242880
IMAGES_PER_PRODUCT_FREE=3
IMAGES_PER_PRODUCT_BASIC=8
IMAGES_PER_PRODUCT_PREMIUM=15
IMAGES_PER_PRODUCT_ENTERPRISE=25

# Commission rates (optional, defaults in code)
COMMISSION_RATE_FREE=15
COMMISSION_RATE_BASIC=10
COMMISSION_RATE_PREMIUM=5
COMMISSION_RATE_ENTERPRISE=3

# Payout settings
MIN_PAYOUT_AMOUNT=1000
PAYOUT_SCHEDULE=weekly
```

---

## Step 6: Create Upload Directories

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path uploads\products

# Linux/Mac
mkdir -p uploads/products

# Set permissions (Linux/Mac)
chmod 755 uploads/products
```

---

## Step 7: Middleware Setup

Ensure you have authentication middleware. If not, create:

```javascript
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

exports.isAdmin = (req, res, next) => {
  if (!req.user.roles || !req.user.roles.includes('admin')) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

exports.isSeller = (req, res, next) => {
  if (!req.user.roles || !req.user.roles.includes('seller')) {
    return res.status(403).json({ message: 'Seller access required' });
  }
  next();
};
```

---

## Step 8: Frontend API Client Setup

Create or update your axios configuration:

```javascript
// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Step 9: CSS Import

Add to your main CSS file or App.js:

```javascript
// Import eCommerce styles
import './styles/EcommerceSubscription.css';
import './styles/CommissionDashboard.css';
import './styles/CategoryManager.css';
import './styles/ProductListing.css';
import './styles/Marketplace.css';
```

---

## Step 10: Testing the Integration

### Test Seller Flow
1. Register/login as a seller
2. Visit `/seller/subscription` - Should see subscription plans
3. Create a seller profile via onboarding
4. Visit `/seller/products` - Should see product listing page
5. Create a test product with images
6. Publish the product
7. Visit `/marketplace` - Should see your product

### Test Buyer Flow
1. Register/login as a buyer
2. Visit `/marketplace` - Should see products
3. Use filters and search
4. Add products to wishlist
5. Compare products
6. View product details

### Test Admin Flow
1. Login as admin
2. Visit `/admin/categories` - Should see category manager
3. Visit `/admin/sellers` - Should see pending verifications
4. Approve a seller
5. Approve products
6. Approve payouts

---

## Step 11: Optional Enhancements

### Add to Package.json
```json
{
  "scripts": {
    "seed:ecommerce": "node backend/scripts/seedEcommerceSubscriptionPlans.js && node backend/scripts/seedEcommerceCategories.js",
    "migrate:ecommerce": "node backend/scripts/migrateToNewEcommerce.js"
  }
}
```

### Setup Cron Jobs (for automated tasks)
```javascript
// backend/jobs/ecommerceCron.js
const cron = require('node-cron');
const CommissionProcessingService = require('../services/CommissionProcessingService');

// Process payouts every Friday at 10 AM
cron.schedule('0 10 * * 5', async () => {
  console.log('Processing weekly payouts...');
  await CommissionProcessingService.generateAutomatedPayouts();
});

// Check subscription renewals daily
cron.schedule('0 0 * * *', async () => {
  console.log('Checking subscription renewals...');
  // Add renewal check logic
});
```

---

## Step 12: Troubleshooting

### Common Issues

**1. Routes not working**
```bash
# Check if routes are mounted correctly
console.log('eCommerce routes loaded');
```

**2. Upload not working**
```bash
# Verify directory exists and has write permissions
ls -la uploads/products
```

**3. Authentication errors**
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET
```

**4. Database connection errors**
```bash
# Test MongoDB connection
mongo $MONGODB_URI
```

**5. Images not displaying**
```javascript
// Serve static files in server.js
app.use('/uploads', express.static('uploads'));
```

---

## Step 13: Production Deployment Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure file upload limits
- [ ] Setup CDN for images (CloudFlare/AWS S3)
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Setup monitoring (error tracking)
- [ ] Configure backup strategy
- [ ] Test payment gateway integration
- [ ] Setup email notifications
- [ ] Configure environment variables
- [ ] Run load tests
- [ ] Security audit

---

## 🎉 You're All Set!

Your eCommerce module is now fully integrated!

### Quick Links:
- **Seller Dashboard**: http://localhost:3000/seller/subscription
- **Marketplace**: http://localhost:3000/marketplace
- **Admin Panel**: http://localhost:3000/admin/categories
- **API Docs**: See `ECOMMERCE_MODULE_README.md`

### Next Steps:
1. Customize UI colors to match your brand
2. Add payment gateway (Razorpay/Stripe)
3. Setup email templates
4. Configure SMS notifications
5. Add analytics tracking

---

**Need Help?**
- Check `ECOMMERCE_IMPLEMENTATION_COMPLETE.md` for full feature list
- Review `ECOMMERCE_MODULE_README.md` for API documentation
- Test using the provided test cases

**Happy Integration! 🚀**
