# Tourism Marketplace User Manual (Front-End)

> Module: `src/modules/tourism/TourismMarketplace.js`

## 1) What this module does
Tourism Marketplace helps users discover tourism/travel experiences (tours, activities, stays, and related offerings depending on what’s enabled) and then browse details and request/booking experiences.

## 2) Entry point
1. Login.
2. Open **Tourism** from navigation.
3. The module typically loads on an experience listing or travel marketplace home view.

## 3) Step-by-step user flows

### 3.1 Browse experiences
1. Open Tourism module.
2. Browse tiles/cards for tours/activities/offers.
3. Use filters/search (if provided).
4. Click an experience to open details.

Expected result:
- Experience detail page opens with itinerary/description and booking actions (if supported).

### 3.2 Request / book an experience
1. On the details screen, click **Book**, **Request**, or equivalent CTA.
2. Select dates/options (if available).
3. Fill required fields (number of guests, notes, contact details).
4. Submit.

Expected result:
- Booking/request confirmation appears and the item shows in your activity area (if enabled).

### 3.3 View bookings / status
1. Open “My Bookings” / “My Requests” / activity section (if present).
2. Select a booking to view status and details.

Expected result:
- Status updates and reference/confirmation info are visible.

## 4) Troubleshooting (UI-level)
- No results:
  - Try clearing filters.
  - Adjust date range/keywords.
- Booking/request failing:
  - Verify login/session.
  - Confirm required fields are filled.
  - Retry after checking network.

## 5) UI sections reference
- Experiences listing/cards
- Experience detail page
- Booking/request form
- My Bookings / activity/status view
