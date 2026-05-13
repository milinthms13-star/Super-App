# Quick Links User Manual (Front-End)

> Module: `src/modules/quicklinks/QuickLinks.js`

## 1) What this module does
**Quick Links** provides fast access to commonly used sections and actions. It typically serves as a **shortcuts hub** to reduce navigation time by letting you jump to key modules with one click.

Common use cases:
- Open a frequently used module/screen
- Jump directly to an action (create, view, manage—depending on your app configuration)
- Find navigation shortcuts from a single place

## 2) Entry point
1. Login.
2. Open **Quick Links** from app navigation (or dashboard).
3. The module loads a list/grid of shortcut cards/buttons.

## 3) Main screen layout (what you see)
### 3.1 Shortcut grid/cards
- Shortcut cards/buttons representing destinations (modules/screens) and/or actions.
- Each card typically has a label (and sometimes an icon).

### 3.2 Navigation behavior
- Clicking a shortcut triggers navigation to its target destination.

## 4) Step-by-step user flows

### 4.1 Open a shortcut
1. On the Quick Links screen, locate the shortcut card/button you want.
2. Click the shortcut.

Expected result:
- The app navigates to the target module/screen successfully.

### 4.2 Open multiple shortcuts in sequence
1. Click a first shortcut.
2. When you return (if your app returns automatically) or after finishing the task, open Quick Links again.
3. Click another shortcut.

Expected result:
- Each shortcut consistently navigates to the correct destination.

## 5) Troubleshooting (UI-level)
- Shortcut doesn’t navigate:
  - Refresh the page.
  - Confirm your account/session is active (login if needed).
  - Verify the module/shortcut is enabled for your role/subscription.
- Quick Links page looks empty:
  - Wait a moment for loading (if the app loads shortcuts asynchronously).
  - Check connectivity and retry.

## 6) UI sections reference
- Shortcut grid/cards
- Shortcut actions/buttons
