# NilaHub Investor Valuation Report

**Prepared:** May 9, 2026  
**Prepared for:** Current investor discussions  
**Subject:** NilaHub software platform, product IP, and current fundraising positioning

## Executive conclusion

Based on a direct repository review, a fresh production build run on **May 9, 2026**, a same-day frontend test run, and current early-stage market context, the most defensible current valuation for **NilaHub** is:

- **INR:** **Rs. 2.4 crore to Rs. 4.0 crore**
- **USD:** **about $260,000 to $430,000**

### FX assumption used

- **RBI / FBIL reference rate:** **INR 93.3684 per USD**
- **Source date:** **April 13, 2026**

### Recommended investor anchor

For a current investor conversation, the cleanest headline number is:

- **Recommended valuation anchor:** **Rs. 3.5 crore**

If you are discussing a small angel or pre-seed raise, you can open slightly above that number and expect negotiation back toward the middle of the range.

### Important correction

Do **not** use the older `docs/investor_documents_package.md` valuation language that says **Rs. 200 crore to Rs. 600 crore**. That figure is not supported by the current product evidence, QA posture, or market context and would likely damage credibility with a serious investor.

## What this report values

This report values the **current software platform and assembled product IP**, not a fully proven operating company.

Included in scope:

- frontend and backend codebase
- integrated module architecture
- buildable product shell
- monetization logic already present in code
- admin, analytics, and operational tooling
- cross-platform packaging for web, desktop, and Android

Not included in scope:

- audited revenue
- verified GMV or order volume
- live MAU / DAU / retention data
- cap table or legal diligence
- customer contracts or signed commercial partnerships

## Evidence reviewed

This valuation is based on evidence directly visible in the repository and in live local verification performed on **May 9, 2026**:

- `src/utils/moduleRoutes.js` defines **19 routable product surfaces**
- `backend/server.js` contains **144 mounted Express route registrations**
- the repository currently contains **163 backend route files**
- the repository currently contains **217 backend service files**
- the repository currently contains **196 backend model files**
- `src/` and `backend/` together contain roughly **350,141 non-empty lines** matched by source scan
- the current production build folder contains **106 generated files**
- `docs/investor-screenshots/` contains **12 investor screenshot assets**
- `package.json` shows active web, Electron, and Capacitor packaging
- `backend/config/monetization.js` includes live pricing logic for:
  - classified plans at **Rs. 149, Rs. 299, and Rs. 999**
  - subscription tiers at **Rs. 299, Rs. 799, and Rs. 2,999 per month**
- `backend/config/constants.js` includes:
  - **15%** default platform commission
  - **Rs. 100** settlement minimum
  - **7-day** settlement cycle

### Current build and test posture

Verified locally on **May 9, 2026**:

- **Production build:** successful via `npm.cmd run build`
- **Build result:** deployable production bundle created
- **Build caveat:** build passes with a substantial ESLint warning backlog
- **Frontend test run:** `npm.cmd test -- --watchAll=false --runInBand`
- **Test result:** **46 suites total, 38 passed, 8 failed**
- **Assertion result:** **281 tests total, 247 passed, 34 failed**

Investor takeaway: this is a real buildable product, but it is **not yet in a clean, fully green QA state**.

## What the project appears to be today

NilaHub is best described as a **broad multi-module consumer platform** with meaningful technical depth across:

- ecommerce and checkout
- messaging and realtime communication
- ridesharing
- food delivery
- wallet and payments
- classifieds and local marketplace
- social and community features
- diary, reminders, and utility loops
- SOS and safety flows
- admin and reporting tooling

The strongest positive signal is not just feature count. It is the presence of **shared infrastructure** across modules: routing, payments, analytics, moderation, notifications, admin controls, and packaging into a single product shell.

## External market context

Current market context matters because investor valuation is not set by code alone.

- Equidam's **H2 2025** data reports a **$5.61 million** median global pre-seed valuation.
- Value Add VC's 2026 summary, citing Carta and PitchBook 2025 data, describes typical 2025 pre-seed rounds at roughly **$4 million to $6 million post-money**.
- TechCrunch reported that Indian startup funding in **2025** became more selective, with total deal count down about **39%** year over year and seed funding down about **30%**, citing Tracxn data.

