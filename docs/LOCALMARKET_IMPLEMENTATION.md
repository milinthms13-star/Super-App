# Local Market & Grocery Delivery Module

## Overview

The **Local Market & Grocery Delivery** module is a comprehensive platform for buying and selling groceries and everyday items from local shops, supermarkets, and convenience stores with fast delivery options.

### Key Features

#### For Buyers 👥
- **Browse Shops**: Search and filter local stores by type, distance, and rating
- **Shop Catalogs**: View products from different shops across multiple categories
- **Smart Cart**: Shop from one store at a time to ensure coordinated delivery
- **Easy Checkout**: Simple order placement with address and payment options
- **Delivery Tracking**: Real-time updates on order status
- **Promo Codes**: Apply discounts and special offers
- **Reviews & Ratings**: Rate shops and leave feedback after delivery
- **Order History**: Track all past orders and reorder easily

#### For Shop Owners 🏪
- **Shop Management**: Create and manage multiple shops
- **Product Management**: Add, edit, and manage product inventory
- **Order Management**: View and manage incoming orders
- **Status Tracking**: Update order status from confirmation to delivery
- **Performance Analytics**: Track ratings and customer reviews
- **Delivery Configuration**: Set delivery charges and minimum orders
- **Promotional Tools**: Configure discount offers and free delivery thresholds

#### For Delivery Partners 🚚
- **Order Assignments**: View available orders for pickup and delivery
- **Delivery Tracking**: Real-time navigation and order tracking
- **Proof of Delivery**: Photo uploads and signatures
- **Performance Metrics**: Track delivery times and ratings

---

## Module Architecture

### Frontend Components

#### Main Component: `LocalMarket.js`
The central component managing all functionality with multiple views:

```
LocalMarket
├── Buyer View (Browse & Order)
│   ├── Shop Browsing (Grid view with filters)
│   ├── Shop Details (Product catalog)
│   ├── Cart Management
│   ├── Checkout Modal
│   └── Order History
├── Shop Owner View (Management)
│   ├── Shop Management
│   ├── Product Management
│   └── Order Management
└── Delivery Partner View (Tracking)
```

#### Key Data Structures

**Shop Object**
```javascript
{
  id: string,
  name: string,
  type: string, // "Grocery Store", "Supermarket", etc.
  rating: number,
  deliveryTime: string,
  deliveryCharge: number,
  minOrder: number,
  freeDeliveryAbove: number,
  products: [Product],
  reviews: [Review]
}
```

**Product Object**
```javascript
{
  id: string,
  name: string,
  price: number,
  mrp: number,
  category: string,
  quantity: string,
  image: string,
  rating: number,
  inStock: boolean
}
```

**Order Object**
```javascript
{
  id: string,
  shopId: string,
  shopName: string,
  items: [OrderItem],
  subtotal: number,
  discount: number,
  delivery: number,
  total: number,
  status: string,
  paymentMethod: string,
  deliveryType: string,
  orderDate: string,
  estimatedDelivery: string
}
```

### Styling
- **File**: `src/styles/LocalMarket.css` (1,200+ lines)
- **Architecture**: BEM (Block Element Modifier) naming convention
- **Features**:
  - Responsive design (mobile, tablet, desktop)
  - Smooth animations and transitions
  - Color-coded status badges
  - Modern gradient backgrounds
  - Accessibility-friendly

### CSS Components
```css
.lm-header              /* Page header with role selector */
.lm-toolbar             /* Search, filter, sort controls */
.lm-shops-grid          /* Grid layout for shops */
.lm-shop-card           /* Individual shop card */
.lm-products-grid       /* Product grid in shop */
.lm-cart-items          /* Cart item list */
.lm-modal-overlay       /* Modal backdrop */
.lm-orders-section      /* Order history section */
.lm-shopowner-view      /* Shop owner dashboard */
```

---

## Backend API Endpoints

### Shop Endpoints
```
GET    /api/localmarket/shops                    List all shops
GET    /api/localmarket/shops/:shopId            Get shop details
GET    /api/localmarket/shops/:shopId/products   Get shop products
POST   /api/localmarket/shops                    Create shop (authenticated)
PUT    /api/localmarket/shops/:shopId            Update shop (owner only)
```

### Product Endpoints
```
POST   /api/localmarket/shops/:shopId/products   Add product (owner)
PUT    /api/localmarket/products/:productId      Update product (owner)
DELETE /api/localmarket/products/:productId      Delete product (owner)
```

