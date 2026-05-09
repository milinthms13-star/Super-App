# Ecommerce User Manual (Front-End)

> Module: `src/modules/ecommerce/Ecommerce.js`

## 1) What this module does
The Ecommerce module provides the shopping experience including catalog browsing, cart, orders, returns, payments/wallet, and seller/vendor features (depending on role/subscription).

## 2) Entry point
1. Open the Ecommerce screen from the app navigation.
2. The module UI typically starts on a product listing/home area.

## 3) Step-by-step user flows

### 3.1 Browse products
1. Open the Ecommerce module.
2. Browse product cards/listing.
3. Use product filters/search (if present in UI).

Expected result:
- Products appear as cards with images, title, price, and actions.

### 3.2 Add items to cart
1. Click **Add to cart** (or equivalent) on a product.
2. If prompted, choose variants/options (size/color) if the product supports them.

Expected result:
- Cart updates and reflects the new quantity.

### 3.3 Update cart
1. Open **Cart** page.
2. Adjust quantity for items.
3. Remove items if needed.

### 3.4 Checkout & place order
1. Open Cart.
2. Proceed to checkout.
3. Choose delivery/payment method.
4. Confirm order.

### 3.5 View your orders
1. Open **Orders** page from the module navigation.
2. Select an order to view status and details.

### 3.6 Returns / refunds flow
1. Open **Returns** page.
2. Select an eligible order.
3. Choose return reason.
4. Submit return request.

### 3.7 Wallet / payment status (if applicable)
1. Open **Wallet** page.
2. Review balance, transactions, or payment history.

## 4) Troubleshooting (UI-level)
- If checkout fails: verify login/session, confirm payment method selection, and retry.
- If cart doesn’t update: refresh the page and re-check quantities.

## 5) UI sections reference
- Product listing/cards
- Cart
- Checkout
- Orders
- Returns
- Wallet / payment-related components

