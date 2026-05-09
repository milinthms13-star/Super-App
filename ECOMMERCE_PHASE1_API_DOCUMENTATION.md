# Ecommerce Phase 1 - API Documentation
**Date:** May 9, 2026  
**Version:** 1.0  
**Status:** Complete & Ready for Testing

---

## 📚 Table of Contents

1. [Wishlist API](#wishlist-api)
2. [Recently Viewed Items API](#recently-viewed-api)
3. [Address Management API](#address-management-api)
4. [Saved Payment Methods API](#payment-methods-api)
5. [Search History API](#search-history-api)
6. [Integration Guide](#integration-guide)
7. [Database Schema](#database-schema)

---

## Wishlist API

### Base URL: `/api/wishlist`

#### 1. Get User's Wishlist
```
GET /me
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 5,
    "estimatedValue": 25000,
    "items": [
      {
        "productId": "61234567890abc",
        "productName": "iPhone 15",
        "price": 79999,
        "image": "url",
        "category": "electronics",
        "addedAt": "2026-05-09T10:30:00Z",
        "notes": "Black color, 256GB",
        "notifyOnPriceChange": true,
        "inStock": true
      }
    ],
    "isPublic": false,
    "publicShareLink": null
  }
}
```

#### 2. Add Item to Wishlist
```
POST /items
Headers: Authorization: Bearer <token>
Body: {
  "productId": "61234567890abc",
  "notes": "Black color, 256GB",
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to wishlist",
  "data": {
    "totalItems": 6,
    "estimatedValue": 105000,
    "item": { /* item details */ }
  }
}
```

#### 3. Remove Item from Wishlist
```
DELETE /items/:productId
Headers: Authorization: Bearer <token>
```

#### 4. Update Item Notes
```
PATCH /items/:productId/notes
Headers: Authorization: Bearer <token>
Body: {
  "notes": "Updated notes about the product"
}
```

#### 5. Toggle Price Change Notification
```
PATCH /items/:productId/notify/price
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Price notification toggled",
  "data": {
    "productId": "61234567890abc",
    "notifyOnPriceChange": true
  }
}
```

#### 6. Toggle Stock Availability Notification
```
PATCH /items/:productId/notify/stock
Headers: Authorization: Bearer <token>
```

#### 7. Clear Entire Wishlist
```
DELETE /clear
Headers: Authorization: Bearer <token>
```

#### 8. Generate Public Share Link
```
POST /share
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Public share link generated",
  "data": {
    "publicShareLink": "wish-1234567890-abc123",
    "shareUrl": "http://localhost:3000/wishlist/share/wish-1234567890-abc123"
  }
}
```

#### 9. View Shared Wishlist (Public)
```
GET /share/:shareLink
Query: ?viewerEmail=user@example.com&viewerName=John
```

#### 10. Disable Public Sharing
```
DELETE /share
Headers: Authorization: Bearer <token>
```

#### 11. Get Wishlist Statistics
```
GET /stats
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalItems": 5,
    "estimatedValue": 105000,
    "categories": 3,
    "avgPrice": 21000,
    "inStockCount": 4,
    "outOfStockCount": 1,
    "sharedWith": 2
  }
}
```

---

## Recently Viewed API

### Base URL: `/api/recently-viewed`

#### 1. Get Recently Viewed Items
```
GET /me?limit=12
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 45,
    "items": [
      {
        "productId": "61234567890abc",
        "productName": "Samsung Galaxy S24",
        "price": 79999,
        "category": "electronics",
        "viewCount": 3,
        "lastViewedAt": "2026-05-09T15:30:00Z",
        "timeSpent": 120
      }
    ],
    "recommendations": {
      "categories": ["electronics", "gadgets"],
      "viewCount": 45
    }
  }
}
```

#### 2. Track Product View
```
POST /track
Headers: Authorization: Bearer <token>
Body: {
  "productId": "61234567890abc",
  "deviceType": "mobile",
  "timeSpent": 45
}
```

#### 3. Get Items by Category
```
GET /category/:category
Headers: Authorization: Bearer <token>
```

#### 4. Get Browsing Analytics
```
GET /analytics
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 45,
    "uniqueProducts": 15,
    "categories": ["electronics", "gadgets", "fashion"],
    "avgTimeSpent": 180,
    "mostViewedCategory": "electronics",
    "mostViewedProduct": {
      "productId": "61234567890abc",
      "name": "iPhone 15",
      "viewCount": 5,
      "category": "electronics"
    },
    "deviceTypes": ["mobile", "desktop"]
  }
}
```

#### 5. Get Browsing Patterns
```
GET /patterns
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "browsingPatterns": {
      "favoriteCategories": [
        { "category": "electronics", "count": 20 },
        { "category": "gadgets", "count": 15 }
      ],
      "pricePreference": {
        "0-500": 5,
        "500-1000": 10,
        "1000-5000": 20,
        "5000+": 10
      },
      "totalBrowsingSession": 45
    },
    "recommendedCategories": ["electronics", "gadgets"]
  }
}
```

#### 6. Clear Browsing History
```
DELETE /clear
Headers: Authorization: Bearer <token>
```

#### 7. Remove Specific Item
```
DELETE /:productId
Headers: Authorization: Bearer <token>
```

---

## Address Management API

### Base URL: `/api/addresses`

#### 1. Get All Addresses
```
GET /me
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAddresses": 3,
    "primaryAddressId": "addr-123456-abc",
    "addresses": [
      {
        "addressId": "addr-123456-abc",
        "name": "Home",
        "type": "home",
        "street": "123 Main Street",
        "building": "Apt 101",
        "area": "Downtown",
        "city": "kochi",
        "state": "kerala",
        "postalCode": "682001",
        "recipient": "John Doe",
        "phoneNumber": "9876543210",
        "instructions": "Ring twice",
        "landmark": "Near XYZ temple",
        "latitude": 9.9312,
        "longitude": 76.2673,
        "isPrimary": true,
        "isActive": true,
        "usageCount": 15,
        "lastUsedAt": "2026-05-08T18:00:00Z"
      }
    ]
  }
}
```

#### 2. Get Primary Address
```
GET /primary
Headers: Authorization: Bearer <token>
```

#### 3. Add New Address
```
POST /add
Headers: Authorization: Bearer <token>
Body: {
  "name": "Office",
  "type": "office",
  "street": "456 Business Ave",
  "building": "Floor 5",
  "area": "Business District",
  "city": "bangalore",
  "state": "karnataka",
  "postalCode": "560034",
  "recipient": "Jane Doe",
  "phoneNumber": "9876543211",
  "alternatePhoneNumber": "8765432109",
  "instructions": "Call before delivery",
  "landmark": "Near Metro Station",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "isPrimary": false
}
```

#### 4. Update Address
```
PATCH /:addressId
Headers: Authorization: Bearer <token>
Body: {
  "name": "Office (Updated)",
  "instructions": "New delivery instructions"
}
```

#### 5. Delete Address
```
DELETE /:addressId
Headers: Authorization: Bearer <token>
```

#### 6. Set as Primary Address
```
PATCH /:addressId/set-primary
Headers: Authorization: Bearer <token>
```

#### 7. Record Address Usage
```
POST /:addressId/use
Headers: Authorization: Bearer <token>
```

#### 8. Get Specific Address
```
GET /:addressId
Headers: Authorization: Bearer <token>
```

#### 9. Verify Address with GPS
```
POST /:addressId/verify
Headers: Authorization: Bearer <token>
Body: {
  "latitude": 9.9312,
  "longitude": 76.2673
}
```

#### 10. Get Address Statistics
```
GET /stats/usage
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAddresses": 3,
    "mostUsedAddress": {
      "addressId": "addr-123456-abc",
      "name": "Home",
      "usageCount": 15
    },
    "addressTypes": {
      "home": 2,
      "office": 1
    }
  }
}
```

---

## Saved Payment Methods API

### Base URL: `/api/payment-methods`

#### 1. Get All Payment Methods
```
GET /me
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMethods": 2,
    "methods": [
      {
        "methodId": "pm-123456-abc",
        "name": "Personal Card",
        "type": "card",
        "isDefault": true,
        "usageCount": 25,
        "lastUsedAt": "2026-05-08T18:00:00Z",
        "card": {
          "last4": "4242",
          "brand": "Visa",
          "holderName": "JOHN DOE",
          "expiryMonth": 12,
          "expiryYear": 2026,
          "isExpired": false
        }
      }
    ]
  }
}
```

#### 2. Get Default Payment Method
```
GET /default
Headers: Authorization: Bearer <token>
```

#### 3. Save New Payment Method
```
POST /add
Headers: Authorization: Bearer <token>
Body: {
  "name": "Personal Card",
  "type": "card",
  "cardData": {
    "last4": "4242",
    "brand": "Visa",
    "expiryMonth": 12,
    "expiryYear": 2026,
    "holderName": "JOHN DOE",
    "tokenId": "token_from_razorpay"
  },
  "isDefault": true
}
```

#### 4. Update Payment Method
```
PATCH /:methodId
Headers: Authorization: Bearer <token>
Body: {
  "name": "My Favorite Card",
  "isDefault": true
}
```

#### 5. Delete Payment Method
```
DELETE /:methodId
Headers: Authorization: Bearer <token>
```

#### 6. Set as Default
```
PATCH /:methodId/set-default
Headers: Authorization: Bearer <token>
```

#### 7. Record Payment Usage
```
POST /:methodId/use
Headers: Authorization: Bearer <token>
Body: {
  "orderId": "order_123456"
}
```

#### 8. Record Failed Attempt
```
POST /:methodId/failed
Headers: Authorization: Bearer <token>
```

#### 9. Unlock Locked Payment Method
```
POST /:methodId/unlock
Headers: Authorization: Bearer <token>
```

#### 10. Link Payment Method to Address
```
POST /:methodId/link-address
Headers: Authorization: Bearer <token>
Body: {
  "addressId": "addr-123456-abc"
}
```

#### 11. Get Payment Method Statistics
```
GET /stats
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMethods": 2,
    "byType": {
      "card": 2,
      "upi": 0
    },
    "mostUsed": {
      "name": "Personal Card",
      "usageCount": 25
    },
    "lockedMethods": 0,
    "expiredCards": 0
  }
}
```

---

## Search History API

### Base URL: `/api/search-history`

#### 1. Get Search History
```
GET /me?limit=20
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSearches": 45,
    "recentSearches": [
      {
        "query": "iphone 15",
        "filters": {
          "minPrice": 70000,
          "maxPrice": 90000,
          "brands": ["Apple"]
        },
        "resultsCount": 12,
        "searchedAt": "2026-05-09T15:30:00Z",
        "deviceType": "mobile",
        "language": "english",
        "executionTimeMs": 245
      }
    ],
    "favoriteSearches": ["iphone", "samsung", "airpods"],
    "trendingSearches": []
  }
}
```

#### 2. Record a Search
```
POST /record
Headers: Authorization: Bearer <token>
Body: {
  "query": "iphone 15",
  "filters": {
    "minPrice": 70000,
    "maxPrice": 90000,
    "brands": ["Apple"]
  },
  "resultsCount": 12,
  "deviceType": "mobile",
  "language": "english",
  "executionTimeMs": 245
}
```

#### 3. Get Trending Searches
```
GET /trending
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trending": [
      { "query": "iphone 15", "count": 8 },
      { "query": "samsung galaxy", "count": 6 }
    ]
  }
}
```

#### 4. Save a Search
```
POST /save
Headers: Authorization: Bearer <token>
Body: {
  "name": "Latest iPhones under 80k",
  "query": "iphone",
  "filters": {
    "maxPrice": 80000,
    "brands": ["Apple"],
    "categories": ["electronics"]
  }
}
```

#### 5. Get Saved Searches
```
GET /saved
Headers: Authorization: Bearer <token>
```

#### 6. Get Saved Search by ID
```
GET /saved/:searchId
Headers: Authorization: Bearer <token>
```

#### 7. Remove Saved Search
```
DELETE /saved/:searchId
Headers: Authorization: Bearer <token>
```

#### 8. Get Search Analytics
```
GET /analytics
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSearches": 45,
    "uniqueSearchQueries": 15,
    "favoriteSearches": ["iphone", "samsung", "airpods"],
    "averageResultsPerSearch": 18,
    "lastSearchedAt": "2026-05-09T15:30:00Z",
    "savedSearchesCount": 3
  }
}
```

#### 9. Clear Search History
```
DELETE /clear
Headers: Authorization: Bearer <token>
```

#### 10. Remove Specific Search
```
DELETE /:index
Headers: Authorization: Bearer <token>
```

#### 11. Get Search Suggestions
```
GET /suggestions/:query?limit=10
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": ["iphone 15", "iphone 14", "iphone 13", "iphone 12"]
  }
}
```

---

## Integration Guide

### Frontend Setup

#### 1. Install Axios or Fetch
```javascript
// Using axios
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';
const token = localStorage.getItem('authToken');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

#### 2. Wishlist Integration
```javascript
// Add to wishlist
const addToWishlist = async (productId, notes = '') => {
  try {
    const response = await api.post('/wishlist/items', {
      productId,
      notes,
      quantity: 1
    });
    console.log('Added to wishlist:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};

// Get wishlist
const getWishlist = async () => {
  try {
    const response = await api.get('/wishlist/me');
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};
```

#### 3. Address Management Integration
```javascript
// Add address
const addAddress = async (addressData) => {
  try {
    const response = await api.post('/addresses/add', addressData);
    console.log('Address added:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};

// Get all addresses
const getAddresses = async () => {
  try {
    const response = await api.get('/addresses/me');
    return response.data.data.addresses;
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};
```

#### 4. Search History Integration
```javascript
// Record search
const recordSearch = async (query, filters = {}) => {
  try {
    await api.post('/search-history/record', {
      query,
      filters,
      resultsCount: 12,
      deviceType: 'mobile'
    });
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};

// Get suggestions
const getSearchSuggestions = async (query) => {
  try {
    const response = await api.get(`/search-history/suggestions/${query}`);
    return response.data.data.suggestions;
  } catch (error) {
    console.error('Error:', error.response?.data?.error);
  }
};
```

---

## Database Schema

### Collections Created:
1. `wishlists` - User wishlists
2. `recently_viewed` - Browsing history
3. `user_addresses` - Saved addresses
4. `saved_payment_methods` - Payment method storage
5. `search_history` - Search queries and history

### Indexes Created:
- Wishlist: `userEmail_1_createdAt_-1`, `isPublic_1_publicShareLink_1`
- RecentlyViewed: `userEmail_1_items.viewedAt_-1`
- UserAddress: `userEmail_1_addresses.isPrimary_1`
- SavedPaymentMethod: `userEmail_1_isActive_1`, `userEmail_1_isDefault_1`
- SearchHistory: `userEmail_1_searches.searchedAt_-1`

---

## Testing Checklist

- [ ] Wishlist CRUD operations
- [ ] Recently viewed tracking and analytics
- [ ] Address management and primary address setting
- [ ] Payment method storage and security
- [ ] Search history and suggestions
- [ ] All error handling scenarios
- [ ] Performance under load
- [ ] Data consistency across modules

---

## Security Considerations

1. **Authentication:** All endpoints require valid JWT token
2. **Authorization:** Users can only access their own data
3. **Data Encryption:** Payment method tokens stored securely
4. **Rate Limiting:** Implement per-endpoint rate limits
5. **SQL Injection:** All queries use parameterized queries
6. **CORS:** Configure appropriate CORS policies

---

## Next Steps

1. **Testing:** Run comprehensive E2E tests
2. **Frontend Integration:** Build React components
3. **Performance:** Optimize queries with caching
4. **Monitoring:** Set up error tracking and logging
5. **Deployment:** Stage → Production rollout

---

## Support

For issues or questions, please open an issue in the project repository.
