# Bill Pay Module Documentation (Front-End)

## 1) Overview
`BillPayHub` is upgraded from a basic bill UI into a monetization-ready daily utility module designed for super-app usage patterns.

Front-end file:
- `src/modules/billpay/BillPayHub.js`
- `src/modules/billpay/BillPayHub.css`

## 2) Module architecture
Tab layout implemented in a single screen:
- Dashboard
- Categories
- Saved Bills
- Pay Bill
- Autopay
- Payment History
- Receipts
- Disputes
- Offers
- Admin Reports

## 3) Feature coverage

### 3.1 Bharat Connect / BBPS category layer
- Includes 25+ bill categories:
  - electricity, water, LPG, DTH, broadband, mobile postpaid, FASTag
  - insurance, EMI, education fees, municipal tax, and additional BBPS-ready categories

### 3.2 Smart dashboard KPIs
- Due soon
- Overdue
- Paid
- Autopay enabled
- Failed payment
- Upcoming reminders

### 3.3 Bill discovery flow
- Input: mobile number or consumer ID
- Behavior:
  - if match exists, pending bill is fetched
  - if no match, simulated discovered bill is generated and added

### 3.4 Reminder system
- Channels:
  - push
  - SMS
  - WhatsApp
- Schedule windows:
  - 7 days before due
  - 2 days before due
  - due date
  - overdue alert

### 3.5 Autopay / e-mandate controls
- Mandate status:
  - active
  - paused
  - cancelled
- Controls:
  - pause/resume/cancel
  - mandate max amount update

### 3.6 Security controls in payment flow
- Authentication options:
  - PIN + OTP
  - Biometric + OTP
- Validation:
  - PIN format check
  - OTP format check
  - biometric confirmation check
  - high-value risk acknowledgment (>= INR 5,000)

### 3.7 Receipt vault
- Each transaction stores:
  - receipt ID
  - transaction ID
  - biller reference number
  - payment status
- Actions:
  - PDF download using `jsPDF`
  - share summary (clipboard)

### 3.8 Failed payment handling
- Shows:
  - amount deducted or not
  - refund status
- Actions:
  - retry payment
  - support ticket shortcut

### 3.9 Dispute center
- Complaint reasons:
  - paid but bill not updated
  - wrong amount
  - refund delay
  - duplicate payment
- Tracks dispute ID, transaction reference, status, and time

### 3.10 Rewards and retention
- Reward wallet in UI:
  - cashback balance
  - coins
  - coupons
- Successful payments increment rewards

### 3.11 Family bills and summary
- Saved bills include `familyMember` association
- Monthly summary provides:
  - total paid this month
  - category-wise spend
  - upcoming dues
  - payment history export (CSV)

### 3.12 Admin reports
- Total transactions
- Success/failure counts and success rate
- Pending refunds
- Dispute ticket count
- Top bill categories
- Commission earned (simulated percentage)
- Biller-wise volume/success/failure/amount report

## 4) State model (front-end simulation)
The module currently runs in local state with seeded data and simulation logic.

Primary state groups:
- `bills`
- `transactions`
- `mandates`
- `disputes`
- `reminderSettings`
- `offerWallet`

## 5) Export and receipt generation
- CSV export uses browser `Blob` + `download` flow.
- PDF receipt generation uses `jsPDF` dependency.

## 6) Integration readiness notes
Current implementation is UI + state simulation and is ready for backend wiring with:
- BBPS biller directory/search API
- fetch bill API
- pay bill API with 2FA/OTP verification backend
- transaction status polling/webhook
- dispute/complaint APIs
- rewards ledger APIs
- admin analytics endpoints
