# Food Delivery Module Gap Analysis

**Prepared:** May 8, 2026  
**Scope:** Compare the current codebase against a Swiggy/Zomato/Uber Eats style feature checklist for a super app food delivery module  
**Method:** Code-evidence review of frontend modules, service layer, auth/profile routes, backend routes, models, queue jobs, dashboards, and roadmap documentation

## Executive View

**MVP launch coverage:** **8.8/10**  
**Competitor parity coverage:** **7.4/10**

The Food Delivery module now covers most of the first-release baseline that a production MVP or investor demo needs. It is no longer just a storefront and checkout demo. The codebase shows real customer, rider, restaurant, and admin operations depth.

Where it still falls short of Swiggy/Zomato/Uber Eats parity is the last 20 to 30 percent that users notice immediately in mature delivery apps: frictionless first-order conversion, communication tooling, stronger payment execution, deeper restaurant analytics, and dispatch optimization.

### Strong areas

- Dedicated food auth, profile, and address stack with OTP, email/password, and social login
- Discovery, menu, cart, checkout, coupon, wallet, tip, loyalty, referral, and scheduled delivery flows
- Rider profile, availability, assignment, tracking, location push, and SOS operations
- Restaurant governance, team roles, audit trail, availability controls, and order management
- Admin dashboard, order monitoring, dispute handling, and audit log visibility
- ETA, traffic multiplier, and route-strategy groundwork for smarter delivery estimates

### Biggest remaining gaps

- Guest checkout and lower-friction first-order conversion
- Map-native tracking and customer-to-rider communication
- External gateway execution and reconciliation depth for UPI/card/net banking
- Distance-based delivery fee, batching, geofencing, and surge-style dispatch controls
- Richer restaurant merchandising, analytics, offers, and inventory tooling
- Media-heavy reviews, combo merchandising, and super-app hyperlocal basket integration

## Evidence Reviewed

- Roadmap: `TODO_FOODDELIVERY_OPTIMIZATION.md`
- Customer app: `src/modules/fooddelivery/FoodDelivery.js`
- Rider app: `src/modules/fooddelivery/DeliveryPartnerDashboard.js`
- Restaurant panel: `src/modules/fooddelivery/RestaurantDashboard.js`
- Admin panel: `src/modules/fooddelivery/FoodAdminDashboard.js`
- Frontend service: `src/services/foodDeliveryService.js`
- Food delivery routes: `backend/routes/fooddelivery.js`
- Food auth/profile routes: `backend/routes/foodDeliveryAuthRoutes.js`
- Auth/profile services: `backend/services/FoodDeliveryAuthService.js`, `backend/services/FoodDeliveryUserProfileService.js`
- Core store logic: `backend/utils/foodStore.js`
- Models: `backend/models/FoodOrder.js`, `backend/models/Restaurant.js`, `backend/models/MenuItem.js`, `backend/models/FoodDeliveryUser.js`, `backend/models/FoodDeliveryAddress.js`
- Queue/live updates: `backend/jobs/foodOrderQueue.js`
- Tests/intended scope: `src/modules/fooddelivery/FoodDelivery.test.js`

## Reality Check

### What the code clearly supports now

- OTP, email/password, and social login flows for food delivery users
- Profile CRUD plus multi-address management with default address handling
- Restaurant listing, menu retrieval, cart persistence, and restaurant-specific checkout
- Coupon application, wallet usage, COD, payment method selection, GST, tip, loyalty, and referral hooks
- Order creation, order history, cancellation, refund-to-wallet, disputes, and tracking retrieval
- Rider onboarding, availability updates, assigned orders, location pushes, order status updates, and SOS
- Restaurant-side order updates, rider assignment, menu availability, restaurant availability, and team governance
- Admin analytics, filtered food order monitoring, dispute resolution, and audit log review

### What this means

This module is a credible end-to-end MVP and a much stronger super app comparison story than a typical half-built food delivery add-on.

It is still not at full competitor parity because several high-visibility operational features are either basic, thin, or absent.

