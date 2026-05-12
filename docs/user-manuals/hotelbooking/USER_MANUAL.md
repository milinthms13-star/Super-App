# Hotel Booking User Manual (Front-End)

> Module: `src/modules/hotelbooking/HotelBooking.js`

## 1) What this module does
Hotel Booking helps users search for hotels, select dates/locations, and complete hotel booking requests (subject to availability and enabled payment options).

## 2) Entry point
1. Login.
2. Open **Hotel Booking** from app navigation.
3. The module typically loads on a search/start screen.

## 3) Step-by-step user flows

### 3.1 Search hotels
1. Open the Hotel Booking module.
2. Enter:
   - destination/location (or select from suggestions)
   - check-in date
   - check-out date
   - (optional) number of guests/room preferences
3. Click **Search**.

Expected result:
- Hotel options appear with price, availability, and basic details.

### 3.2 View hotel details
1. Click a hotel card/listing.
2. Review:
   - room types and rates (if shown)
   - amenities
   - cancellation/house rules (if available)

Expected result:
- Hotel detail page shows more information and booking actions.

### 3.3 Select room and book
1. Choose a room/rate option (if supported).
2. Confirm guest count/preferences.
3. Proceed to booking/checkout step.
4. Submit booking request (and payment if integrated).

Expected result:
- Booking confirmation is shown and appears in “My Bookings” if enabled.

### 3.4 View bookings
1. Open **My Bookings** / **Bookings** (if present).
2. Select a booking to see status/details.

Expected result:
- Status, booking reference, and relevant details are visible.

## 4) Troubleshooting (UI-level)
- Search returns nothing:
  - Adjust dates or location.
  - Try fewer filters (if any).
- Booking submission fails:
  - Verify login.
  - Confirm all required fields (guest/room selection).
  - Retry after network recovery.

## 5) UI sections reference
- Search form
- Hotel cards/listing
- Hotel detail + room/rate selection
- Booking confirmation
- My Bookings view
