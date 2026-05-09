# NilaHub — Module Rating & Estimated Price

**Generated:** 2026-05-08  
**Basis:**
- Canonical 18-module list from `PROJECT_VALUATION_REPORT.md`
- Evidence-based deep analysis for **Food Delivery** from `FOODDELIVERY_GAP_ANALYSIS.md`
- For other modules, pricing/rating is derived from the valuation report’s **complexity buckets** (High vs Medium) and the fact that they are marked **✅ Complete** in the module table.

> Note: If you want evidence-grade (like Food Delivery) ratings for every module, share the corresponding `*_GAP_ANALYSIS.md` / `*_IMPLEMENTATION_*` docs for each module and I will upgrade each row to evidence-based scoring.

---

## Scoring model (simple, transparent)
- **Rating (/10)**
  - High complexity modules: **8.5/10** (complete, but still early stage)
  - Medium complexity modules: **8.0/10**
  - Food Delivery is overridden by evidence: **8.1/10**
- **Estimated module price (USD)**
  - High complexity: **$20K–$30K** each (from valuation report)
  - Medium complexity: **$10K–$20K** each (from valuation report)
  - Food Delivery: set to **$18K–$25K** (evidence shows strong MVP depth but notable parity gaps)

---

## Module table

| Module | Rating (/10) | Complexity | Estimated Price (USD) | Evidence docs used |
|---|---:|---|---:|---|
| E-Commerce | 8.5 | High | $20K–$30K | `PROJECT_VALUATION_REPORT.md` |
| Social Media | 8.5 | High | $20K–$30K | `PROJECT_VALUATION_REPORT.md` |
| Messaging/Chatroom | 8.5 | High | $20K–$30K | `PROJECT_VALUATION_REPORT.md` |
| Food Delivery | 8.1 | High | $18K–$25K | `FOODDELIVERY_GAP_ANALYSIS.md`, `TODO_FOODDELIVERY_OPTIMIZATION.md` |
| Ride Sharing | 8.5 | High | $20K–$30K | `PROJECT_VALUATION_REPORT.md` |
| Wallet/Payments | 8.5 | High | $20K–$30K | `PROJECT_VALUATION_REPORT.md` |
| Admin Dashboard | 8.5 | High | $20K–$30K | `PROJECT_VALUATION_REPORT.md` |
| Real Estate | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Astrology | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Classifieds | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Personal Diary | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Reminder/Alert System | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Local Market | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Matrimonial | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Health Module | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| Support/Help | 8.0 | Low | $8K–$15K | `PROJECT_VALUATION_REPORT.md` |
| User Management | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |
| SOS/Emergency | 8.0 | Medium | $10K–$20K | `PROJECT_VALUATION_REPORT.md` |

---

## Total (rough bounds)
- Using the valuation report’s bucket ranges for 18 modules, the implied module-sum range is broadly consistent with the report’s overall **$200K–$500K** valuation band.

---

## What to do next (to make this truly “evidence-grade”)
For each module besides Food Delivery, run the same type of deep **gap/evidence review** using the module-specific docs (e.g., `*_GAP_ANALYSIS.md`, `*_IMPLEMENTATION_COMPLETE.md`, `*_STATUS.md`).

If you want, I can upgrade this file to evidence-grade by:
1) mapping each module to its best doc set (gap/status/completion),
2) recalculating rating using feature parity coverage,
3) adjusting price range based on missing critical parity items (payments, tracking, ops depth, etc.).

