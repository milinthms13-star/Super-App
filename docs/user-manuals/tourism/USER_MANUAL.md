# Tourism Marketplace User Manual (Front-End)

> Module: `src/modules/tourism/TourismMarketplace.js`

## 1) What this module does
**Tourism Marketplace** helps users discover tourism/travel experiences (tours, activities, stays, and related offerings depending on what’s enabled). You can:
- Browse and search experiences
- View experience details (itinerary, inclusions, availability—depending on your UI)
- Request or book an experience
- View booking/request status in your activity area

## 2) Entry point
1. Login.
2. Open **Tourism** from navigation.
3. The module typically loads on an experience listing or marketplace home view.

## 3) Main screen layout (what you see)

### 3.1 Experiences listing
- Tiles/cards for experiences (with basic info like title, location, price/starting price if available)
- Optional filters/search controls (if supported)

### 3.2 Experience detail view
- Itinerary/description
- Feature highlights / inclusions
- Date/options selection (if provided)
- Booking/request actions (CTA buttons)

### 3.3 My bookings / requests
- A list of your past and current bookings/requests
- Status + reference/confirmation details (if provided)

## 4) Step-by-step user flows

### 4.1 Browse experiences
1. Open **Tourism**.
2. Browse the experience tiles/cards.
3. (Optional) Use filters/search to narrow results.
4. Click an experience to open its details.

Expected result:
- The experience detail page opens with description/itinerary and booking actions (if supported).

### 4.2 Request / book an experience
1. On the details screen, click **Book**, **Request**, or the relevant CTA.
2. Select required options:
   - dates (if supported)
   - number of guests and any plan/options
3. Fill required fields:
   - guest/contact info (as requested by your UI)
   - notes/instructions (optional/required depending on your UI)
4. Submit the booking/request.

Expected result:
- You see a confirmation message.
- The experience appears in **My Bookings / My Requests** (if enabled).

### 4.3 View bookings / requests & status
1. Open **My Bookings** / **My Requests** / activity section (if present).
2. Select a booking/request item.
3. Review:
   - current status
   - confirmation/reference info
   - any updated details available in your UI

Expected result:
- Status updates and reference details are visible.

## 5) Troubleshooting (UI-level)

- No results found:
  - Clear filters.
  - Try adjusting keywords.
  - Expand date range / try broader location filters (if your UI supports it).

- Booking/request failing:
  - Verify your login/session is active.
  - Confirm all required fields are filled (date/options/guest details).
  - Retry after checking network connectivity.

- Confirmation not showing:
  - Refresh the page once after submission.
  - Check **My Bookings / My Requests** to locate the request by status.

## 6) UI sections reference
- Experiences listing/cards
- Filters/search controls
- Experience detail page (itinerary/description + options)
- Booking/request form (dates, guests, contact fields)
- My Bookings / My Requests / activity status view
