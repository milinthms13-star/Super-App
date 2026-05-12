# Business Builder User Manual (Front-End)

> Module: `src/modules/businessbuilder/BusinessBuilder.js`

## 1) What this module does
Business Builder helps users create and manage business-related plans and assets. Depending on role and enabled features, it may guide users through setup steps, dashboards, and action workflows.

## 2) Entry point
1. Login.
2. Open **Business Builder** from the app navigation.
3. The module typically opens on a builder/dashboard overview.

## 3) Step-by-step user flows

### 3.1 Start/continue a business build
1. Open the Business Builder module.
2. Choose an existing project/build (if present) or start a new one.
3. Follow the UI wizard/sections to provide core business details.

Expected result:
- A saved draft/build is created and appears in the list/dashboard.

### 3.2 Add business assets/details
1. Navigate through sections (e.g., profile, offerings, branding, operations).
2. Fill required fields.
3. Save progress (continue later).

Expected result:
- The build state persists and reflects saved updates.

### 3.3 Review and finalize
1. Open the review/summary step (if provided).
2. Validate all required information.
3. Confirm final submission/activation (if that action exists).

Expected result:
- Confirmation message/updated status is shown.

## 4) Troubleshooting (UI-level)
- Data not saving:
  - Verify network connectivity.
  - Check login/session.
  - Retry and ensure required fields are completed.
- Wizard step missing:
  - Refresh the page.
  - Confirm you’re using the correct account role.

## 5) UI sections reference
- Builder dashboard/landing
- Wizard/steps for business setup
- Save/continue draft
- Review/finalize screens (if available)