## Competitor Checklist Coverage

Status legend:

- `Implemented`: clearly supported in current code paths
- `Implemented basic`: supported, but still lighter than mature delivery apps
- `Partial`: data model or route support exists, but UX or operations depth is still thin
- `Missing`: not evidenced in the current module

### Customer App Features

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| Mobile OTP login | Must-have | Implemented | Food auth routes and `FoodDeliveryAuthService.js` provide OTP send and verify flows |
| Email/password login | Must-have | Implemented | Food auth routes and password-based auth service exist |
| Social login (Google/Apple/Facebook) | Stretch | Implemented | `FoodDeliveryAuthService.js` handles Google, Apple, and Facebook providers |
| Guest checkout | Stretch | Missing | Authenticated user context is assumed through current cart and order flows |
| Profile management | Must-have | Implemented | Food profile routes and profile service support CRUD and preferences |
| Address management | Must-have | Implemented | Dedicated address routes, service methods, and `FoodDeliveryAddress.js` exist |
| Multiple saved addresses | Must-have | Implemented | Address service enforces up to five saved addresses with default switching |
| Nearby restaurants | Must-have | Partial | Restaurant location and distance fields exist, but address-aware ranking is not clearly surfaced in the current customer UI |
| Search restaurant/food | Must-have | Partial | Restaurant search is visible in `FoodDelivery.js`; cross-menu food search is not obvious |
| Filter by cuisine | Must-have | Implemented basic | Customer UI has cuisine filter controls |
| Veg/non-veg filter | Must-have | Partial | Menu model has `vegetarian`, but visible filtering is still limited |
| Ratings and reviews | Must-have | Partial | Restaurant review and rating data exist; social-proof UX remains light |
| Open/closed status | Must-have | Partial | Restaurant `open` state exists, but customer-facing presentation is still basic |
| Delivery time estimation | Must-have | Implemented basic | Restaurant cards and ETA snapshots expose delivery timing |
| Restaurant photos | Must-have | Partial | Restaurant image fields exist, but current UI still relies heavily on placeholders |
| Featured restaurants | Stretch | Partial | `Restaurant.promoted` exists, but spotlight merchandising is not strong in the current customer view |
| AI recommendations | Stretch | Implemented basic | Recommendation endpoint and "Recommended for this order" block are present |

### Menu Management

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| Categories and subcategories | Must-have | Partial | Category support exists in models and menu APIs; UX depth is still basic |
| Food variants (half/full) | Must-have | Implemented basic | Variant pricing and availability are modeled and passed through checkout |
| Add-ons/toppings | Must-have | Implemented basic | Add-on selection and pricing are wired end to end |
| Combo offers | Stretch | Missing | No visible combo-builder or bundle offer flow |
| Dynamic pricing | Stretch | Missing | Checkout pricing is not dynamically varied by demand or time in the visible module |
| Item availability toggle | Must-have | Implemented basic | Restaurant dashboard supports menu item availability updates |
| Food images | Must-have | Partial | Item image fields exist, but visible presentation is light |
| Nutritional info | Optional | Partial | Menu item schema exposes calorie-related fields, but UX is limited |
| Preparation time | Stretch | Implemented basic | Prep time is surfaced in menu items and used in ETA snapshots |

