# Microservices with Shared Database - Implementation Plan

## 🎯 Architecture Overview

You'll have **12 independent microservices**, all connecting to a **single shared MongoDB database**.

```
                    ┌─────────────────────┐
                    │   API Gateway       │
                    │   (Kong/Nginx)      │
                    │   Port: 80/443      │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐         ┌─────▼──────┐        ┌─────▼──────┐
   │  Auth    │         │ E-commerce │        │  Payment   │
   │ Service  │         │  Service   │        │  Service   │
   │ :3001    │         │  :3003     │        │  :3004     │
   └────┬─────┘         └─────┬──────┘        └─────┬──────┘
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Shared MongoDB    │
                    │  (Single Database) │
                    └────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Shared Redis     │
                    │   (Cache/Queue)    │
                    └────────────────────┘
```

---

## 📦 12 Microservices to Create

### 1. **auth-service** (Port 3001)
- User authentication
- JWT token management
- OTP verification
- Session management

### 2. **user-service** (Port 3002)
- User profile CRUD
- Avatar management
- Preferences
- Activity logs

### 3. **ecommerce-service** (Port 3003)
- Product catalog
- Shopping cart
- Orders
- Reviews

### 4. **payment-service** (Port 3004)
- Razorpay integration
- Transactions
- Invoices
- Refunds

### 5. **classifieds-service** (Port 3005)
- Listings
- Search & filters
- Categories
- Ad moderation

### 6. **food-delivery-service** (Port 3006)
- Restaurants
- Menus
- Food orders
- Delivery tracking

### 7. **marketplace-service** (Port 3007)
- Real estate
- Matrimonial
- Healthcare
- Education
- Tourism
- Hotels

### 8. **business-service** (Port 3008)
- Business builder
- Freelancer marketplace
- Gulf services
- Service bookings

### 9. **content-service** (Port 3009)
- Messaging
- Personal diary
- Social feed
- Posts & comments

### 10. **ai-service** (Port 3010)
- AI chat
- Beauty AI
- Astrology
- Kids video maker

### 11. **finance-service** (Port 3011)
- Financial institutions
- Loan applications
- Credit scoring

### 12. **notification-service** (Port 3012)
- Email notifications
- SMS (Twilio)
- Push notifications
- In-app alerts

---

## 🏗️ Service Template Structure

Each service will follow this structure:

```
service-name/
├── src/
│   ├── config/
│   │   ├── database.js       # Shared DB connection
│   │   ├── redis.js          # Shared Redis
│   │   └── env.js            # Environment config
│   ├── routes/
│   │   └── index.js          # Service routes
│   ├── controllers/
│   │   └── *.controller.js   # Request handlers
│   ├── services/
│   │   └── *.service.js      # Business logic
│   ├── models/
│   │   └── *.model.js        # Mongoose models
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   └── errorHandler.js   # Error handling
│   ├── utils/
│   │   └── logger.js         # Winston logger
│   ├── app.js                # Express app setup
│   └── server.js             # Server entry point
├── tests/
│   └── *.test.js
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
└── README.md
```

---

## 🔧 Shared Database Strategy

### Benefits
- ✅ **Simple**: No distributed transactions
- ✅ **Fast**: No network calls between services for data
- ✅ **Easy**: Familiar development model
- ✅ **ACID**: Full transaction support

### Trade-offs
- ⚠️ **Coupling**: Services share data models
- ⚠️ **Schema changes**: Need coordination
- ⚠️ **Scale**: Database becomes bottleneck eventually

### Best Practices
1. **Each service owns its collections**
   - Auth service: Users, Sessions, OTP
   - Ecommerce service: Products, Orders, Cart
   - Payment service: Transactions, Invoices

2. **No direct access to other service collections**
   - Auth service should NOT query Products
   - Ecommerce should call Auth service API for user data

3. **Use API calls for cross-service data**
   - Service A needs data from Service B → HTTP call
   - Avoid direct database queries across service boundaries

4. **Eventual migration path**
   - Later, can split database by service
   - For now, keep simple with shared DB

---

## 🚀 Implementation Plan

### Week 1: Infrastructure Setup

**Day 1-2: Create Shared NPM Package**
```bash
# Create shared package
mkdir -p packages/shared
cd packages/shared
npm init -y
```

**Package contents**:
- Database connection utility
- Redis client
- Logger
- Authentication middleware
- Error handlers
- Common validators

**Day 3-4: Set up API Gateway**
- Install Kong or Nginx
- Configure routing rules
- Set up rate limiting
- SSL certificates

**Day 5: Create Service Template**
- Create base service template
- Docker setup
- CI/CD pipeline template

---

### Week 2-3: Create Core Services

**Priority 1 (Week 2)**:
1. **Auth Service** (Days 1-2)
   - Register, login, logout
   - JWT token management
   - MPIN support
   - Deploy to Cloud Run

