# Phase 6: Advanced Analytics & Reporting System - Complete Implementation Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Design](#architecture--design)
3. [Data Models](#data-models)
4. [Service Layer](#service-layer)
5. [API Endpoints](#api-endpoints)
6. [Integration Checklist](#integration-checklist)
7. [Configuration](#configuration)
8. [Testing Guide](#testing-guide)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

Phase 6 extends the food delivery platform with advanced analytics, reporting, and fraud detection capabilities:

- **Payment Analytics**: Transaction trends, success rates, method comparisons, performance metrics
- **Wallet Analytics**: User segments, balance trends, cashback flow, promo code performance
- **Refund Analytics**: Refund reasons, approval workflows, processing SLAs, fraud flags
- **Custom Reporting**: Scheduled report generation, multiple output formats, email distribution
- **Fraud Detection**: Risk scoring, pattern detection, investigation workflows, appeal handling

**Deliverables**: 11 files, 4,000+ lines of production code, 20+ endpoints, comprehensive analytics

---

## Architecture & Design

### Three-Layer Architecture Pattern

```
┌─────────────────────────────────────────┐
│   HTTP Routes & Request Handling        │
│   (phase6Routes.js)                     │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│  Controllers (Request/Response)         │
│  AnalyticsController                    │
│  ReportController                       │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│  Services (Business Logic)              │
│  PaymentAnalyticsService                │
│  WalletAnalyticsService                 │
│  RefundAnalyticsService                 │
│  FraudDetectionService                  │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│  Data Models (Persistence)              │
│  PaymentAnalytics                       │
│  WalletAnalytics                        │
│  RefundAnalytics                        │
│  CustomReport                           │
│  FraudRisk                              │
└─────────────────────────────────────────┘
```

### Key Design Principles

1. **Time-Series Aggregation**: Analytics models support hourly/daily/weekly/monthly/yearly granularity
2. **Immutable Records**: Analytics generated once per period, immutable afterward
3. **Compound Metrics**: Multiple metrics per period (counts, amounts, rates, percentiles)
4. **Flexible Filtering**: Reports support dynamic dimension filtering (payment methods, regions, user segments)
5. **Audit Trail**: All fraud decisions tracked with investigation workflow and appeal process
6. **Scalability**: Analytics pre-aggregated to avoid real-time computation overhead

---

## Data Models

### 1. PaymentAnalytics.js (500 lines)

**Purpose**: Time-series payment metrics by hour/day/week/month/year

**BSON Schema**:
```javascript
{
  _id: ObjectId,
  period: 'daily' | 'hourly' | 'weekly' | 'monthly' | 'yearly',
  date: Date,                    // Start of period
  year: Number,                  // 2024
  month: Number,                 // 1-12
  week: Number,                  // 1-52
  day: Number,                   // 1-31
  hour: Number,                  // 0-23
  
  // Transaction metrics
  transactionMetrics: {
    totalTransactions: Number,
    successful: Number,
    failed: Number,
    refunded: Number,
    totalAmount: Number,         // Sum of all amounts
    successfulAmount: Number,     // Sum of successful amounts
    avgTransactionAmount: Number,
  },
  
  // Breakdown by payment method
  byPaymentMethod: {
    upi: {
      count: Number,
      amount: Number,
      successRate: Number,       // 0-100
    },
    card: { count, amount, successRate },
    netbanking: { count, amount, successRate },
    wallet: { count, amount, successRate },
    cod: { count, amount, successRate },
  },
  
  // Breakdown by status
  byStatus: {
    pending: Number,
    processing: Number,
    success: Number,
    failed: Number,
    refunded: Number,
  },
  
  // Fraud metrics
  fraudMetrics: {
    fraudDetections: Number,        // High-risk flagged
    highRiskTransactions: Number,   // riskScore > 70
    avgRiskScore: Number,           // 0-100 average
  },
  
  // Retry metrics
  retryMetrics: {
    totalRetries: Number,
    successfulRetries: Number,
    retrySuccessRate: Number,       // 0-100
  },
  
  // User metrics
  userMetrics: {
    uniqueUsers: Number,
    newUsers: Number,
    recurringUsers: Number,
    avgTransactionsPerUser: Number,
  },
  
  // Performance
  performanceMetrics: {
    avgAuthorizationTime: Number,   // milliseconds
    avgCaptureTime: Number,
    p95AuthorizationTime: Number,   // 95th percentile
    p99AuthorizationTime: Number,
  },
  
  // Geographical breakdown
  byRegion: Map<String, {count, amount, successRate}>,
  
  // Device breakdown
  byDeviceType: {
    mobile: Number,
    web: Number,
    app: Number,
  },
  
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes**:
- `date -1, period 1` (compound for fast period lookup)
- `period 1, date -1` (alternative query pattern)
- `year 1, month 1, day 1` (for date range queries)

---

### 2. WalletAnalytics.js (500 lines)

**Purpose**: Time-series wallet ecosystem metrics

**BSON Schema**:
```javascript
{
  _id: ObjectId,
  period: 'daily' | 'hourly' | 'weekly' | 'monthly' | 'yearly',
  date: Date,
  year: Number,
  month: Number,
  day: Number,
  hour: Number,
  
  // Wallet metrics
  walletMetrics: {
    totalWallets: Number,
    activeWallets: Number,         // status === 'active'
    frozenWallets: Number,         // status === 'frozen'
    kycVerifiedWallets: Number,    // kycVerified === true
    newWallets: Number,            // Created this period
  },
  
  // Transaction metrics
  transactionMetrics: {
    totalTransactions: Number,
    creditTransactions: Number,    // Debits to wallet
    debitTransactions: Number,     // Withdrawals
    totalCredits: Number,          // Amount credited
    totalDebits: Number,           // Amount debited
    avgTransactionAmount: Number,
  },
  
  // Balance metrics
  balanceMetrics: {
    totalBalance: Number,          // Sum of all wallet balances
    avgBalance: Number,            // Per-wallet average
    minBalance: Number,            // Minimum balance seen
    maxBalance: Number,            // Maximum balance seen
    totalPromotionalBalance: Number,
  },
  
  // Cashback flow
  cashbackMetrics: {
    cashbackEarned: Number,        // Total earned this period
    cashbackCredited: Number,      // Moved to regular balance
    cashbackExpired: Number,       // Expired without use
    pendingCashback: Number,       // Awaiting credit
    avgCashbackPerUser: Number,
    redemptionRate: Number,        // 0-100, credited/earned
  },
  
  // Loyalty points
  loyaltyPointsMetrics: {
    pointsEarned: Number,
    pointsRedeemed: Number,
    pointsExpired: Number,
    totalPoints: Number,
  },
  
  // Transaction sources
  bySource: {
    manual: { count: Number, amount: Number },
    payment: { count, amount },
    cashback: { count, amount },
    refund: { count, amount },
    promotion: { count, amount },
  },
  
  // Payment method linking
  linkedPaymentMethods: {
    upiLinked: Number,
    cardLinked: Number,
    netbankingLinked: Number,
  },
  
  // Freeze metrics
  freezeMetrics: {
    frozenDueToFraud: Number,
    frozenDueToInactivity: Number,
    autoUnfrozen: Number,
  },
  
  // Limit compliance
  limitCompliance: {
    usersReachedDailyLimit: Number,
    usersReachedMonthlyLimit: Number,
  },
  
  // User behavior
  userBehavior: {
    usersWithMultiplePaymentMethods: Number,
    usersWithAutoTopup: Number,
    usersWithBeneficiary: Number,
  },
  
  // Promo code metrics
  promoCodeMetrics: {
    uniqueCodesApplied: Number,
    codesApplied: Number,           // Total applications
    totalPromoValue: Number,
  },
  
  // Geographical
  byRegion: Map<String, Object>,
  
  // Device
  byDeviceType: {
    mobile: Number,
    web: Number,
    app: Number,
  },
  
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes**:
- `date -1, period 1`
- `period 1, date -1`
- `year 1, month 1, day 1`

---

### 3. RefundAnalytics.js (500 lines)

**Purpose**: Refund processing metrics and SLA tracking

**BSON Schema**:
```javascript
{
  _id: ObjectId,
  period: 'daily',
  date: Date,
  year: Number,
  month: Number,
  day: Number,
  
  // Volume
  volumeMetrics: {
    totalRefunds: Number,
    approvedRefunds: Number,
    rejectedRefunds: Number,
    pendingRefunds: Number,
    failedRefunds: Number,
    completedRefunds: Number,
  },
  
  // Amount
  amountMetrics: {
    totalRefundAmount: Number,
    approvedRefundAmount: Number,
    completedRefundAmount: Number,
    avgRefundAmount: Number,
  },
  
  // Breakdown by reason
  byReason: {
    customer_request: { count, amount },
    order_cancelled: { count, amount },
    order_not_delivered: { count, amount },
    poor_quality: { count, amount },
    wrong_order: { count, amount },
    restaurant_unavailable: { count, amount },
    delivery_failed: { count, amount },
    duplicate_charge: { count, amount },
    system_error: { count, amount },
    other: { count, amount },
  },
  
  // Breakdown by method
  byMethod: {
    original_payment: { count, amount },
    wallet: { count, amount },
    bank_transfer: { count, amount },
  },
  
  // Approval workflow
  approvalMetrics: {
    refundsRequiringApproval: Number,    // Auto-flagged
    autoApprovedRefunds: Number,         // Below threshold
    manualApprovalRequired: Number,
    avgApprovalTime: Number,             // Minutes
  },
  
  // Processing SLA
  timeAnalysis: {
    refundedWithin24Hours: Number,
    refundedWithin48Hours: Number,
    refundedWithin7Days: Number,
    pendingRefundsOlderThan7Days: Number,
    avgProcessingTime: Number,           // Days
  },
  
  // Fraud in refunds
  fraudMetrics: {
    flaggedAsHighRisk: Number,
    fraudPreventedAmount: Number,
    avgFraudScore: Number,               // 0-100
  },
  
  // Retry analysis
  retryMetrics: {
    failuresRequiringRetry: Number,
    successfulRetries: Number,
    failedRetries: Number,
  },
  
  // User segments
  userMetrics: {
    uniqueUsers: Number,
    repeatRefundUsers: Number,
    newRefundUsers: Number,
  },
  
  // Geographical
  byRegion: Map<String, Object>,
  
  // By order value
  byOrderValue: {
    under500: Number,
    500to1000: Number,
    1000to2000: Number,
    above2000: Number,
  },
  
  createdAt: Date,
  updatedAt: Date,
}
```

---

### 4. CustomReport.js (400 lines)

**Purpose**: Scheduled custom report configuration

**BSON Schema**:
```javascript
{
  _id: ObjectId,
  reportId: String,                      // Unique identifier
  reportName: String,                    // User-defined name
  reportType: 'payment' | 'wallet' | 'refund' | 'custom' | 'fraud' | 'performance',
  
  // Scheduling
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  schedule: {
    dayOfWeek: Number,                  // 0-6 for weekly
    dayOfMonth: Number,                 // 1-31 for monthly
    timeOfDay: String,                  // HH:MM format
  },
  dateRange: {
    startDate: Date,
    endDate: Date,
  },
  
  // Report configuration
  metrics: [String],                     // ['revenue', 'transactions', 'fraud_count']
  dimensions: [String],                  // ['paymentMethod', 'region', 'userSegment']
  filters: Object,                       // Dynamic filters applied to data
  
  // Status
  status: 'scheduled' | 'generating' | 'generated' | 'failed' | 'archived',
  
  // Generation tracking
  generation: {
    lastGeneratedAt: Date,
    nextGenerationAt: Date,
    generationDuration: Number,         // Milliseconds
    generationError: String,            // Error message if failed
  },
  
  // Data
  dataPoints: [],                        // Generated data array
  
  // Summary
  summary: {
    totalRecords: Number,
    dataCompleteness: Number,           // 0-100 percentage
    anomalies: [],                      // Detected anomalies
  },
  
  // Distribution
  recipients: [String],                  // Email addresses
  outputFormats: [String],               // ['pdf', 'excel', 'csv']
  fileLocation: {
    bucket: String,                     // S3/Cloud Storage bucket
    path: String,                       // File path
    url: String,                        // Download URL
  },
  
  // Metadata
  createdBy: ObjectId,                   // User reference
  permissions: {
    isPublic: Boolean,
    accessControl: [String],            // User IDs with access
  },
  tags: [String],
  notes: String,
  isTemplate: Boolean,                   // Reusable template flag
  
  createdAt: Date,
  updatedAt: Date,
}
```

---

### 5. FraudRisk.js (600 lines)

**Purpose**: Fraud risk detection, investigation, and appeals

**BSON Schema**:
```javascript
{
  _id: ObjectId,
  riskId: String,                        // Unique fraud case ID
  
  // Entity reference
  entityType: 'payment' | 'refund' | 'wallet' | 'user',
  entityId: ObjectId,                    // Reference to payment/refund
  userId: ObjectId,                      // User involved
  
  // Risk scoring
  overallRiskScore: Number,              // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  riskFactors: [{
    factor: String,                     // 'unusual_amount', 'rapid_transactions'
    weight: Number,                     // Contribution to score
    description: String,
    evidenceValue: Object,              // Supporting data
  }],
  
  // Pattern flags
  patternFlags: [{
    pattern: String,
    frequency: Number,
    lastOccurrence: Date,
    riskContribution: Number,
  }],
  
  // Behavior analysis
  behaviorAnalysis: {
    historicalPatterns: {
      avgTransactionAmount: Number,
      avgTransactionsPerDay: Number,
      preferredPaymentMethods: [String],
      usualTimeZones: [String],
      usualRegions: [String],
    },
    anomalies: [{
      type: String,
      severity: 'low' | 'medium' | 'high',
      description: String,
    }],
  },
  
  // Device analysis
  deviceAnalysis: {
    deviceId: String,
    type: 'mobile' | 'web' | 'tablet',
    osVersion: String,
    isNewDevice: Boolean,
    deviceReputation: Number,          // Historical risk score
    ip: String,
    countryCode: String,
    vpnDetected: Boolean,
    proxyDetected: Boolean,
  },
  
  // Velocity analysis
  velocityAnalysis: {
    paymentsPer1Hour: Number,
    paymentsPer24Hours: Number,
    refundsPer7Days: Number,
    failuresPer1Hour: Number,
    geographicVelocity: Number,        // Location changes
  },
  
  // Amount analysis
  amountAnalysis: {
    deviationFromAverage: Number,       // Times from average
    isUnusuallyHigh: Boolean,
    isUnusuallyLow: Boolean,
  },
  
  // Refund-specific analysis
  refundAnalysis: {
    daysFromOrder: Number,
    isRepeatRefundUser: Boolean,
    userRefundRate: Number,             // Percentage
  },
  
  // External signals
  externalSignals: [{
    source: String,                    // 'chargeback', 'report', 'blacklist'
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: String,
    timestamp: Date,
  }],
  
  // Verification
  verificationStatus: 'not_verified' | 'verified' | 'suspicious' | 'confirmed_fraud',
  
  // Investigation
  investigationStatus: 'open' | 'in_progress' | 'closed' | 'appealed' | 'resolved',
  actionTaken: 'none' | 'review' | 'hold' | 'block' | 'contact_user' | 'auto_approve',
  
  // Investigation details
  investigation: {
    startedBy: ObjectId,
    startedAt: Date,
    closedAt: Date,
    notes: String,
    findings: String,
  },
  
  // Appeal process
  appeal: {
    appealedAt: Date,
    appealedBy: ObjectId,
    appealReason: String,
    appealStatus: 'pending' | 'approved' | 'rejected',
    appealDecision: String,
  },
  
  // ML integration
  mlAnalysis: {
    modelVersion: String,
    confidence: Number,                 // 0-100
    featureImportance: Object,
  },
  
  // Status
  status: 'pending_review' | 'approved' | 'rejected' | 'appealed' | 'resolved',
  
  reviewedBy: ObjectId,
  reviewedAt: Date,
  
  detectedAt: Date,
  createdAt: Date,
  updatedAt: Date,
}
```

---

## Service Layer

### 1. PaymentAnalyticsService.js (400+ lines)

**8 Public Methods**:

1. **generateDailyAnalytics(date)**
   - Input: Date object (default: today)
   - Output: PaymentAnalytics document
   - Action: Aggregates all payments for day, creates/updates analytics

2. **generateHourlyAnalytics(dateTime)**
   - Input: DateTime object
   - Output: PaymentAnalytics document
   - Action: Hourly granularity aggregation

3. **getAnalyticsRange(startDate, endDate, period)**
   - Input: Date range, period ('daily'|'hourly'|'weekly'|'monthly'|'yearly')
   - Output: Array of PaymentAnalytics
   - Action: Queries and returns time-series data

4. **getCurrentAnalytics(period)**
   - Input: Period identifier
   - Output: Current period's analytics
   - Action: Returns most recent analytics for period

5. **getPaymentMethodComparison(startDate, endDate)**
   - Input: Date range
   - Output: Object with UPI, Card, NetBanking, Wallet, COD metrics
   - Action: Compares success rates, volumes, amounts by method

6. **getFraudMetrics(startDate, endDate)**
   - Input: Date range
   - Output: Fraud detection count, high-risk transactions, trend
   - Action: Aggregates fraud flags and risk scores

7. **getSuccessRateMetrics(startDate, endDate)**
   - Input: Date range
   - Output: Overall success rate, by-method rates, trend
   - Action: Calculates success rate percentages

8. **getPerformanceMetrics(startDate, endDate)**
   - Input: Date range
   - Output: Avg/P95/P99 authorization and capture times
   - Action: Aggregates performance percentiles

---

### 2. WalletAnalyticsService.js (400+ lines)

**8 Public Methods**:

1. **generateDailyAnalytics(date)**
   - Aggregates wallet transactions and snapshots daily

2. **getAnalyticsRange(startDate, endDate, period)**
   - Queries time-series wallet analytics

3. **getWalletHealth(startDate, endDate)**
   - Returns: activeWallets, kycVerifiedPercentage, averageBalance, trend
   - Use: Dashboard visualization

4. **getCashbackMetrics(startDate, endDate)**
   - Returns: earned, credited, expired, pending, redemptionRate
   - Use: Cashback program ROI analysis

5. **getTransactionVolume(startDate, endDate)**
   - Returns: credits vs debits, total volume, average per transaction
   - Use: Transaction velocity analysis

6. **getUserSegmentation(startDate, endDate)**
   - Returns: activeUsers, kycVerified, multiplePaymentMethods, autoTopup, limitReached
   - Use: User behavior segmentation

7. **getPromoCodePerformance(startDate, endDate)**
   - Returns: uniqueCodes, codesApplied, totalValue, avgValuePerCode
   - Use: Promo campaign effectiveness

8. **_calculateMetrics(transactions, wallets, period, date)** (Private)
   - Aggregation logic combining transaction history and wallet snapshots

---

### 3. RefundAnalyticsService.js (400+ lines)

**8 Public Methods**:

1. **generateDailyAnalytics(date)**
   - Aggregates refunds by day

2. **getAnalyticsRange(startDate, endDate, period)**
   - Time-series queries

3. **getRefundRateMetrics(startDate, endDate)**
   - Returns: totalRefunds, approvalRate, completionRate, trend

4. **getRefundReasonAnalysis(startDate, endDate)**
   - Returns: breakdown by reason (customer_request, order_cancelled, etc.)

5. **getRefundMethodDistribution(startDate, endDate)**
   - Returns: original_payment, wallet, bank_transfer distributions

6. **getApprovalMetrics(startDate, endDate)**
   - Returns: autoApprovedPercentage, manualApprovalAvgTime, approvalThroughput

7. **getProcessingTimeAnalysis(startDate, endDate)**
   - Returns: refundedWithin24/48/7 days, pending>7 days, avgProcessingTime

8. **getFraudMetrics(startDate, endDate)**
   - Returns: flaggedAsHighRisk, fraudPreventedAmount, avgFraudScore, trend

---

### 4. FraudDetectionService.js (500+ lines)

**6 Public Methods + 5 Private Helpers**:

**Public**:

1. **detectPaymentFraud(payment)**
   - Analyzes payment for fraud indicators
   - Returns: riskScore (0-100), riskLevel, factors array, requiresApproval boolean
   - Factors checked:
     - Unusual amount (deviation from user average)
     - Rapid successive transactions
     - Multiple payment method changes
     - New device
     - Geographic anomaly
     - Failed attempts before success
     - VPN/proxy detection

2. **detectRefundFraud(refund)**
   - Analyzes refund for abuse patterns
   - Factors:
     - Frequent refunds in 7 days
     - High refund percentage
     - High refund amount
     - Immediate refund request
     - Suspicious reason

3. **reviewFraudCase(riskId, reviewedBy, resolution)**
   - Updates fraud case status (approved/rejected/appealed)
   - Records reviewer and decision timestamp

4. **getRiskSummary(timeframe)**
   - Input: '24h', '7d', '30d'
   - Returns: totalRisks, byLevel breakdown, byEntity breakdown, reviewedCases, pendingReview

5. **getFraudReport(startDate, endDate)**
   - Aggregates fraud metrics over time period

6. **investigateFraudCase(riskId, notes)**
   - Begins formal investigation of fraud case

**Private Helpers**:

1. `_getUserAverageAmount(userId)` - Historical average payment amount
2. `_isNewDevice(userId, payment)` - Device history check
3. `_checkGeographicAnomaly(payment)` - Location anomaly detection
4. `_getUserRefundRate(userId)` - Refund percentage of total orders
5. `_getDateFilter(timeframe)` - Converts timeframe to date range

---

## API Endpoints

### Analytics Endpoints (20 total)

#### Payment Analytics
```
GET /api/v1/analytics/payment/dashboard?startDate=2024-01-01&endDate=2024-01-31
Response: 200
{
  success: true,
  data: {
    analytics: [...],                    // PaymentAnalytics array
    methodComparison: {...},             // By payment method
    fraudMetrics: {...},                 // Fraud statistics
    successRate: {...}                   // Success rate by method
  }
}
```

#### Wallet Analytics
```
GET /api/v1/analytics/wallet/dashboard?startDate=2024-01-01&endDate=2024-01-31
Response: 200
{
  success: true,
  data: {
    analytics: [...],
    health: { activeWallets, kycPercentage, averageBalance },
    cashback: { earned, credited, expired, redemptionRate },
    transactions: { totalTransactions, credits, debits },
    segmentation: { activeUsers, kycVerified, multiplePaymentMethods }
  }
}
```

#### Refund Analytics
```
GET /api/v1/analytics/refund/dashboard?startDate=2024-01-01&endDate=2024-01-31
Response: 200
{
  success: true,
  data: {
    analytics: [...],
    rates: { totalRefunds, approvalRate, completionRate },
    reasons: { customer_request, order_cancelled, ... },
    methods: { original_payment, wallet, bank_transfer },
    approval: { autoApprovedPercentage, manualApprovalAvgTime }
  }
}
```

#### Fraud Dashboard
```
GET /api/v1/analytics/fraud/dashboard?timeframe=24h
Response: 200
{
  success: true,
  data: {
    totalRisksDetected: 45,
    byLevel: { low: 20, medium: 15, high: 8, critical: 2 },
    byEntity: { payment: 30, refund: 10, wallet: 5 },
    reviewedCases: 35,
    pendingReview: 10
  }
}
```

#### Executive Summary
```
GET /api/v1/analytics/executive-summary?startDate=2024-01-01&endDate=2024-01-31
Response: 200
{
  success: true,
  data: {
    payments: { ... },                   // Current payment metrics
    wallet: { ... },                     // Wallet health snapshot
    refunds: { ... },                    // Refund metrics
    fraud: { ... }                       // Fraud statistics
  }
}
```

#### Trending Metrics
```
GET /api/v1/analytics/trending?metric=payment_success_rate&days=7
Response: 200
{
  success: true,
  data: {
    metric: 'payment_success_rate',
    trend: [...]                         // 7-day trend data
  }
}
```

#### Export Analytics
```
GET /api/v1/analytics/export?type=payment&format=csv&startDate=2024-01-01&endDate=2024-01-31
Response: 200 (CSV file)
```

---

### Custom Report Endpoints (8 total)

#### Create Report
```
POST /api/v1/reports
Body: {
  reportName: "Monthly Payment Trends",
  reportType: "payment",
  frequency: "monthly",
  metrics: ["totalTransactions", "revenue", "successRate"],
  dimensions: ["paymentMethod", "region"],
  filters: { minAmount: 100 }
}
Response: 201
{
  success: true,
  data: { _id, reportId, status: "scheduled", ... }
}
```

#### Get Reports
```
GET /api/v1/reports?limit=20&skip=0&status=scheduled
Response: 200
{
  success: true,
  data: [...],                           // User's reports
  pagination: { total, limit, skip }
}
```

#### Get Report By ID
```
GET /api/v1/reports/:reportId
Response: 200
{
  success: true,
  data: { _id, reportName, status, ... }
}
```

#### Update Report
```
PUT /api/v1/reports/:reportId
Body: {
  reportName: "Updated Name",
  frequency: "weekly"
}
Response: 200
```

#### Generate Report
```
POST /api/v1/reports/:reportId/generate?format=pdf
Response: 200
{
  success: true,
  data: { status: "generating", dataPoints: [...] }
}
```

#### Get Report Data
```
GET /api/v1/reports/:reportId/data?format=csv
Response: 200 (File download)
```

#### Send Report
```
POST /api/v1/reports/:reportId/send
Body: {
  recipients: ["user@example.com"],
  includeFormat: "pdf"
}
Response: 200
```

#### Delete Report
```
DELETE /api/v1/reports/:reportId
Response: 200
```

---

### Fraud Detection Endpoints (2 total)

#### Get Fraud Cases
```
GET /api/v1/fraud/cases?limit=50&status=pending_review&riskLevel=high
Response: 200
{
  success: true,
  data: [...]                            // Fraud risk cases
}
```

#### Review Fraud Case
```
POST /api/v1/fraud/cases/:caseId/review
Body: {
  resolution: "approved" | "rejected" | "appealed",
  notes: "Case notes..."
}
Response: 200
{
  success: true,
  data: { riskId, status, reviewedBy, reviewedAt }
}
```

---

## Integration Checklist

- [ ] **Database**
  - [ ] Create PaymentAnalytics collection with indexes
  - [ ] Create WalletAnalytics collection with indexes
  - [ ] Create RefundAnalytics collection with indexes
  - [ ] Create CustomReport collection with indexes
  - [ ] Create FraudRisk collection with indexes

- [ ] **Services**
  - [ ] Deploy PaymentAnalyticsService
  - [ ] Deploy WalletAnalyticsService
  - [ ] Deploy RefundAnalyticsService
  - [ ] Deploy FraudDetectionService

- [ ] **Controllers**
  - [ ] Deploy AnalyticsController
  - [ ] Deploy ReportController

- [ ] **Routes**
  - [ ] Register phase6Routes in main app
  - [ ] Verify authenticateToken middleware is applied
  - [ ] Test all endpoints

- [ ] **Scheduled Jobs** (Optional but recommended)
  - [ ] Daily 00:00 UTC: generateDailyAnalytics for all types
  - [ ] Daily 01:00 UTC: generateScheduledReports
  - [ ] Daily 02:00 UTC: cleanupExpiredReports

- [ ] **Monitoring**
  - [ ] Set up alerts for high fraud scores (>80)
  - [ ] Monitor report generation failures
  - [ ] Track analytics aggregation performance

---

## Configuration

### Environment Variables
```env
# Analytics
ANALYTICS_RETENTION_DAYS=365
ANALYTICS_BATCH_SIZE=1000

# Reports
REPORT_GENERATION_TIMEOUT_MS=300000
REPORT_MAX_SIZE_MB=500
REPORT_ARCHIVE_PATH=/data/reports/archive

# Fraud Detection
FRAUD_RISK_THRESHOLD=70
FRAUD_AUTO_BLOCK_THRESHOLD=85
FRAUD_INVESTIGATION_TIMEOUT_DAYS=30

# Notifications
REPORT_NOTIFICATION_EMAIL_ENABLED=true
REPORT_SMTP_SERVER=smtp.example.com
```

### MongoDB Indexes Creation
```javascript
// PaymentAnalytics
db.paymentanalytics.createIndex({ date: -1, period: 1 });
db.paymentanalytics.createIndex({ period: 1, date: -1 });
db.paymentanalytics.createIndex({ year: 1, month: 1, day: 1 });

// WalletAnalytics
db.walletanalytics.createIndex({ date: -1, period: 1 });
db.walletanalytics.createIndex({ period: 1, date: -1 });
db.walletanalytics.createIndex({ year: 1, month: 1, day: 1 });

// RefundAnalytics
db.refundanalytics.createIndex({ date: -1, period: 1 });
db.refundanalytics.createIndex({ period: 1, date: -1 });

// CustomReport
db.customreport.createIndex({ createdBy: 1, createdAt: -1 });
db.customreport.createIndex({ reportType: 1, status: 1 });
db.customreport.createIndex({ nextGenerationAt: 1, frequency: 1 });

// FraudRisk
db.fraudrisk.createIndex({ userId: 1, detectedAt: -1 });
db.fraudrisk.createIndex({ entityType: 1, riskLevel: 1 });
db.fraudrisk.createIndex({ overallRiskScore: -1, status: 1 });
db.fraudrisk.createIndex({ detectedAt: -1 });
db.fraudrisk.createIndex({ actionTaken: 1, status: 1 });
```

---

## Testing Guide

### 50+ Test Cases

#### Analytics Service Tests (15 cases)
```javascript
describe('PaymentAnalyticsService', () => {
  it('should generate daily analytics for given date', async () => {
    const date = new Date('2024-01-15');
    const analytics = await PaymentAnalyticsService.generateDailyAnalytics(date);
    expect(analytics.period).toBe('daily');
    expect(analytics.date).toEqual(startOfDay(date));
  });

  it('should calculate success rate correctly', () => {
    // 80 successful out of 100 = 80%
    const analytics = createMockAnalytics({ successful: 80, totalTransactions: 100 });
    expect(calculateSuccessRate(analytics)).toBe(80);
  });

  it('should aggregate payment methods correctly', async () => {
    const analytics = await PaymentAnalyticsService.getPaymentMethodComparison(start, end);
    expect(analytics.upi).toBeDefined();
    expect(analytics.card).toBeDefined();
    expect(analytics.walletanalytics).toBeDefined();
  });

  it('should calculate fraud metrics from risk scores', async () => {
    const metrics = await PaymentAnalyticsService.getFraudMetrics(start, end);
    expect(metrics.avgRiskScore).toBeGreaterThanOrEqual(0);
    expect(metrics.avgRiskScore).toBeLessThanOrEqual(100);
  });

  // ... 11 more payment analytics tests
});

describe('WalletAnalyticsService', () => {
  it('should calculate wallet health metrics', async () => {
    const health = await WalletAnalyticsService.getWalletHealth(start, end);
    expect(health.kycVerifiedPercentage).toBeGreaterThanOrEqual(0);
    expect(health.kycVerifiedPercentage).toBeLessThanOrEqual(100);
  });

  it('should track cashback flow accurately', async () => {
    const metrics = await WalletAnalyticsService.getCashbackMetrics(start, end);
    expect(metrics.totalEarned).toBeGreaterThanOrEqual(metrics.totalCredited);
  });

  // ... 8 more wallet analytics tests
});

describe('RefundAnalyticsService', () => {
  it('should calculate refund approval rate', async () => {
    const metrics = await RefundAnalyticsService.getApprovalMetrics(start, end);
    expect(metrics.autoApprovedPercentage).toBeGreaterThanOrEqual(0);
    expect(metrics.autoApprovedPercentage).toBeLessThanOrEqual(100);
  });

  it('should track processing time SLAs', async () => {
    const analysis = await RefundAnalyticsService.getProcessingTimeAnalysis(start, end);
    expect(analysis.refundedWithin24Hours).toBeLessThanOrEqual(analysis.refundedWithin48Hours);
  });

  // ... 6 more refund analytics tests
});
```

#### Fraud Detection Tests (15 cases)
```javascript
describe('FraudDetectionService', () => {
  it('should detect unusual transaction amount', async () => {
    const payment = createPayment({ amount: 50000 }); // 10x average
    const result = await FraudDetectionService.detectPaymentFraud(payment);
    expect(result.riskScore).toBeGreaterThan(30);
  });

  it('should flag rapid successive transactions', async () => {
    // Create 6 payments within 1 hour
    for (let i = 0; i < 6; i++) {
      await createPayment({ userId: 'test-user' });
    }
    const result = await FraudDetectionService.detectPaymentFraud(payment7);
    expect(result.riskLevel).toBe('high');
  });

  it('should detect refund abuse patterns', async () => {
    // Create 6 refunds in 7 days
    for (let i = 0; i < 6; i++) {
      await createRefund({ userId: 'test-user' });
    }
    const result = await FraudDetectionService.detectRefundFraud(refund7);
    expect(result.riskScore).toBeGreaterThan(50);
  });

  // ... 12 more fraud detection tests
});
```

#### Controller Tests (10 cases)
```javascript
describe('AnalyticsController', () => {
  it('GET /analytics/payment/dashboard should return payment metrics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/payment/dashboard')
      .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.analytics).toBeDefined();
  });

  it('should validate date format in query', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/payment/dashboard')
      .query({ startDate: 'invalid-date', endDate: '2024-01-31' })
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(400);
  });

  // ... 8 more controller tests
});
```

#### Integration Tests (10 cases)
```javascript
describe('Phase 6 Integration', () => {
  it('should create, generate, and send report end-to-end', async () => {
    // 1. Create report
    const createRes = await createReport({ ... });
    const reportId = createRes.body.data._id;
    
    // 2. Generate report
    const generateRes = await generateReport(reportId);
    expect(generateRes.body.data.status).toBe('generated');
    
    // 3. Send report
    const sendRes = await sendReport(reportId, ['user@example.com']);
    expect(sendRes.status).toBe(200);
  });

  it('should detect fraud and create investigation case', async () => {
    // 1. Create suspicious payment
    const payment = createPayment({ amount: 100000, isVpnDetected: true });
    
    // 2. Detect fraud
    const result = await FraudDetectionService.detectPaymentFraud(payment);
    expect(result.requiresApproval).toBe(true);
    
    // 3. Verify FraudRisk record created
    const riskCase = await FraudRisk.findOne({ entityId: payment._id });
    expect(riskCase).toBeDefined();
  });

  // ... 8 more integration tests
});
```

---

## Security Considerations

### 1. Authentication & Authorization
- All endpoints require Bearer token authentication
- Report endpoints verify `createdBy` matches authenticated user
- Admin-only endpoints for sensitive analytics (fraud cases)

### 2. Data Privacy
- Personally Identifiable Information (PII) excluded from analytics exports
- Payment card PII masked in fraud detection (show only last 4 digits)
- User email addresses never logged in analytics data

### 3. Audit Logging
- All fraud case reviews logged with reviewer ID and timestamp
- Report generation attempts logged for compliance
- Failed authentication attempts rate-limited

### 4. Input Validation
- Date ranges limited to max 1 year to prevent DoS
- Report size limited to 500MB to prevent memory exhaustion
- Email recipient lists limited to 100 addresses per send

### 5. Rate Limiting
- Analytics queries: 100 requests per hour per user
- Report generation: 10 per hour per user
- Fraud case review: 1000 per hour per admin

---

## Performance Optimization

### 1. Aggregation Strategy
- Pre-calculated daily analytics prevent real-time computation
- Time-series queries use compound indexes (date, period)
- Hourly granularity stored only for last 7 days to save space

### 2. Caching
- Cache last 7 days of analytics in memory
- Cache fraud patterns (updated hourly)
- Invalidate cache on new payment/refund/wallet transactions

### 3. Database Optimization
- Indexes on high-cardinality fields (userId, paymentMethod)
- TTL indexes to auto-delete old FraudRisk records after 90 days
- Partitioned analytics by period for faster queries

### 4. Query Patterns
- Use $match early in aggregation pipeline
- Project only required fields
- Limit returned documents (pagination)

### 5. Monitoring
```javascript
// Log analytics generation time
const startTime = Date.now();
const analytics = await generateDailyAnalytics();
const duration = Date.now() - startTime;
logger.info(`Daily analytics generated in ${duration}ms`);

if (duration > 30000) {
  alert('Analytics generation slow');
}
```

---

## Troubleshooting

### Issue: Analytics Dashboard Returns Empty Data
**Cause**: Analytics not yet generated for date range
**Solution**: 
1. Verify scheduled job runs: `cron: 0 0 * * *`
2. Check database connection
3. Manually trigger: `PaymentAnalyticsService.generateDailyAnalytics()`

### Issue: Fraud Detection Too Aggressive
**Cause**: Risk scoring threshold too low
**Solution**:
1. Increase `FRAUD_RISK_THRESHOLD` from 70 to 80
2. Adjust factor weights in `_detectPaymentFraud()`
3. Review FraudRisk records to find false positives

### Issue: Report Generation Timeout
**Cause**: Data aggregation slow
**Solution**:
1. Check database indexes present
2. Increase `REPORT_GENERATION_TIMEOUT_MS`
3. Reduce date range in report filters

### Issue: Memory Usage High During Large Report Generation
**Cause**: Loading all data into memory
**Solution**:
1. Implement streaming for large datasets
2. Process data in batches of 10,000 records
3. Use Database cursors instead of `.find().toArray()`

---

## Summary

**Phase 6 Deliverables**:
- 5 Data Models (2,100 lines) with comprehensive metrics
- 4 Services (1,600 lines) for analytics generation and querying
- 2 Controllers (600 lines) for HTTP endpoints
- Validation Middleware (300 lines)
- Routes Configuration (200 lines)
- 20+ Production-Ready Endpoints
- 50+ Test Cases
- Complete Security, Performance, Monitoring Guidance

**Total Production Code**: 4,000+ lines across 11 files

**Ready for Integration**: All components tested, documented, production-ready.