### Cart, Checkout, and Payments

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| Add/remove cart items | Must-have | Implemented | Cart routes and persisted cart state exist |
| Quantity update | Must-have | Implemented | Quantity changes are supported through cart normalization and persistence |
| Coupon code support | Must-have | Implemented basic | Coupon resolution exists in `foodStore.js` and customer UI |
| Wallet support | Stretch | Implemented basic | Wallet usage and refund-to-wallet behavior are wired into checkout/order flows |
| Delivery fee calculation | Must-have | Implemented basic | Delivery fee is calculated in checkout summary, but not distance-based |
| Tax/GST calculation | Must-have | Implemented basic | Checkout summary returns GST and tax values |
| Tip delivery partner | Stretch | Implemented basic | Tip amount is part of cart, checkout summary, and order storage |
| Scheduled delivery | Stretch | Implemented basic | Scheduled delivery validation and storage exist |
| Multiple payment methods | Must-have | Implemented basic | Customer UI and `FoodOrder.paymentMethod` support COD, wallet, UPI, card, and net banking |
| UPI | Must-have | Partial | Payment method selection exists, but external execution flow is still thin |
| Credit/debit card | Must-have | Partial | Payment method selection exists, but gateway capture/reconciliation depth is unclear |
| Net banking | Must-have | Partial | Supported as a selected payment method, not clearly as a full gateway flow |
| Cash on delivery | Must-have | Implemented basic | COD is a first-class payment method in the current flow |
| Wallet payments | Stretch | Implemented basic | Wallet-backed checkout is implemented more deeply than external gateways |
| Refund management | Must-have | Implemented basic | Cancel/refund logic exists with wallet credit handling |

### Order Management and Live Tracking

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| Real-time order status | Must-have | Implemented basic | Status changes, queue events, and live update primitives exist |
| Map-based live tracking | Must-have | Partial | Tracking coordinates and route history exist, but the customer UI is text-based rather than map-based |
| Delivery partner tracking | Must-have | Implemented basic | Order tracking endpoint returns rider and tracking state |
| ETA updates | Must-have | Implemented basic | ETA snapshot, traffic multiplier, and recalculation logic are present |
| Push notifications | Must-have | Partial | Notification events are emitted in backend flows, but visible end-user notification UX is still light |
| SMS notifications | Stretch | Missing | No strong code evidence of food-specific SMS delivery events |
| Call delivery partner | Must-have | Missing | No visible rider-call action in customer flow |
| Chat with delivery partner | Stretch | Missing | No food-specific customer-rider chat flow is evident |
| Order placed | Must-have | Implemented | Order creation flow is in place |
| Restaurant accepted | Must-have | Implemented basic | Restaurant status update flow exists |
| Preparing food | Must-have | Implemented basic | Order status flow includes preparation updates |
| Pickup assigned | Must-have | Implemented basic | Rider assignment route and auto/manual assignment logic exist |
| Out for delivery | Must-have | Implemented basic | Rider status updates support delivery progression |
| Delivered | Must-have | Implemented | Rider and restaurant status flows support delivered state |
| Cancelled/refunded | Must-have | Implemented basic | Cancellation and refund handling exist |

### Delivery Partner Module

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| Rider registration | Must-have | Implemented basic | Rider profile creation route and dashboard exist |
| Document upload | Must-have | Partial | Rider profile accepts document payloads, but the current rider dashboard does not expose a dedicated upload workflow |
| KYC verification | Must-have | Partial | KYC status is inferred in backend logic, but reviewer workflow depth is thin |
| Online/offline toggle | Must-have | Implemented | Rider dashboard and availability route support this directly |
| Accept/reject order | Must-have | Partial | Assigned-order flow exists, but explicit accept/reject UX is not strong |
| Google Maps navigation | Must-have | Missing | No map navigation integration is visible in rider UI |
| Earnings dashboard | Must-have | Missing | No rider earnings or settlement dashboard is visible |
| Daily payout report | Must-have | Missing | No payout reporting workflow is evident |
| Order history | Must-have | Partial | Rider order route supports active/completed retrieval, but the dashboard is still basic |
| Emergency SOS | Stretch | Implemented basic | Rider SOS route, UI, and admin visibility exist |

### Restaurant Panel

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| Restaurant registration | Must-have | Missing | Managed-restaurant operations exist, but an explicit onboarding flow is not evident in the current food panel |
| Menu management | Must-have | Partial | Menu fetch and availability toggle exist, but add/edit/delete depth is still thin |
| Order accept/reject | Must-have | Implemented basic | Restaurant order routes and dashboard status controls exist |
| Inventory management | Stretch | Missing | No strong stock or depletion workflow is visible |
| Sales analytics | Stretch | Partial | Permission scaffolding exists, but dedicated restaurant analytics UX is still light |
| Offer creation | Stretch | Missing | No restaurant-side offer builder is visible |
| Delivery timing setup | Must-have | Implemented basic | Restaurant dashboard can update prep timing/open state |
| Restaurant availability toggle | Must-have | Implemented basic | Restaurant open/closed control exists |
| Staff management | Stretch | Implemented basic | Governance, team roles, permissions, and recent audit log exist |

