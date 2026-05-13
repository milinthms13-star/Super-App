# Finance Hub User Manual (Front-End)

> Module: `src/modules/finance/FinanceHub.js`  
> Product name in UI: **Nila Finance Hub** (loan marketplace + eligibility + tracking)

## 1) What this module does
Finance Hub helps you:
- Browse an **institution marketplace** for loans (by category, district, institution type)
- Check **enhanced eligibility** (approval probability, FOIR, EMI estimate, etc.)
- Calculate **EMI** (monthly + yearly breakdown, processing fee, prepayment, offer comparison)
- **Apply** for loan assistance (lead creation + document uploads + consent)
- **Track** submitted applications/leads
- View **Schemes** / government scheme guidance
- (Admin/consultant workflows exist in the same UI based on role)

## 2) Entry point in the app
1. Open **Finance Hub** from main navigation/menu.

## 3) Global layout
At the top you’ll find:
- A search bar for institutions/categories/schemes
- District + institution type selectors
- A tab row with main sections

## 4) Main tabs (UI)
- **Loans**
- **Eligibility**
- **EMI**
- **Apply**
- **Track**
- **Schemes**

## 5) Loans (institution marketplace)
### 5.1 Browse categories
1. In the Loans tab, choose a loan category chip from:
   - Business Loans, Personal Loans, Gold Loans, Home Loans, Vehicle Loans, Education Loans, Agriculture Loans, Women Entrepreneur Loans, MSME Loans
2. Optionally filter using the top controls:
   - District
   - Institution type (Banks / NBFC / etc.)
   - Search term

### 5.2 Review institutions
For each institution listing you can expand details:
- Verified Partner badge (if applicable)
- Type, branch address, contact person
- Service districts
- Approval time range (min/max days)
- Processing fee (value + type)
- Commission model (type + value)
- Ratings and review count

## 6) Eligibility (loan eligibility checker)
1. Open **Eligibility** tab.
2. Fill the eligibility form:
   - Full Name, Phone
   - Loan Category
   - District
   - Age
   - Monthly Income
   - Required Amount
   - Existing EMI
   - Monthly Expenses
   - Employment type + stability months
   - CIBIL score
   - Collateral available (toggle)
   - Business vintage months
   - GST/ITR availability toggles
3. Click **Check Eligibility**.

Expected result:
- You’ll see:
  - Approval probability %
  - Score
  - FOIR %
  - Estimated new EMI
  - Best matching products
  - Improvement tips
  - Potential rejection reasons
  - Matching institutions list

## 7) EMI (advanced EMI calculator)
1. Open **EMI** tab.
2. Fill:
   - Principal (INR)
   - Annual Interest (%)
   - Tenure (months)
   - Processing fee type (percentage/flat) + value
   - Prepayment amount (INR) + prepayment month
3. Click **Calculate EMI**.

Results include:
- Monthly EMI
- Total interest
- Processing fee amount
- Total payable
- Downloadable EMI schedule as CSV
- Yearly breakdown list
- Offer comparison (3 offers) including EMI + total payable

## 8) Apply (create a loan assistance lead)
1. Open **Apply** tab.
2. Fill lead form:
   - Full Name, Phone
   - District
   - Loan Category
   - Amount
   - Institution selection (if present)
   - Callback window
   - Preferred interest rate + preferred tenure
   - WhatsApp opt-in
   - Consent checkboxes:
     - Privacy consent
     - KYC consent
     - Disclaimer consent
   - Document notes (optional)

3. Upload required documents:
- The UI expects uploads for document fields:
  - Aadhaar
  - PAN
  - Salary Slip
  - Bank Statement
  - GST / Business Proof
  - Collateral Documents

4. Click **Submit application / Create lead**.

Expected behavior:
- The module creates a lead via backend `financeApi.createLead`.
- After lead creation:
  - Track phone is updated
  - User dashboard (lead history) loads for the submitted phone
  - Admin/commission dashboards are refreshed

Validation (important):
- Phone must be **10 digits**
- Loan amount must be > 0
- Tenure must be positive
- Preferred interest rate must be between **6% and 36%**
- All consent checkboxes must be accepted

## 9) Track (track applications)
1. Open **Track** tab.
2. Enter a **10-digit phone number** (track phone).
3. Click track action to fetch:
   - user dashboard
   - lead history list

## 10) Schemes
- Schemes tab shows government scheme cards (Mudra, PMEGP, Stand-Up India, MSME institutional loans, women/SCST/minority, etc.).
- Use scheme cards to learn eligibility/document hints.

## 11) Troubleshooting
- Eligibility errors:
  - monthly income/required amount/age must be valid
- EMI calculator errors:
  - interest must be between 6% and 36%
  - principal must be > 0
- Apply submission fails:
  - ensure all consents are checked
  - ensure phone is exactly 10 digits
  - upload required documents (if backend expects them)
- Tracking fails:
  - confirm the phone number format (10 digits)

## 12) UI sections reference (quick)
- Loans: categories + institution listings
- Eligibility: form + approval probability result card
- EMI: calculator + CSV download + breakdown + offers compare
- Apply: lead form + document uploads + consent
- Track: fetch lead history by phone
- Schemes: government scheme cards and guidance
