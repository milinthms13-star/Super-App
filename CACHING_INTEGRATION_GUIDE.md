# Caching Integration Guide - BusinessBuilder Module

## Overview

This guide documents the Redis caching layer implementation for the BusinessBuilder module, including cache strategies, middleware application, and performance optimizations.

---

## ✅ Completed Components

### 1. Cache Service (`backend/services/cacheService.js`)

**Features**:
- Redis connection management with automatic reconnection
- Generic get/set/delete operations
- Pattern-based key deletion (invalidation)
- TTL (Time To Live) management
- JSON serialization/deserialization
- Connection health checks
- Graceful error handling

**Key Methods**:
```javascript
await cacheService.get(key)                    // Retrieve cached value
await cacheService.set(key, value, ttl)        // Set cache with TTL
await cacheService.delete(key)                 // Delete specific key
await cacheService.deletePattern(pattern)      // Delete keys matching pattern
await cacheService.exists(key)                 // Check if key exists
await cacheService.flushAll()                  // Clear entire cache
```

---

### 2. Cache Middleware (`backend/middleware/cacheMiddleware.js`)

**Features**:
- Automatic request caching based on URL and query parameters
- Configurable TTL per route
- Custom cache key generators
- Automatic cache invalidation on write operations
- Support for user-scoped and business-scoped caching

**Key Generators**:
```javascript
keyGenerators.default(req)           // URL + query params
keyGenerators.user(req)              // User ID + URL
keyGenerators.business(req)          // Business ID + URL
keyGenerators.userAndBusiness(req)   // User + Business + URL
```

**Usage Example**:
```javascript
// Cache for 5 minutes with default key generator
app.get('/api/data', cacheMiddleware(300), handler);

// Cache with user-specific key for 10 minutes
app.get('/api/user/profile', cacheMiddleware(600, keyGenerators.user), handler);

// Cache with business-specific key for 1 hour
app.get('/api/business/:id', cacheMiddleware(3600, keyGenerators.business), handler);
```

---

## 🔄 Cache Invalidation Strategy

### Automatic Invalidation

The cache middleware automatically invalidates related cache entries on write operations:

**POST/PUT/PATCH/DELETE requests** automatically clear:
- Exact match for the resource
- Pattern-based matches for related resources
- User-scoped caches when authenticated
- Business-scoped caches when business context exists

### Manual Invalidation

For complex scenarios, use the cache service directly:

```javascript
const cacheService = require('../services/cacheService');

// Invalidate specific business data
await cacheService.deletePattern(`business:${businessId}:*`);

// Invalidate all mini apps for a business
await cacheService.deletePattern(`miniapps:${businessId}:*`);

// Invalidate user's dashboard
await cacheService.delete(`user:${userId}:dashboard`);
```

---

## 📊 Caching Strategy by Route

### BusinessBuilder Main Routes (`/api/business-builder`)

| Endpoint | Cache TTL | Key Generator | Notes |
|----------|-----------|---------------|-------|
| GET `/businesses` | 300s (5min) | user | List changes infrequently |
| GET `/businesses/:id` | 600s (10min) | business | Individual business details |
| GET `/businesses/:id/analytics` | 180s (3min) | business | Analytics update every 3 min |
| POST `/businesses` | - | - | Invalidates user cache |
| PUT `/businesses/:id` | - | - | Invalidates business cache |

### Advanced Routes (`/api/business-builder/advanced`)

| Endpoint | Cache TTL | Key Generator | Notes |
|----------|-----------|---------------|-------|
| GET `/search` | 120s (2min) | default | Search results cached briefly |
| GET `/filter` | 180s (3min) | user | Filter results per user |
| GET `/leads` | 300s (5min) | business | Lead list updates |
| GET `/leads/stats` | 600s (10min) | business | Statistics change slowly |

### Invoice Routes (`/api/business-builder/invoices`)

| Endpoint | Cache TTL | Key Generator | Notes |
|----------|-----------|---------------|-------|
| GET `/` | 180s (3min) | business | Recent invoices |
| GET `/:id` | 600s (10min) | default | Individual invoice |
| GET `/:id/pdf` | 1800s (30min) | default | PDF generation is expensive |
| POST `/` | - | - | Invalidates business cache |

### Mini Apps Routes (`/api/business-builder/mini-apps`)