### Admin Panel

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| User management | Must-have | Partial | Shared platform likely has user management, but not a deep food-specific admin UX here |
| Restaurant management | Must-have | Partial | Admin visibility exists, but approval/governance tooling is still operational rather than lifecycle-complete |
| Delivery partner management | Must-have | Partial | Admin dashboards see orders and rider SOS state, but partner management is still light |
| Commission settings | Must-have | Missing | No visible commission configuration flow |
| Order monitoring | Must-have | Implemented basic | `FoodAdminDashboard.js` and `/admin/orders` support monitoring and filters |
| Coupon management | Must-have | Partial | Coupon enforcement exists in backend logic, but dedicated food admin management UI is not evident |
| Banner management | Stretch | Missing | No visible banner workflow |
| Category management | Must-have | Missing | No dedicated food category admin flow is visible |
| Refund management | Must-have | Partial | Refund handling exists in order lifecycle, but approval workflow depth is limited |
| Reports and analytics | Stretch | Implemented basic | Admin dashboard surfaces order, rider, dispute, and governance metrics |
| Dispute management | Stretch | Implemented basic | Admin UI supports dispute review and state transitions |

### Advanced, Optimization, and Security

| Feature | Priority | Current Status | Evidence / Notes |
|---|---|---|---|
| AI food recommendation | High | Implemented basic | Recommendation scoring exists based on popularity and cart context |
| Subscription plans | High | Missing | No food subscription workflow is visible |
| Group ordering | High | Missing | No shared cart or multi-user order flow exists |
| Voice ordering | Medium | Missing | No food-order voice flow is evident |
| Multi-language support | High | Shared platform partial | Platform i18n exists, but food-specific localization depth is not verified here |
| Real-time chat | High | Missing | No customer-rider or customer-restaurant food chat flow is visible |
| Smart route optimization | High | Implemented basic | ETA snapshots use traffic multiplier, route strategy, and live tracking recalculation |
| Dark mode | Medium | Shared platform partial | Not assessed as a food-specific differentiator here |
| Loyalty and reward points | High | Implemented basic | Loyalty earn/redeem flows are present in checkout and order data |
| Referral system | High | Implemented basic | Referral code support and summary data are wired in |
| Auto rider assignment | Stretch | Implemented basic | `assignRiderToOrder` supports auto and manual assignment |
| Distance-based delivery fee | Must-have | Missing | Delivery charge is subtotal-threshold based, not distance aware |
| Geo-fencing | Stretch | Missing | No delivery-zone enforcement flow is clearly visible |
| Multiple orders per rider | Stretch | Missing | Current assignment logic prevents active overlap rather than enabling batching |
| Peak hour surge pricing | Stretch | Missing | Traffic affects ETA, but not visible price surge behavior |
| OTP order verification | Must-have | Missing | No delivery-confirmation OTP flow is visible |
| Fraud detection | Stretch | Missing | No food-specific fraud or anomaly workflow is evident |
| Secure payment gateway | Must-have | Partial | Payment method selection exists, but mature capture and reconciliation depth is still thin |
| Admin audit logs | Stretch | Implemented basic | Restaurant audit entries and food admin audit log route are present |
| Role-based access | Must-have | Implemented basic | Restaurant/admin/rider permission checks exist in routes and governance logic |

## Best Features to Beat Competitors

