# Quick Start Guide - Classifieds Enhancements

## 🚀 Using the Enhanced Classifieds Module

### 1. Creating a Listing with Enhanced Features

```javascript
const listing = {
  title: "Gaming Laptop RTX 4060",
  description: "High-end gaming laptop with warranty",
  price: 85000,
  category: "Electronics",
  subcategory: "Laptops",
  location: "Bengaluru",
  condition: "Like New",
  tags: ["Gaming", "Warranty", "Laptop"],
  mediaCount: 6,
  plan: "featured", // free, featured, urgent, subscription
  contactOptions: ["Chat", "Call", "WhatsApp"],
};

// System automatically:
// ✓ Generates SEO slug
// ✓ Detects spam/phishing
// ✓ Sets geolocation coordinates
// ✓ Initializes analytics
// ✓ Logs to audit trail
```

### 2. Searching with Filters

```javascript
const results = await searchClassifieds({
  text: "gaming laptop",
  category: "Electronics",
  minPrice: 50000,
  maxPrice: 150000,
  sortBy: "latest", // featured, price-low, price-high, popular
  page: 1,
  limit: 20,
});

// Returns: { listings, pagination: { total, pages } }
```

### 3. Real-time Updates

```javascript
// Client-side (Frontend)
socket.emit('watch-listing', 'listing-id');
socket.on('new-message', (data) => {
  console.log('New message received:', data);
});

// Server-side (Backend)
const ws = setupClassifiedsWebSocket(io);
ws.broadcastNewMessage(listingId, message);
```

### 4. Seller Dashboard

```javascript
const dashboard = getSellerDashboard(sellerListings);

console.log(dashboard.summary);
// {
//   totalListings: 15,
//   activeListings: 12,
//   totalViews: 4500,
//   totalChats: 120,
//   conversionRate: 2.67,
//   totalRevenue: 3000
// }

const recommendations = getSellerRecommendations(dashboard);
```

### 5. Rating & Review a Listing

```javascript
const review = {
  buyerName: "John Doe",
  rating: 5,
  comment: "Excellent seller, fast delivery!",
  aspectRatings: {
    accuracy: 5,        // How accurate was the listing
    communication: 5,   // Seller responsiveness
    condition: 5        // Item condition vs listing
  }
};

await addClassifiedReview(listingId, review);
```

### 6. Geolocation Search

```javascript
// Find listings within 50km of a location
const nearbyListings = await findNearbyListings(
  [77.5946, 12.9716], // [longitude, latitude] - Bengaluru
  50 // radius in km
);
```

### 7. Moderation & Admin Functions

```javascript
// Approve a listing
await moderateClassifiedAd(listingId, {
  action: 'approve',
  moderationNotes: 'Looks good'
});

// Flag for review
await moderateClassifiedAd(listingId, {
  action: 'flag',
  moderationNotes: 'Suspicious pricing'
});

// Reject a listing
await moderateClassifiedAd(listingId, {
  action: 'reject',
  moderationNotes: 'Violates policy'
});
```

### 8. Price History Tracking

```javascript
const listing = await findClassifiedAdById(listingId);

// Price history available at:
listing.priceHistory; // Array of {price, changedAt}

// Alert system (to be implemented):
// - Track price drops
// - Notify users watching the listing
// - Generate price trend reports
```

### 9. Seller Verification Levels

```javascript
const verificationLevels = [
  'unverified',         // No verification
  'email-verified',     // Email confirmed
  'phone-verified',     // Phone number verified
  'identity-verified'   // ID verified
];

// Update seller verification
await moderateClassifiedAd(listingId, {
  sellerVerificationLevel: 'identity-verified'
});
```

### 10. Spam Detection & Flagging

```javascript
const { calculateSpamScore, detectSuspiciousFlags } = require('./utils/spamDetector');

const listing = {
  title: "Click here for free money",
  description: "Earn bitcoin fast!"
};

const score = calculateSpamScore(listing);  // Returns 0-100
const flags = detectSuspiciousFlags(listing); // Returns array of flags

// Auto-moderation
if (score > 50) {
  listing.moderationStatus = 'flagged';
  listing.flags = flags;
}
```

