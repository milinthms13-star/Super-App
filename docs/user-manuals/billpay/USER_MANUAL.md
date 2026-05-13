# BillPay User Manual (Front-End)

> Module: `src/modules/billpay/BillPayHub.js`

## 1) What this module does
BillPay Hub helps you:
- Sync and view **your bills** (due / overdue / paid) in a live dashboard
- **Discover pending bills** using **Mobile Number** or **Consumer ID**
- Browse supported **BBPS categories** (directory coverage layer)
- Manage **Saved Bills** including **family bill management** and **autopay enable/disable**
- Pay bills using secure **2FA authentication**:
  - **PIN + OTP**
  - **Biometric + OTP**
  - High-value risk confirmation for amounts **>= ₹5,000**
- View **Payment History**
- Generate **receipts (PDF)** from Receipt Vault and **share** receipt details
- Raise **Disputes/Complaints** for transactions
- View **Offers / rewards wallet** (UI wallet simulation)
- View **Admin Reports** (local ledger + backend analytics fallback)
- Export payment history as **CSV**

## 2) Entry point in the app
1. Navigate to **Bill Pay** from main navigation/menu.

## 3) Primary navigation tabs (UI)
Use the tab bar to switch sections:
- **Dashboard**
- **Categories**
- **Saved Bills**
- **Pay Bill**
- **Autopay**
- **Payment History**
- **Receipts**
- **Disputes**
- **Offers**
- **Admin Reports**

> Note: The active tab state controls which UI sections are rendered.

## 4) Global behavior: backend sync + fallback
- On load, the module **syncs from backend** using:
  - `billpayService.getBills()`
  - `billpayService.getHistory()`
  - `billpayService.getDisputes()`
  - `billpayService.getMandates()`
- If backend calls fail, it continues using **local fallback data** and shows a sync/error message.

You’ll see the current sync status at the bottom footnote area:
- “Sync in progress…”
- or a completed timestamp message
- or an error message indicating fallback usage.

---

## 5) Step-by-step user flows

### 5.1 Dashboard: view bill health + reminder readiness
1. Open **Dashboard**.
2. Review KPI cards:
   - **Due Soon**
   - **Overdue**
   - **Paid**
   - **Autopay Enabled** (count of bills where autopay is enabled)
   - **Failed Payment** (transactions with status `Failed`)
   - **Upcoming Reminders** (computed based on reminder settings + due-date deltas)
3. In the left panel (**Bill Discovery**), discover bills (details in 5.2).
4. In the right panel (**Reminder System**), configure reminder channels:
   - **Push notifications**
   - **SMS reminders**
   - **WhatsApp reminders**
   - Timing checkboxes:
     - **7 days before due**
     - **2 days before due**
     - **Due-date alert**
     - **Overdue alert**
5. The module shows a compact timeline list of reminder events in the current window.

---

### 5.2 Dashboard → Bill Discovery (auto-fetch pending bill)
1. Open **Dashboard**.
2. Find **Bill Discovery** section.
3. Fill:
   - **Identifier Type**:
     - `Mobile Number` OR `Consumer ID`
   - **Value**:
     - e.g. `9876543210` or `KSEB-183920`
   - **Preferred Category**:
     - pick from BBPS-supported categories list
4. Click **Discover Pending Bill**.

Expected result:
- If backend discovery returns a bill, it is normalized and:
  - added/updated in the bill list
  - selected automatically for payment:
    - **Pay Bill** bill id is updated
    - **Pay Bill** amount is updated
- If discovery fails, you’ll see an error message inside Bill Discovery.

---

### 5.3 Categories: browse BBPS coverage layer
1. Open **Categories**.
2. Scroll through BBPS categories supported by the module (e.g., Electricity, Water, DTH, Broadband, FASTag, Insurance, EMI, etc.).
3. This screen is informational for coverage.

---

### 5.4 Saved Bills: manage family bills + enable/disable autopay
1. Open **Saved Bills**.
2. Review your saved bills list.
   - Each list item shows:
     - nickname
     - biller name
     - family member (Self/Spouse/Parents/Mother/etc.)
     - due-date and amount
     - current status
3. For each bill, click:
   - **Enable Autopay** (if currently disabled) OR
   - **Disable Autopay** (if currently enabled)

Expected result:
- The module calls backend:
  - `billpayService.updateBillAutopay(billId, newState)`
- The specific bill row updates immediately after normalization.

Also on this screen:
- Monthly category-wise spend is shown as tiles if data exists.
- You can click **Export Payment History** to download CSV.

---

### 5.5 Pay Bill: secure payment with PIN/Biometric + OTP + risk confirmation
1. Open **Pay Bill**.
2. Select a **Saved Bill** from:
   - dropdown of bills (nickname + biller name)
3. Enter/verify:
   - **Amount**
