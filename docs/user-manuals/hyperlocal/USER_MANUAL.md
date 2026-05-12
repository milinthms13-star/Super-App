# Hyperlocal Delivery User Manual (Front-End)

> Module: `src/modules/hyperlocal/HyperlocalDeliveryHub.js`

## 1) What this module does
Hyperlocal Delivery Hub helps users order nearby goods/services for fast delivery. It typically includes:
- browse categories/merchants
- place orders
- track delivery status (depending on integration)
- view order history

## 2) Entry point
1. Login.
2. Open **Hyperlocal** from navigation.
3. The module typically loads on a hub/home or category/merchant listing screen.

## 3) Step-by-step user flows

### 3.1 Browse merchants/categories
1. Open Hyperlocal.
2. Browse merchant tiles/categories.
3. Select a merchant or category.

Expected result:
- Items/products/services for the selected merchant/category load.

### 3.2 Build an order
1. Add items to cart/basket (if UI supports it).
2. Review quantities.
3. Open cart/checkout.

Expected result:
- Cart shows selected items with totals.

### 3.3 Checkout & place order
1. Choose delivery address/location (if required).
2. Confirm delivery time windows (if available).
3. Proceed to payment/confirmation step.
4. Submit the order.

Expected result:
- Order is placed and a confirmation/receipt is shown.

### 3.4 Track delivery
1. Open **My Orders** / active orders (if available).
2. Select the order.
3. Track status updates until delivered.

Expected result:
- Delivery timeline/status updates are visible.

## 4) Troubleshooting (UI-level)
- Order fails to place:
  - Confirm address/required fields are filled.
  - Ensure you’re logged in.
  - Retry after checking network.
- No items visible:
  - Adjust category filters or merchant selection.
  - Refresh the page.

## 5) UI sections reference
- Merchant/category browser
- Item catalog/basket/cart
- Checkout confirmation
- Order tracking/history
