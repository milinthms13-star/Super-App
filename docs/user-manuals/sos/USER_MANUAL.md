# SOS User Manual (Front-End)

> Module: `src/modules/sos/*` (SOS / Emergency Alerts)

## 1) What this module does
The **SOS** module enables you to trigger an **emergency alert** and share the current context (e.g., live location/trip context when available) to the emergency workflow.

Typical outcomes:
- An SOS alert is triggered
- The UI shows escalation/acknowledgement status
- If SOS is triggered during an active ride/trip, the alert is linked to that trip context

## 2) Entry point in the app
1. Open the app and navigate to the **SOS** screen/panel.
2. If your app provides global quick actions, you may also access SOS from there.

## 3) Main screen layout (what you see)

### 3.1 SOS trigger area
- An emergency prompt/message
- A **Trigger SOS** button

### 3.2 SOS status / escalation area
- Status indicators (e.g., ongoing / acknowledged / escalated)
- Any waiting timer or next-step instructions

### 3.3 Optional trip-context banner
- If SOS is launched from an active trip/ride screen, you may see a banner showing trip context

## 4) Step-by-step user flows

### 4.1 Trigger SOS (manual SOS)
1. Open **SOS**.
2. Read/confirm the emergency prompt (if the UI asks you to confirm intent).
3. Click **Trigger SOS**.

Expected result:
- The UI shows a message such as:
  - `SOS alert triggered for emergency support.`
- The UI then shows escalation messages such as:
  - `SOS alert escalated to emergency workflow.`

### 4.2 Trigger SOS during an active trip (if your UI supports it)
1. Start a trip / ensure an active trip is running.
2. Open the **active trip actions** area.
3. Click **SOS**.

Expected result:
- The SOS alert is tied to the active trip context.
- Escalation/status messages appear in the SOS area.

### 4.3 View SOS status after triggering
1. After triggering SOS, check the SOS status section.
2. Follow any on-screen instructions (for example: wait/confirm/acknowledge).

Expected result:
- You can see the current state (pending/acknowledged/escalated or similar).

## 5) Troubleshooting (UI-level)

- SOS button does not respond:
  - Ensure you’re logged in.
  - Check internet connectivity.
  - Close and reopen the SOS panel and retry.

- SOS triggers but no escalation message appears:
  - Refresh the screen and check again.
  - Verify app permissions that SOS may rely on (location/notifications).
  - Retry the action if needed (only if it is safe to do so).

- SOS context missing (e.g., no trip/location details):
  - Ensure location/trip context is available in the app when you trigger SOS.
  - Confirm required permissions are granted.

## 6) UI sections reference
- SOS trigger button + emergency prompt
- SOS status + escalation notifications
- Optional trip-context banner (when SOS is triggered from ride/trip screens)
