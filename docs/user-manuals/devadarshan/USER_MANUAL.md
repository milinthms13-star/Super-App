# Devadarshan User Manual (Front-End)

> Module: `src/modules/devadarshan/DevadarshanHub.js`

## 1) What this module does
Devadarshan provides a devotional/temple experience hub (based on the “devadarshan” module) where users can browse devotional content and participate in relevant experiences (subject to enabled features).

## 2) Entry point
1. Login.
2. Open **Devadarshan** from navigation.
3. The module typically loads on a hub/home view.

## 3) Step-by-step user flows

### 3.1 Browse devotional content
1. Open Devadarshan hub.
2. Browse the available tiles/cards/sections.
3. Select an item to open details.

Expected result:
- A detail view opens with relevant information (description, images, actions).

### 3.2 Perform available actions (if supported)
1. On the detail page, click actions (e.g., “View”, “Join”, “Notify me”, etc. depending on UI).
2. Follow any prompts and confirm.

Expected result:
- Confirmation feedback is shown and your action appears in “My” views if present.

## 4) Troubleshooting (UI-level)
- Content not loading:
  - Verify your session/login.
  - Refresh and retry.
  - Check connectivity.
- Actions not available:
  - Confirm you’re using the correct account/role and module is enabled.

## 5) UI sections reference
- Devotional hub/cards
- Detail screens
- Action dialogs/buttons (if present)
