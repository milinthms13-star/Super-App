# Hyperlocal User Manual (Front-End)

> Module: `src/modules/hyperlocal/HyperlocalDeliveryHub.js`  
> Product name in UI: **Nila Hyperlocal Delivery**

## 1) What this module does
HyperlocalDeliveryHub helps users:
- Discover nearby shops by category and search
- Favorite shops
- Place hyperlocal orders (instant or scheduled)
- Enable special options:
  - Emergency pharmacy request
  - Prescription upload
  - One delivery from multiple shops (multi-shop mode)
- Track orders and view recent order history
- Register as a vendor (shop listing)
- Onboard as a delivery partner (delivery jobs + accept)
- Admin set up commission/zone/featured fee settings (demo)

## 2) Entry point in the app
1. Open **Hyperlocal Delivery** from main navigation/menu.

## 3) Hero + shop discovery
At the top you can:
- Search nearby shops using **Search nearby shops**
- Choose a category chip:
  - All
  - Grocery, Pharmacy, Food, Parcel, Vegetables & Fruits, Meat & Fish, Bakery, Stationery, Pet Supplies

The module shows shop cards for the filtered result set.

## 4) Shop cards: key details and actions
Each shop card displays:
- Shop name
- Category
- Distance (km)
- Rating
- Open/Closed status, radius, ETA
- Available coupons

Shop actions:
- **Select shop**  
  - fills the order form with that shop id and category
- **Favorite / Unfavorite**  
  - toggles shop in your favorites list

## 5) Place Hyperlocal Order (user flow)
Use **Place Hyperlocal Order** to place an order.

### 5.1 Fill order form
Required/important fields:
- Delivery type:
  - instant
  - scheduled
- Category (auto-filled from selection)
- Shop (select from dropdown; must be selected)
- Address (must not be empty)
- Payment mode:
  - UPI
  - COD
  - Card
  - Wallet
- Delivery instructions (optional text)
- Options (checkboxes):
  - Emergency pharmacy request
  - Prescription uploaded
  - One delivery from multiple shops (multiShopMode)

### 5.2 Submit order
1. Click **Place order**.
2. After submit, the module confirms the order and sets order status:
   - instant → “Partner assigned”
   - scheduled → “Scheduled”

Expected result:
- The order appears in **Recent orders** at the right panel.
- The order form resets after placement.

Validation:
- If shop is not selected or address is blank, you’ll see:
  - “Select shop and delivery address.”

## 6) Favorites and Order Tracking panel
This right-side panel includes:

### 6.1 Favorite shops
- Shows the list of your favorited shop names.

### 6.2 Recent orders
- Shows last orders (top 10 in this build) including:
  - order id
  - shop name
  - category
  - payment method
  - status

## 7) Vendor features (shop registration)
Use the **Vendor Features** form:

1. Enter:
   - Shop name
   - Category
   - Delivery radius (km)
   - Coupon code (optional)
2. Toggle:
   - Shop open status
3. Click **Submit vendor profile**.

Expected result (demo):
- Vendor status message shows the submitted details.

## 8) Delivery Partner features (onboarding + jobs)
Use the **Delivery Partner Features** form:

1. Enter:
   - Full name
   - Vehicle type (Bike/Scooter/Auto)
   - Service area
2. Toggle:
   - KYC verified
3. Click **Onboard partner**.

Then you’ll see **Delivery jobs** list:
- Each job shows:
  - id, pickup → drop, earning, status
- If status is not “Accepted”, you can click **Accept**.

Expected result:
- Job status updates to “Accepted”.

## 9) Admin features (demo configuration)
Use **Admin Features**:

- Commission (%)
- Delivery zone
- Featured listing fee
- Click **Apply admin settings**

Expected result:
- Admin status message summarises the settings.

## 10) Troubleshooting
- Order not accepted / order status not generated:
  - ensure you selected a shop and filled delivery address.
- Empty shop results:
  - change category filter to “All” and/or adjust search term.
- Favorites not showing:
  - confirm you clicked Favorite/Unfavorite on shop cards.

## 11) UI sections reference (quick)
- Shop discovery: search + category chips + shop cards
- Place order: delivery type + shop + address + payment + options
- Favorites & tracking: favorite shops + recent orders
- Vendor features: shop registration
- Delivery partner features: onboarding + job accept
- Admin features: commission/zone/featured listing fee settings
