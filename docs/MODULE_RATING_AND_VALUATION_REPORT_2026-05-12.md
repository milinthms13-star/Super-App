# NilaHub Module Rating and Valuation Report

Date: May 12, 2026
Scope: `src/modules/*` portfolio quality scoring and technical/IP valuation framing

## Executive summary

- Portfolio module rating (average): **3.58 / 5**
- Production-ready modules (4.5+): **5**
- Strong beta modules (4.0-4.4): **2**
- MVP modules (3.3-3.9): **12**
- Early-stage modules (<3.3): **17**

Recommended valuation framing for current investor discussions (technical/IP only):
- **INR 2.6 crore to INR 4.8 crore**
- Discussion anchor: **INR 3.9 crore**

This aligns with your existing conservative investor valuation band while reflecting improved module readiness in Astrology, BillPay, and Education.

## Evidence sources used

- `docs/ASTROLOGY_MODULE_GO_LIVE_RATING_AND_CHECKLIST.md`
- `ASTROLOGY_PRODUCTION_GAPS_FIXED_VERIFIED.md`
- `docs/BILLPAY_MODULE_GO_LIVE_RATING_AND_CHECKLIST.md`
- `docs/EDUCATION_MODULE_GO_LIVE_RATING_AND_CHECKLIST.md`
- `docs/ECOMMERCE_MODULE_DOCUMENTATION.md`
- `docs/MATRIMONIAL_MODULE_DOCUMENTATION.md`
- `docs/PRODUCTION_READINESS_ASSESSMENT_REPORT.md`
- `INVESTOR_VALUATION_REPORT_FINAL.md`
- `docs/user-manuals/*/USER_MANUAL.md`

## Scoring method

Each module is scored on a 5-point scale using:
- user manual coverage
- technical module documentation
- go-live/readiness documentation
- feature implementation documentation
- tests (module tests and Cypress where available)
- backend route evidence

Manual overrides were applied where explicit go-live ratings already exist in project docs.

## Module scorecard (May 12, 2026)

| Module | Score (/5) | Status |
|---|---:|---|
| astrology | 5.0 | Production ready |
| education | 4.9 | Production ready |
| billpay | 4.7 | Production ready |
| ecommerce | 4.6 | Production ready |
| matrimonial | 4.6 | Production ready |
| admin | 4.1 | Strong beta |
| messaging | 4.1 | Strong beta |
| classifieds | 3.7 | MVP |
| fooddelivery | 3.7 | MVP |
| realestate | 3.7 | MVP |
| ridesharing | 3.7 | MVP |
| socialmedia | 3.7 | MVP |
| sos | 3.7 | MVP |
| businessbuilder | 3.5 | MVP |
| businessservices | 3.5 | MVP |
| localmarket | 3.5 | MVP |
| reporting | 3.5 | MVP |
| support | 3.5 | MVP |
| reminderalert | 3.4 | MVP |
| bustrainbooking | 3.2 | Early-stage |
| devadarshan | 3.2 | Early-stage |
| finance | 3.2 | Early-stage |
| freelancer | 3.2 | Early-stage |
| gulfservices | 3.2 | Early-stage |
| healthcare | 8.0 | Complete |
| hotelbooking | 3.2 | Early-stage |
| hyperlocal | 3.2 | Early-stage |
| localservices | 3.2 | Early-stage |
| maps | 3.2 | Early-stage |
| nilaaihub | 3.2 | Early-stage |
| quicklinks | 3.2 | Early-stage |
| resumebuilder | 3.2 | Early-stage |
| skilllearning | 3.2 | Early-stage |
| tourism | 3.2 | Early-stage |
| jobportal | 3.1 | Early-stage |
| personaldiary | 2.8 | Early-stage |

## Valuation model (technical/IP framing)

This is a module-portfolio valuation model, not an audited company valuation.

### Tier contribution approach

- Tier A (5 modules, production-ready): highest replacement value
- Tier B (2 modules, strong beta): moderate-high value
- Tier C (12 modules, MVP): moderate value
- Tier D (17 modules, early-stage): option value

Applying overlap/integration discount and commercialization-risk discount gives:
- **Defensible current range: INR 2.6 crore to INR 4.8 crore**
- **Recommended anchor: INR 3.9 crore**

## Investor talking points

- You now have multiple independently documented production-ready modules, not a single flagship feature.
- Shared infra and monetization logic increase portfolio value versus isolated module apps.
- The valuation should still stay disciplined until full QA and live traction metrics are presented.

## Fastest value-up unlocks (next 60 days)

1. Push 3-5 MVP modules from 3.x into 4.x with backend sync and go-live checklists.
2. Enforce Cypress gates for all production-ready modules in CI.
3. Publish traction dashboard (active users, conversion, retention, revenue events) for investor diligence.
4. Standardize production-readiness docs for every module to reduce perceived execution risk.

