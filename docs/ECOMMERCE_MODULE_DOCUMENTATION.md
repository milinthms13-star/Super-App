# E-Commerce Module Documentation (GlobeMart / NilaHub Super App)

## 1. Overview
The **E-commerce module** powers end-to-end shopping workflows plus growth and vendor monetization features.

This repository’s ecommerce documentation is split across multiple artifacts (phase completion reports, status matrices, and feature-specific quickstarts). This document consolidates the **module-level** view: what’s included, where it lives, and how to use it.

---

## 2. Module Scope (High-Level)
The ecommerce module includes:

- **Core checkout & order lifecycle**
  - Coupons/discounts
  - Order cancellation + invoice prevention
  - Inventory restoration
- **Delivery verification**
  - OTP generation/verification
  - Delivery proof upload + location capture
  - Tracking + status timeline UI
- **Vendor settlement & commission**
  - Commission configuration
  - Settlement model & settlement endpoints
  - Settlement dashboards and approval workflow
- **Growth & alerts**
  - Abandoned cart detection + recovery scheduling
  - Inventory alerting (low-stock/out-of-stock) + seller notification flow
- **Advanced vendor/revenue optimization (Phase 7)**
  - Vendor performance analytics
  - Flash sales & time-bound promotions
  - Dynamic commission management
- **Commerce expansion features (10-feature bundle)**
  - Wishlist sharing, bulk orders (B2B), subscriptions
  - Reviews & ratings
  - AI recommendations
  - In-app wallet payments (wallet)
  - Referral program
  - Digital gift cards
  - Seller analytics dashboard
  - Live chat (real-time support)

---

## 3. Implementation Status (Repo Reference)
- Overall module: **~95% complete**
  - See: `ECOMMERCE_IMPLEMENTATION_STATUS_MATRIX.md`
- Advanced Phase 7 (vendor optimization): **Production Ready**
  - See: `ECOMMERCE_PHASE7_IMPLEMENTATION_COMPLETE.md`, `ECOMMERCE_PHASE7_COMPLETION_STATUS.md`
- Feature set (10 advanced ecommerce features) is documented as complete:
  - See: `ECOMMERCE_IMPLEMENTATION_COMPLETE.md`

---

## 4. Architecture Map (Where Things Live)

### Frontend (UI)
The ecommerce UI components live under:
- `src/modules/ecommerce/`

Example imports (from implementation-complete doc):
```javascript
import {
  BulkOrders,
  CartPage,
  Ecommerce,
  OrdersPage,
  ProductCard,
  ReturnsPage,
  Reviews,
  Subscriptions,
  Wallet,
  WishlistShare,
  ReferralProgram,
  GiftCards,
  SellerAnalytics,
  ProductRecommendations
} from './modules/ecommerce';
```

### Backend (Services / Routes / Models)
Backend code follows the standard structure:
- `backend/services/`
- `backend/routes/`
- `backend/models/`

Phase 7 additions include:
- Services:
  - `backend/services/VendorPerformanceService.js`
  - `backend/services/FlashSaleService.js`
  - `backend/services/DynamicCommissionService.js`
- Routes:
  - `backend/routes/ecommercePhase7Routes.js`
- Server registration:
  - Added route mount in `backend/server.js`

---

## 5. API Conventions
Across ecommerce endpoints in this repo, responses typically follow one of these patterns:

### Success
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error
```json
{
  "success": false,
  "message": "Descriptive error message",
  "error": "Technical error details"
}
```

(See phase-level docs for full endpoint lists.)

---

## 6. Phase 7 (Advanced Revenue Optimization) — API Reference

> Source:
> - `ECOMMERCE_PHASE7_IMPLEMENTATION_COMPLETE.md`
> - `ECOMMERCE_PHASE7_QUICKSTART.md`
> - `ECOMMERCE_PHASE7_COMPLETION_STATUS.md`

### 6.1 Vendor Performance Analytics
1. **Get Vendor Performance**
   - `GET /api/ecommerce/phase7/vendor/{vendorId}/performance?daysBack=30`

2. **Benchmark Comparison**
   - `GET /api/ecommerce/phase7/vendor/{vendorId}/performance/benchmark?daysBack=30`

3. **Performance Report (with insights)**
   - `GET /api/ecommerce/phase7/vendor/{vendorId}/performance/report?daysBack=30`

---

### 6.2 Flash Sales & Time-Bound Promotions
1. **Create Flash Sale**
   - `POST /api/ecommerce/phase7/flashsales`

2. **List Active Flash Sales**
   - `GET /api/ecommerce/phase7/flashsales/active?vendorId=vendor_123`

3. **Get Promotion Impact Analytics**
   - `GET /api/ecommerce/phase7/flashsales/{saleId}/impact`

4. **End Flash Sale Early**
   - `POST /api/ecommerce/phase7/flashsales/{saleId}/end`

5. **Timed Discounts for a Product**
   - `GET /api/ecommerce/phase7/products/{productId}/discounts`

6. **Bulk Purchase Offer**
   - `POST /api/ecommerce/phase7/products/{productId}/bulk-offer`

