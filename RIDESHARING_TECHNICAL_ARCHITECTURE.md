# 🏗️ Ride-Sharing Module - Technical Architecture & Implementation Guide

**Document Type:** Technical Reference  
**Target Audience:** Backend & Frontend Developers  
**Last Updated:** May 9, 2026

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Rider   │  │ Driver   │  │ Admin    │  │ Partner  │         │
│  │ Mobile  │  │ Mobile   │  │ Dashboard│  │ API      │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        └─────────────┼─────────────┼─────────────┘
                      │ HTTP/WebSocket
        ┌─────────────┼─────────────────────────────┐
        │             │                             │
┌───────▼──────────────────────────────────────────┴────────┐
│                   API GATEWAY / LOAD BALANCER               │
│  - Request validation                                      │
│  - Rate limiting                                           │
│  - Auth middleware                                         │
└───────┬──────────────────────────────────────────────────┘
        │
┌───────▼────────────────────────────────────────────────────┐
│                    EXPRESS.JS API LAYER                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Routes  │  │ Ride Routes  │  │ Admin Routes │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│  ┌──────▼──────────────────▼─────────────────▼──────┐      │
│  │           MIDDLEWARE LAYER                       │      │
│  │  - Error handling                                │      │
│  │  - Logging                                       │      │
│  │  - Request/Response formatting                   │      │
│  └──────────────────────────────────────────────────┘      │
└───────┬──────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Auth Service │  │ Ride Service │  │ Payment      │    │
│  │              │  │              │  │ Service      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Driver Match │  │ Fare Calc    │  │ Location     │    │
│  │ Service      │  │              │  │ Service      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────┬──────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ MongoDB ORM  │  │ Redis Cache  │  │ Elasticsearch│    │
│  │ (Mongoose)   │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────┬──────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Google Maps  │  │ Razorpay     │  │ Firebase     │    │
│  │              │  │ Payment      │  │ SMS/OTP      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────────────────────────────────────┘
```

---

## 🔌 Real-Time Communication (WebSocket)

### Socket.IO Event Architecture

```javascript
// Server-side Socket.IO setup
const io = require('socket.io')(server, {
  cors: { origin: process.env.FRONTEND_URL },
  transports: ['websocket', 'polling']
});

// Namespace architecture
const driverNamespace = io.of('/driver');
const riderNamespace = io.of('/rider');
const adminNamespace = io.of('/admin');

// Example: Driver location updates
driverNamespace.on('connection', (socket) => {
  // Authenticate
  socket.on('authenticate', (data) => {
    // Verify JWT token
    socket.driverId = data.driverId;
    socket.join(`driver:${data.driverId}`);
    socket.join('drivers:online'); // Global driver broadcast
  });

  // Update location
  socket.on('location-update', async (data) => {
    const { lat, lng, speed, bearing } = data;
    
    // Update in Redis for performance
    await redisClient.set(
      `driver:${socket.driverId}:location`,
      JSON.stringify({ lat, lng, speed, bearing, timestamp: Date.now() })
    );

    // Emit to rider on active ride
    const ride = await RideRequest.findOne({
      driverId: socket.driverId,
      status: 'in_transit'
    });

    if (ride) {
      riderNamespace.to(`rider:${ride.customerId}`).emit('driver-location-update', {
        driverLat: lat,
        driverLng: lng,
        speed,
        bearing,
        eta: calculateETA(data)
      });
    }
  });

  socket.on('disconnect', () => {
    // Update driver status
    Driver.updateOne(
      { userId: socket.driverId },
      { isOnline: false }
    );
  });
});
```

### Events Reference

```javascript
// RIDER EVENTS
'ride:requested'        // Ride booking initiated
'driver:assigned'       // Driver matched and assigned
'driver:arriving'       // Driver ETA < 2 mins
'trip:started'          // Driver picked up rider
'trip:completed'        // Ride finished
'ride:cancelled'        // Ride cancelled

// DRIVER EVENTS
'ride:request-received' // New ride offer
'ride:accepted'         // Ride accepted by driver
'trip:update'           // Real-time trip progress
'driver:online'         // Driver went online
'driver:offline'        // Driver went offline

// ADMIN EVENTS
'ride:metrics'          // Real-time ride metrics
'driver:alert'          // Driver alerts (fraud, suspension)
'system:alert'          // System-wide alerts
```

---

## 🗄️ Database Schema Design

### Collections & Indexes

```javascript
// RideRequest Collection
db.riderequests.createIndex({ "customerId": 1, "createdAt": -1 })
db.riderequests.createIndex({ "driverId": 1, "status": 1 })
db.riderequests.createIndex({ "status": 1, "createdAt": -1 })
db.riderequests.createIndex({ "pickup.lat": "2d", "pickup.lng": "2d" })

