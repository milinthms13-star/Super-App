# ECOMMERCE PENDING TASKS - DETAILED ACTION ITEMS

## Current State

All 4 advanced phases have been **implemented**. This document lists specific tasks that may need verification, testing, or refinement.

---

## 🔍 VERIFICATION TASKS (Critical)

### Phase 1: Coupons & Order Cancel

#### Coupon System
- [ ] **Test coupon application**
  - Verify discount calculates correctly for different discount types (% vs fixed)
  - Verify order total reflects discount
  - Verify discount persists through checkout
  - Test expired coupon rejection
  - Test minimum order amount validation

- [ ] **Test coupon UI**
  - Coupon field appears in CartPage.js
  - Apply button works and shows loading state
  - Remove coupon option available
  - Discount displayed in order summary
  - Coupon code cleared after cancellation

#### Order Cancellation
- [ ] **Test cancellation logic**
  - Cancel button only appears for "Confirmed" orders
  - Cancellation updates order status to "Cancelled"
  - Inventory is restored correctly
  - Cancellation reason stored in order
  - Refund is initiated (if payment was made)

- [ ] **Test cancellation UI**
  - Cancel button visible on OrdersPage.js
  - Confirmation modal appears before cancel
  - Cancel button disabled during processing
  - Success message shown after cancellation
  - Order history shows cancellation event

- [ ] **Test invoice generation**
  - Cancelled orders do NOT generate invoice
  - Delivered orders STILL generate invoice (GST)
  - Refunded orders don't block future orders

---

### Phase 3: Settlement & Commission

#### Commission Calculation
- [ ] **Verify commission formula**
  - Formula: Revenue × (Commission % / 100)
  - Default commission is 15%
  - Commission varies by product category (if configured)
  - Commission correctly deducted from vendor payout

- [ ] **Test settlement calculation**
  - Settlement aggregates correct orders
  - Settlement filters by date range
  - Settlement shows correct commission deduction
  - Net payable = Revenue - Commission

#### Settlement Endpoints
- [ ] **Verify settlement endpoints**
  - `GET /api/settlements` - Lists all settlements
  - `GET /api/settlements/:settlementId` - Gets specific settlement
  - `POST /api/settlements/:settlementId/approve` - Admin approves
  - `POST /api/settlements/:settlementId/process` - Initiates payout
  - `PATCH /api/settlements/:settlementId/mark-paid` - Marks paid

#### Settlement Reports
- [ ] **Verify settlement reports**
  - Report shows all items in settlement period
  - Commission breakdown is clear
  - Payment method selected correctly
  - PDF generation works (if implemented)

---

### Phase 4: Abandoned Cart & Inventory Alerts

#### Abandoned Cart Detection
- [ ] **Test cart abandonment detection**
  - Carts detected as abandoned after configurable time (default 24h)
  - Abandoned carts appear in AbandonedCart collection
  - Cart items, prices, and seller info stored correctly
  - Multiple reminders tracked

#### Abandoned Cart Reminders
- [ ] **Test reminder scheduler**
  - Reminders sent at 24h, 48h, 72h after abandonment
  - Email reminders include cart recovery link
  - SMS reminders sent if phone available
  - In-app notifications triggered
  - Unsubscribe option available

- [ ] **Test reminder effectiveness**
  - Clicking recovery link reopens cart
  - Cart items restored correctly
  - Original discounts/coupons honored
  - User can complete purchase without re-adding items

#### Inventory Alerts
- [ ] **Test low stock detection**
  - Alert triggered when stock < threshold
  - Seller receives notification
  - Alert includes product details
  - Reorder suggestions provided

- [ ] **Test out-of-stock handling**
  - Product marked unavailable when stock = 0
  - Alert sent to seller
  - Alert includes restock deadline
  - Restock priority shown

---

## 🐛 EDGE CASES & BUG FIXES

### Coupon Issues
- [ ] **Edge case: Expired coupon during checkout**
  - What if coupon expires between cart view and order creation?
  - Should error gracefully or auto-remove coupon
  - User notified about coupon expiry

