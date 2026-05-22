# Hyperlocal 360 Figma Implementation (Frame-by-Frame)

## File Structure
1. `00 Cover`
2. `01 Foundations`
3. `02 Components`
4. `03 User Flow`
5. `04 Vendor Flow`
6. `05 Partner Flow`
7. `06 Admin Flow`
8. `07 Operations 360`
9. `08 Growth`
10. `09 Prototypes`

## 01 Foundations
- Color tokens: primary, neutral, success, warning, danger, info
- Typography scale: display, heading, body, meta
- Spacing scale: 4, 8, 12, 16, 20, 24, 32
- Radius scale: 8, 10, 12, 16, 24, 999
- Elevation: surface, raised, floating CTA
- Status tones and focus state guidance

## 02 Components (Required)
- Tab chip row: default, active, disabled
- Metric card: label/value/helper/trend variants
- Empty state card: icon/title/subtitle/action
- Status badge: success/warning/danger/neutral
- Form field group: input, select, textarea, helper, error, success
- Timeline row: label, timestamp, note, active marker
- Data list item with quick actions
- Section panel shell with header + utility actions
- Button variants: primary, secondary, danger, ghost

## 03 User Flow
Frames:
1. Shop discovery (filters + card grid)
2. Product browsing + add-to-cart
3. Address + checkout
4. Scheduled delivery window selector
5. Quote summary and pricing breakdown
6. Order success with idempotent retry note
7. Order timeline + status transitions
8. Refund/complaint interaction states

## 04 Vendor Flow
Frames:
1. Vendor onboarding form
2. Shop management shell
3. Product CRUD and stock controls
4. Vendor orders with accept/reject actions
5. Settlement and analytics snapshots
6. Out-of-stock and policy edge states

## 05 Partner Flow
Frames:
1. Partner onboarding + KYC status
2. Job feed + accept/reject
3. Delivery stages (assigned -> picked up -> out -> delivered)
4. Navigation and payout request
5. Wallet and payout guardrails

## 06 Admin Flow
Frames:
1. Pending shops moderation
2. Pending partners moderation
3. Refund queue with review actions
4. Complaints queue and resolution
5. Config controls (zone/surge/commission)
6. Audit log table and filters

## 07 Operations 360
Frames:
1. KPI strip (orders, jobs, complaints, refunds)
2. Revenue and fulfillment panels
3. Top shops/products lists
4. Category and city breakdown cards
5. Drilldown modal patterns

## 08 Growth
Frames:
1. Wallet and top-up safety prompt
2. Subscription plans and active plan states
3. Ads management and budget controls
4. Referral/trust card placements

## 09 Prototypes
- Prototype A: User order lifecycle
- Prototype B: Vendor order handling
- Prototype C: Partner fulfillment lifecycle
- Prototype D: Admin moderation and audit trail
- Prototype E: 360 ops daily review

## Naming Conventions
- Frame: `HL360/<Page>/<Feature>/<State>`
- Component: `HL/<Category>/<Component>/<Variant>`
- Variables: `hl.color.*`, `hl.space.*`, `hl.radius.*`, `hl.type.*`

## Handoff
- Include redlines for spacing and typography
- Include interaction notes for every stateful component
- Add API mapping notes per screen
