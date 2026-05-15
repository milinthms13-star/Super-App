# NilaHub Valuation Report (Fresh Investor Edition)

**Prepared on:** May 15, 2026  
**Prepared for:** Investor presentation  
**Valuation type:** Pre-revenue / early-traction software platform valuation (code and product-IP based)

## 1) Executive Summary

This report is a fresh valuation prepared from current repository evidence, not from older copied documents.

### Recommended valuation positioning

- **Pre-money range:** **INR 4.5 crore to INR 7.5 crore**
- **Primary anchor to present:** **INR 6.0 crore pre-money**
- **Negotiation comfort band:** **INR 5.2 crore to INR 6.8 crore**

### Why this range

- Product depth is significantly above MVP level (multi-module + large backend surface).
- Monetization rails are already implemented in code.
- Cross-platform packaging exists (web, desktop, mobile).
- Discount is still required because investor-grade traction metrics are not yet formally packaged in this report.

## 2) What Was Actually Reviewed

Repository-backed signals observed on May 15, 2026:

- **36 frontend modules** in `src/modules`
- **39 routable module paths** in `src/utils/moduleRoutes.js`
- **214 backend route files** in `backend/routes`
- **108 Express route mounts** (code scan of `app.use(` across backend)
- **265 model files** in `backend/models` (recursive)
- **56 controllers** in `backend/controllers`
- **207 service files** in `backend/services`
- **19 middleware files** in `backend/middleware`
- **147 test/spec/cypress-pattern files**
- **~139,216** non-empty frontend source lines (scan)
- **~277,941** non-empty backend source lines (scan)
- **135 production build files** in `build`

Investor material assets present:

- **12 investor screenshots** in `docs/investor-screenshots`

## 3) Commercial Readiness Signals in Code

Monetization and transaction infrastructure exists in implementation:

- Classified monetization plans in `backend/config/monetization.js`:
  - `featured` (INR 299), `urgent` (INR 149), `seller_pro` (INR 999)
- Subscription tiers:
  - `starter` (INR 299/month), `pro` (INR 799/month), `enterprise` (INR 2,999/month)
- Settlement and commission constants in `backend/config/constants.js`:
  - Default platform commission: **15%**
  - Settlement minimum: **INR 100**
  - Settlement cycle: **7 days**

This is important because valuation is stronger when pricing logic and monetization rails are already coded, not only planned.

## 4) Valuation Methodology

Because audited revenue and formal cohort metrics are not attached here, valuation is derived using a **blended platform method**:

1. **Replacement and integration value (45%)**  
What it would cost/time-risk to rebuild a similar integrated multi-module platform.

2. **Platform readiness and deployability (30%)**  
Product assembly quality, route/model/service depth, deployment footprint, packaging readiness.

3. **Monetization optionality value (25%)**  
Value of implemented revenue rails (subscriptions, paid visibility, commission flows), adjusted for execution risk.

## 5) Scenario-Based Valuation

### Bear Case (Conservative)

- Assumes slower GTM execution and delayed monetization conversion.
- **Indicative pre-money:** **INR 4.5 crore**

### Base Case (Recommended for current discussions)

- Assumes focused category execution (TradePost + HomeSphere first), with early paid conversion and cleaner KPI packaging over next 2 quarters.
- **Indicative pre-money:** **INR 6.0 crore**

### Bull Case (Execution-upside)

- Assumes faster traction proof, stronger conversion, and repeat paid usage across top modules.
- **Indicative pre-money:** **INR 7.5 crore**

## 6) Suggested Fundraise Framing

Use the valuation together with a clear dilution narrative:

- If raising **INR 1.0 crore** at INR 6.0 crore pre-money:
  - Post-money INR 7.0 crore
  - Dilution ~14.3%
- If raising **INR 1.5 crore** at INR 6.0 crore pre-money:
  - Post-money INR 7.5 crore
  - Dilution ~20.0%

## 7) Investor Talking Script (Use As-Is)

NilaHub is already a deeply implemented multi-module platform, not a concept deck. Our current repository shows 36 frontend modules, 214 backend route files, 265 model files, and coded monetization rails including subscriptions, paid listings, and settlement logic. Based on a blended replacement-value and readiness-adjusted method, our defensible pre-money valuation range is INR 4.5 crore to INR 7.5 crore, and we are anchoring this round at INR 6.0 crore pre-money.

## 8) Key Risks Investors May Raise

- Traction packaging risk: investor-grade MAU/retention/conversion sheets may be requested.
- Focus risk: broad module scope needs category-priority narrative.
- QA confidence risk: test/reporting quality should be shown as a trend line in diligence.

## 9) What Can Justify a Higher Next-Round Valuation

1. Publish monthly KPI sheet (activation, conversion, paid conversion, retention).
2. Show repeat paid behavior in classifieds/real-estate monetization rails.
3. Demonstrate consistent release quality with formal QA evidence.
4. Build city/segment-level GTM proof with measurable supply + demand growth.

## 10) Scope and Limitations

This valuation is designed for investor discussion and negotiation, not statutory audit valuation.  
It is intentionally evidence-backed from code/product state and intentionally conservative where audited commercial metrics are not yet provided.

## 11) Evidence Anchors

- `src/modules/*`
- `src/utils/moduleRoutes.js`
- `backend/routes/*`
- `backend/models/*`
- `backend/controllers/*`
- `backend/services/*`
- `backend/middleware/*`
- `backend/config/monetization.js`
- `backend/config/constants.js`
- `build/*`
- `docs/investor-screenshots/*`

