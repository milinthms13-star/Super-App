# FoodDelivery User Manual (Front-End)

> Module: `src/modules/fooddelivery/FoodDelivery.js`  
> Product name in UI: **Feastly - Food Delivery**

## 1) What this module does
FoodDelivery is a multi-role food ordering system that lets you:
- Browse restaurants and menus (customer view)
- Add items to cart with **variant + add-ons + special instructions**
- Apply coupon/referral codes and choose payment options
- Schedule an order (scheduled datetime)
- Track orders and raise issues/disputes per order
- Use rewards (points earned/redeemed) and view rewards summary
- Manage restaurant ops / delivery ops / admin ops via role-based dashboards

## 2) Entry point in the app
1. Open **Food Delivery** from main navigation/menu.
2. The module opens with the default view: **Customer**.

## 3) View switcher (inside this module)
Use the internal view tabs:
- **Customer**
- **Restaurant Ops**
- **Delivery Ops**
- **Admin Ops**

> The selected view controls which dashboard/component is shown.

---

## 4) Customer flow: browse restaurants → order → track

### 4.1 Browse restaurants
1. Go to **Customer** view.
2. Use the search/filter controls:
   - Search restaurants (by name)
   - Cuisine filter
   - Sort by:
     - Top Rated
     - Fastest Delivery

3. Click **View Menu** on a restaurant card.

Expected result:
- Restaurant menu loads
- Your restaurant-specific cart loads (if the backend has a cart for that restaurant)

---

### 4.2 Add items to cart (with customization)
For a menu item, set (when available):
1. **Variant / size** (dropdown) — only for items with variants
2. **Add-ons** (checkbox list)
3. **Special instructions** (text input)

Then:
4. Click **Add** (or “Add Suggested” for recommendation items)

Expected result:
- Item is added to the cart for the selected restaurant
- Cart updates, including selected variant/add-ons/instructions

**Note:** Cart items are merged only when the selection matches (variant + add-ons + instructions).

---

### 4.3 See cart summary
When cart has items, the cart panel shows:
- Cart total (subtotal calculation)
- Items with quantity and chosen customization
- Restaurant cart identifier

---

### 4.4 Apply pricing and checkout inputs
In the cart panel, configure:
- **Promo code** (couponCode)
- **Referral code**
- **Payment method**:
  - Cash on Delivery (cod)
  - Wallet
  - UPI
  - Card
- **Tip amount**
- **Scheduled for** (datetime-local)
- **Redeem points** (rewardPointsToRedeem)

Also:
- The module calls a backend **checkout summary preview** to validate totals before checkout.
  - If validation fails, you’ll see checkoutMessage.

---

### 4.5 Checkout (place order)
1. Ensure cart is not empty.
2. If checkout summary says invalid, fix the issue (see checkoutMessage).
3. Click **Checkout**.

Expected result:
- Backend checkout happens (`foodDeliveryService.checkout`)
- Cart clears
- The new order appears in **My Orders**
- Rewards summary refreshes
- A success alert shows the total

---

## 5) My Orders: tracking, cancellation, and disputes

### 5.1 View order status
In the orders list:
- You’ll see:
  - order id
  - order status
  - total amount
  - payment method and refund status
  - assigned rider (if any)
  - scheduled indicator (if applicable)
  - loyalty points earned/redeemed

### 5.2 Track an order
1. Click **Track Order** for that order.
2. The module fetches tracking and shows:
   - tracking status
   - ETA + route strategy
   - distance to customer
   - optional rider SOS indicator

### 5.3 Cancel an order
- If **canCancel** is true for the order:
  - click **Cancel Order**
- The order status updates after backend response.

### 5.4 Raise an issue / dispute (per order)
1. In the order card, select:
   - **issueType** (Late delivery, Item missing, Food quality, Rider issue)
2. Enter a short **description**
3. Click **Submit Issue**

Expected result:
- A dispute is created and attached to the order
- Issue fields reset for that order

---

## 6) Rewards
- Rewards summary loads on entry.
- After successful checkout, the module refreshes rewards.

What you can typically do:
- Redeem points during checkout using **Redeem points**
- View:
  - points balance
  - referral code
  - lifetime rewards earned

---

## 7) Restaurant / Rider / Admin Ops
This module renders dedicated dashboards:
- **RestaurantDashboard** (Restaurant Ops)
- **DeliveryPartnerDashboard** (Delivery Ops)
- **FoodAdminDashboard** (Admin Ops)

> This file only routes to those dashboards; follow their internal UI for exact actions.

---

## 8) Troubleshooting
- Menu fails to load:
  - try selecting the restaurant again
- Checkout validation fails:
  - read checkoutMessage; adjust coupon/referral/tip/schedule/redeem points/payment method
- Order tracking fails:
  - retry Track Order; ensure backend is reachable
- Issue/dispute not submitted:
  - choose an issue type and add a non-empty description
