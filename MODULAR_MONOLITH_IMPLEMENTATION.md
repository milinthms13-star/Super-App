# Modular Monolith Implementation Guide

## 🎯 Goal

Reorganize your current backend into well-defined modules that:
- ✅ Are loosely coupled
- ✅ Have clear boundaries
- ✅ Can be extracted to microservices later
- ✅ Are easier to understand and maintain

## 📁 New Directory Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.js
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.js
│   │   │   ├── services/
│   │   │   │   └── auth.service.js
│   │   │   ├── models/
│   │   │   │   └── User.model.js
│   │   │   ├── middleware/
│   │   │   │   └── auth.middleware.js
│   │   │   ├── validators/
│   │   │   │   └── auth.validator.js
│   │   │   └── index.js
│   │   │
│   │   ├── ecommerce/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── index.js
│   │   │
│   │   ├── payment/
│   │   ├── classifieds/
│   │   ├── food-delivery/
│   │   ├── marketplace/
│   │   ├── business/
│   │   ├── content/
│   │   ├── ai-ml/
│   │   ├── finance/
│   │   └── notifications/
│   │
│   ├── shared/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   ├── redis.js
│   │   │   └── env.js
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   └── cors.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   ├── validator.js
│   │   │   └── helpers.js
│   │   └── constants/
│   │       └── index.js
│   │
│   ├── app.js
│   └── server.js
│
├── tests/
│   ├── auth/
│   ├── ecommerce/
│   └── ...
│
├── package.json
├── Dockerfile
└── README.md
```

## 🏗️ Module Structure Pattern

Each module follows the same structure:

```
module-name/
├── routes/          # API endpoints
├── controllers/     # Request handling
├── services/        # Business logic
├── models/          # Database schemas
├── middleware/      # Module-specific middleware
├── validators/      # Input validation
├── constants/       # Module constants
└── index.js         # Module exports
```

## 📝 Implementation Steps

### Step 1: Create Module Structure

I'll create the directory structure and move files systematically.

### Step 2: Define Module Boundaries

Each module will have:
- **Clear interface** (exported functions)
- **No direct access** to other module internals
- **Communication through events** or service calls

### Step 3: Shared Dependencies

Common code goes in `shared/`:
- Database connection
- Redis client
- Logger
- Error handlers
- Common middleware

---

## 🔧 Example: Auth Module

### File: `src/modules/auth/index.js`

```javascript
/**
 * Auth Module
 * Handles authentication, authorization, and user management
 */

const authRoutes = require('./routes/auth.routes');
const authService = require('./services/auth.service');
const authMiddleware = require('./middleware/auth.middleware');

module.exports = {
  routes: authRoutes,
  service: authService,
  middleware: authMiddleware,
};
```

### File: `src/modules/auth/services/auth.service.js`

```javascript
const User = require('../models/User.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../../../shared/utils/logger');

class AuthService {
  async register(userData) {
    try {
      const { email, password, name } = userData;
      
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        name,
      });
      
      logger.info(`User registered: ${email}`);
      return user;
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }
  
  async login(email, password) {
    try {
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }
      
      // Generate token
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      logger.info(`User logged in: ${email}`);
      return { user, token };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }
  
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new AuthService();
```

### File: `src/modules/auth/controllers/auth.controller.js`

```javascript
const authService = require('../services/auth.service');

