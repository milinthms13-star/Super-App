# Phase 14: Complete API Endpoint Reference

**Total Endpoints:** 54  
**Base Path:** `/api/v1`  
**Status:** Production Ready ✅

---

## 📊 PREDICTIVE ANALYTICS (11 Endpoints)

### Revenue Forecasting
```
GET  /predictive/revenue-forecast
     Query: days (1-365, default: 30)
     Returns: Forecast data with seasonal patterns
     
GET  /predictive/revenue-forecast/seasonal
     Returns: Seasonal patterns and factors
     
GET  /predictive/revenue-forecast/confidence
     Query: days (1-365), confidence (0-1)
     Returns: Forecast with confidence intervals
```

### Churn Prediction
```
GET  /predictive/churn-risk/:userId
     Params: userId (MongoDB ID)
     Returns: Churn score, risk level, recommendations
     
POST /predictive/churn-risk/batch
     Body: { userIds: [...], limit: number }
     Returns: Multiple user churn risks
     
GET  /predictive/churn-risk/at-risk-users
     Query: threshold (0-100), limit (1-100)
     Returns: Users at risk of churning
     
GET  /predictive/retention-recommendations/:userId
     Params: userId (MongoDB ID)
     Returns: Personalized retention strategies
```

### Demand Forecasting
```
GET  /predictive/demand-forecast/category/:categoryId
     Query: days (1-365)
     Returns: Category demand forecast
     
GET  /predictive/demand-forecast/region/:region
     Query: days (1-365)
     Returns: Regional demand forecast
     
GET  /predictive/demand-forecast/insights
     Returns: Demand insights and recommendations
     
GET  /predictive/summary
     Returns: Combined revenue and demand summary
```

---

## 🔍 SEARCH & DISCOVERY (12 Endpoints)

### Product Search
```
POST /search/products
     Body: {
       query: string (1-200 chars),
       filters: {},
       page: number,
       limit: number (1-100)
     }
     Returns: Search results with ranking scores
     
GET  /search/suggestions
     Query: partial (1-100 chars), limit (1-20)
     Returns: Search suggestions
     
GET  /search/trends
     Query: timeWindow (weekly|monthly)
     Returns: Popular search trends
```

### Index Management
```
POST /search/index/product
     Body: { productId }
     Returns: Index status
     
POST /search/index/bulk
     Body: { productIds: [...] }
     Returns: Bulk indexing status
     
POST /search/index/reindex
     Returns: Reindex progress status
     
GET  /search/index/health
     Returns: Elasticsearch cluster health
     
GET  /search/index/statistics
     Returns: Index sizes and document counts
```

### Search Analytics
```
GET  /search/analytics/popular
     Query: limit (1-100), timeWindow (hour|day|week|month)
     Returns: Popular searches
     
GET  /search/analytics/funnel
     Returns: Search→Click→View→Purchase funnel
     
GET  /search/analytics/performance
     Returns: Response times, QPS, error rates
     
GET  /search/analytics/failed
     Returns: Failed searches and reasons
     
GET  /search/analytics/filters
     Returns: Filter usage statistics
     
GET  /search/analytics/roi
     Returns: Search ROI and revenue attribution
```

---

## 👥 USER SEGMENTATION (12 Endpoints)

### Behavioral Segments
```
GET  /segmentation/behavioral
     Returns: 5 segments (VIP, Loyal, Occasional, Inactive, Dormant)
     
GET  /segmentation/behavioral/vip
     Returns: VIP users (high value, very active)
     
GET  /segmentation/behavioral/loyal
     Returns: Loyal users (regular customers)
     
GET  /segmentation/behavioral/at-risk
     Returns: At-risk users (inactive)
```

### RFM Segments
```
GET  /segmentation/rfm
     Returns: 7 RFM segments with scoring
     
GET  /segmentation/rfm/champions
     Returns: RFM Champions (best customers)
```

### General Segmentation
```
GET  /segmentation/cohort
     Returns: Cohort analysis by signup date
     
GET  /segmentation/:type/users/:segmentName
     Params: type (behavioral|rfm|cohort), segmentName
     Query: limit (1-1000)
     Returns: Users in specific segment
     
GET  /segmentation/analysis
     Returns: Combined analysis of all segments
     
POST /segmentation/export/:type
     Params: type (behavioral|rfm|cohort)
     Query: format (json|csv)
     Returns: Exportable segment data
     
GET  /segmentation/summary
     Returns: Segment counts and percentages
```

---

## 🎁 RECOMMENDATIONS (10 Endpoints)

