# Food Delivery User Manual (Front-End)

> Module: `src/modules/fooddelivery/FoodDelivery.js`

## 1) What this module does
Food Delivery provides browsing/restaurants menu, cart building, ordering, payment, tracking, and refunds for the food delivery experience.

## 2) Entry point
1. Open the Food Delivery module from navigation.
2. Choose a restaurant and browse menu items.

## 3) Step-by-step user flows

### 3.1 Browse restaurants & menus
1. Open Food Delivery.
2. Select a restaurant.
3. View menu items (and variants if provided).

### 3.2 Add items to cart
1. Pick quantity/variant for a menu item.
2. Click **Add to cart**.
3. Review cart for selected items.

### 3.3 Checkout & place an order
1. Open **Cart**.
2. Proceed to checkout.
3. Choose delivery address/details.
4. Select payment method.
5. Confirm the order.

### 3.4 Track your order
1. Open the **Order Tracking** view.
2. Observe order status updates (accepted → preparing → on the way → delivered).

### 3.5 View order history
1. Open Orders / history area (depending on UI).
2. Select a past order.
3. View details: items, totals, payment status, tracking.

### 3.6 Refunds / returns (if supported)
1. Open Returns / Refunds page.
2. Select an order.
3. Provide reason and submit.

## 4) Troubleshooting
- If the menu doesn’t load: confirm internet connection and re-open the module.
- If checkout fails: verify cart items and payment method.

## 5) UI sections reference
- Restaurant/food browsing
- Menu item cards + variants
- Cart
- Checkout
- Order tracking
- Orders history
- Refund/returns (if exposed)