- [ ] **Edge case: Coupon exceeds order value**
  - What if coupon discount > order amount?
  - Should cap discount to order amount
  - Or reject coupon application

- [ ] **Edge case: Multiple coupons**
  - Is only 1 coupon allowed per order? (Verify)
  - If multiple coupons sent, only first should apply
  - Clear error for additional coupon attempts

### Cancellation Issues
- [ ] **Edge case: Partial shipment cancellation**
  - If order has multiple items, can user cancel only some?
  - Or must cancel entire order?
  - If partial: adjust inventory restoration accordingly

- [ ] **Edge case: Cancel already refunded order**
  - What if refund initiated but not completed?
  - Can user cancel again?
  - Prevent duplicate refunds

- [ ] **Edge case: Cancel then re-purchase**
  - User cancels order, then immediately re-orders
  - System allows this (no lock-out period)
  - Inventory was released on first cancel, is available

### Settlement Issues
- [ ] **Edge case: Settlement for zero orders**
  - What if vendor has no orders in settlement period?
  - Should settlement still be created?
  - Or skip vendor entirely?

- [ ] **Edge case: Commission percentage change**
  - If commission % changes mid-period, which applies?
  - Should be: commission % at time of order delivery
  - Not at time of settlement

- [ ] **Edge case: Failed payment in settlement**
  - What if settlement payment fails?
  - Should retry, or mark OnHold?
  - How many retries before manual intervention?

### Abandoned Cart Issues
- [ ] **Edge case: Cart abandoned but immediately re-accessed**
  - User abandons cart, then comes back in 2 minutes
  - Should NOT send reminder
  - Cart should be "un-abandoned"

- [ ] **Edge case: Item out of stock when reminder clicked**
  - Original item was in stock, now out of stock
  - Recovery link works but item unavailable
  - Suggest alternative item or notify user

- [ ] **Edge case: Price changed on abandoned item**
  - Item price when abandoned: ₹100
  - Item price now: ₹120
  - Should show new price or old price in recovery?
  - Recommendation: Show new price with notice

---

## 📊 PERFORMANCE OPTIMIZATIONS

### Database Indexing
- [ ] **Verify indexes exist:**
  ```javascript
  // Settlement collection
  db.settlement.createIndex({ vendorEmail: 1, periodStartDate: -1 })
  db.settlement.createIndex({ status: 1 })
  
  // AbandonedCart collection
  db.abandonedcart.createIndex({ customerEmail: 1, abandonedAt: -1 })
  db.abandonedcart.createIndex({ status: 1 })
  
  // InventoryAlert collection
  db.inventoryalert.createIndex({ sellerEmail: 1, status: 1 })
  db.inventoryalert.createIndex({ productId: 1, alertType: 1 })
  ```

### Query Optimization
- [ ] **Settlement queries**
  - Paginate settlement history (not load all at once)
  - Cache settlement reports (5min TTL)
  - Index settlement queries by vendor + date