### Order Endpoints
```
POST   /api/localmarket/orders                   Create order (authenticated)
GET    /api/localmarket/orders                   Get user orders
GET    /api/localmarket/shops/:shopId/orders     Get shop orders (owner)
PUT    /api/localmarket/orders/:orderId/status   Update status (owner)
```

### Review Endpoints
```
POST   /api/localmarket/orders/:orderId/review   Review order
POST   /api/localmarket/shops/:shopId/review     Review shop
```

---

## Database Models

### Shop Model
```javascript
{
  name: String (required),
  ownerId: ObjectId (User),
  type: String (enum),
  rating: Number (0-5),
  deliveryCharge: Number,
  minOrder: Number,
  freeDeliveryAbove: Number,
  location: {
    street: String,
    city: String,
    coordinates: { latitude, longitude }
  },
  products: [ObjectId],
  reviews: [{ userId, rating, comment, createdAt }],
  totalReviews: Number
}
```

### LocalMarketProduct Model
```javascript
{
  shopId: ObjectId (Shop),
  name: String (required),
  category: String (enum),
  price: Number (required),
  mrp: Number,
  quantity: String,
  inStock: Boolean,
  rating: Number (0-5),
  reviews: [{ userId, rating, comment, createdAt }]
}
```

### LocalMarketOrder Model
```javascript
{
  orderId: String (unique),
  userId: ObjectId (User),
  shopId: ObjectId (Shop),
  items: [{
    productId: ObjectId,
    productName: String,
    price: Number,
    quantity: Number
  }],
  subtotal: Number,
  discount: Number,
  deliveryCharge: Number,
  total: Number,
  status: String (enum),
  paymentMethod: String (enum),
  deliveryAddress: Object,
  promoCode: String,
  review: { rating, comment, createdAt }
}
```

---

## Shop Types
- Grocery Store
- Supermarket
- Convenience Store
- Local Kirana
- Organic Store

## Product Categories
- Vegetables & Fruits
- Dairy & Eggs
- Pantry Staples
- Beverages
- Bakery
- Meat & Fish
- Personal Care
- Household
- Snacks & Confectionery
- Frozen Foods

## Order Statuses
1. **Order Confirmed** - Order received and confirmed
2. **Being Prepared** - Shop is preparing items
3. **Ready for Pickup** - Items ready, awaiting delivery partner
4. **Out for Delivery** - On the way to customer
5. **Delivered** - Successfully delivered
6. **Cancelled** - Order cancelled by user or shop

## Payment Methods
- UPI
- Card
- Wallet
- Cash on Delivery (COD)
- Net Banking

## Delivery Options
- Home Delivery (with delivery charges)
- Store Pickup (no delivery charge)

---

## Promo Codes

The system supports various promotional codes:

| Code | Type | Details |
|------|------|---------|
| SAVE100 | Flat | ₹100 off above ₹500 |
| FIRST20 | Percent | 20% off on first order (max ₹150) |
| FREEDEL | Delivery | Free delivery above ₹599 |
| FRESH15 | Percent | 15% off on fresh items (max ₹100) |

---

## User Workflows

### Buyer Workflow
1. Select "Buyer" role in the module
2. Browse shops by type, distance, or rating
3. Search for specific shops
4. Click shop card to view products
5. Add products to cart
6. Review cart items
7. Enter delivery address
8. Select delivery/payment method
9. Apply promo code (if available)
10. Place order
11. Track order status
12. Leave review after delivery

### Shop Owner Workflow
1. Select "Shop Owner" role
2. Click "Add New Shop"
3. Enter shop details (name, type, charges)
4. Create shop
5. Manage shop products
6. View incoming orders
7. Update order status
8. Check shop performance metrics
9. Monitor customer reviews

### Delivery Partner Workflow
1. Select "Delivery Partner" role
2. View available orders
3. Accept order for delivery
4. Navigate to shop
5. Pickup order from shop
6. Navigate to customer location
7. Deliver items
8. Capture proof of delivery
9. Update status to delivered

---

## State Management

The module uses React Hooks for state management:

```javascript
// Buyer state
const [currentTab, setCurrentTab] = useState("browse");
const [cart, setCart] = useState([]);
const [orders, setOrders] = useState([]);
const [selectedShop, setSelectedShop] = useState(null);
const [appliedPromo, setAppliedPromo] = useState(null);

// Filters and sorting
const [searchTerm, setSearchTerm] = useState("");
const [sortBy, setSortBy] = useState("rating");
const [filterType, setFilterType] = useState("All");

// Forms
const [orderForm, setOrderForm] = useState(DEFAULT_ORDER_FORM);
const [reviewForm, setReviewForm] = useState({});

// Modals
const [showCheckout, setShowCheckout] = useState(false);
const [showReview, setShowReview] = useState(null);
```

