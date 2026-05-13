# Ecommerce User Manual (Front-End)

> Module: `src/modules/ecommerce/Ecommerce.js`

## 1) What this module does
Ecommerce provides:
- **Marketplace shopping** (product discovery, search, filters, recommendations)
- **Favorites** and **saved searches**
- **Voice + smart search** assistant behaviors (when enabled)
- **Flash sales** with optional PWA notifications
- **Cart**, **Orders**, **Returns**
- **Product reviews**
- **Subscriptions**, **Wallet**
- **Refill reminders** (schedule/dismiss per product)
- Seller/vendor experience (depending on role/subscription):
  - Catalog: create/update products
  - Inventory batches: set stock, price/MRP, discounts, expiry, return policy
  - Seller orders: advance fulfillment status / sync tracking
  - Seller return requests: update return-request status
  - Seller analytics (component shown via SellerAnalytics)

## 2) Entry point in the app
1. Open the **Ecommerce** module from app navigation.
2. The UI starts in the marketplace/product discovery view.

## 3) Marketplace shopping workflow (shopper)
### 3.1 Discover products
You can browse the marketplace catalog using:
- Marketplace search text
- Category / subcategory filters
- Seller/business filter
- Price min/max
- Minimum rating
- In-stock only toggle
- Sort options (relevance, price low/high, discount, rating, etc.)

There’s also a **smart search plan** feature that can apply a refined search state.

Expected result:
- Products are shown as product cards.
- If remote search is used, the results may show an offline/fallback mode when remote search fails.

### 3.2 Use suggestions / smart search
Typical assistant-driven actions:
- Apply **Smart Search** (updates the marketplace filters and refreshes the catalog)
- Click **suggestions** (applies a saved “shortcut” search state)
- Use **voice search** (if supported by the device hook)

### 3.3 Flash sales and notifications
If flash sales are active:
- You may see flash-sale countdown behavior
- If PWA notification permission is granted, the module can trigger notifications like “Flash sale ending soon”.

### 3.4 Quick view and chat actions
From product cards you may have:
- **Quick View** (opens a modal/panel)
- **Copy product summary for chat** (writes product share message to clipboard when available)

### 3.5 Favorites and saved searches
You can:
- Switch marketplace view to **Favorites**
- Save the current search/filters as a **GlobeMart shortcut** (saved search)
- Load/apply saved searches quickly later

Expected result:
- Loading a saved search applies the stored filters and refreshes the marketplace.

## 4) Cart, Orders, Returns, Reviews (shopper)
Use the module’s dedicated screens/components:

### 4.1 Cart
- Update item quantities
- Proceed to checkout

### 4.2 Orders
- View order status and details per order

### 4.3 Returns
- Submit return requests for eligible orders
- Track return status updates

### 4.4 Reviews
- View and add product reviews (where supported by UI)

## 5) Wallet and Subscriptions
### 5.1 Wallet
- Review wallet/balance related details and payment status (depending on backend wiring)

### 5.2 Subscriptions
- Manage active subscriptions and related fulfillment/ordering options

## 6) Refills (schedule reminders)
For refill-related products:
- Use the **schedule refill** action to create a reminder
- You’ll see reminder timing feedback (displayed as UI messages)
- You may also be able to dismiss the refill reminder

## 7) Seller / business experience (role-based)
If you are an entrepreneur/business user, the module exposes seller tools.

### 7.1 Manage products (catalog)
Seller workflow includes:
- Create a new product in the catalog (image upload supported)
- Edit existing product details
- Products can be:
  - waiting for approval (pending)
  - approved
  - rejected/needs changes (status depends on moderation)

Expected behavior:
- New products are created and sent back for admin approval.
- Editing uses an update route and updates moderation status accordingly.

### 7.2 Manage inventory batches for products
After a product is available, manage inventory batches:
- Add stock batch:
  - batch label
  - stock quantity
  - selling price, MRP
  - dispatch location
  - discount setup (amount/percentage + optional start/end dates)
  - manufacturing/expiry dates (if expiryApplicable)
  - return policy:
    - returnAllowed
    - returnWindowDays (required if returns are enabled)

Validation behavior (enforced by UI):
- MRP must be >= price
- Discount end date cannot be earlier than start date
- Expiry date cannot be earlier than manufacturing date
- Expiry date is required if expiryApplicable is enabled

### 7.3 Enable/disable product availability
- Toggle product availability to hide/show in storefront
- Batch availability can also be toggled:
  - enable/disable a batch

### 7.4 Seller orders: advance fulfillment
In the seller orders area:
- For each seller segment/order step, you can:
  - advance to next status
  - configure manual tracking fields (provider/trackingNumber/shipmentId)
  - sync status when configured

### 7.5 Seller returns: update return request status
For returned items in seller orders:
- Use the return-request update handler from UI
- Keep an eye on seller-return-request count indicators (computed from returned items)

## 8) Notifications and PWA behavior
If notification permission is granted:
- The module can run flash-sale ending notifications.
If permission isn’t granted:
- Flash-sale notifications won’t trigger.

## 9) Troubleshooting
- Remote search seems slow/unavailable:
  - results may fall back to local/mock listing mode
- Voice search not working:
  - voice hook may not be available on your device
- Smart search doesn’t apply:
  - ensure there’s a searchText/plan input (the UI blocks “no input” smart search)
- Product creation blocked:
  - required fields:
    - product name
    - category
  - image and payload creation follow the form’s validations
- Inventory batch blocked:
  - check price/MRP, dates ordering, expiry requirements, and return window days rules

## 10) UI sections reference (quick)
- Marketplace discovery: filters + smart search + favorites + flash sale
- Quick view + share product to chat
- Cart
- Orders
- Returns
- Reviews
- Wallet
- Subscriptions
- Seller catalog + inventory batches + seller orders + return updates
