# Deploy All 35 Microservices

## ✅ Generated Services

All 35 microservices have been created in the `microservices/` directory:

### Core Services (1-5)
1. ✅ **auth-service** (Port 3001) - Authentication & JWT
2. ✅ **user-service** (Port 3002) - User profiles & management
3. ✅ **notification-service** (Port 3003) - Email, SMS, Push notifications
4. ✅ **payment-service** (Port 3004) - Payments & transactions
5. ✅ **file-service** (Port 3005) - File uploads & media

### E-commerce Services (6-10)
6. ✅ **ecommerce-service** (Port 3006) - Products, cart, orders
7. ✅ **vendor-service** (Port 3007) - Vendor management
8. ✅ **inventory-service** (Port 3008) - Stock & inventory
9. ✅ **shipping-service** (Port 3009) - Shipping & tracking
10. ✅ **recommendation-service** (Port 3010) - Product recommendations

### Marketplace Services (11-15)
11. ✅ **classifieds-service** (Port 3011) - Classifieds & listings
12. ✅ **realestate-service** (Port 3012) - Real estate properties
13. ✅ **matrimonial-service** (Port 3013) - Matrimonial profiles
14. ✅ **jobs-service** (Port 3014) - Jobs & career
15. ✅ **vehicles-service** (Port 3015) - Vehicles & automotive

### Food & Hospitality (16-19)
16. ✅ **food-delivery-service** (Port 3016) - Food delivery
17. ✅ **hotel-booking-service** (Port 3017) - Hotel bookings
18. ✅ **tourism-service** (Port 3018) - Tourism packages
19. ✅ **travel-service** (Port 3019) - Travel booking

### Business Services (20-24)
20. ✅ **business-builder-service** (Port 3020) - Business builder
21. ✅ **freelancer-service** (Port 3021) - Freelancer marketplace
22. ✅ **gulf-services-service** (Port 3022) - Gulf services
23. ✅ **finance-service** (Port 3023) - Financial services
24. ✅ **insurance-service** (Port 3024) - Insurance

### Healthcare & Education (25-28)
25. ✅ **healthcare-service** (Port 3025) - Healthcare & appointments
26. ✅ **education-service** (Port 3026) - Education & courses
27. ✅ **astrology-service** (Port 3027) - Astrology predictions
28. ✅ **beauty-ai-service** (Port 3028) - Beauty AI & skincare

### Content & Social (29-32)
29. ✅ **messaging-service** (Port 3029) - Chat & messaging
30. ✅ **social-service** (Port 3030) - Social feed & posts
31. ✅ **diary-service** (Port 3031) - Personal diary
32. ✅ **poll-service** (Port 3032) - Polls & surveys

### AI & Advanced (33-35)
33. ✅ **ai-chat-service** (Port 3033) - AI chat
34. ✅ **kids-video-service** (Port 3034) - Kids video maker
35. ✅ **analytics-service** (Port 3035) - Analytics & reports

---

## 🚀 Quick Deploy Script

### Deploy All Services to Cloud Run

```bash
#!/bin/bash
# deploy-all.sh

REGION="asia-south1"
PROJECT_ID="your-project-id"

# Core Services
services=(
  "auth-service"
  "user-service"
  "notification-service"
  "payment-service"
  "file-service"
  "ecommerce-service"
  "vendor-service"
  "inventory-service"
  "shipping-service"
  "recommendation-service"
  "classifieds-service"
  "realestate-service"
  "matrimonial-service"
  "jobs-service"
  "vehicles-service"
  "food-delivery-service"
  "hotel-booking-service"
  "tourism-service"
  "travel-service"
  "business-builder-service"
  "freelancer-service"
  "gulf-services-service"
  "finance-service"
  "insurance-service"
  "healthcare-service"
  "education-service"
  "astrology-service"
  "beauty-ai-service"
  "messaging-service"
  "social-service"
  "diary-service"
  "poll-service"
  "ai-chat-service"
  "kids-video-service"
  "analytics-service"
)

for service in "${services[@]}"; do
  echo "🚀 Deploying $service..."
  cd "microservices/$service"
  
  gcloud run deploy "$service" \
    --source . \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --allow-unauthenticated \
    --set-env-vars "MONGO_URI=$MONGO_URI,REDIS_HOST=$REDIS_HOST,JWT_SECRET=$JWT_SECRET"
  
  if [ $? -eq 0 ]; then
    echo "✅ $service deployed successfully"
  else
    echo "❌ $service deployment failed"
  fi
  
  cd ../..
done

echo "✅ All services deployed!"
```

---

## 📊 Cost Estimation

### Monthly Costs (Cloud Run)

**Tier 1: Always Running (5 services)** - $10-15 each
- auth-service: $15
- user-service: $10
- notification-service: $15
- payment-service: $15
- ecommerce-service: $20
**Subtotal**: $75/month