| Differentiator | Value | Current Status | Notes |
|---|---|---|---|
| Timer-based cooking workflow | High | Partial | Prep-time controls exist, but there is no dedicated kitchen countdown workflow yet |
| AI delivery estimation | High | Implemented basic | ETA, traffic multiplier, and route strategy are already present |
| Unified super app wallet | High | Implemented basic | Food module uses wallet flows and the wider platform already has a wallet system |
| Community reviews with images/videos | High | Missing | Current review depth is text-and-rating oriented |
| Hyperlocal marketplace integration | High | Partial | The platform has adjacent modules, but not a unified food plus grocery plus pharmacy basket flow |
| Smart combo recommendation | High | Partial | Recommendation engine exists, but bundle/combo merchandising does not |
| Emergency SOS for riders | High | Implemented basic | Already a meaningful differentiator in current rider/admin flows |

## Suggested MVP for First Release

This checklist is enough for a strong production-minded MVP and investor demo. Current evidence suggests the module is already close on most of these:

| MVP Feature | Current Status | Notes |
|---|---|---|
| User login | Implemented | OTP, email/password, and social login exist |
| Restaurant listing | Implemented | Core restaurant browse flow is present |
| Search/filter | Implemented basic | Good enough for MVP, but food-level search should improve later |
| Cart and checkout | Implemented basic | Core checkout works with coupons, wallet, tip, and scheduling |
| Online payment and COD | Partial | COD is stronger than external gateway execution today |
| Live order tracking | Implemented basic | Tracking data is present; map UX can come later |
| Delivery partner app | Implemented basic | Rider dashboard supports core operating flow |
| Restaurant panel | Implemented basic | Order ops, availability, and staff access are present |
| Admin dashboard | Implemented basic | Admin analytics, disputes, and audit visibility exist |
| Notifications | Partial | Backend eventing exists, but customer-facing notification UX is still lighter than mature apps |
| Coupons | Implemented basic | Coupon application and validation are in place |

## Score Breakdown

| Category | Score | Notes |
|---|---:|---|
| Customer app fundamentals | 8.4/10 | Strong auth/address base, but guest checkout and richer discovery still lag |
| Menu and merchandising | 7.5/10 | Variants and add-ons are solid; combo and rich media depth are still missing |
| Checkout and payments | 8.0/10 | Good MVP coverage, but external payment execution still needs hardening |
| Order lifecycle and tracking | 8.2/10 | Core lifecycle is believable; map UX and communication are still thin |
| Rider operations | 7.8/10 | Core rider ops exist, but navigation, earnings, and payouts are absent |
| Restaurant operations | 8.1/10 | Good ops and governance baseline; deeper analytics and inventory remain |
| Admin and governance | 7.9/10 | Better than many MVPs because disputes and audit visibility already exist |
| Competitive differentiation | 6.3/10 | AI ETA, wallet, loyalty, referral, and SOS help, but major parity wins are still pending |

## Priority Fix Order

### Priority 1: Close obvious parity gaps

1. Add guest checkout for first-order conversion.
2. Harden UPI, card, and net banking execution plus reconciliation.
3. Add map-based tracking, rider call, rider chat, and SMS notifications.
4. Upgrade restaurant discovery with better nearby ranking, featured merchandising, and veg/non-veg filters.

### Priority 2: Improve delivery economics and operations

1. Replace subtotal-only delivery fee logic with distance-aware pricing.
2. Add geofencing, batching, and optional surge controls.
3. Build rider earnings and payout reporting.
4. Add restaurant inventory, offers, and analytics depth.

### Priority 3: Add super app differentiation

1. Introduce timer-based kitchen workflow.
2. Add smart combos and "people also ordered" merchandising.
3. Add media reviews and stronger social proof.
4. Connect food delivery to a broader hyperlocal basket story across super app modules.

## Final Assessment

If judged as a demo or launchable MVP, this module is in a strong position.

If judged against mature Swiggy/Zomato/Uber Eats parity, it is still in the upper-middle stage: strong operational groundwork, credible multi-actor workflows, but not yet fully polished in payments, communication, and optimization.

**Best short label:**  
**"Strong MVP with real operations depth, but not yet full delivery-app parity."**
