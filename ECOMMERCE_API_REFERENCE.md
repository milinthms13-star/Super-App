# eCommerce API Reference - Quick Guide

## 🔑 Authentication

All protected routes require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📦 Products API

### Create Product
```http
POST /api/products/listing/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 999,
  "stock": 100,
  "category": "category_id",
  "sku": "PROD-001",
  "status": "draft"
}
```

### Upload Product Images
```http
POST /api/products/listing/:productId/images/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- images: [file1, file2, file3]
```

### Publish Product
```http
POST /api/products/listing/:productId/publish
Authorization: Bearer <token>
```

### Get My Products
```http
GET /api/products/listing/my-products?page=1&limit=20&status=active
Authorization: Bearer <token>
```

### Bulk Operations
```http
POST /api/products/listing/bulk/publish
Authorization: Bearer <token>

{
  "productIds": ["id1", "id2", "id3"]
}
```

---

## 🛍️ Marketplace API

### Browse Products
```http
GET /api/marketplace/products?category=id&minPrice=100&maxPrice=5000&page=1
```

### Search Products
```http
GET /api/marketplace/search?q=laptop&limit=10
```

### Get Product Details
```http
GET /api/marketplace/products/:productId
```

### Featured Products
```http
GET /api/marketplace/featured?limit=12
```

### Trending Products
```http
GET /api/marketplace/trending?limit=12
```

### Add to Wishlist
```http
POST /api/marketplace/wishlist/add
Authorization: Bearer <token>

{
  "productId": "product_id"
}
```

### Get Recommendations
```http
GET /api/marketplace/recommendations?limit=12
Authorization: Bearer <token>
```

---

## ⭐ Subscription API

### Get Available Plans
```http
GET /api/ecommerce/subscription/plans
```

### Subscribe to Plan
```http
POST /api/ecommerce/subscription/subscribe
Authorization: Bearer <token>

{
  "planId": "plan_id",
  "duration": "monthly",
  "paymentMethod": "razorpay",
  "paymentId": "payment_id"
}
```

### Upgrade Plan
```http
POST /api/ecommerce/subscription/upgrade
Authorization: Bearer <token>

{
  "newPlanId": "plan_id"
}
```

### Get Subscription Status
```http
GET /api/ecommerce/subscription/status
Authorization: Bearer <token>
```

### Cancel Subscription
```http
POST /api/ecommerce/subscription/cancel
Authorization: Bearer <token>

{
  "reason": "Optional cancellation reason"
}
```

---

## 💰 Commission API

### Calculate Commission Preview
```http
POST /api/ecommerce/commission/calculate
Authorization: Bearer <token>

{
  "orderAmount": 5000,
  "category": "category_id"
}
```

### Get Seller Commission Summary
```http
GET /api/ecommerce/commission/seller/summary?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### Get Transaction History
```http
GET /api/ecommerce/commission/transactions?page=1&limit=20&status=completed
Authorization: Bearer <token>
```

---

## 💳 Payout API

### Get Payout Summary
```http
GET /api/payouts/summary
Authorization: Bearer <token>
```

### Request Payout
```http
POST /api/payouts/request
Authorization: Bearer <token>
```

### Get Payout History
```http
GET /api/payouts/my-payouts?page=1&status=completed
Authorization: Bearer <token>
```

### Get Payout Details
```http
GET /api/payouts/:payoutId
Authorization: Bearer <token>
```

### Generate Invoice
```http
GET /api/payouts/:payoutId/invoice
Authorization: Bearer <token>
```

---

## 📁 Category API

### Get All Categories
```http
GET /api/ecommerce/categories
```

### Get Category Details
```http
GET /api/ecommerce/categories/:categoryId
```

### Get Category Breadcrumb
```http
GET /api/ecommerce/categories/:categoryId/breadcrumb
```

### Search Categories
```http
GET /api/ecommerce/categories/search?q=electronics
```

### Create Category (Admin)
```http
POST /api/ecommerce/categories
Authorization: Bearer <admin_token>

{
  "name": "Category Name",
  "slug": "category-slug",
  "description": "Description",
  "parentCategory": "parent_id"
}
```

---

## 🔐 Admin API

### Get Pending Verifications
```http
GET /api/payouts/admin/pending?page=1
Authorization: Bearer <admin_token>
```

### Approve Payout
```http
POST /api/payouts/admin/:payoutId/approve
Authorization: Bearer <admin_token>