class AuthController {
  async register(req, res, next) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: { user, token },
      });
    } catch (error) {
      next(error);
    }
  }
  
  async logout(req, res, next) {
    try {
      // Logout logic (invalidate token, etc.)
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        data: { user: req.user },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
```

### File: `src/modules/auth/routes/auth.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validateRegistration, validateLogin } = require('../validators/auth.validator');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', validateRegistration, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware.authenticate, authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authMiddleware.authenticate, authController.getProfile);

module.exports = router;
```

---

## 🔄 Main Application Setup

### File: `src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Shared middleware
const errorHandler = require('./shared/middleware/errorHandler');
const rateLimiter = require('./shared/middleware/rateLimiter');

// Module routes
const authModule = require('./modules/auth');
const ecommerceModule = require('./modules/ecommerce');
const paymentModule = require('./modules/payment');
const classifiedsModule = require('./modules/classifieds');
const foodDeliveryModule = require('./modules/food-delivery');
const marketplaceModule = require('./modules/marketplace');
const businessModule = require('./modules/business');
const contentModule = require('./modules/content');
const aiMlModule = require('./modules/ai-ml');
const financeModule = require('./modules/finance');
const notificationsModule = require('./modules/notifications');

const app = express();

// Global middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Module routes
app.use('/api/auth', authModule.routes);
app.use('/api/ecommerce', ecommerceModule.routes);
app.use('/api/payments', paymentModule.routes);
app.use('/api/classifieds', classifiedsModule.routes);
app.use('/api/food-delivery', foodDeliveryModule.routes);
app.use('/api/marketplace', marketplaceModule.routes);
app.use('/api/business', businessModule.routes);
app.use('/api/content', contentModule.routes);
app.use('/api/ai', aiMlModule.routes);
app.use('/api/finance', financeModule.routes);
app.use('/api/notifications', notificationsModule.routes);

// Error handling
app.use(errorHandler);

module.exports = app;
```

### File: `src/server.js`

```javascript
require('dotenv').config();
const app = require('./app');
const database = require('./shared/config/database');
const redis = require('./shared/config/redis');
const logger = require('./shared/utils/logger');

const PORT = process.env.PORT || 8080;

// Connect to database
database.connect()
  .then(() => {
    logger.info('Database connected successfully');
    
    // Connect to Redis
    return redis.connect();
  })
  .then(() => {
    logger.info('Redis connected successfully');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Startup error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await database.disconnect();
  await redis.disconnect();
  process.exit(0);
});
```

---

## 🧩 Module Communication

### Event-Based Communication

```javascript
// src/shared/utils/eventBus.js
const EventEmitter = require('events');

class EventBus extends EventEmitter {}

module.exports = new EventBus();
```

### Example: Order Created Event

```javascript
// In ecommerce module
const eventBus = require('../../shared/utils/eventBus');

// Emit event when order created
eventBus.emit('order.created', {
  orderId: order._id,
  userId: order.userId,
  amount: order.total,
});

// In notification module - listen for events
eventBus.on('order.created', async (data) => {
  await notificationService.sendOrderConfirmation(data);
});

// In payment module - listen for events
eventBus.on('order.created', async (data) => {
  await paymentService.createPaymentIntent(data);
});
```

---

## 🧪 Testing Structure

```javascript
// tests/auth/auth.service.test.js
const authService = require('../../src/modules/auth/services/auth.service');
const User = require('../../src/modules/auth/models/User.model');

describe('Auth Service', () => {
  describe('register', () => {
    it('should register new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
      
      const user = await authService.register(userData);
      
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });
    
    it('should throw error if user exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };
      
      await authService.register(userData);
      
      await expect(authService.register(userData))
        .rejects.toThrow('User already exists');
    });
  });
});
```

---

## 📊 Benefits of This Structure

### 1. Clear Boundaries
- Each module is self-contained
- Easy to understand what each module does
- Reduced cognitive load

### 2. Easy to Test
- Test each module independently
- Mock dependencies easily
- Clear test structure

### 3. Easy to Scale
- Add new modules without touching existing ones
- Split team by modules
- Independent development

### 4. Easy to Extract
- When ready for microservices, just:
  1. Copy module folder
  2. Add server.js
  3. Deploy as separate service

### 5. Better Maintainability
- Find code easily
- Understand module responsibilities
- Onboard new developers faster

---

## 🚀 Migration Plan

### Phase 1: Create Structure (Week 1)
1. Create new directory structure
2. Set up shared utilities
3. Create module templates

### Phase 2: Migrate Core Modules (Week 2)
1. Auth module
2. User module
3. Payment module

### Phase 3: Migrate Domain Modules (Week 3-4)
1. E-commerce
2. Classifieds
3. Food delivery
4. Marketplace

### Phase 4: Migrate Supporting Modules (Week 5)
1. Content
2. AI/ML
3. Finance
4. Notifications

### Phase 5: Cleanup (Week 6)
1. Remove old structure
2. Update tests
3. Update documentation

---

## ⏭️ Next Steps

Would you like me to:

1. **Start the migration now** - I'll create the modular structure
2. **Create detailed migration scripts** - Automated file movement
3. **Show example for one complete module** - Full working example
4. **Create the shared utilities first** - Foundation for modules

Let me know and I'll proceed!
