# DEVADARSHAN Module Documentation

## Overview
`Devadarshan` is a temple discovery, vazhipadu booking, donation, and devotional profile module.

As of this update, the module is implemented with **backend + DB persistence only** and no local browser storage dependency for operational data.

## Frontend Entry Points
- `src/modules/devadarshan/DevadarshanHub.js`
- `src/modules/devadarshan/DevadarshanHub.css`

## Backend Entry Points
- Route: `backend/routes/devadarshan.js`
- Models:
  - `backend/models/DevadarshanTemple.js`
  - `backend/models/DevadarshanEvent.js`
  - `backend/models/DevadarshanBooking.js`
  - `backend/models/DevadarshanDonation.js`
  - `backend/models/DevadarshanUserState.js`

## API Contract
Base path: `/api/devadarshan`

### User APIs
- `GET /bootstrap`
  - Returns catalog + user state + bookings + donations.
- `POST /bookings`
  - Creates booking with validation.
- `PATCH /bookings/:bookingCode/cancel`
  - Cancels booking for owner/admin.
- `POST /bookings/:bookingCode/payments/initiate`
  - Starts gateway payment (Razorpay/Stripe) using configured backend credentials.
- `POST /bookings/:bookingCode/payments/verify`
  - Verifies and captures payment result.
- `POST /donations`
  - Creates donation receipt record.
- `POST /profile`
  - Saves devotional profile preferences.
- `POST /family`
  - Adds family nakshatra profile.
- `DELETE /family/:memberId`
  - Removes family member.
- `POST /preferences/favorites/:templeId/toggle`
- `POST /preferences/events/:eventId/toggle`
- `POST /preferences/live/:templeId/toggle`

### Admin APIs
- `POST /admin/temples`
- `POST /admin/events`
- `PATCH /admin/temples/:templeId/verify`
- `PATCH /admin/bookings/:bookingCode/status`

All admin endpoints require authenticated admin privileges at backend middleware level.

## Data Ownership
- Temple/event catalog: DB-backed collections.
- Bookings/donations: DB-backed collections.
- User profile/favorites/family/notifications/reminder selections: DB-backed user state.
- Receipts: generated client-side as text export from DB-sourced records.

## Production Notes
- Payment flows require active gateway credentials in `PaymentGateway` collection.
- Stripe/Razorpay key config must be present for checkout initiation and verification.
- No localStorage is used for business state persistence.

## Testing
- Frontend helper tests:
  - `src/modules/devadarshan/DevadarshanHub.test.js`
- Backend route schema tests:
  - `backend/tests/devadarshan.route.test.js`