4. Choose:
   - **Payment Method**: `UPI`, `Card`, `NetBanking`, `Wallet`
   - **Authentication Mode**:
     - `PIN + OTP`
     - `Biometric + OTP`
5. Complete required security fields:
   - If **PIN + OTP**:
     - enter **Payment PIN** (expects **4–6 digits**)
     - enter **OTP** (expects **6 digits**)
   - If **Biometric + OTP**:
     - enter **OTP** (expects **6 digits**)
     - enable **Biometric confirmation** via checkbox/flag in the UI (the module requires `biometricConfirmed === true`)
6. High-value risk check:
   - If **amount >= ₹5,000**, you must check **risk acknowledgment**
7. Click **Pay** (submit).

Expected result on success:
- Module creates payment order:
  - `billpayService.createPaymentOrder(...)`
- Collects gateway result via Razorpay-like flow:
  - `collectPaymentGatewayResult(...)`
- Verifies payment:
  - `billpayService.verifyPayment(...)`
- Rewards wallet updates in the Offers wallet UI.
- Backend + UI sync is triggered (silent refresh).
- A success message appears with:
  - generated **transaction id**
  - **receipt** id
  - biller reference

Expected result on failure:
- Payment message shows a failure reason.

---

### 5.6 Autopay: manage mandates
1. Open **Autopay**.
2. Update a mandate by:
   - **Resume**
   - **Pause**
   - **Cancel**
3. Update mandate **max amount limit** (if present in the UI).

Expected result:
- Changes sync through:
  - `billpayService.updateMandate(mandateId, { status, reason? })`
  - `billpayService.updateMandate(mandateId, { maxAmount })`

---

### 5.7 Payment History: review outcomes + retry failed payments
1. Open **Payment History**.
2. Identify transactions with status:
   - `Success`
   - `Failed`
3. For a **failed** transaction, use **Retry**:
   - the module pre-fills Pay Bill using the failed txn’s bill/method/authMode and switches tab to **Pay Bill**
   - you must reconfirm PIN/OTP/security gates

---

### 5.8 Receipts: generate PDF + share receipt details
1. Open **Receipts**.
2. Select a transaction receipt in the list.
3. Use:
   - **Download PDF**:
     - generates a PDF receipt via `jsPDF` and saves it as `${receiptId}.pdf`
   - **Share**:
     - copies a receipt summary string to clipboard (if clipboard is supported)

---

### 5.9 Disputes: raise complaint against a transaction
1. Open **Disputes**.
2. Enter:
   - **Transaction ID** (txn id or display id)
   - **Complaint Reason** (type)
   - add **description/details**
3. Click submit to create the dispute.

Expected result:
- The module calls backend:
  - `billpayService.createDispute({ transactionId, type, description })`
- Adds the dispute item to the top of the disputes list
- Clears the form and shows a “complaint raised” message

---

### 5.10 Offers / Rewards wallet
1. Open **Offers**.
2. View wallet values (cashback/coins/coupons).
3. Wallet values update after successful payments and sync refresh.

---

### 5.11 Admin Reports: analytics by date range with fallback
1. Open **Admin Reports**.
2. Choose Admin date range:
   - uses UI state `adminRange` (mapped by helper to:
     - `last30Days`, `quarter`, or `thisMonth`)
3. You will see metrics such as:
   - total transactions
   - success/failure counts and success rate
   - pending refunds
   - dispute tickets
   - top bill categories
   - commission earned
   - biller-wise breakdown

Expected result:
- If analytics API is unavailable, the module shows **local ledger metrics** instead.

---

## 6) Troubleshooting
### Sync issues / backend unavailable
- If you see fallback messaging, retry after some time—backend sync is attempted again on next actions.

### Payment rejected due to security checks
- **PIN + OTP**:
  - PIN must be **4–6 digits**
  - OTP must be **6 digits**
- **Biometric + OTP**:
  - OTP must be **6 digits**
  - biometric confirmation must be enabled in UI
- **High value**:
  - for **>= ₹5,000**, confirm the risk acknowledgment checkbox

### Receipt sharing not working
- If clipboard access is blocked, use **Download PDF** instead.

---

## 7) UI sections reference (quick)
- **Dashboard**: Bill Discovery + Reminder System + KPI + monthly snapshot cards
- **Categories**: BBPS categories coverage list
- **Saved Bills**: saved bill list + autopay toggle + category spend + CSV export
- **Pay Bill**: secure payment form + PIN/biometric + gateway + verification
- **Autopay**: mandate resume/pause/cancel + limit updates
- **Payment History**: success/failure list + retry failed flows
- **Receipts**: PDF generation + share
- **Disputes**: transaction id + reason + description form
- **Offers**: rewards wallet
- **Admin Reports**: analytics and local fallback