## 📊 Important Metrics

### Conversion Rate Calculation
```
Conversion Rate = (Number of Chats / Total Views) * 100
Example: 10 chats / 200 views = 5% conversion rate
```

### Engagement Rate
```
Engagement Rate = (Chats + Favorites) / Total Views * 100
Example: (10 + 20) / 200 views = 15% engagement rate
```

### Popularity Score
```
Score (0-100) based on:
- Views contribution (0-40)
- Chats contribution (0-35)
- Favorites contribution (0-25)
- Featured/Urgent boost (+15/+10)
- Freshness factor (+10)
```

## 🔐 Security Features Used

✅ Input validation with Joi schemas
✅ Spam detection and phishing prevention
✅ Rate limiting (different limits per operation)
✅ Audit logging of all actions
✅ User blocking capability
✅ Moderation workflow
✅ Automated spam scoring

## 📦 Database Indexes

For optimal performance, these indexes are created:

```javascript
- slug (unique, sparse)
- coordinates (2dsphere) - for geospatial queries
- category + location + moderationStatus
- sellerEmail + createdAt
- featured + urgent + createdAt
- spamScore
- tags
- subscriptionTier
- sellerVerificationLevel
```

## ⚡ Performance Tips

1. **Use pagination**: Limit results to 20-50 per page
2. **Filter early**: Apply category/location filters before text search
3. **Cache seller stats**: Update dashboard every 1 hour
4. **Use indexes**: Query on indexed fields (category, location, seller)
5. **Monitor spam scores**: Review flagged listings regularly

## 🐛 Debugging

### Enable Debug Logging

```javascript
// In server.js
process.env.DEBUG = 'classifieds:*';

// View spam score for testing
const listing = await findClassifiedAdById(id);
console.log('Spam Score:', listing.spamScore);
console.log('Flags:', listing.flags);
```

### Check Audit Logs

```javascript
const logs = await getAuditLogs({
  action: 'listing-created',
  startDate: new Date('2026-04-20'),
  endDate: new Date('2026-04-22')
});
```

## 🚀 Next Steps

### To implement these features fully:

1. **Update routes/appData.js** - Add new endpoints for:
   - Image upload with media handler
   - Geolocation search
   - Reviews/ratings
   - Seller analytics endpoints
   - Moderation dashboard

2. **Update Classifieds.js** - Add UI for:
   - Image upload with drag-drop
   - Pagination controls
   - Rating/review display
   - Price change alerts
   - Seller dashboard

3. **Add WebSocket listener** in server.js:
   ```javascript
   const { setupClassifiedsWebSocket } = require('./config/classifiedsWebSocket');
   const ws = setupClassifiedsWebSocket(io);
   ```

4. **Run database migration**:
   ```bash
   npm run migrate -- 001-classifieds-schema-enhancement
   ```

## 📚 Files Reference

| File | Purpose |
|------|---------|
| models/ClassifiedAd.js | Enhanced schema with 40+ new fields |
| utils/slugGenerator.js | SEO-friendly URL generation |
| utils/spamDetector.js | Spam/phishing detection |
| utils/geolocationHelper.js | Location-based features |
| utils/analyticsHelper.js | Performance metrics |
| utils/mediaHandler.js | Image/video management |
| utils/classifiedsValidation.js | Input validation schemas |
| utils/auditLogger.js | Action logging |
| utils/sellerAnalytics.js | Seller dashboard metrics |
| config/monetization.js | Pricing and plans |
| config/classifiedsWebSocket.js | Real-time updates |
| middleware/classifiedsRateLimiter.js | Rate limiting |
| scripts/migrations/001-*.js | Database migration |

---

**Need help?** Check [CLASSIFIEDS_ENHANCEMENTS.md](./CLASSIFIEDS_ENHANCEMENTS.md) for detailed documentation.