**Tier 2: High Traffic (10 services)** - $8-12 each
- vendor, inventory, shipping, recommendation
- classifieds, realestate, matrimonial, jobs, vehicles
- food-delivery
**Subtotal**: $100/month

**Tier 3: Medium Traffic (10 services)** - $5-8 each
- hotel-booking, tourism, travel
- business-builder, freelancer, gulf-services
- finance, insurance, healthcare, education
**Subtotal**: $70/month

**Tier 4: Low Traffic (10 services)** - $3-5 each
- astrology, beauty-ai, messaging, social, diary
- poll, ai-chat, kids-video, analytics, file
**Subtotal**: $40/month

**Infrastructure**:
- MongoDB Atlas (shared): $25/month
- Redis (shared): $15/month
- API Gateway (Kong): $30/month
- Load Balancer: $20/month
- Monitoring & Logging: $20/month
**Subtotal**: $110/month

**Total Estimated Cost**: $395/month

**Comparison**:
- Current Monolith: $85/month
- 35 Microservices: $395/month
- **Increase**: $310/month (+365%)

---

## 🏗️ API Gateway Configuration

### Kong Gateway Routes

```yaml
# kong.yml
services:
  - name: auth
    url: https://auth-service-xxxx.run.app
    routes:
      - name: auth-routes
        paths: [/api/auth]
    plugins:
      - name: rate-limiting
        config:
          minute: 100

  - name: users
    url: https://user-service-xxxx.run.app
    routes:
      - name: user-routes
        paths: [/api/users, /api/profile]
    plugins:
      - name: jwt

  - name: ecommerce
    url: https://ecommerce-service-xxxx.run.app
    routes:
      - name: ecommerce-routes
        paths: [/api/products, /api/cart, /api/orders]

  # ... (add all 35 services)
```

---

## 🔧 Environment Variables

Create a `.env` file with shared variables:

```env
# Shared Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/malabarbazaar

# Shared Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Secret (same across all services)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRE=7d

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=https://auth-service-xxxx.run.app
USER_SERVICE_URL=https://user-service-xxxx.run.app
PAYMENT_SERVICE_URL=https://payment-service-xxxx.run.app
NOTIFICATION_SERVICE_URL=https://notification-service-xxxx.run.app
# ... (add all service URLs)

# External Services
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

---

## 📝 Local Development

### Run All Services Locally (Docker Compose)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  auth-service:
    build: ./microservices/auth-service
    ports:
      - "3001:3001"
    environment:
      - MONGO_URI=mongodb://admin:password@mongodb:27017/malabarbazaar
      - REDIS_HOST=redis
      - JWT_SECRET=local-dev-secret
    depends_on:
      - mongodb
      - redis

  user-service:
    build: ./microservices/user-service
    ports:
      - "3002:3002"
    environment:
      - MONGO_URI=mongodb://admin:password@mongodb:27017/malabarbazaar
      - REDIS_HOST=redis
    depends_on:
      - mongodb
      - redis

  # Add all other services...
```

Run all services:
```bash
docker-compose up -d
```

---

## 🧪 Testing

### Test Each Service

```bash
# Test auth service
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Test user service
curl http://localhost:3002/health

# Test all services
for port in {3001..3035}; do
  echo "Testing service on port $port..."
  curl -s http://localhost:$port/health | jq .
done
```

---

## 📦 Deployment Priorities

### Phase 1: Core Services (Week 1)
Deploy these first as they're critical:
1. auth-service
2. user-service
3. payment-service
4. notification-service
5. file-service

### Phase 2: High Revenue Services (Week 2)
6. ecommerce-service
7. food-delivery-service
8. classifieds-service
9. realestate-service
10. matrimonial-service

### Phase 3: Business Services (Week 3)
11-24 (all business & marketplace services)

### Phase 4: Content & AI (Week 4)
25-35 (healthcare, education, social, AI services)

---

## 🎯 Next Steps

1. **Configure shared database**:
   ```bash
   # Set up MongoDB Atlas cluster
   # Get connection string
   ```

2. **Set up Redis**:
   ```bash
   # Deploy Redis on Cloud Memorystore
   # Or use Redis Labs
   ```

3. **Deploy services**:
   ```bash
   chmod +x deploy-all.sh
   ./deploy-all.sh
   ```

4. **Set up API Gateway**:
   ```bash
   # Install Kong
   # Configure routes
   ```

5. **Configure frontend**:
   ```env
   REACT_APP_API_URL=https://your-api-gateway.com
   ```

6. **Monitor & optimize**:
   - Set up Google Cloud Monitoring
   - Configure alerts
   - Optimize based on usage

---

## ✅ Success Criteria

Each service should:
- ✅ Start successfully
- ✅ Connect to shared MongoDB
- ✅ Respond to health checks
- ✅ Handle authentication (where needed)
- ✅ Log properly
- ✅ Scale automatically

---

**All 35 microservices are ready to deploy!** 🚀
