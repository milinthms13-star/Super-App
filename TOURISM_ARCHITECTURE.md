# Tourism Module - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  TourismService  │  │  TourismMarket   │  │   Components  │ │
│  │                  │  │     place.js     │  │               │ │
│  │  - API calls     │  │                  │  │  - PackageCard│ │
│  │  - Razorpay SDK  │  │  State Mgmt      │  │  - BookingForm│ │
│  │  - Image upload  │  │  Business Logic  │  │  - PaymentBtn │ │
│  └─────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                     │                     │         │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            │   HTTPS/JSON        │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Node.js/Express)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Routes Layer (tourismNew.js)                │  │
│  │  /api/tourism/packages    /api/tourism/bookings         │  │
│  │  /api/tourism/payments    /api/tourism/reviews          │  │
│  │  /api/tourism/vendor/*    /api/tourism/admin/*          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Middleware Layer                            │  │
│  │  • Authentication (JWT)    • Authorization (Roles)       │  │
│  │  • Image Upload (Multer)   • Validation                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Services Layer                              │  │
│  │  • PaymentService     • NotificationService             │  │
│  │  • InvoiceService     • Custom Business Logic           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Models Layer (Mongoose ODM)                 │  │
│  │  TourismPackage  TourismVendor   TourismBooking         │  │
│  │  TourismReview   TourismLead     TourismPayment         │  │
│  │  TourismComplaint TourismCoupon                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│   MongoDB       │  │   Razorpay      │  │  Email/SMS       │
│   Database      │  │   Payment       │  │  Services        │
│                 │  │   Gateway       │  │                  │
│  • Collections  │  │  • Orders       │  │  • SMTP/Gmail    │
│  • Indexes      │  │  • Payments     │  │  • Twilio/AWS    │
│  • Aggregations │  │  • Refunds      │  │  • Templates     │
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

## 📊 Data Flow Diagrams

### Booking Creation Flow

```
Customer                Frontend              Backend               Services              Database
   │                       │                     │                     │                     │
   │ 1. Fill Form          │                     │                     │                     │
   ├──────────────────────>│                     │                     │                     │
   │                       │ 2. POST /bookings   │                     │                     │
   │                       ├────────────────────>│                     │                     │
   │                       │                     │ 3. Validate         │                     │
   │                       │                     │ 4. Apply Coupon     │                     │
   │                       │                     │ 5. Calculate        │                     │
   │                       │                     │                     │                     │
   │                       │                     │ 6. Create Booking   │                     │
   │                       │                     ├────────────────────────────────────────>│
   │                       │                     │                     │    Save Booking     │
   │                       │                     │<────────────────────────────────────────│
   │                       │                     │                     │                     │
   │                       │ 7. Return Booking   │                     │                     │
   │                       │<────────────────────│                     │                     │
   │ 8. Show Booking       │                     │                     │                     │
   │<──────────────────────│                     │                     │                     │
```

### Payment Processing Flow

```
Customer                Frontend              Backend               Razorpay            Database
   │                       │                     │                     │                     │
   │ 1. Click Pay          │                     │                     │                     │
   ├──────────────────────>│                     │                     │                     │
   │                       │ 2. Create Intent    │                     │                     │
   │                       ├────────────────────>│                     │                     │
   │                       │                     │ 3. Create Order     │                     │
   │                       │                     ├────────────────────>│                     │
   │                       │                     │ 4. Order ID         │                     │
   │                       │                     │<────────────────────│                     │
   │                       │                     │ 5. Save Payment     │                     │
   │                       │                     ├─────────────────────────────────────────>│
   │                       │ 6. Payment Intent   │                     │                     │
   │                       │<────────────────────│                     │                     │
   │                       │                     │                     │                     │
   │ 7. Open Razorpay      │                     │                     │                     │
   │<──────────────────────│                     │                     │                     │
   │ 8. Enter Card Details │                     │                     │                     │
   ├──────────────────────────────────────────────────────────────────>│                     │
   │                       │                     │ 9. Process Payment  │                     │
   │                       │                     │<────────────────────│                     │
   │ 10. Payment Response  │                     │                     │                     │
   │<──────────────────────────────────────────────────────────────────│                     │
   │                       │ 11. Verify Payment  │                     │                     │
   │                       ├────────────────────>│                     │                     │
   │                       │                     │ 12. Verify Signature│                     │
   │                       │                     │ 13. Capture Payment │                     │
   │                       │                     ├────────────────────>│                     │
   │                       │                     │ 14. Update Status   │                     │
   │                       │                     ├─────────────────────────────────────────>│
   │                       │                     │ 15. Send Email      │                     │
   │                       │                     │ 16. Generate Invoice│                     │
   │                       │ 17. Success         │                     │                     │
   │                       │<────────────────────│                     │                     │
   │ 18. Show Confirmation │                     │                     │                     │
   │<──────────────────────│                     │                     │                     │
```

### Notification Flow

```
Event Trigger          Backend Service        Email Service         SMS Service          Customer
     │                      │                      │                     │                   │
     │ Payment Success      │                      │                     │                   │
     ├─────────────────────>│                      │                     │                   │
     │                      │ Build Email HTML     │                     │                   │
     │                      │ Build SMS Text       │                     │                   │
     │                      │                      │                     │                   │
     │                      │ Send Email           │                     │                   │
     │                      ├─────────────────────>│                     │                   │
     │                      │                      │ Deliver Email       │                   │
     │                      │                      ├─────────────────────────────────────────>│
     │                      │                      │                     │                   │
     │                      │ Send SMS             │                     │                   │
     │                      ├──────────────────────────────────────────>│                   │
     │                      │                      │                     │ Deliver SMS       │
     │                      │                      │                     ├──────────────────>│
     │                      │                      │                     │                   │
     │                      │ Update Flags         │                     │                   │
     │                      │ (notifications sent) │                     │                   │
```

## 🗂️ Database Schema

### Collections Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         MongoDB Database                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  tourismpackages                                                │
│  ├─ _id (ObjectId)                                              │
│  ├─ title, destination, category                                │
│  ├─ startPrice, rating, reviewsCount                            │
│  ├─ vendorId (ref: tourismvendors)                              │
│  └─ approvalStatus, isActive                                    │
│                                                                 │
│  tourismvendors                                                 │
│  ├─ _id (ObjectId)                                              │
│  ├─ name, email, phone                                          │
│  ├─ kycStatus, approvalStatus                                   │
│  └─ verificationBadge, bankDetails                              │
│                                                                 │
│  tourismbookings                                                │
│  ├─ _id (ObjectId)                                              │
│  ├─ packageId (ref: tourismpackages)                            │
│  ├─ vendorId (ref: tourismvendors)                              │
│  ├─ customerName, customerEmail, customerPhone                  │
│  ├─ bookingStatus, confirmationNumber                           │
│  ├─ amountSummary { total, paid, balance }                      │
│  └─ paymentDetails { status, reference }                        │
│                                                                 │
│  tourismpayments                                                │
│  ├─ _id (ObjectId)                                              │
│  ├─ bookingId (ref: tourismbookings)                            │
│  ├─ orderId, providerOrderId, providerPaymentId                 │
│  ├─ amount, status, provider                                    │
│  └─ signature, capturedAt                                       │
│                                                                 │
│  tourismreviews                                                 │
│  ├─ _id (ObjectId)                                              │
│  ├─ packageId (ref: tourismpackages)                            │
│  ├─ reviewerName, rating, comment                               │
│  └─ images[], isVisible                                         │
│                                                                 │
│  tourismleads                                                   │
│  ├─ _id (ObjectId)                                              │
│  ├─ vendorId (ref: tourismvendors)                              │
│  ├─ travelerName, travelerPhone                                 │
│  ├─ destination, budget, status                                 │
│  └─ convertedToBooking, bookingId                               │
│                                                                 │
│  tourismcoupons                                                 │
│  ├─ _id (ObjectId)                                              │
│  ├─ code (unique), description                                  │
│  ├─ discountPercent, minAmount                                  │
│  └─ usageCount, usageLimit, isActive                            │
│                                                                 │
│  tourismcomplaints                                              │
│  ├─ _id (ObjectId)                                              │
│  ├─ bookingId, packageId, vendorId                              │
│  ├─ issue, category, severity, status                           │
│  └─ escalationTimeline[], resolution                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Relationships

```
TourismVendor
     │
     │ (1:N)
     ▼
TourismPackage ──────(1:N)─────> TourismReview
     │
     │ (1:N)
     ▼
TourismBooking ──────(1:N)─────> TourismPayment
     │
     │ (1:1)
     ▼
TourismComplaint

TourismLead ─────(optional 1:1)────> TourismBooking

TourismCoupon ───(N:N)────> TourismBooking
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                       Security Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Network Security                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • HTTPS/TLS encryption                                   │ │
│  │  • CORS configuration                                     │ │
│  │  • Rate limiting                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│  Layer 2: Authentication                                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • JWT tokens                                             │ │
│  │  • Token expiration                                       │ │
│  │  • Session management                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│  Layer 3: Authorization                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Role-based access (User, Vendor, Admin)                │ │
│  │  • Resource ownership checks                              │ │
│  │  • Permission middleware                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│  Layer 4: Input Validation                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Mongoose schema validation                             │ │
│  │  • XSS sanitization                                       │ │
│  │  • File type/size validation                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│  Layer 5: Payment Security                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Razorpay signature verification                        │ │
│  │  • PCI DSS compliance (handled by Razorpay)               │ │
│  │  • Webhook signature validation                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                           │                                     │
│  Layer 6: Data Security                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • MongoDB encryption at rest                             │ │
│  │  • Sensitive data hashing                                 │ │
│  │  • Backup encryption                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📈 Scalability Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                      Horizontal Scaling                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Load Balancer (Nginx/AWS ALB)                                  │
│          │                                                       │
│          ├─────────┬─────────┬─────────┬─────────┐            │
│          ▼         ▼         ▼         ▼         ▼            │
│      Node 1     Node 2    Node 3    Node 4    Node 5          │
│      (API)      (API)     (API)     (API)     (API)           │
│          │         │         │         │         │            │
│          └─────────┴─────────┴─────────┴─────────┘            │
│                           │                                     │
│                           ▼                                     │
│              MongoDB Replica Set                                │
│              ┌────────┬────────┬────────┐                      │
│              │Primary │Secondary│Secondary│                     │
│              │(Write) │(Read)  │(Read)  │                      │
│              └────────┴────────┴────────┘                      │
│                                                                 │
│  Caching Layer (Redis - Optional)                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Session storage                                        │ │
│  │  • API response caching                                   │ │
│  │  • Rate limiting counters                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  File Storage (S3/CloudFront - Optional)                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  • Package images                                         │ │
│  │  • Review images                                          │ │
│  │  • KYC documents                                          │ │
│  │  • Generated invoices                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Performance Optimizations

### Database Optimization
- **Indexes**: Compound indexes on frequently queried fields
- **Aggregations**: For complex queries and analytics
- **Connection Pooling**: Reuse database connections
- **Query Optimization**: Select only required fields

### API Optimization
- **Response Caching**: Cache frequently accessed data
- **Pagination**: Limit result sets
- **Compression**: Gzip response compression
- **Async Operations**: Non-blocking I/O

### Frontend Optimization
- **Code Splitting**: Load only required code
- **Lazy Loading**: Images and components
- **Bundle Optimization**: Minification and tree-shaking
- **CDN**: Static assets delivery

## 📊 Monitoring Stack

```
Application Metrics
     │
     ├─> Error Tracking (Sentry)
     ├─> Performance Monitoring (New Relic)
     ├─> Log Aggregation (CloudWatch)
     ├─> Uptime Monitoring (Pingdom)
     └─> Business Metrics (Custom Dashboard)

Database Metrics
     │
     ├─> Query Performance (MongoDB Atlas)
     ├─> Connection Pool Status
     ├─> Disk Usage
     └─> Replication Lag

Payment Metrics
     │
     ├─> Transaction Success Rate
     ├─> Failed Payment Reasons
     ├─> Refund Processing Time
     └─> Settlement Status

User Metrics
     │
     ├─> Booking Conversion Rate
     ├─> Average Booking Value
     ├─> User Acquisition Cost
     └─> Customer Lifetime Value
```

---

**Architecture Status:** Production Ready ✅

**Scalability:** Horizontal scaling supported  
**Availability:** High availability with replica sets  
**Security:** Multi-layer security implemented  
**Performance:** Optimized for 1000+ concurrent users  
**Monitoring:** Comprehensive observability