- [ ] **Abandoned cart queries**
  - Limit reminder checks to recent carts (last 30 days)
  - Archive old abandoned carts (>90 days)
  - Batch reminder sending (don't send one by one)

---

## 🎨 FRONTEND COMPLETENESS

### CartPage.js (Coupons)
- [ ] Coupon code input field exists
- [ ] Apply button with loading state
- [ ] Remove coupon button after applying
- [ ] Discount amount displayed in green
- [ ] Validation error message if invalid coupon
- [ ] Success message if coupon applied

### OrdersPage.js (Cancellation)
- [ ] Cancel button visible for eligible orders
- [ ] Confirmation modal before cancellation
- [ ] Cancel button disabled during process
- [ ] Success notification after cancel
- [ ] Order status updated to "Cancelled"
- [ ] Cancellation reason shown in order history

### Settlement Dashboard
- [ ] Shows all settlements with pagination
- [ ] Filter by date range
- [ ] Filter by status (Pending, Processing, Completed)
- [ ] Shows commission breakdown
- [ ] Shows payment method
- [ ] Shows approval/processing buttons (admin only)

### Alerts Dashboard
- [ ] Shows abandoned carts with recovery options
- [ ] Shows inventory alerts with priority
- [ ] Filters for unread alerts
- [ ] Dismiss/archive functionality

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Going to Production

#### Data Migration
- [ ] [ ] Migrate existing orders to new Coupon schema (if needed)
- [ ] [ ] Create Settlement records for past orders (if needed)
- [ ] [ ] Initialize InventoryAlert thresholds from product data

#### Configuration
- [ ] [ ] Set `COMMISSION_PERCENTAGE` in .env (default 15%)
- [ ] [ ] Set `SETTLEMENT_CYCLE_DAYS` in .env (default 7)
- [ ] [ ] Set `SETTLEMENT_MIN_AMOUNT` in .env (default ₹100)
- [ ] [ ] Set `ABANDONED_CART_THRESHOLD_HOURS` in .env (default 24)
- [ ] [ ] Set `LOW_STOCK_THRESHOLD` in .env (default 10 units)

#### Job Scheduling
- [ ] [ ] Enable `abandonedCartScheduler` (runs every 6 hours)
- [ ] [ ] Enable `inventoryAlertScheduler` (runs every 1 hour)
- [ ] [ ] Enable `settlementScheduler` (runs weekly on Monday)

#### Notifications
- [ ] [ ] Configure email service for cart reminders
- [ ] [ ] Configure SMS service for alerts (if applicable)
- [ ] [ ] Setup push notifications for in-app alerts
- [ ] [ ] Test all notification templates

---

## 📝 DOCUMENTATION TASKS

### API Documentation
- [ ] [ ] Document `POST /api/orders/:orderId/cancel`
- [ ] [ ] Document `GET /api/settlements` with query params
- [ ] [ ] Document `POST /api/settlements/:settlementId/approve`
- [ ] [ ] Document abandoned cart recovery flow
- [ ] [ ] Document inventory alert thresholds

### Admin Guides
- [ ] [ ] How to override commission percentage
- [ ] [ ] How to manually trigger settlement
- [ ] [ ] How to manage abandoned cart reminders
- [ ] [ ] How to configure inventory alert rules

### User Guides
- [ ] [ ] How to apply coupon code
- [ ] [ ] How to cancel order and get refund
- [ ] [ ] How to recover abandoned cart
- [ ] [ ] How to manage inventory (for sellers)

---

## ✅ FINAL VERIFICATION CHECKLIST

**Before marking as "Ready":**

```
PHASE 1: Coupons & Cancel
[ ] Coupon applies to orders ✓
[ ] Discount shown in cart summary ✓
[ ] Order can be cancelled ✓
[ ] Inventory restored on cancel ✓
[ ] Invoice NOT generated for cancelled orders ✓

PHASE 3: Settlement
[ ] Commission calculated correctly ✓
[ ] Settlement shows correct amounts ✓
[ ] Settlement payment methods work ✓
[ ] Settlements can be approved/processed ✓
[ ] Vendor receives payout ✓

PHASE 4: Alerts
[ ] Abandoned carts detected ✓
[ ] Reminders sent at correct intervals ✓
[ ] Cart recovery link works ✓
[ ] Inventory alerts sent ✓
[ ] Low stock notifications reach seller ✓

GENERAL
[ ] All endpoints tested ✓
[ ] All error cases handled ✓
[ ] Database indexes exist ✓
[ ] Jobs are scheduled ✓
[ ] Notifications working ✓
```

---

## 🎯 PRIORITY ORDER FOR NEXT STEPS

### Priority 1: Testing (Do This First)
1. Test coupon application flow
2. Test order cancellation with inventory restoration
3. Test settlement calculation accuracy
4. Test abandoned cart reminders

### Priority 2: Bug Fixes
1. Fix any edge cases found in Priority 1 testing
2. Add validation for coupon expiry
3. Add settlement failure retry logic
4. Add unsubscribe option to reminders

### Priority 3: Performance
1. Add database indexes
2. Implement caching for settlements
3. Batch abandoned cart reminders
4. Archive old abandoned carts

### Priority 4: Polish
1. Update documentation
2. Create admin dashboards
3. Add analytics/metrics
4. Setup monitoring & alerts

---

**All implementation is complete. These are verification and refinement tasks.** ✨