// Driver Collection
db.drivers.createIndex({ "currentLocation": "2dsphere" })
db.drivers.createIndex({ "isOnline": 1, "availabilityStatus": 1 })
db.drivers.createIndex({ "userId": 1 }, { unique: true })
db.drivers.createIndex({ "kycStatus": 1 })

// Rider Collection
db.riders.createIndex({ "userId": 1 }, { unique: true })
db.riders.createIndex({ "phone": 1 }, { unique: true })

// Payment Collection
db.payments.createIndex({ "rideId": 1 }, { unique: true })
db.payments.createIndex({ "customerId": 1, "createdAt": -1 })

// Rating Collection
db.ratings.createIndex({ "rideId": 1 }, { unique: true })
db.ratings.createIndex({ "driverId": 1, "createdAt": -1 })
db.ratings.createIndex({ "riderId": 1, "createdAt": -1 })
```

### Sharding Strategy

For scaling MongoDB at scale:

```javascript
// Shard by customerId / driverId for ride queries
db.riderequests.createIndex({ "customerId": 1 })
db.riderequests.createIndex({ "driverId": 1 })

// Shard by geographic location for geo-queries
db.drivers.createIndex({ "currentLocation": "2dsphere" })

// Time-based sharding for analytics
db.riderequests.createIndex({ "createdAt": 1 })
```

---

## 🚀 Queue & Job Processing

### BullMQ Job Queue Setup

```javascript
// queues/rideQueue.js
const Queue = require('bull');
const redis = require('redis');

const rideQueue = new Queue('rides', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Driver Matching Job
rideQueue.process('match-driver', 5, async (job) => {
  const { rideId } = job.data;
  
  // Find ride
  const ride = await RideRequest.findById(rideId);
  
  // Geo-spatial query for nearby drivers
  const availableDrivers = await Driver.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [ride.pickup.lng, ride.pickup.lat]
        },
        $maxDistance: 5000 // 5km
      }
    },
    isOnline: true,
    availabilityStatus: 'available',
    vehicleType: ride.vehicleType
  }).limit(5).sort({ rating: -1 });

  // Send requests to drivers
  for (const driver of availableDrivers) {
    await rideQueue.add('send-driver-request', {
      rideId,
      driverId: driver._id
    });
  }

  return { status: 'sent', driversCount: availableDrivers.length };
});

// Ride Timeout Job (cancel if no driver accepts in 30 sec)
rideQueue.process('ride-timeout', async (job) => {
  const { rideId } = job.data;
  
  const ride = await RideRequest.findById(rideId);
  
  if (ride.status === 'requested') {
    ride.status = 'cancelled';
    ride.cancelReason = 'No driver available';
    await ride.save();
    
    // Notify rider
    io.to(`rider:${ride.customerId}`).emit('ride:cancelled', {
      reason: 'No drivers available'
    });
  }
});

// Add job with delay
rideQueue.add('ride-timeout', { rideId }, {
  delay: 30000, // 30 seconds
  attempts: 1
});

module.exports = rideQueue;
```

### Job Processing Patterns

```javascript
// Pattern 1: Parallel Processing
const jobs = drivers.map(driver => 
  rideQueue.add('notify-driver', { rideId, driverId: driver._id })
);
await Promise.all(jobs);

