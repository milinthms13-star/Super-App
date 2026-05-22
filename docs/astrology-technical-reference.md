# AstroNila Astrology Module Technical Reference

## Purpose

This document explains the implementation structure, data flow, API surface, and integration points for the AstroNila Astrology module.

## Module scope

The module currently covers:

- Zodiac sign lookup and daily horoscope generation
- User astrology profile storage
- Kundli generation and PDF export
- Horoscope report export
- Consultation booking and consultant management
- Payment flow for consultation bookings
- Admin analytics and operational alerts
- Consultant dashboard workflows
- Frontend astrology home experience

---

## Frontend architecture

### Main entry component

**File:** `src/modules/astrology/AstrologyHome.js`

This component renders the main astrology experience and wires together:

- quick start profile panel
- zodiac sign chips
- feature tab navigation
- daily horoscope / today view
- Kundli view
- consultation view
- saved reports
- profile settings
- AI question flow
- mobile bottom navigation

### Supporting components

- `src/modules/astrology/AnalyticsDashboard.js`
- `src/modules/astrology/ConsultantAdminPanel.js`
- `src/modules/astrology/AstrologyQuickStartPanel.js`
- `src/modules/astrology/views/TodayView.js`
- `src/modules/astrology/views/KundliView.js`
- `src/modules/astrology/views/ConsultView.js`

### Frontend service

**File:** `src/services/astrologyService.js`

This service centralizes all HTTP calls to `/api/astrology` and also provides local fallback data for resilience.

---

## Frontend service contract

### Export

```js
export const astrologyService
```

### Key methods

#### Read endpoints
- `getSigns()`
- `getDailyHoroscope(sign)`
- `getProfile()`
- `getPanchangam()`
- `getFestivalUpdates()`
- `getKundliData(profile)`
- `getCompatibility(sign, partnerSign)`
- `askAstrologyAssistant(question, sign)`
- `getConsultants()`
- `getConsultationHistory()`
- `getConsultationPaymentStatus(bookingId)`
- `getAnalyticsDashboard(period)`
- `getAnalyticsAlerts(lookbackHours)`

#### Write / action endpoints
- `updateProfile(payload)`
- `updateProfileHistory(payload)`
- `downloadKundliReport(profile)`
- `downloadHoroscopeReport(sign, period, language)`
- `createConsultationBooking(payload)`
- `updateConsultationBookingStatus(bookingId, status)`
- `createConsultationPaymentOrder(bookingId)`
- `verifyConsultationPayment(bookingId, payload)`
- `downloadAnalyticsReport(period, format)`

### Error behavior

All remote calls throw a normalized error via `buildServiceError` with:

- `message`
- `status`
- `fallbackData`
- `cause`

This allows the UI to continue rendering fallback content when the backend is unavailable.

---

## Frontend state and behavior

### AstrologyHome controller

`useAstrologyHomeController()` is responsible for:

- active tab state
- selected zodiac sign
- language toggle
- saved profile state
- consultation and Kundli interactions
- AI prompt state
- report download state
- derived predictions and summaries

### Important UI state groups

- `profileApi`
- `consultApi`
- `kundliApi`
- `signs`
- `reading`
- `festivals`
- `panchangam`
- `assistantAnswer`
- `selectedSignDetails`

### Known dependency expectations

`AstrologyHome.js` expects the controller hook to provide:

- `FEATURE_TABS`
- `MOBILE_NAV_ITEMS`
- `GENDER_OPTIONS`
- `BIRTH_TIMEZONE_OPTIONS`
- `BIRTH_LOCATION_OPTIONS`
- `NAKSHATRA_NAMES`
- handlers such as `handleGenerateReport`, `handleQuickSave`, `handleAskAssistant`

If a controller export changes, the component contract must be updated together.

---

## Backend architecture

### Route module

**File:** `backend/routes/astrology.js`

This is the primary astrology API router and is mounted at:

```js
/api/astrology
```

### Supporting backend modules

- `backend/utils/astrologyData.js`
- `backend/models/AstrologyUserProfile.js`
- `backend/services/astrologyBackendService.js`
- `backend/services/astrologyProviderService.js`
- `backend/utils/astrologyBackendUpgradeHelpers.js`

---

## Backend data model

### AstrologyUserProfile

**File:** `backend/models/AstrologyUserProfile.js`

MongoDB schema for user profile storage.

#### Core fields
- `userId`
- `sign`
- `birthDate`
- `birthTime`
- `birthPlace`
- `birthTimezone`
- `nakshatra`
- `rashi`
- `lagna`
- `gender`

#### Nested objects
- `preferences`
- `notifications`

#### Arrays
- `familyProfiles`
- `savedReadings`
- `kundliHistory`
- `compatibilityHistory`

