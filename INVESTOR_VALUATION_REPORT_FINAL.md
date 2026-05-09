# NilaHub Investor Valuation Report

**Prepared:** May 9, 2026  
**Prepared for:** Investor discussions  
**Subject:** NilaHub software platform and assembled product IP

## Executive conclusion

Based on the current repository evidence, the most defensible present-day valuation for **NilaHub** is:

- **USD:** **$230,000 to $360,000**
- **INR:** **Rs. 1.91 crore to Rs. 2.99 crore**

Using the same internal FX assumption already documented in `FINAL_SINGLE_PRICE_IN_INR.md`:

- **Working FX assumption:** **1 USD = Rs. 83**

### Recommended discussion anchor

For a current investor conversation, the cleanest anchor is:

- **Anchor ask:** **Rs. 2.5 crore to Rs. 2.75 crore**

This anchor is strong enough to reflect the platform's breadth, but still credible given the current proof gaps around live traction, public deployment, and team disclosure.

## What this report values

This report values the **software asset and assembled platform IP**, not a fully audited company enterprise value.

Included in scope:

- product codebase
- integrated backend services
- module architecture
- cross-platform packaging
- monetization configuration
- admin, analytics, and reporting systems
- investor-facing screenshot assets already prepared in the repo

Not included in scope:

- audited revenue or GMV
- verified live user traction
- cap table or equity structure
- legal IP assignment review
- third-party diligence on uptime, security, or commercial contracts

## Evidence base reviewed

This valuation is grounded in files already present in the repository:

- `package.json` identifies the product as **NilaHub** and includes web, Electron, and Capacitor packaging.
- Management has now provided a live web demo URL: **https://mysuperapp-ekr4.onrender.com/**
- Management has also provided founder detail: **Dhanya Mohan**, founder, with **20 years of development experience**.
- `src/utils/moduleRoutes.js` defines **19 top-level routable surfaces**, including dashboard and admin flows.
- The current `build/` folder contains **107 generated production build files**.
- `build_output.txt` records a successful optimized build and states that the build folder is ready to be deployed.
- Current automated test footprint totals **124 specs**:
  - **45** frontend tests
  - **71** backend tests
  - **8** Cypress E2E specs
- The backend currently includes **136 route files** and **183 model files**.
- `docs/investor-screenshots/` contains **12 investor-facing preview screenshots**.
- `backend/config/monetization.js` shows active pricing and payment rails:
  - classified listing plans at **Rs. 149, Rs. 299, and Rs. 999**
  - subscription tiers at **Rs. 299, Rs. 799, and Rs. 2,999 per month**
  - enabled payment methods including **credit card, debit card, UPI, net banking, and wallet**
- `backend/config/constants.js` shows monetization controls:
  - **15%** default platform commission
  - **Rs. 100** minimum settlement amount
  - **7-day** settlement cycle
- `PHASE13_ANALYTICS_AND_REPORTING_COMPLETE.md` describes a production-ready analytics and reporting layer with **45+ endpoints** and reconciliation workflows.
- `ECOMMERCE_IMPLEMENTATION_STATUS_MATRIX.md` rates the ecommerce module at **95% complete**.
- `BEFORE_AFTER_COMPARISON.md` shows messaging maturity improving from **about 60% to about 75%** after Phase 1.

## What the codebase appears to be

NilaHub is best described as a **multi-surface super-app platform** with meaningful technical breadth across:

- messaging and real-time interaction
- ecommerce and checkout flows
- wallet and payment orchestration
- food delivery
- ridesharing
- SOS and safety
- diary and reminder utility loops
- admin operations and analytics
- cross-platform packaging for web, desktop, and Android

The investor takeaway is not just "many features." The stronger point is that the repository shows **assembled systems**: shared routing, monetization logic, reporting, admin controls, and multiple user journeys already wired into one platform.

## Valuation methodology

Because there is no verified revenue or live traction package in the workspace, a pure startup-multiple method would be weak. The more defensible method today is a **readiness-adjusted asset valuation**.

### 1. Replacement cost value

A buyer or investor would be acquiring a platform that would be expensive and time-consuming to rebuild from scratch:

