# Local Market & Grocery Delivery User Manual (Front-End)

> Module: `src/modules/localmarket/LocalMarket.js`  
> Product name in UI: **Local Market & Grocery Delivery**

## 1) What this module does
LocalMarket is a local grocery + essentials delivery app with:
- Role-based views: **Buyer**, **Shop Owner**, **Delivery Partner**, **Admin**
- Shop discovery by search + type + sorting
- Browse products per shop
- Add items to cart and place orders
- Promo code discounts
- Order history + status
- Leave reviews for completed orders
- Shop owner tools: add shop

## 2) Entry point in the app
1. Open **LocalMarket** from main navigation/menu.
2. Choose a role in the **View as** selector (Buyer / Shop Owner / Delivery Partner / Admin).

## 3) Buyer view: browse shops
### 3.1 Use the toolbar
In Buyer → Browse tab:
- **Search shops** (search by name/type)
- **Filter type** (All + shop types)
- **Sort by**
  - Rating
  - Distance
  - Delivery time
- Buttons:
  - **My Orders**
  - **Cart** (opens checkout modal)

### 3.2 Browse shop cards
Each shop card shows:
- rating, delivery time, distance
- discount label
- promoted badge (if promoted)
- quick action:
  - **Browse Products**

## 4) Buyer view: browse products
1. Click **Browse Products** for a shop.
2. You’ll see products from that specific shop including:
   - image, name, category, description
   - price and MRP
   - quantity available

3. Click **Add to Cart** for items you want.

Cart rules (important):
- If your cart currently has items from another shop, adding items from a different shop will **clear the cart** (with confirmation).

## 5) Cart + Checkout (modal)
When you open the Cart button:
- You can change quantities with **− / +**
- Checkout requires:
  - **Delivery Address**
  - **Delivery Type** (Home Delivery / Store Pickup)
  - **Payment Method**:
    - UPI, Card, Wallet, Cash on Delivery, Net Banking
  - **Special Instructions** (optional)
  - **Promo Code**:
    - SAVE100, FIRST20, FREEDEL, FRESH15 (shown as selectable buttons)

Price breakdown:
- Subtotal
- Discount (if promo is applied)
- Delivery charge (home delivery depending on shop free-delivery threshold)
- Total

## 6) Place order
1. Click **Place Order**.
2. The order is created as:
   - status: **Order Confirmed**
3. The cart is cleared and checkout modal closes.

Expected result:
- The order appears in **My Orders**.

## 7) My Orders (order history)
In Buyer → Orders:
- Each order card shows:
  - shop name
  - order status
  - order id and date
  - items list (name × quantity)
  - totals (subtotal/discount/delivery/total)
- Action:
  - **Leave Review** button

## 8) Leave Review (modal)
1. Click **Leave Review** on an order.
2. Select rating (1 to 5 stars).
3. Add comment.
4. Click **Submit Review**.

Expected result:
- Review is submitted (demo alert) and modal closes.

## 9) Shop Owner view: add a shop
When role is **Shop Owner**:
1. Click **➕ Add New Shop**.
2. Fill:
   - Shop name
   - Shop type
   - Delivery charge
   - Minimum order
   - Free delivery above
3. Click **Create Shop**.

Expected result:
- The new shop is added to the shop list.
- Shop owner can manage products/orders via buttons (demo UI).

## 10) Troubleshooting
- Cart is empty / order not placed:
  - add items first
  - ensure delivery address is filled
- Promo code invalid:
  - use one of the promo buttons listed in UI
- Adding products clears cart:
  - cart supports only one shop at a time in this build

## 11) UI sections reference (quick)
- Buyer → Browse: search/filter/sort + shop cards
- Buyer → Products: product grid + Add to cart
- Checkout modal: address, delivery type, payment method, special instructions, promo
- Buyer → Orders: order cards + Leave Review
- Shop Owner: Add New Shop modal