### Embedded schema summaries

#### `astrologyReadingSchema`
Stores daily horoscope history.

#### `familyProfileSchema`
Stores family member birth details.

#### `kundliHistorySchema`
Stores generated Kundli report metadata.

#### `compatibilityHistorySchema`
Stores compatibility check history.

---

## Static astrology data

### File
`backend/utils/astrologyData.js`

### Exports
- `zodiacSigns`
- `normalizeSign`
- `getSignDetails`
- `getReadingDateKey`
- `getDailyHoroscope`
- `calculateNakshatra`
- `calculateBirthAstroProfile`

### Responsibilities

- provides zodiac metadata
- computes deterministic daily horoscope text
- derives reading dates in India timezone
- estimates birth-based nakshatra and rashi from birth date/time

### Deterministic reading generation

`getDailyHoroscope(sign, date)` creates repeatable readings by hashing:

- sign
- India-date key

This keeps the same sign on the same date stable across requests.

---

## API endpoints

All routes live under `/api/astrology`.

### Public endpoints

#### `GET /signs`
Returns zodiac sign metadata.

#### `GET /daily/:sign`
Returns a daily horoscope for the selected sign.

#### `GET /panchangam`
Returns Panchangam data from the provider service or fallback content.

#### `GET /festivals`
Returns festival updates for the selected region/month/year.

#### `GET /consultants`
Returns consultant profiles.

### Authenticated endpoints

#### `GET /profile`
Returns the current user’s saved astrology profile.

#### `PUT /profile`
Creates or updates the current user’s profile.

#### `POST /kundli`
Generates a Kundli payload from the profile or provided birth data.

#### `POST /kundli/report`
Returns a Kundli PDF report.

#### `POST /compatibility`
Calculates zodiac compatibility.

#### `POST /assistant`
Returns an astrology assistant response.

#### `GET /consultants/:consultantId`
Returns a consultant profile when the user has access.

#### `PUT /consultants/:consultantId`
Updates consultant profile details.

#### `POST /consultants/add-slot`
Adds an availability slot for a consultant.

#### `DELETE /consultants/remove-slot`
Removes an availability slot.

#### `POST /consultations/book`
Creates a consultation booking.

#### `GET /consultations`
Lists the current user’s consultation bookings.

#### `GET /consultations/consultant-bookings`
Lists bookings for a consultant or admin.

#### `GET /consultations/consultant-earnings`
Returns consultant earnings summary.

#### `PATCH /consultations/:bookingId/status`
Updates booking status.

#### `POST /consultations/:bookingId/payment/create-order`
Creates a Razorpay payment order.

#### `POST /consultations/:bookingId/payment/verify`
Verifies a Razorpay payment.

#### `GET /consultations/:bookingId/payment`
Returns booking payment status.

#### `POST /payment/webhook/razorpay`
Processes Razorpay webhook events.

#### `GET /analytics/dashboard`
Returns admin analytics metrics.

#### `GET /analytics/alerts`
Returns operational alerts.

#### `GET /analytics/report`
Returns PDF or CSV analytics export.

#### `GET /horoscope/report`
Returns a horoscope PDF export.

#### `GET /experiments/variants`
Returns A/B experiment variants for the current user.

#### `POST /experiments/track`
Records experiment events.

#### `GET /experiments/results/:experimentName`
Returns experiment results for admins.

#### `GET /experiments`
Returns active experiments for admins.

---

## Validation rules

The route uses `express-validator` plus custom request validation.

### Common validators
- `profileValidators`
- `consultationBookingValidators`
- `consultationStatusValidators`
- `paymentCreateOrderValidators`
- `paymentVerifyValidators`
- `compatibilityValidators`
- `assistantValidators`
- `analyticsDashboardValidators`
- `analyticsAlertsValidators`
- `analyticsReportValidators`
- `horoscopeReportValidators`

### Validation response shape

Invalid requests return:

```json
{
  "success": false,
  "message": "Invalid request payload.",
  "errors": [
    {
      "field": "fieldName",
      "message": "validation message"
    }
  ]
}
```

---

## Authentication and authorization

### Auth middleware
The route imports:

```js
const authMiddleware = require('../middleware/auth');
```

and uses:

- `authenticate`
- `hasAdminPrivileges`

### Access control patterns

- **Profile / booking / payment routes:** authenticated users
- **Consultant routes:** consultant scope or admin scope
- **Analytics routes:** admin only
- **Booking ownership checks:** user owner, consultant, or admin depending on action

### Important guards

- `ensureConsultantScopeAccess`
- `ensureBookingAccess`
- `hasConsultantAccess`
- `isBookingOwner`

---

## Booking and payment flow

### Booking flow