- consumer product surfaces
- admin tooling
- payment and settlement logic
- analytics/reporting
- real-time messaging
- mobile and desktop packaging

**Indicated value contribution:** **$190,000 to $280,000**

### 2. Assembled platform premium

The repository is more valuable than a pile of isolated prototypes because the modules are assembled into one product shell, with monetization logic, reporting layers, and investor-ready visual material already started.

**Indicated value contribution:** **$60,000 to $120,000**

### 3. Readiness discount

The valuation must be discounted because the repo does **not yet prove**:

- live public deployment
- stable production usage metrics
- revenue history
- customer retention
- founder/team credentials in a single authoritative file

There is also a quality caveat: the recorded production build succeeds, but it does so with lint warnings rather than a fully clean build log.

**Discount applied:** **-$20,000 to -$40,000**

### Resulting present valuation

- **Defensible current range:** **$230,000 to $360,000**
- **Defensible current INR range:** **Rs. 1.91 crore to Rs. 2.99 crore**

## Why the valuation is credible

This range is credible because it avoids the two most common mistakes in early investor documents:

1. It does **not** pretend the repo already proves revenue-scale startup economics.
2. It does **not** undervalue the asset as a simple prototype or landing-page app.

The codebase already demonstrates real software breadth, monetization primitives, operational tooling, and packaging depth. At the same time, the missing execution proofs still justify a discount versus a live, revenue-bearing business.

## Founder profile

The current founder detail available for investor packaging is:

- **Dhanya Mohan** - Founder
- **20 years of development experience**

This strengthens the credibility of the build and delivery story. A fuller investor pack would still benefit from a proper team slide or founder bio page covering role, domain background, and current operating responsibilities.

## Suggested investor wording

Use the following paragraph directly if helpful:

> NilaHub is currently best valued as a high-scope, pre-traction software platform rather than as a fully scaled operating business. The repository demonstrates meaningful technical breadth across commerce, messaging, payments, analytics, safety, and cross-platform distribution, with a current evidence-backed asset valuation of approximately Rs. 1.91 crore to Rs. 2.99 crore. For investor discussions today, management would be justified in anchoring closer to Rs. 2.5 crore to Rs. 2.75 crore, with further upside unlocked by live deployment proof, initial traction, and a stronger diligence pack.

## Main risks an investor will ask about

- **Deployment proof:** a live demo URL is now available at **https://mysuperapp-ekr4.onrender.com/**, but uptime evidence, monitoring screenshots, and release-history proof are still not documented in the investor pack.
- **Traction proof:** no verified MAU, GMV, order count, or conversion metrics are documented.
- **Team proof:** founder information is now available for **Dhanya Mohan**, but there is still no single investor-grade team roster or full leadership slide in the pack.
- **Testing proof:** test files exist, but there is no current investor-ready pass report in the workspace.
- **Build cleanliness:** the latest saved build output shows success with warnings, not a clean zero-warning release log.

## What would likely increase valuation fastest

The fastest value unlocks are not more feature documents. They are proof-of-execution assets:

1. Pair the live demo URL with seeded demo credentials and one uptime or hosting proof screenshot.
2. Replace preview screenshots with captures from the live build.
3. Expand the founder detail into a one-page leadership or team slide with names, roles, and time commitment.
4. Add one traction sheet, even if early:
   - waitlist
   - pilot merchants
   - test users
   - usage events
5. Add one QA/deployment appendix with:
   - build status
   - test summary
   - uptime or monitoring screenshot

If those are added, a stretch valuation above the current band becomes easier to defend.

## Recommended package to send with this report

- `INVESTOR_VALUATION_REPORT_FINAL.md`
- `INVESTOR_SCREENSHOT_APPENDIX.md`
- `INVESTOR_OUTREACH_READINESS_WORKSHEET.md`
- pitch deck: `public/MalabarBazaar_Final_With_Closing.pptx`

## Final assessment

NilaHub already looks like a serious assembled software platform, not a lightweight prototype. The strongest investor position today is to present it as a **broad, monetizable product asset with meaningful build depth**, while being transparent that the next valuation jump depends on stronger live proof, a fuller team pack, and early commercial validation.
