# NilaHub Valuation Report (Single-Rate, Formula-Based)

**Date:** May 15, 2026  
**Method:** Repository-evidence calculation with one fixed output  
**Final valuation (pre-money):** **INR 6.0 crore**

## 1) Fixed Result

After applying one consistent formula to the current codebase state, the single valuation rate is:

## **INR 6,00,00,000 (6.0 crore) pre-money**

---

## 2) Inputs Used (Measured from repo)

- Frontend modules: **36**
- Frontend routable paths: **39**
- Backend route files: **214**
- Express route mounts: **108**
- Model files (recursive): **265**
- Service files: **207**
- Controller files: **56**
- Middleware files: **19**
- Test/spec/cypress files: **147**
- Frontend non-empty lines: **139,216**
- Backend non-empty lines: **277,941**

Evidence paths:

- `src/modules/*`
- `src/utils/moduleRoutes.js`
- `backend/routes/*`
- `backend/models/*`
- `backend/services/*`
- `backend/controllers/*`
- `backend/middleware/*`

---

## 3) Calculation Model

### Step A: Engineering effort months

Weighted effort formula:

- `effort_months = (modules*2.4) + (route_mounts*0.12) + (route_files*0.06) + (model_files*0.05) + (service_files*0.04) + (controller_files*0.08) + (middleware_files*0.10) + (test_files*0.05)`

Calculated effort:

- `effort_months = 147.46`

### Step B: Base replacement value

- Blended fully-loaded engineering cost assumption: **INR 2.40 lakh / month**
- `base_value = 147.46 * 2.40 lakh = INR 3.54 crore`

### Step C: Integration premium

For assembled multi-module integration (shared auth, routing, messaging, payments, ops):

- `integration_premium = 60% of base = INR 2.12 crore`

Subtotal:

- `3.54 + 2.12 = INR 5.66 crore`

### Step D: Monetization-readiness premium

For implemented paid plans, subscriptions, commission, settlement rules:

- `monetization_premium = 20% of subtotal = INR 1.13 crore`

Subtotal:

- `5.66 + 1.13 = INR 6.79 crore`

### Step E: Execution-risk discount

Applied for pre-scale commercial proof risk:

- `execution_discount = 12% of subtotal = INR 0.81 crore`

Final:

- `6.79 - 0.81 = INR 5.98 crore`
- Rounded investor number: **INR 6.0 crore pre-money**

---

## 4) Final Number to Present

Use this exact line:

**"Based on a repository-measured, formula-based platform valuation, NilaHub's current pre-money valuation is INR 6.0 crore."**

---

## 5) Notes

- This is a single-number operating valuation for investor discussion, not a statutory audit valuation.
- If you later add verified traction data (MAU, paid conversion, retention), this formula can be rerun with a traction multiplier.
- PitchBook plugin was tagged, but no live PitchBook comp feed is callable in this environment right now; this number is therefore strictly codebase-calculated.
