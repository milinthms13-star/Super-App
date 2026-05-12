# BillPay Module — Feature List

## 1) Module structure / navigation
- Single-screen tab layout inside **BillPayHub**:
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

## 2) Bharat Connect / BBPS categories
- Supports **25+ bill categories** including:
  - Electricity, Water, LPG, DTH, Broadband, Mobile Postpaid, FASTag
  - Insurance, EMI, Education Fees, Municipal Tax
  - Additional BBPS-ready categories

## 3) Smart dashboard (KPIs)
- Shows key indicators such as:
  - Due soon
  - Overdue
  - Paid
  - Autopay enabled
  - Failed payment
  - Upcoming reminders

## 4) Bill discovery flow
- User can discover bills using:
  - **Mobile number**
  - **Consumer ID**
- Behavior:
  - If match exists: fetches pending bill for payment
  - If no match exists: generates a simulated “discovered” pending bill record

## 5) Reminder system
- Reminder channels:
  - Push
  - SMS
  - WhatsApp
- Reminder schedule windows:
  - 7 days before due
  - 2 days before due
  - On due date
  - Overdue alert

## 6) Autopay / e-mandate management
- Mandate status support:
  - Active
  - Paused
  - Cancelled
- Controls:
  - Pause / Resume / Cancel
  - Update mandate max amount

## 7) Secure payment flow (2FA + validations)
- Authentication options:
  - PIN + OTP
  - Biometric + OTP
- Validation and checks:
  - PIN format check
  - OTP format check
  - Biometric confirmation check
  - High-value risk acknowledgment for **>= INR 5,000**

## 8) Receipt vault
- For each transaction, stores:
  - Receipt ID
  - Transaction ID
  - Biller reference number
  - Payment status
- Actions:
  - Download receipt as **PDF** (via **jsPDF**)
  - Share receipt summary (clipboard)

## 9) Failed payment handling & recovery
- Displays:
  - Whether amount was deducted
  - Refund status
- Recovery actions:
  - Retry payment
  - Support ticket shortcut

## 10) Dispute / complaint center
- Complaint reasons include:
  - Paid but bill not updated
  - Wrong amount
  - Refund delay
  - Duplicate payment
- Tracks:
  - Dispute ID
  - Transaction reference
  - Status
  - Timestamp

## 11) Rewards & retention
- Rewards wallet in UI:
  - Cashback balance
  - Coins
  - Coupons
- Reward logic:
  - Successful payments increment rewards

## 12) Family bills & monthly summary
- Saved bills support `familyMember` association
- Monthly summary includes:
  - Total paid this month
  - Category-wise spend
  - Upcoming dues
  - Payment history export (CSV)

## 13) Admin reports (analytics)
- Aggregations and metrics:
  - Total transactions
  - Success/failure counts and success rate
  - Pending refunds
  - Dispute ticket count
  - Top bill categories
  - Commission earned (simulated percentage)
  - Biller-wise volume/success/failure/amount report

## 14) Integration readiness (backend-ready capabilities)
- Prepared for wiring with APIs for:
  - BBPS biller directory/search
  - Fetch bill
  - Pay bill with 2FA/OTP verification
  - Transaction status polling / webhook updates
  - Dispute/complaint APIs
  - Rewards ledger APIs
  - Admin analytics endpoints

