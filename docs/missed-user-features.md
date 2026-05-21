# Missed / Incomplete User-Facing Features (module scan)

This file summarizes user-visible feature gaps found during a code scan of `src/modules` (and routing context from `src/App.js`).

## 1) Freelancer module: multiple subfeatures are stubbed (“coming soon”)

Located in:
- `src/modules/freelancer/components/EmergencyTab.js`
  - UI text: **“Emergency services coming soon”**
  - Missing feature for users: the actual emergency-services workflow (request, connect, tracking, etc.).

- `src/modules/freelancer/components/DisputesManagement.js`
  - UI text: **“list, detail, resolve coming soon”**
  - Missing feature for users: viewing disputes, dispute detail, and resolving disputes.

- `src/modules/freelancer/components/PlansTab.js`
  - UI text: **“plan purchase/renewal coming soon”**
  - Missing feature for users: plan selection, purchase/renewal, billing/subscription management.

- `src/modules/freelancer/components/ReportsManagement.js`
  - UI text: **“list, detail, audit trail coming soon”**
  - Missing feature for users: user-facing reports management + audit trail view.

- `src/modules/freelancer/components/PostJobTab.js`
  - UI text: **“job post form coming soon”**
  - Missing feature for users: posting jobs (create job form, validation, preview, publish).

- `src/modules/freelancer/components/KycApprovalQueue.js`
  - UI text: **“approve/reject actions coming soon”**
  - Missing feature for users: KYC queue actions (approve/reject) and associated state changes.

## 2) Hotel Booking module: sample/static data placeholder (API not wired)

Located in:
- `src/modules/hotelbooking/HotelBooking.js`
  - Comment: **“TODO: Move to backend and fetch from API”**
  - Missing feature for users: real hotel listings from backend (current UX likely uses `SAMPLE_HOTELS` only).

## 3) System-wide: multiple modules contain user-facing placeholder/sample input values

This is not necessarily a functional gap, but it often correlates with incomplete flows. Found examples include:
- Astrology: search fields and wizard steps that rely on placeholders in `src/modules/astrology/AstrologyQuickStartPanel.js`
- Business Builder: many onboarding inputs use example placeholders in `src/modules/businessbuilder/BusinessBuilder.js`
- Bill Pay: placeholder samples for phone/PIN/OTP/TXN ids in `src/modules/billpay/BillPayHub.js`

For each module, placeholders may be benign (just UX text), but they should be checked against:
- backend wiring
- saving/persistence
- post-submit navigation and receipts/confirmation states

## 4) Admin/operations UX may be incomplete depending on backend availability

Routing exists, but user-visible “missing features” can still occur when dependent backend endpoints are down or stubbed. For example, route gating is controlled by:
- `src/App.js` toggle-controlled module IDs and admin/public app-data

If an admin-visible module is reachable but empty, users may experience “feature missing” even when UI code exists.

---

## Quick list (actionable gaps)
- Freelancer: Emergency services workflow missing (stub).
- Freelancer: Dispute management missing (stub).
- Freelancer: Plans purchase/renewal missing (stub).
- Freelancer: Reports management & audit trail missing (stub).
- Freelancer: Post job form missing (stub).
- Freelancer: KYC approval queue actions missing (stub).
- Hotel Booking: real hotel API integration missing (static sample data placeholder).

## Evidence locations
- `src/modules/freelancer/components/*` (each file contains “coming soon” stub text)
- `src/modules/hotelbooking/HotelBooking.js` (comment “TODO: Move to backend and fetch from API”)
- `src/App.js` (routing + module gating context)