### Personalized Recommendations
```
GET  /recommendations/:userId
     Params: userId (MongoDB ID)
     Query: limit (1-50)
     Returns: Hybrid recommendations
     
GET  /recommendations/:userId/collaborative
     Params: userId (MongoDB ID)
     Query: limit (1-50)
     Returns: Collaborative filtering only
     
GET  /recommendations/:userId/content-based
     Params: userId (MongoDB ID)
     Query: limit (1-50)
     Returns: Content-based only
     
GET  /recommendations/:userId/based-on/:productId
     Params: userId, productId
     Query: limit (1-50)
     Returns: Recommendations based on product
```

### Trending & Batch
```
GET  /recommendations/trending
     Query: limit (1-100), timeWindow (day|week|month)
     Returns: Trending products (last 30 days)
     
POST /recommendations/batch
     Body: { userIds: [...], limit: number }
     Returns: Recommendations for multiple users
     
GET  /recommendations/similar-users/:userId
     Params: userId (MongoDB ID)
     Query: limit (1-5)
     Returns: Similar users for collaborative filtering
```

### Feedback & Analytics
```
POST /recommendations/feedback
     Body: {
       userId, recommendationId, feedback,
       productId
     }
     Feedback: helpful|not_helpful|clicked|purchased
     Returns: Feedback recorded status
     
GET  /recommendations/analytics/performance
     Returns: CTR, purchase rate, AOV metrics
     
GET  /recommendations/summary
     Returns: Algorithm weights and performance summary
```

---

## ⚙️ OPTIMIZATION (9 Endpoints)

### Query Optimization
```
GET  /optimization/query-analysis
     Returns: Slow queries, execution times
     
GET  /optimization/query-statistics/:collection
     Params: collection name
     Returns: Per-collection query stats
```

### Cache Strategy
```
GET  /optimization/cache/strategy/:dataType
     Params: dataType (user-profile|product-catalog|etc)
     Returns: Recommended caching strategy
     
GET  /optimization/cache/configuration
     Returns: L1/L2/L3 cache configuration
     
GET  /optimization/cache/efficiency
     Returns: Hit rate, miss rate, efficiency
     
GET  /optimization/cache/statistics
     Returns: Current cache metrics
     
POST /optimization/cache/invalidate
     Body: { dataType }
     Returns: Invalidation confirmation
```

### Index Optimization
```
GET  /optimization/index/recommendations
     Returns: 8 recommended indexes with priority
     
GET  /optimization/index/analysis
     Returns: Existing index analysis
     
GET  /optimization/index/scripts
     Returns: MongoDB index creation scripts
     
GET  /optimization/index/performance
     Returns: Index fragmentation and health
     
GET  /optimization/index/size-estimates
     Returns: Storage impact estimate
     
GET  /optimization/summary
     Returns: Overall optimization recommendations
```

---

## 📊 Endpoint Summary by Category

| Category | Count | Purpose |
|----------|-------|---------|
| Predictive Analytics | 11 | Revenue, churn, demand forecasting |
| Search & Discovery | 12 | Full-text search, indexing, analytics |
| User Segmentation | 12 | Behavioral, RFM, cohort analysis |
| Recommendations | 10 | Personalized, trending, batch |
| Optimization | 9 | Query, cache, index optimization |
| **TOTAL** | **54** | |

---

## 🔐 Authentication

All endpoints:
- Accept standard HTTP methods (GET, POST)
- Return JSON responses
- Use standard error codes (400, 404, 500)
- Support optional query parameters for pagination

---

## 📝 Common Query Parameters

```
limit:      1-1000 (default: varies by endpoint)
page:       1+ (for paginated results)
days:       1-365 (for time-range queries)
timeWindow: hour|day|week|month
format:     json|csv (for exports)
threshold:  0-100 (for risk/score filtering)
```

---

## 🚀 Usage Examples

### Get 30-day revenue forecast
```bash
curl -X GET "http://localhost:5000/api/v1/predictive/revenue-forecast?days=30"
```

### Search electronics
```bash
curl -X POST "http://localhost:5000/api/v1/search/products" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "electronics",
    "page": 1,
    "limit": 20
  }'
```

### Get user segments
```bash
curl -X GET "http://localhost:5000/api/v1/segmentation/behavioral"
```

### Get personalized recommendations
```bash
curl -X GET "http://localhost:5000/api/v1/recommendations/USER_ID?limit=10"
```

### Check optimization recommendations
```bash
curl -X GET "http://localhost:5000/api/v1/optimization/index/recommendations"
```

---

## ✅ Status Codes

```
200 - OK (successful request)
201 - Created (resource created)
400 - Bad Request (validation error)
404 - Not Found (resource not found)
500 - Server Error (internal error)
```

---

## 📞 Error Response Format

```json
{
  "success": false,
  "error": "Description of error",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

---

*Phase 14 Complete API Reference - 54 Endpoints, 12 Services, Production Ready*
