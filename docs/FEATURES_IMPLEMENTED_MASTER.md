# FEATURES IMPLEMENTED MASTER — MalabarBazaar

> Roll-up view of feature coverage across modules.

## How to use
- Use this file as a high-level checklist.
- For deeper, module-specific UI steps and troubleshooting, open:
  - `docs/user-manuals/<module>/USER_MANUAL.md`
- For engineering architecture/entry points, open:
  - `docs/<MODULE>_MODULE_DOCUMENTATION.md`

---

## Auth & User foundation (cross-cutting)
- OTP authentication flow (send/verify)
- JWT session restore on app bootstrap
- Role-aware login (user / entrepreneur / admin)
- Profile persistence and language preference storage
- Cross-module user state sync via PATCH `/auth/me`

> Source of truth in docs: see `src/components/Login.js`, `src/App.js`, `backend/routes/auth.js`, `backend/models/User.js`.

---

## Astrology (Astro / Astrology)
From `docs/ASTROLOGY_MODULE_FEATURES_DOCUMENT.md`:
- Daily horoscope by zodiac sign
- Astrology profile save & manage
- Family member birth profiles (derived rashi/nakshatra/lagna)
- Recent saved readings history
- Quick insights (lucky color/number/good time/avoid time)
- Section-based experience navigation
- Today section (rashi summary + panchang snapshot)
- Rashi/Nakshatra guidance
- Kundli summary + PDF download button (UI-level)
- Marriage match / compatibility (sign vs partner sign)
- Panchangam + festival reminders
- Remedies section
- Talk to astrologer (consultants list + booking CTA)
- AI assistant Q&A (with offline fallback)
- EN / Malayalam language toggle

---

## Bill Pay
From `docs/BILLPAY_MODULE_DOCUMENTATION.md` and `docs/BILLPAY_FEATURES_LIST.md`:
- 25+ BBPS/Bharat Connect bill categories
- Smart dashboard KPIs (due soon/overdue/paid/autopay/failed/etc.)
- Bill discovery flow (mobile/consumer id; includes simulated discovery)
- Reminder system (push/SMS/WhatsApp; schedule windows)
- Autopay / e-mandate controls (active/paused/cancelled; max amount)
- Payment security controls (PIN+OTP, biometric+OTP, risk acknowledgement for >= 5000)
- Receipt vault (PDF download, share summary)
- Failed payment handling (retry, support ticket shortcut)
- Dispute center (reasons, tracking, statuses)
- Rewards & retention (cashback/coins/coupons increments)
- Family bills + monthly summary (CSV export)
- Admin reports (volume, success rate, refunds, disputes, categories, commission)

---

## What is not fully covered by existing master roll-ups
This repo currently contains detailed per-module feature docs for only some modules. The master roll-up can be extended by adding more module feature documents following the same naming convention:
- `<MODULE>_FEATURES_DOCUMENT.md` or `*_FEATURES_LIST.md`

---

## Suggested next build step (for completeness)
1. Create `*_FEATURES_DOCUMENT.md` for remaining modules.
2. Update this master roll-up with new sections.