// Pattern 2: Sequential Processing with Retries
rideQueue.add('payment-processing', { rideId }, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

// Pattern 3: Scheduled Jobs
rideQueue.add('send-reminder', { rideId }, {
  repeat: {
    pattern: '0 23 * * *' // Daily at 11 PM
  }
});
```

---

## 🛡️ Authentication & Authorization

### JWT Token Structure

```javascript
// Access Token (7 days)
{
  userId: "user_id",
  role: "rider|driver|admin",
  phone: "+91xxx",
  iat: timestamp,
  exp: timestamp + 7days
}

// Refresh Token (30 days)
{
  userId: "user_id",
  iat: timestamp,
  exp: timestamp + 30days,
  type: "refresh"
}
```

### Middleware Pattern

```javascript
// middleware/auth.js
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
```

### Usage in Routes

```javascript
// Only authenticated users
router.get('/rides', authenticate, getRides);

// Only riders
router.post('/rides/book', 
  authenticate, 
  authorize('rider'), 
  bookRide
);

// Admin only
router.get('/admin/dashboard', 
  authenticate, 
  authorize('admin'), 
  getAdminDashboard
);
```

---

## 💾 Caching Strategy

### Redis Usage Patterns

```javascript
// Pattern 1: Cache Aside (Lazy Loading)
const getDriver = async (driverId) => {
  // Check cache first
  const cached = await redis.get(`driver:${driverId}`);
  if (cached) return JSON.parse(cached);

  // Query database
  const driver = await Driver.findById(driverId);

  // Store in cache (1 hour expiry)
  await redis.setex(`driver:${driverId}`, 3600, JSON.stringify(driver));

  return driver;
};

// Pattern 2: Cache Update on Write
const updateDriver = async (driverId, updates) => {
  const driver = await Driver.findByIdAndUpdate(driverId, updates, { new: true });
  
  // Update cache
  await redis.setex(`driver:${driverId}`, 3600, JSON.stringify(driver));
  
  return driver;
};

// Pattern 3: Real-time Location Caching
const updateDriverLocation = async (driverId, lat, lng) => {
  // Fast write to Redis
  await redis.set(`driver:${driverId}:location`, JSON.stringify({
    lat, lng, timestamp: Date.now()
  }));

  // Batch write to MongoDB every 5 seconds
  locationUpdateQueue.add({
    driverId, lat, lng
  }, { delay: 5000 });
};

// Pattern 4: Rate Limiting
const checkRateLimit = async (userId, action, limit = 5, window = 60) => {
  const key = `rate:${userId}:${action}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  if (current > limit) {
    throw new Error('Rate limit exceeded');
  }
};
```

### Cache Invalidation

```javascript
// Invalidate on updates
const invalidateDriverCache = async (driverId) => {
  await redis.del([
    `driver:${driverId}`,
    `driver:${driverId}:location`,
    `driver:${driverId}:stats`
  ]);
};

// Cascade invalidation
const invalidateRideCache = async (rideId) => {
  const ride = await RideRequest.findById(rideId);
  
  // Invalidate both rider and driver caches
  await redis.del([
    `ride:${rideId}`,
    `driver:${ride.driverId}:active-ride`,
    `rider:${ride.customerId}:active-ride`
  ]);
};
```

---

## 🔄 Async Processing Patterns

### Event-Driven Architecture

```javascript
// EventEmitter for internal events
const EventEmitter = require('events');
const rideEvents = new EventEmitter();

// Ride completion triggers multiple async tasks
rideEvents.on('ride:completed', async (rideData) => {
  // Task 1: Calculate earnings
  await EarningsService.calculateRideEarnings(rideData);

  // Task 2: Send receipts
  await NotificationService.sendReceipt(rideData);

  // Task 3: Update statistics
  await AnalyticsService.updateRideStats(rideData);

  // Task 4: Trigger payment
  await PaymentService.processPayment(rideData);
});

// Emit event when ride completes
rideEvents.emit('ride:completed', { rideId, customerId, driverId });
```

### Message Queue Patterns

```javascript
// Publish-Subscribe Pattern
const amqp = require('amqplib');

// Publisher
const publishRideEvent = async (eventType, data) => {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertExchange('rides', 'topic', { durable: true });
  channel.publish(
    'rides',
    `ride.${eventType}`,
    Buffer.from(JSON.stringify(data))
  );
};

// Subscriber
const subscribeToRideEvents = async () => {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertExchange('rides', 'topic', { durable: true });
  const q = await channel.assertQueue('ride-processor');
  
  channel.bindQueue(q.queue, 'rides', 'ride.*');
  
  channel.consume(q.queue, async (msg) => {
    const { eventType, data } = JSON.parse(msg.content.toString());
    
    if (eventType === 'completed') {
      await handleRideCompletion(data);
    }
  });
};
```

---

## 🗺️ Geospatial Queries

### Driver Matching Implementation

```javascript
// Find drivers within radius sorted by rating
const findNearbyDrivers = async (pickup, radius = 5000) => {
  return await Driver.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [pickup.lng, pickup.lat]
        },
        distanceField: 'distance',
        maxDistance: radius,
        spherical: true,
        query: {
          isOnline: true,
          availabilityStatus: 'available'
        }
      }
    },
    { $sort: { rating: -1 } },
    { $limit: 10 }
  ]);
};

// Hexagonal grid for heatmaps (future)
const getHotspots = async () => {
  return await RideRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          lat: {
            $round: [{ $multiply: ['$pickup.lat', 100] }, 0]
          },
          lng: {
            $round: [{ $multiply: ['$pickup.lng', 100] }, 0]
          }
        },
        count: { $sum: 1 },
        avgFare: { $avg: '$estimatedFare' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};
```

---

## 🔐 Error Handling & Logging

### Centralized Error Handler

```javascript
// utils/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error
  logger.error({
    timestamp: new Date(),
    userId: req.userId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  // Mongoose duplicate key error
  if (err.code === 11000) {
    err.message = `${Object.keys(err.keyValue)[0]} already exists`;
    err.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.message = 'Invalid token';
    err.statusCode = 401;
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Usage
router.post('/ride/book', async (req, res, next) => {
  try {
    // ... booking logic
  } catch (error) {
    next(new AppError('Booking failed', 400));
  }
});
```

### Structured Logging

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Log levels
logger.info('Ride matched', { rideId, driverId, distance });
logger.warn('High surge detected', { surge: 2.5, zone: 'downtown' });
logger.error('Payment failed', { rideId, error: err.message });
```

---

## ✅ Testing Strategy

### Unit Tests Example

```javascript
// tests/fareCalculation.test.js
const FareCalculationService = require('../services/FareCalculationService');

describe('FareCalculationService', () => {
  test('should calculate fare for bike ride', () => {
    const fare = FareCalculationService.estimateFare('bike', 10);
    
    expect(fare.baseFare).toBe(28);
    expect(fare.distanceFare).toBe(60); // 10 * 6
    expect(fare.total).toBeGreaterThan(28);
  });

  test('should apply surge pricing', () => {
    let fare = FareCalculationService.estimateFare('auto', 5);
    fare = FareCalculationService.applySurge(fare, 1.5);
    
    expect(fare.surgeFactor).toBe(1.5);
    expect(fare.total).toBeGreaterThan(83.65); // base amount * 1.5
  });

  test('should apply coupon discount', () => {
    const fare = FareCalculationService.estimateFare('sedan', 5);
    const coupon = { code: 'SAVE10', discountType: 'percentage', discountValue: 10 };
    const discounted = FareCalculationService.applyCoupon(fare, coupon);
    
    expect(discounted.discount).toBeGreaterThan(0);
    expect(discounted.total).toBeLessThan(fare.total);
  });
});
```

### Integration Tests Example

```javascript
// tests/rideBooking.integration.test.js
describe('Ride Booking Flow', () => {
  beforeEach(async () => {
    await RideRequest.deleteMany({});
    await Driver.deleteMany({});
  });

  test('should book ride successfully', async () => {
    // Create test driver
    const driver = await Driver.create({
      userId: 'driver1',
      vehicleNumber: 'KL01AB1234',
      vehicleType: 'auto',
      currentLocation: {
        type: 'Point',
        coordinates: [76.2859, 10.3157] // Kochi
      },
      isOnline: true
    });

    // Book ride
    const response = await request(app)
      .post('/api/ridesharing/rides/book')
      .set('Authorization', 'Bearer token')
      .send({
        rideType: 'auto',
        pickup: { address: 'Kakkanad', lat: 10.3157, lng: 76.2859 },
        destination: { address: 'MG Road', lat: 10.2342, lng: 76.2674 }
      });

    expect(response.status).toBe(200);
    expect(response.body.rideId).toBeDefined();
  });
});
```

---

## 📈 Performance Optimization

### Query Optimization

```javascript
// ❌ Bad: N+1 query problem
const rides = await RideRequest.find({ status: 'completed' });
for (const ride of rides) {
  const driver = await Driver.findById(ride.driverId); // N queries!
}

// ✅ Good: Use populate
const rides = await RideRequest.find({ status: 'completed' })
  .populate('driverId')
  .populate('customerId')
  .select('pickup destination fare'); // Select only needed fields

// ✅ Best: Aggregation pipeline for complex queries
const stats = await RideRequest.aggregate([
  { $match: { createdAt: { $gte: new Date('2024-01-01') } } },
  { $group: {
    _id: '$driverId',
    totalRides: { $sum: 1 },
    totalFare: { $sum: '$fare' },
    avgRating: { $avg: '$driverRating' }
  }},
  { $sort: { totalRides: -1 } },
  { $limit: 10 }
]);
```

### Connection Pooling

```javascript
// mongoose connection with pool
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 45000
});

// Redis connection pooling
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  max_clients: 30,
  perform_checks: true,
  database: 0
});
```

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] Redis cache warmed
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Monitoring setup (Datadog/New Relic)
- [ ] Error tracking (Sentry)
- [ ] CDN configured for static assets
- [ ] Backup strategy configured
- [ ] Health check endpoints working
- [ ] CORS configured properly
- [ ] Security headers added
- [ ] API documentation deployed

---

**This architectural guide will be expanded with each phase implementation.**
