# Hyperlocal 360 Ops Board (Canva Brief)

## Goal
Create a single-screen operations board for daily admin review of the hyperlocal business.

## Canvas Size
- 1920 x 1080 (landscape)

## Sections
1. Header strip
- Title: `Hyperlocal 360 Operations`
- Date/time block (top right)
- Filters: City, Date range, Category

2. KPI row (6 cards)
- Total Orders
- Active Jobs
- Delivered Orders
- Cancellation Rate
- Pending Refunds
- Open Complaints

3. Revenue block
- Gross Sales
- Net Vendor Payout
- Commission Collected
- Avg Order Value

4. Fulfillment block
- Partner Online Count
- Avg Partner Acceptance Time
- SLA Breach Count
- Top Delay Reasons

5. Quality & Risk block
- Refund Funnel (requested -> approved/rejected)
- Complaint Funnel (open -> resolved)
- Top complaint tags

6. Leaderboards
- Top Shops by Revenue
- Top Products by Units
- City-wise Orders

## Visual Direction
- Professional operations dashboard
- Colors: slate/teal/amber accents (no purple)
- Clear card hierarchy, high-contrast numbers

## Data Mapping
Use backend `/api/hyperlocal/overview360` and admin analytics/reporting endpoints as source.

## Exports
- PNG for daily sharing
- Editable Canva link for updates