{
  "approvalNotes": "Approved"
}
```

### Reject Payout
```http
POST /api/payouts/admin/:payoutId/reject
Authorization: Bearer <admin_token>

{
  "rejectionReason": "Reason for rejection"
}
```

### Complete Payout
```http
POST /api/payouts/admin/:payoutId/complete
Authorization: Bearer <admin_token>

{
  "paymentDetails": {
    "paymentReference": "TXN123456",
    "paymentDate": "2024-01-15",
    "paymentMethod": "bank_transfer"
  }
}
```

### Get Platform Statistics
```http
GET /api/payouts/admin/statistics?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pages": 5,
    "limit": 20
  }
}
```

---

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Token missing/invalid |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Server Error - Internal error |

---

## 🔄 Status Values

### Product Status
- `draft` - Not published
- `active` - Live on marketplace
- `inactive` - Hidden from marketplace
- `pending_approval` - Awaiting admin approval
- `rejected` - Rejected by admin
- `deleted` - Soft deleted

### Order Status
- `pending` - Order placed
- `confirmed` - Order confirmed
- `processing` - Being processed
- `shipped` - Shipped to customer
- `delivered` - Delivered
- `cancelled` - Cancelled
- `returned` - Returned

### Payout Status
- `pending` - Not yet processed
- `pending_approval` - Awaiting admin approval
- `approved` - Approved by admin
- `processing` - Being processed
- `completed` - Paid out
- `rejected` - Rejected by admin
- `failed` - Payment failed

### Subscription Status
- `trial` - Trial period
- `active` - Active subscription
- `expired` - Subscription expired
- `cancelled` - Cancelled by user

---

## 📝 Query Parameters

### Common Filters
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort field
- `sortOrder` - asc/desc
- `search` - Search term
- `status` - Filter by status
- `startDate` - Start date filter
- `endDate` - End date filter

### Marketplace Filters
- `category` - Category ID
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `rating` - Minimum rating
- `inStock` - In stock only (true/false)
- `featured` - Featured only (true/false)

---

## 🎯 Rate Limits

**Recommended limits:**
- Authentication: 5 requests/minute
- Product creation: 10 requests/minute
- Image upload: 5 requests/minute
- Browse/Search: 60 requests/minute
- Payout requests: 3 requests/hour

---

## 💡 Best Practices

1. **Always include error handling**
```javascript
try {
  const response = await axios.get('/api/marketplace/products');
  // Handle success
} catch (error) {
  console.error(error.response?.data?.message);
  // Handle error
}
```

2. **Use pagination for lists**
```javascript
const fetchProducts = async (page = 1) => {
  const { data } = await axios.get(`/api/products/listing/my-products?page=${page}&limit=20`);
  return data;
};
```

3. **Implement retry logic for failed requests**
```javascript
const retryRequest = async (url, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

4. **Cache frequently accessed data**
```javascript
// Cache categories for 1 hour
const cachedCategories = localStorage.getItem('categories');
if (cachedCategories && Date.now() - cachedCategories.timestamp < 3600000) {
  return JSON.parse(cachedCategories.data);
}
```

---

## 🧪 Testing Examples

### cURL Examples

**Get Products:**
```bash
curl -X GET "http://localhost:5000/api/marketplace/products?page=1&limit=10"
```

**Create Product:**
```bash
curl -X POST "http://localhost:5000/api/products/listing/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":999,"stock":10}'
```

**Upload Images:**
```bash
curl -X POST "http://localhost:5000/api/products/listing/PRODUCT_ID/images/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

### Postman Collection

Import this collection for easy testing:
```json
{
  "info": { "name": "eCommerce API" },
  "item": [
    {
      "name": "Get Products",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/marketplace/products"
      }
    }
  ]
}
```

---

**For more details, see:**
- `ECOMMERCE_MODULE_README.md` - Full documentation
- `ECOMMERCE_INTEGRATION_GUIDE.md` - Integration steps
- `ECOMMERCE_IMPLEMENTATION_COMPLETE.md` - Feature overview