| Endpoint | Cache TTL | Key Generator | Notes |
|----------|-----------|---------------|-------|
| GET `/` | 300s (5min) | business | List of mini apps |
| GET `/:id` | 600s (10min) | default | Individual mini app |
| GET `/:id/products` | 180s (3min) | default | Product list |
| GET `/:id/orders` | 60s (1min) | default | Orders update frequently |
| GET `/:id/funnel` | 300s (5min) | default | Funnel metrics |

### Audit Logs Routes (`/api/audit-logs`)

| Endpoint | Cache TTL | Key Generator | Notes |
|----------|-----------|---------------|-------|
| GET `/` | 60s (1min) | user | Recent activity |
| GET `/user/:userId` | 120s (2min) | user | User activity summary |
| GET `/business/:businessId` | 180s (3min) | business | Business activity |

### QR Code Routes (`/api/qrcode`)

| Endpoint | Cache TTL | Key Generator | Notes |
|----------|-----------|---------------|-------|
| GET `/preview` | 3600s (1hr) | default | QR codes rarely change |
| POST `/miniapp` | - | - | No caching on generation |
| POST `/bulk` | - | - | No caching on generation |

---

## 🚀 Performance Optimizations

### 1. Database Query Optimization

**Implemented**:
- Indexed fields on MongoDB collections
- Projection to fetch only required fields
- Aggregation pipeline optimization
- Batch queries to reduce round trips

**Example**:
```javascript
// Instead of multiple queries
const business = await Business.findById(id);
const invoices = await Invoice.find({ businessId: id });
const miniApps = await MiniApp.find({ businessId: id });

// Use aggregation for single query
const result = await Business.aggregate([
  { $match: { _id: id } },
  { $lookup: { from: 'invoices', localField: '_id', foreignField: 'businessId', as: 'invoices' } },
  { $lookup: { from: 'miniapps', localField: '_id', foreignField: 'businessId', as: 'miniApps' } }
]);
```

### 2. Frontend Code Splitting

**Recommendations** (To be implemented):
```javascript
// Lazy load BusinessBuilder module
const BusinessBuilder = React.lazy(() => import('./modules/businessbuilder/BusinessBuilder'));

// Lazy load Chart components
const RevenueChart = React.lazy(() => import('./components/Charts/RevenueChart'));
```

### 3. Image Lazy Loading

**Recommendations** (To be implemented):
```javascript
// Add loading="lazy" to images
<img src={logoUrl} alt="Logo" loading="lazy" />

// Or use Intersection Observer for custom lazy loading
```

### 4. Response Compression

**Already Enabled** in `backend/app.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

---

## 📝 Environment Configuration

### Required Environment Variables

Add to `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache Settings
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=300
CACHE_MAX_TTL=3600
```

### Redis Installation

**Development (Local)**:
```bash
# Windows (with Chocolatey)
choco install redis-64

# Or download from: https://github.com/microsoftarchive/redis/releases

# Start Redis
redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

**Production (Cloud)**:
- Redis Cloud: https://redis.com/try-free/
- AWS ElastiCache
- Azure Cache for Redis
- Google Cloud Memorystore

---

## 🔍 Monitoring & Debugging

### Cache Hit Rate Monitoring

Add logging to track cache effectiveness:

```javascript
// In cacheMiddleware.js
const cacheStats = {
  hits: 0,
  misses: 0,
  getHitRate() {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%';
  }
};

// Log stats periodically
setInterval(() => {
  logger.info(`Cache Stats - Hit Rate: ${cacheStats.getHitRate()}, Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses}`);
}, 60000); // Every minute
```

### Cache Debugging

Enable debug mode in development:

```javascript
// In cacheService.js
const DEBUG_CACHE = process.env.CACHE_DEBUG === 'true';

if (DEBUG_CACHE) {
  console.log(`[CACHE] ${operation} - Key: ${key}, TTL: ${ttl}`);
}
```

### Redis CLI Commands

```bash
# View all keys
redis-cli KEYS "*"

# Get specific key
redis-cli GET "business:123:dashboard"

# Check TTL
redis-cli TTL "business:123:dashboard"

# Delete pattern
redis-cli --scan --pattern "business:*" | xargs redis-cli DEL

# Clear all cache
redis-cli FLUSHDB
```

---

## 🧪 Testing Cache Implementation

### Unit Tests

