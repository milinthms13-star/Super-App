# Hyperlocal 360 Component & State Matrix

## Global States
- Loading
- Empty
- Error
- Partial Success
- Permission Denied
- Validation Error
- Conflict/Idempotent Replay
- Offline/Retry

## User Journey States
- Search with no shops
- Delivery radius blocked
- Prescription required
- Scheduled window invalid
- Quote updated
- Order placed
- Order cancel success/fail
- Refund pending/approved/rejected
- Complaint open/resolved

## Vendor States
- Shop pending approval
- Shop approved
- Product low stock
- Product unavailable
- Order accepted
- Order rejected

## Partner States
- Profile pending approval
- Online/offline toggle
- Job assigned to other partner
- Delivery status progression
- Payout exceeds available balance
- Payout requested

## Admin States
- Pending queue empty
- Pending queue populated
- Refund review complete
- Complaint resolved
- Config updated
- Audit rows loaded/empty

## Visual Rules
- Do not hide system feedback.
- Every async action must show pending + result state.
- Status badges must be semantically colored with icon + text.
- Tables/lists need pagination affordance.
