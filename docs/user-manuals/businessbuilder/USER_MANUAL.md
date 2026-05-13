# BusinessBuilder User Manual (Front-End)

> Module: `src/modules/businessbuilder/BusinessBuilder.js`  
> Product name in UI: **SME Growth Studio** (AI Business Builder)

## 1) What this module does
BusinessBuilder helps you create and execute a small business launch plan by combining:
- A **multi-step Launch Wizard** (idea → customers → location → budget → products/services → pricing → marketing → notes)
- An **AI Plan Generator** (business summary, market/competitor analysis, revenue + costs + profit, SWOT, 3/6-month roadmap)
- A **Startup Cost Calculator** (estimates investment, monthly burn, break-even)
- A **Scheme Hub** (government scheme suggestions based on business type, budget, and entrepreneur profile)
- **Document Generator** (creates Quotation/Receipt/Proposal/GST Bill/Brochure/Visiting Card text previews)
- **Launch Checklist** (step-by-step tasks with completion toggles)
- A **Business Profile** overview
- **Invoice Studio** (create invoices and download invoice PDFs)
- A **Mini App Builder** (create a mini-app listing with branding/content)

## 2) Entry point in the app
1. Open **BusinessBuilder** from main navigation/menu.
2. You land on the **Growth Dashboard** tab by default.

## 3) Primary navigation tabs (UI)
Use the top tabs:
- **Growth Dashboard**
- **Launch Wizard**
- **AI Plan Generator**
- **Startup Cost**
- **Scheme Hub**
- **Document Generator**
- **Launch Checklist**
- **Business Profile**
- **Invoice Studio**
- **Mini App Builder**

A status banner may appear (success/info messages) and the UI may show “Refreshing data...” while loading.

---

## 4) Growth Dashboard (what to do next)
On the dashboard you can see:
- Active business drafts
- Completion percentage
- Pending tasks (from checklist)
- Revenue estimate
- Documents created count
- Recommended next action (calculated based on wizard + cost + checklist + plan state)
- Marketplace integration suggestions (based on your business type)

---

## 5) Launch Wizard (step-by-step plan inputs)
### 5.1 Run the wizard
1. Open **Launch Wizard**.
2. Go through the wizard steps (8 steps):
   - Business idea
   - Target customers
   - Location / service area
   - Budget
   - Products/services
   - Pricing
   - Marketing plan
   - Final business plan notes
3. Each step shows a textarea with a placeholder prompt.
4. Use:
   - **Previous**
   - **Next**

### 5.2 Track progress
- The UI shows **Step X of 8**
- It shows a percentage based on how many wizard fields are filled

### 5.3 Quick launch summary
Below the wizard card you’ll see a summary panel listing each wizard step and the entered value (or “Not filled yet”).

---

## 6) AI Plan Generator
### 6.1 Generate the plan
1. Open **AI Plan Generator**.
2. Click:
   - **Generate AI Plan**
3. Review the output sections:
   - Business summary
   - Market analysis
   - Competitor analysis
   - Revenue model
   - Cost estimation
   - Profit projection
   - SWOT analysis
   - 3-month roadmap
   - 6-month roadmap
4. Review the confidence note at the end.

### 6.2 Generate branding ideas
1. In **AI Plan Generator**, click **Generate Branding Builder**.
2. Review outputs:
   - Business name ideas
   - Logo suggestions
   - Taglines
   - Brand colors
   - Poster content + social caption

---

## 7) Startup Cost Calculator
1. Open **Startup Cost**.
2. Fill inputs:
   - Rent (monthly)
   - Staff salary (monthly)
   - Inventory (one-time)
   - Marketing (monthly)
   - License cost (one-time)
   - Equipment (one-time)
   - Utilities (monthly)
   - Other monthly expenses
   - Expected monthly revenue
3. The UI displays:
   - Estimated one-time investment
   - Estimated monthly expenses
   - Estimated monthly profit
   - Break-even period (if monthly profit is positive)

---

## 8) Scheme Hub (government scheme matching)
1. Open **Scheme Hub**.
2. Enter/ensure your **business type** and **budget** are set (wizard/profile).
3. The module calculates matching schemes using:
   - Supported business types
   - Budget ceilings
   - Entrepreneur profile toggles (women/kerala/SCST/minority)
4. Review suggested schemes and their fit details.

---

## 9) Document Generator
1. Open **Document Generator**.
2. Choose a document **type** (Quotation, Receipt, Proposal, GST Bill Format, Brochure Content, Visiting Card Text).
3. Fill the form fields relevant to that type:
   - customerName / customerCompany
   - subject
   - line items (text)
   - notes
4. Click **Generate** (document generation button in this section).
5. Review the **document preview**.
6. Use actions:
   - **Download** (downloads a text file preview)
   - **Copy** (copies preview text to clipboard)

Expected result:
- Preview updates immediately after generation.
- Download is blocked until a preview exists.

---

## 10) Launch Checklist (execution readiness)
1. Open **Launch Checklist**.
2. You’ll see checklist items like:
   - Register business
   - Create logo/brand identity
   - Open bank account
   - Apply for eligible loan/scheme
   - Create social pages
   - Add products/services in mini app
   - Start first marketing campaign
3. Toggle each checklist item to mark completed/incomplete.

Expected result:
- The dashboard “Recommended next action” changes as tasks complete.

---

## 11) Business Profile
Use **Business Profile / Overview** to view your saved business details and keep your business form aligned with what you’re planning to launch.

---

## 12) Invoice Studio
### 12.1 Create an invoice
1. Open **Invoice Studio**.
2. Ensure a business profile is created/saved first (if not, the UI will prompt).
3. Fill:
   - Customer name/phone/email/GSTIN/address
   - Due date, discount, notes
   - Invoice items (name/description/quantity/unit price/tax rate)
4. Click **Create invoice**.
5. The invoice list refreshes.

### 12.2 Download invoice PDF
- Use the invoice’s download action to generate a PDF:
  - `GET /api/business-builder/invoices/:invoiceId/pdf`

---

## 13) Mini App Builder
### 13.1 Create a mini app listing
1. Open **Mini App Builder**.
2. Ensure you have an active business profile.
3. Fill mini app fields:
   - App name
   - Slug
   - App type (Business Card / Product Showcase / Service Booking / Store Locator / Contact Form)
   - Description (and hero/about content)
   - Contact info: email/phone/address/website
   - Branding colors: primaryColor + secondaryColor
4. Click **Create mini app**.

Expected result:
- On success, mini apps list refreshes.
- If slug conflicts or required fields are missing, you’ll see an error status.

---

## 14) Troubleshooting
- “Save business profile” fails:
  - confirm required fields are filled (businessName/phone/email, etc.)
- “Create invoice / mini app” blocked:
  - create and save a business profile first
- Clipboard copy fails:
  - copy may be blocked by browser permissions—copy manually from preview
- PDF download fails:
  - retry later; confirm invoice exists and backend endpoint is reachable

## 15) UI sections reference (quick)
- Growth Dashboard: KPIs + recommended next action
- Launch Wizard: 8 steps wizard
- AI Plan Generator: plan + branding outputs
- Startup Cost: cost + break-even
- Scheme Hub: scheme matching
- Document Generator: document preview + download/copy
- Launch Checklist: completion toggles
- Business Profile: business basics overview
- Invoice Studio: create invoice + download PDF
- Mini App Builder: create mini app listing
