# AstroNila Astrology — “Super Module” Upgrade Checklist
**Generated:** 2026-05-13

## Current baseline (from repo evidence)
- Production readiness is already very strong.
- Repo evidence shows:
  - Auth + user scoping ✅ verified
  - Kundli PDF generation ✅ verified
  - Consultation booking flow ✅ verified
  - Placeholder cleanup + localization wrapper ✅ verified
  - Rate limiting + input sanitization ✅ verified
- Optional enhancements are implemented (payments, notifications, consultant admin panel, analytics, A/B testing).

## Super-module target
Make the module investor-grade and production-grade by completing the remaining “proof + operational depth” gaps.

---

## A) Must-have proof & reliability (highest priority)
1. **E2E test: Kundli PDF download**
   - Success: authenticated user downloads valid PDF blob in staging.
   - Failure handling: shows correct user error and logs safely.

2. **E2E test: Consultation booking → confirmation**
   - Validate: slot exists, booking persisted, confirmation code returned.

3. **E2E test: (If monetized) Booking → Payment → Confirmation**
   - Validate: payment create-order, verify signature, update booking/payment state.

4. **Load test:** Rate limiting under stress
   - Target: confirm assistant/compatibility limits behave correctly under concurrency.

5. **OWASP Top-10 security pass for this module**
   - Auth/session checks, injection paths, IDOR verification, logging safety.

---

## B) Monetization completeness (if you want it “super monetization engine”)
6. **Wire payment button end-to-end in booking confirmation**
   - UI → backend payment create-order → verify endpoint.
   - Confirm booking state transitions are correct.

7. **Refund/failed payment behavior**
   - Define booking/payment rollback rules and surface user-friendly messages.

---

## C) Operational completeness (production operations)
8. **Email/SMS provider runtime integration**
   - Remove “provider integration pending” status.
   - Add retries, timeouts, and failure logging.

9. **Notification reliability & idempotency**
   - Avoid duplicate confirmations on retry.

10. **Monitoring & alerts**
   - Alert: PDF generation failures
   - Alert: booking create failure rate
   - Alert: auth failures spikes

---

## D) Admin + analytics depth (investor-grade)
11. **Consultant admin backend wiring**
   - Admin Panel UI already exists; finish the backend route integration.
   - Validate slot CRUD + earnings analytics correctness.

12. **Analytics backend + data aggregation API**
   - Dashboard must fetch computed metrics from backend (not placeholders).

13. **Export correctness**
   - PDF/CSV export must match dashboard totals and include date filters.

---

## E) Experimentation & growth
14. **A/B testing instrumentation end-to-end**
   - Ensure `assignVariants()` + `trackEvent()` calls are wired in UI.
   - Ensure experiment results are computed from stored events.

15. **Analytics event taxonomy**
   - Define event names and required fields:
     - view, click, conversion, booking success/fail, payment success/fail.

---

## F) Performance + UX polish (last 10–20% “super” polish)
16. **PDF performance optimization**
   - Cache reusable parts if applicable.
   - Validate large family tree rendering times.

17. **Localization QA in real browsers**
   - Verify Malayalam rendering (not just “strings exist”).
   - Check encoding/edge characters.

18. **Accessibility & error UX**
   - Ensure keyboard navigation, focus management, and consistent error states.

---

## Suggested next steps (tight execution order)
- Week 1: E2E + payment end-to-end (if monetized) + load testing
- Week 2: provider runtime integration + alerts/monitoring
- Week 3: admin backend + analytics backend wiring
- Week 4: A/B instrumentation + final performance + localization QA