```javascript
const cacheService = require('../services/cacheService');

describe('Cache Service', () => {
  beforeEach(async () => {
    await cacheService.flushAll();
  });

  it('should set and get cache', async () => {
    await cacheService.set('test:key', { data: 'value' }, 60);
    const result = await cacheService.get('test:key');
    expect(result).toEqual({ data: 'value' });
  });

  it('should expire cache after TTL', async () => {
    await cacheService.set('test:expire', 'value', 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await cacheService.get('test:expire');
    expect(result).toBeNull();
  });

  it('should delete by pattern', async () => {
    await cacheService.set('user:1:data', 'value1', 60);
    await cacheService.set('user:1:profile', 'value2', 60);
    await cacheService.set('user:2:data', 'value3', 60);
    
    await cacheService.deletePattern('user:1:*');
    
    const result1 = await cacheService.get('user:1:data');
    const result2 = await cacheService.get('user:2:data');
    expect(result1).toBeNull();
    expect(result2).toBe('value3');
  });
});
```

### Integration Tests

```javascript
const request = require('supertest');
const app = require('../app');

describe('Cache Middleware', () => {
  it('should cache GET requests', async () => {
    const response1 = await request(app)
      .get('/api/business-builder/businesses')
      .set('Authorization', `Bearer ${token}`);
    
    const response2 = await request(app)
      .get('/api/business-builder/businesses')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response1.body).toEqual(response2.body);
    expect(response2.headers['x-cache']).toBe('HIT');
  });

  it('should invalidate cache on POST', async () => {
    // Cache initial data
    await request(app)
      .get('/api/business-builder/businesses')
      .set('Authorization', `Bearer ${token}`);
    
    // Create new business
    await request(app)
      .post('/api/business-builder/businesses')
      .set('Authorization', `Bearer ${token}`)
      .send({ businessName: 'Test', businessType: 'Retail' });
    
    // Should return fresh data
    const response = await request(app)
      .get('/api/business-builder/businesses')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.headers['x-cache']).toBe('MISS');
  });
});
```

---

## 📈 Expected Performance Improvements

### Before Caching
- **API Response Time**: 200-500ms (database query)
- **Dashboard Load**: 2-3 seconds
- **Analytics Endpoints**: 500ms-1s
- **Database Load**: 100 queries/minute

### After Caching
- **API Response Time**: 10-50ms (cache hit)
- **Dashboard Load**: 500ms-1s
- **Analytics Endpoints**: 50-100ms
- **Database Load**: 20-30 queries/minute (70% reduction)

### Cache Hit Rate Targets
- **Business Profiles**: 80-90%
- **Analytics Data**: 70-80%
- **Mini App Lists**: 75-85%
- **Invoice Lists**: 60-70%

---

## ⚠️ Important Considerations

### 1. Cache Consistency

**Problem**: Cached data may become stale if database is updated directly.

**Solution**: Always use API endpoints for updates, which automatically invalidate cache.

### 2. Memory Management

**Problem**: Redis memory can grow unbounded.

**Solution**: Set max memory and eviction policy in redis.conf:
```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 3. Cache Stampede

**Problem**: Multiple requests fetch same data simultaneously when cache expires.

**Solution**: Implement probabilistic early expiration:
```javascript
const earlyExpiration = ttl * 0.9; // Refresh at 90% of TTL
```

### 4. Serialization Overhead

**Problem**: Large objects take time to serialize/deserialize.

**Solution**: Cache only necessary fields, use compression for large objects.

---

## 🔧 Troubleshooting

### Cache Not Working

1. **Check Redis Connection**:
   ```bash
   redis-cli ping
   ```

2. **Verify Environment Variables**:
   ```bash
   echo $REDIS_HOST
   echo $CACHE_ENABLED
   ```

3. **Check Logs**:
   ```bash
   tail -f logs/app.log | grep CACHE
   ```

### Stale Data Issues

1. **Manual Cache Clear**:
   ```javascript
   await cacheService.deletePattern('business:*');
   ```

2. **Reduce TTL** for frequently changing data

3. **Implement Cache Warming** for critical data

### High Memory Usage

1. **Monitor Redis Memory**:
   ```bash
   redis-cli INFO memory
   ```

2. **Set Expiration** on all keys

3. **Use Eviction Policy** to automatically remove old keys

---

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/topics/lru-cache)
- [Caching Strategies](https://aws.amazon.com/caching/best-practices/)
- [Node.js Redis Client](https://github.com/redis/node-redis)

---

## ✅ Next Steps

1. **Monitor cache hit rates** in production
2. **Adjust TTL values** based on real usage patterns
3. **Implement cache warming** for critical paths
4. **Add cache metrics** to monitoring dashboard
5. **Optimize database queries** that are rarely cached

---

**Last Updated**: Current Session  
**Status**: Caching infrastructure complete and integrated