1. User selects consultant and slot.
2. Server validates availability.
3. Server creates idempotent booking payload.
4. Reminder record is attempted.
5. Notification service sends booking messages.
6. Booking is returned to the client.

### Payment flow

1. Client requests payment order.
2. Server creates a Razorpay order.
3. Payment is verified using signature validation.
4. Booking status changes to confirmed when valid.
5. Webhook reconciliation also updates booking state.

### Webhook behavior

The webhook handler:
- validates signature
- deduplicates repeated events
- maps event payloads to bookings
- updates payment status and booking status
- writes operational audit records

---

## Report generation

### Kundli report
Generated via `buildKundliPdfStream`.

### Horoscope report
Generated via `buildHoroscopePdfBuffer(sign, period, language)`.

### Analytics report
Generated via `buildAnalyticsPdfStream(metrics, period)` or CSV export.

### Response headers
Downloads return:
- `Content-Type`
- `Content-Disposition`
- optional `Content-Length`

---

## Analytics

### Dashboard metrics
Built from consultation records and booking history.

Returned data includes:
- totalBookings
- completedBookings
- cancelledBookings
- totalRevenue
- averageRating
- topConsultants
- bookingTrends
- userRetention

### Operational alerts
Derived from system events such as:
- payment verification failures
- slot conflict spikes
- webhook errors

---

## Frontend/backend integration contracts

### Sign data
Frontend expects sign objects with:
- `sign`
- `label`
- `dateRange`
- `element`
- `color`
- `horoscope`

### Profile data
Frontend profile forms use:
- `birthDate`
- `birthTime`
- `birthPlace`
- `birthTimezone`
- `gender`
- `favoriteTopics`

### Consultant payload
Expected public consultant shape:
- `id`
- `name`
- `specialty`
- `rate`
- `amountInr`
- `availability`
- `availableSlots`
- `languages`
- `rating`
- `bio`

### Booking payload
Expected booking shape:
- `id`
- `consultantId`
- `consultantName`
- `slot`
- `preferredDate`
- `status`
- `confirmationCode`
- `amountInr`
- `currency`
- `paymentStatus`
- `paymentOrderId`
- `paymentId`
- `createdAt`

---

## Styling and asset files

### Frontend styles
- `src/styles/Astrology.css`
- `src/modules/astrology/AstrologyUpgrade.css`
- `src/modules/astrology/AnalyticsDashboard.css`
- `src/modules/astrology/ConsultantAdminPanel.css`

### Branding and static assets
- `public/logo.svg`
- `public/favicon.ico`
- `public/manifest.json`

---

## Runtime dependencies

### Frontend
- React
- Axios

### Backend
- Express
- express-validator
- mongoose
- crypto
- Razorpay integration through backend service layer

Before adding new imports, verify the package already exists in `package.json`.

---

## Current implementation notes

### Existing issue surfaced in frontend
`src/modules/astrology/AstrologyHome.js` currently references:

- `astrologyService`
- `DEFAULT_BIRTH_TIME_ZONE`

in places where they are not imported in the file as shown. That is an implementation defect, not a documentation issue, and should be fixed separately if the module is being executed in the current build.

### Route file size
`backend/routes/astrology.js` is a large integration router with many responsibilities. If future work expands it further, split analytics, payments, and consultation flows into smaller route modules.

---

## Production readiness notes

- Confirm `NODE_ENV=production` and `PORT` are configured in production.
- Configure `MONGODB_URI` and `REDIS_URL`; Redis is optional but recommended for astrology provider caching.
- Enable `ASTROLOGY_LIVE_MODE=true` only when `ASTROLOGY_PROVIDER_BASE_URL` and `ASTROLOGY_PROVIDER_API_KEY` are present.
- Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for live payment processing.
- Monitor backend logs for provider fallback warnings and webhook signature validation failures.
- Ensure analytics and consultant endpoints remain restricted to admin/consultant roles.

---

## Verification checklist

When modifying this module, verify:

- `GET /api/astrology/signs`
- `GET /api/astrology/daily/:sign`
- `GET /api/astrology/profile`
- `PUT /api/astrology/profile`
- `POST /api/astrology/kundli`
- `POST /api/astrology/consultations/book`
- `GET /api/astrology/analytics/dashboard`
- `GET /api/astrology/analytics/alerts`

Also verify:
- frontend build succeeds
- TypeScript or lint checks do not fail
- PDF download headers are correct
- authenticated routes reject unauthenticated access
- admin-only routes reject non-admin access

---

## Related documentation

- `docs/astrology-user-manual.md`

## Summary

The Astrology module is a full-stack feature with:
- deterministic horoscope generation
- persisted user profiles
- consultation and payment workflows
- PDF exports
- admin analytics
- consultant management

Frontend and backend must evolve together because the UI depends heavily on the service contract returned by `/api/astrology`.
