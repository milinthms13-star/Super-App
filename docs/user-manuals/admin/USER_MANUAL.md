# Admin User Manual (Front-End)

> Module: `src/modules/admin/AdminPanel.jsx` / `src/modules/admin/AdminDashboard.js` (admin UI bundle)

## 1) What this module does
The Admin module provides moderation and administrative controls for the platform. It is used by admin staff to review reports, manage listings/content, and monitor system/module activity.

## 2) Entry point
1. Login as an admin user.
2. Open the **Admin** section from the app navigation/dashboard.
3. The module typically loads an admin landing/dashboard view.

## 3) Step-by-step user flows

### 3.1 Review administrative dashboard
1. Open **Admin Dashboard**.
2. Review KPIs/cards and available admin actions.
3. Select a section (e.g., moderation, panel tools) from the admin navigation.

Expected result:
- Dashboard widgets display current counts/alerts relevant to admin operations.

### 3.2 Use Admin Panel tools
1. Open **Admin Panel**.
2. Select the relevant tool/action tab.
3. Filter/search for items (users, listings, reports) if UI provides it.
4. Open an item to view details.
5. Apply an action (approve/reject/remove/flag depending on policy).

Expected result:
- Action results reflect immediately (status update / toast message).

## 4) Troubleshooting (UI-level)
- If admin actions fail:
  - Verify your account has admin permissions.
  - Refresh the page and try again.
  - Check for session expiration (log out/in).
- If filters show no results:
  - Clear filters and verify date ranges/status selections.

## 5) UI sections reference
- Admin Dashboard
- Admin Panel
- Moderation/management tables/cards
- Action modals/dialogs (if applicable)