2. **User Service** (Day 3)
   - Profile management
   - Avatar upload
   - Deploy to Cloud Run

3. **Payment Service** (Days 4-5)
   - Razorpay integration
   - Transaction handling
   - Deploy to Cloud Run

**Priority 2 (Week 3)**:
4. **Ecommerce Service** (Days 1-2)
5. **Classifieds Service** (Day 3)
6. **Notification Service** (Days 4-5)

---

### Week 4-5: Create Domain Services

**Week 4**:
7. **Food Delivery Service** (Days 1-2)
8. **Marketplace Service** (Days 3-4)
9. **Business Service** (Day 5)

**Week 5**:
10. **Content Service** (Days 1-2)
11. **AI Service** (Days 3-4)
12. **Finance Service** (Day 5)

---

### Week 6: Testing & Optimization

**Tasks**:
- Integration testing
- Load testing
- Performance optimization
- Documentation
- Deployment guides

---

## 💻 Let Me Start Creating Services NOW

I'll create the first 3 services right now:

### 1. Auth Service
### 2. User Service  
### 3. Payment Service

Each will be:
- ✅ Complete working service
- ✅ Dockerfile ready
- ✅ Cloud Run deployment ready
- ✅ Connected to shared MongoDB
- ✅ Independent scaling

---

## 📊 Cost Breakdown

### Estimated Monthly Costs

**Cloud Run (12 services)**:
- Auth: $10/month
- User: $10/month
- Ecommerce: $30/month (higher traffic)
- Payment: $20/month
- Classifieds: $15/month
- Food Delivery: $20/month
- Marketplace: $15/month
- Business: $10/month
- Content: $15/month
- AI: $40/month (compute intensive)
- Finance: $10/month
- Notification: $15/month
**Subtotal**: $210/month

**Infrastructure**:
- MongoDB Atlas: $25/month (shared)
- Redis: $15/month (shared)
- API Gateway: $20/month
- Service Mesh: $30/month
**Subtotal**: $90/month

**Total**: $300/month

**Comparison**:
- Current monolith: $85/month
- Microservices: $300/month
- **Increase**: $215/month (+253%)

---

## 🎯 API Gateway Configuration

### Kong Gateway Setup

```yaml
# kong.yml
services:
  - name: auth-service
    url: https://auth-service-xxxx.run.app
    routes:
      - name: auth
        paths: [/api/auth]
        methods: [GET, POST, PUT, DELETE]
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local

  - name: ecommerce-service
    url: https://ecommerce-service-xxxx.run.app
    routes:
      - name: products
        paths: [/api/products, /api/cart, /api/orders]
    plugins:
      - name: jwt
        config:
          secret_is_base64: false

  - name: payment-service
    url: https://payment-service-xxxx.run.app
    routes:
      - name: payments
        paths: [/api/payments]
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 20
```

---

## 🔐 Inter-Service Communication

### Service-to-Service Auth

```javascript
// In each service: src/utils/serviceAuth.js

const axios = require('axios');

class ServiceAuth {
  constructor() {
    this.serviceToken = process.env.SERVICE_API_KEY;
  }

  async callService(serviceUrl, endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${serviceUrl}${endpoint}`,
        headers: {
          'X-Service-Token': this.serviceToken,
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw new Error(`Service call failed: ${error.message}`);
    }
  }

  // Helper methods for specific services
  async getUserById(userId) {
    return await this.callService(
      process.env.USER_SERVICE_URL,
      `/api/users/${userId}`,
      'GET'
    );
  }

  async createNotification(notificationData) {
    return await this.callService(
      process.env.NOTIFICATION_SERVICE_URL,
      '/api/notifications',
      'POST',
      notificationData
    );
  }
}

module.exports = new ServiceAuth();
```

---

## 📝 Environment Variables

Each service needs:

```env
# Service Config
NODE_ENV=production
PORT=8080
SERVICE_NAME=auth-service

# Shared Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/malabarbazaar
REDIS_HOST=redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRE=7d

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=https://auth-service-xxxx.run.app
USER_SERVICE_URL=https://user-service-xxxx.run.app
PAYMENT_SERVICE_URL=https://payment-service-xxxx.run.app
ECOMMERCE_SERVICE_URL=https://ecommerce-service-xxxx.run.app
# ... (other services)

# Service API Key (for service-to-service auth)
SERVICE_API_KEY=your-secure-service-key
```

---

## 🚀 Ready to Start?

I'll now create the first 3 microservices:

1. **Auth Service** - Complete authentication microservice
2. **User Service** - User profile management
3. **Payment Service** - Payment processing

Each will include:
- ✅ Full source code
- ✅ Dockerfile
- ✅ README
- ✅ Cloud Run deployment config
- ✅ Environment variables template

**Shall I proceed with creating these services?**

Type "yes" and I'll start building the microservices right now! 🚀
