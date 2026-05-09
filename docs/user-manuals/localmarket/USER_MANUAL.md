# Local Market User Manual (Front-End)

> Module: `src/modules/localmarket/*` (Local vendors, delivery, neighborhood services)

## 1) What this module does
LocalMarket enables users to discover and interact with local vendors and services.

Typical roles within this module (based on UI patterns in the codebase):
- Buyer / Tenant (browse & purchase/list)
- Shop Owner (manage products/orders)
- Delivery Partner (delivery ops)
- Admin (oversight)

## 2) Entry point in the app
1. Open app dashboard.
2. Select **Local Market**.

## 3) Step-by-step user flow

### 3.1 Buyer: browse vendors and products
1. Open Local Market.
2. Browse vendor/store cards.
3. Open a store to view items.
4. Use search/filter/sorting (if provided).

### 3.2 Buyer: place an order (if supported)
1. Add items to cart.
2. Proceed to checkout.
3. Select delivery/pickup details.
4. Confirm the order.

### 3.3 Shop Owner: manage your shop
1. Switch to **Shop Owner** role (if role switch exists).
2. View catalog/products.
3. Add or update items.
4. Review incoming orders.

### 3.4 Delivery Partner: delivery operations (if supported)
1. Switch to **Delivery Partner** role.
2. Accept assigned deliveries.
3. Update delivery status as items move through stages.

## 4) Troubleshooting (UI-level)
- Vendor/product list empty:
  - Check filters.
  - Refresh.
  - Verify user is in correct role.
- Order failures:
  - Verify checkout details.
  - Confirm login/session.

## 5) UI sections reference
- Vendor/store browsing
- Product cards/list
- Cart/checkout (if exposed)
- Role-based workspace (Shop Owner / Delivery Partner)
- Order list / delivery queue (if exposed)