---

## Features Breakdown

### 1. Shop Browsing
- Grid layout with shop cards
- Real-time search functionality
- Filter by shop type
- Sort by rating, distance, or delivery time
- Shop details including rating, delivery time, minimum order
- Promoted shop badges

### 2. Product Catalog
- Product grid with emojis or images
- Category-wise organization
- Price comparison (MRP vs Selling Price)
- Product quantity/unit information
- Stock status indicator
- Quick "Add to Cart" button

### 3. Cart Management
- Add items from one shop at a time
- Update quantities with +/- buttons
- Remove items from cart
- Live price calculation
- Automatic cart clear when switching shops

### 4. Checkout Process
- Delivery address input
- Delivery type selection (Home/Pickup)
- Payment method selection
- Special instructions for shop/delivery
- Promo code application
- Price breakdown (Subtotal, Discount, Delivery, Total)

### 5. Promo Code System
- Multiple promo codes with different discount types
- Flat amount discounts
- Percentage-based discounts
- Delivery charge waivers
- Minimum order requirements
- Maximum discount caps

### 6. Order Tracking
- Order history with all past orders
- Order status with color-coded badges
- Order details (items, date, total)
- Estimated delivery time
- Review submission form
- Order ID reference

### 7. Rating & Review System
- 5-star rating system
- Text comment for reviews
- Shop-level reviews
- Order-level reviews
- Automatic shop rating calculation
- Review display on shop cards

### 8. Shop Owner Dashboard
- Multiple shop management
- Product inventory control
- Order list and status updates
- Analytics dashboard
- Performance metrics

---

## Integration Points

### App.js Integration
```javascript
import LocalMarket from "./modules/localmarket/LocalMarket";

// In renderModule switch:
case "localmarket":
  return <LocalMarket />;

// In Navigation: Add localmarket module to available modules
```

### Backend Integration
```javascript
const localmarketRoutes = require('./routes/localmarket');
app.use('/api/localmarket', localmarketRoutes);
```

---

## Responsive Design

The module is fully responsive:

### Desktop (1024px+)
- Multi-column grid layouts
- Side-by-side panels
- Full-width modals

### Tablet (768px - 1024px)
- 2-column grids
- Adapted layouts
- Touch-friendly buttons

### Mobile (< 768px)
- Single column layout
- Stacked elements
- Full-width components
- Optimized modals

### Extra Small (< 480px)
- Simplified UI
- Vertical layouts
- Increased tap targets
- Optimized typography

---

## Testing

Run backend tests:
```bash
npm test backend/routes/localmarket.test.js
```

Test endpoints with cURL:
```bash
# Get all shops
curl http://localhost:5000/api/localmarket/shops

# Create order (requires auth)
curl -X POST http://localhost:5000/api/localmarket/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{...order data...}'
```

---

## Performance Optimizations

- **useMemo** for filtered/sorted shop lists
- **useCallback** for event handlers
- **Lazy loading** for large product lists
- **Pagination** for order history
- **Debounced search** for shop filtering
- **Optimistic updates** for cart changes

---

## Security Considerations

- Authentication required for orders and reviews
- Authorization checks for shop owners
- Input validation on all forms
- XSS protection through sanitization
- Rate limiting on API endpoints
- Secure password handling with bcrypt
- JWT token-based authentication

---

## Future Enhancements

1. **Real-time Updates**: Socket.io integration for live order tracking
2. **Advanced Analytics**: Seller dashboards with detailed metrics
3. **Subscription Service**: Subscribe to regular deliveries
4. **Loyalty Program**: Points and rewards system
5. **AI Recommendations**: Personalized product suggestions
6. **Multi-language Support**: Localization for different regions
7. **Payment Gateway Integration**: Razorpay, Stripe integration
8. **GPS Tracking**: Real-time delivery partner location
9. **Video Reviews**: Allow video testimonials
10. **Bulk Ordering**: B2B wholesale options

---

## Troubleshooting

### Cart not updating
- Clear browser cache
- Check if items are from the same shop
- Verify JavaScript console for errors

### Orders not showing
- Ensure user is logged in
- Check backend API connectivity
- Verify database models are created

### Styles not loading
- Import LocalMarket.css in main App
- Check CSS class names match BEM convention
- Verify no conflicting global styles

---

## Support & Contribution

For issues, questions, or feature requests:
1. Check existing documentation
2. Review GitHub issues
3. Submit detailed bug reports
4. Follow contribution guidelines

---

**Version**: 1.0.0  
**Last Updated**: April 23, 2026  
**Maintainer**: NilaHub Team