### Why that does not mean NilaHub should be priced at global pre-seed medians

Those market benchmarks are for companies that are usually being valued as **venture financings**, not as code assets alone. Investors paying those prices also expect stronger proof in one or more of the following areas:

- live traction
- repeat usage
- founder-market fit packaged clearly
- measurable revenue path
- cleaner diligence materials

NilaHub has strong technical breadth, but the repo review does **not** yet prove those commercial milestones. That is why the correct valuation approach here is a **discounted platform/IP valuation**, not a headline VC benchmark valuation.

## Valuation methodology

Because live traction and audited financials are not yet established in the reviewed materials, the most defensible method is a **readiness-adjusted replacement-cost valuation**.

### 1. Replacement-cost floor

A third party rebuilding the current platform from scratch would be paying for:

- multi-module frontend work
- backend route and service layer depth
- monetization logic
- admin and analytics tooling
- cross-platform packaging
- integration and QA time

**Indicated value contribution:** **Rs. 1.8 crore to Rs. 2.7 crore**

### 2. Assembled-platform premium

The asset is worth more than a raw code dump because it is already assembled into one operating product shell with shared patterns across modules.

That integration premium comes from:

- reused infrastructure
- operational logic
- pricing and settlement rails
- investor-facing visuals already prepared
- cross-module expansion potential

**Indicated value contribution:** **Rs. 0.9 crore to Rs. 1.8 crore**

### 3. Readiness and commercialization discount

The valuation still needs a material discount because the current review shows:

- no audited revenue or GMV
- no verified user traction pack
- failed frontend test suites
- a warning-heavy production build
- no independently verified uptime or monitoring appendix
- broad scope that may raise focus-risk questions

**Discount applied:** **minus Rs. 0.3 crore to Rs. 0.5 crore**

## Resulting valuation

- **Defensible current valuation range:** **Rs. 2.4 crore to Rs. 4.0 crore**
- **USD equivalent:** **about $260,000 to $430,000**
- **Best single-number anchor today:** **Rs. 3.5 crore**

## Why this range is credible

This range avoids both common early-stage mistakes:

1. It does **not** pretend the product already deserves a full institutional pre-seed multiple.
2. It does **not** undervalue the project as a simple prototype or landing-page app.

The codebase is clearly more advanced than a lightweight MVP. At the same time, the commercial proof is still too thin to justify aggressive venture-style pricing.

## Risks an investor will likely raise

- **Traction risk:** no verified user, order, GMV, or retention data in the reviewed materials
- **QA risk:** test suite is meaningful, but not fully passing
- **Quality risk:** production build succeeds with many warnings
- **Focus risk:** the platform spans many categories, which can look ambitious or diluted depending on the investor
- **Execution risk:** some investor-facing docs in the repo are inconsistent and need cleanup before sending externally

## Best way to present this to an investor

Present this as a **current platform valuation**, not as a mature company valuation.

Suggested wording:

> NilaHub is currently best valued as a high-scope, pre-traction software platform with meaningful assembled product IP. Based on the present codebase, build verification, test posture, monetization logic, and platform integration depth, the most defensible current valuation is approximately Rs. 2.4 crore to Rs. 4.0 crore, with Rs. 3.5 crore as a practical investor discussion anchor. Additional upside depends on live traction, cleaner QA proof, and stronger diligence materials.

## What would raise valuation fastest

The next valuation jump will come from proof, not from more feature claims.

Highest-impact upgrades:

1. Convert the current build into a clearly documented live demo with seeded login credentials.
2. Get the frontend test run materially greener.
3. Add a traction sheet with any real numbers:
   - waitlist
   - pilot vendors
   - demo users
   - usage events
4. Add one-page founder and team credibility materials.
5. Add a short QA and deployment appendix with build, test, and uptime proof.

## Final assessment

NilaHub is a serious software asset with real breadth and integration work behind it. The codebase supports a **solid low-crore valuation today**, but not an inflated super-app headline valuation. The right investor position is to be confident about the technical asset, honest about the proof gaps, and disciplined about the number you present.
