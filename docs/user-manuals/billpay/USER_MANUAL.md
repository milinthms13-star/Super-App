# Bill Pay User Manual (Front-End)

> Module: `src/modules/billpay/BillPayHub.js`

## 1) What this module does
BillPay Hub is now a super-app style daily-use payment module with:
- Bharat Connect / BBPS-ready category coverage (25+ categories)
- smart dashboard for due/overdue/paid/autopay/failed/reminder metrics
- bill discovery using mobile number or consumer ID
- secure payment flow with PIN/Biometric + OTP and high-value risk confirmation
- autopay/e-mandate controls
- receipt vault with PDF, transaction ID, biller reference, share/download
- failed payment recovery, refund visibility, and support ticket shortcut
- dispute center, rewards, family bill management, monthly summary, admin reporting

## 2) Entry point
1. Login to the app.
2. Open **Bill Pay** from navigation.
3. Use the top tabs:
   - `Dashboard`
   - `Categories`
   - `Saved Bills`
   - `Pay Bill`
   - `Autopay`
   - `Payment History`
   - `Receipts`
   - `Disputes`
   - `Offers`
   - `Admin Reports`

## 3) User flows

### 3.1 Discover bill automatically
1. Go to `Dashboard`.
2. In **Bill Discovery**, select `Mobile Number` or `Consumer ID`.
3. Enter identifier and submit.

Expected result:
- Matching pending bill is fetched and preselected for payment.
- If no match exists in local records, a new pending bill record is created in simulation mode.

### 3.2 Pay bill securely
1. Go to `Pay Bill`.
2. Select saved bill and verify amount.
3. Choose payment method and authentication mode:
   - `PIN + OTP`, or
   - `Biometric + OTP`
4. Enter OTP and complete required security checks.
5. For high-value payment (>= INR 5,000), confirm risk acknowledgment.
6. Submit payment.

Expected result:
- Success: transaction ID, receipt ID, and biller reference generated.
- Failure: failed state with deduction status and refund status shown.

### 3.3 Manage reminders
1. Go to `Dashboard` > **Reminder System**.
2. Enable channels:
   - Push
   - SMS
   - WhatsApp
3. Enable schedule windows:
   - 7 days before due
   - 2 days before due
   - due date
   - overdue alert

Expected result:
- Reminder timeline previews upcoming reminder events for unpaid bills.

### 3.4 Manage autopay mandates
1. Open `Autopay`.
2. For each mandate, use:
   - `Resume`
   - `Pause`
   - `Cancel`
3. Update mandate max amount and leave input field to save.

Expected result:
- Mandate state and amount limit update immediately in UI.

### 3.5 Handle failed payments
1. Open `Payment History`.
2. Find failed transaction.
3. Review:
   - Amount deducted (Yes/No)
   - Refund status
4. Click `Retry` to reopen prefilled Pay flow.
5. Click `Support Ticket` to prefill Dispute form.

Expected result:
- Retry-ready payment form or prefilled dispute workflow.

### 3.6 Download/share receipts
1. Open `Receipts`.
2. Choose transaction.
3. Click:
   - `Download PDF`
   - `Share`

Expected result:
- Receipt PDF is generated.
- Share copies receipt summary to clipboard.

### 3.7 Raise complaint/dispute
1. Open `Disputes`.
2. Enter transaction ID.
3. Select type:
   - Paid but bill not updated
   - Wrong amount
   - Refund delay
   - Duplicate payment
4. Add details and submit.

Expected result:
- Complaint ticket is created with timestamp and status.

### 3.8 Rewards and family management
1. Open `Offers` for cashback, coins, and coupon status.
2. Open `Saved Bills` to manage family-linked bills and export payment history.

Expected result:
- Rewards balance updates after successful payments.
- Category-wise spend and family bill records are visible.

## 4) Admin panel
Open `Admin Reports` to monitor:
- total transactions
- success/failure rate
- pending refunds
- dispute tickets
- top bill categories
- commission earned
- biller-wise report

## 5) Troubleshooting
- If payment is blocked:
  - verify PIN/OTP format
  - complete biometric confirmation when selected
  - confirm risk checkbox for high-value transactions
- If receipt share fails:
  - clipboard access may be restricted by browser security settings
- If bill discovery returns no direct match:
  - module creates a simulated pending bill entry for workflow continuity