7. **Calculate Bulk Discount**
   - `GET /api/ecommerce/phase7/products/{productId}/bulk-discount?quantity=15`

8. **Checkout Integration**
   - `POST /api/checkout/apply-discount`
   - Body example (from doc): `{ productId, quantity, saleId }`

---

### 6.3 Dynamic Commission Management
1. **Calculate Dynamic Commission for Order**
   - `POST /api/ecommerce/phase7/orders/{orderId}/commission`
   - Body: `{ vendorId }`

2. **Commission History**
   - `GET /api/ecommerce/phase7/vendor/{vendorId}/commission/history?limit=50`

3. **Commission Reconciliation**
   - `POST /api/ecommerce/phase7/vendor/{vendorId}/commission/reconcile`
   - Body: `{ startDate, endDate }`

4. **Create Commission Tier**
   - `POST /api/ecommerce/phase7/commission/tier`

5. **Commission Comparison**
   - `GET /api/ecommerce/phase7/vendor/{vendorId}/commission/comparison?category=electronics`

---

## 7. Commerce Expansion Features (10-Feature Bundle) — API Reference

> Source: `ECOMMERCE_IMPLEMENTATION_COMPLETE.md`

### 7.1 Referral Program
- `GET /api/referral/my-referral`
- `POST /api/referral/track-referral`
- `GET /api/referral/statistics`
- `PUT /api/referral/update-tier`
- `PUT /api/referral/toggle-status`

### 7.2 Gift Cards
- `POST /api/gift-cards/create`
- `GET /api/gift-cards/sent`
- `GET /api/gift-cards/received`
- `POST /api/gift-cards/redeem`
- `POST /api/gift-cards/transfer`
- `GET /api/gift-cards/:cardCode`

### 7.3 Seller Analytics Dashboard (API)
- `GET /api/seller-analytics/dashboard`
- `GET /api/seller-analytics/trends/sales`
- `GET /api/seller-analytics/products/performance`
- `GET /api/seller-analytics/customers/insights`
- `GET /api/seller-analytics/inventory/metrics`

---

## 8. Key Frontend Modules (By Feature)
This module includes (by doc evidence):

- `WishlistShare` — wishlist view + sharing + stats/comments
- `BulkOrders` — bulk quote requests + pricing tiers + order tracking
- `Subscriptions` — recurring deliveries + pause/cancel/modify
- `Reviews` — submit, filter, helpful votes
- `ProductRecommendations` — personalized suggestions + confidence/reasons
- `Wallet` — balance + transactions + send money + receipts
- `ReferralProgram` — referral code, stats, tier progress, wallet reward credit
- `GiftCards` — create/send/redeem/transfer + expiry tracking
- `SellerAnalytics` — KPIs + trends + product/customer/inventory analysis
- `Live chat` — real-time interface (built on messaging infrastructure)

(See `ECOMMERCE_IMPLEMENTATION_COMPLETE.md` for detailed sub-features.)

---

## 9. Operational Notes & Validation Checklist (Recommended)
Because the repo docs reflect “complete + production-ready” status, the remaining operational work should focus on **verification**:

### 9.1 Critical verification targets
- Commission calculation accuracy (Phase 3/7 formulas)
- Settlement endpoint end-to-end flow testing
- Abandoned cart reminder delivery (email/SMS timing + unsubscribe)
- Inventory alert delivery (deduplication and notification delivery)
- Flash sale application logic in checkout (time window + quantity remaining)

### 9.2 Suggested testing workflow
- Backend unit tests: service calculation functions
- Integration tests: routes + database state changes
- E2E tests (Cypress): coupon → checkout → cancel/verify delivery proof
- Load/perf checks: analytics dashboards and vendor performance endpoints

(See `ECOMMERCE_IMPLEMENTATION_STATUS_MATRIX.md` for the exact priority list.)

---

## 10. Reference Files (Jump Links)
- Module status matrix:
  - `ECOMMERCE_IMPLEMENTATION_STATUS_MATRIX.md`
- Feature bundle completion:
  - `ECOMMERCE_IMPLEMENTATION_COMPLETE.md`
- Phase 7:
  - `ECOMMERCE_PHASE7_IMPLEMENTATION_COMPLETE.md`
  - `ECOMMERCE_PHASE7_QUICKSTART.md`
  - `ECOMMERCE_PHASE7_COMPLETION_STATUS.md`
- Phase 3 ecommerce intelligence:
  - `PHASE3_ECOMMERCE_COMPLETION_REPORT.md`
  - `PHASE3_API_REFERENCE.md`

---

## 11. Quick “How to Use” (Developer)
1. Start with:
   - Phase docs to understand endpoint contracts (`ECOMMERCE_PHASE7_*`, `ECOMMERCE_IMPLEMENTATION_COMPLETE.md`)
2. Confirm server mounts:
   - `backend/server.js`
3. Wire frontend:
   - Ensure `src/modules/ecommerce/index.js` exports the required components
4. Validate:
   - Run `npm run build` and backend syntax checks (as described in phase docs)

---

## 12. Version / Last Updated
- This document consolidates existing repo documentation.
- Last updated: **May 9, 2026**
