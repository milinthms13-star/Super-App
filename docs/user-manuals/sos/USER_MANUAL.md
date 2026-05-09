# SOS User Manual (Front-End)

> Module: `src/modules/sos/*` (SOS / Emergency Alerts)

## 1) What this module does
The SOS module enables a user to trigger an **emergency alert** and share the current context (e.g., live location/trip context when available) to the emergency workflow.

Typical outcomes:
- An SOS alert is triggered.
- Emergency escalation/notifications are shown in the UI.
- If SOS is triggered during an active ride/trip, the alert is tied to that trip context.

## 2) Entry point in the app
1. Open the app and navigate to the **SOS** screen/panel.
2. If the app has a global quick-action, you can also access SOS from there.

## 3) Step-by-step user flow

### 3.1 Trigger SOS
1. Open **SOS**.
2. Confirm your emergency intent (UI typically shows an emergency prompt/message).
3. Click **Trigger SOS**.

Expected result:
- The UI shows an SOS state message such as:
  - `SOS alert triggered for emergency support.`
- The UI shows an escalation/notification message such as:
  - `SOS alert escalated to emergency workflow.`

### 3.2 Use SOS during an active trip (if applicable)
If your SOS is available from the ride/trip screen:
1. Start a trip / ensure an active trip is running.
2. Open the **active trip actions**.
3. Click **SOS**.

Expected result:
- The SOS alert is tied to the active trip context.
- Emergency workflow/notifications are shown.

### 3.3 View SOS status
After triggering SOS:
- Check the SOS status area (e.g., ongoing / acknowledged / escalated).
- Follow any on-screen instructions or waiting timer.

## 4) Troubleshooting (UI-level)
- SOS button does not respond:
  - Ensure you are logged in.
  - Check internet connectivity.
  - Retry after closing/reopening the SOS panel.
- SOS triggers but no escalation message appears:
  - Refresh the screen.
  - Re-check app permissions (location/notifications) if the app requests them.

## 5) UI sections reference
- SOS trigger button / emergency prompt
- SOS status + escalation notifications
- (Optional) trip-context banner when SOS is triggered from ride/trip screens

