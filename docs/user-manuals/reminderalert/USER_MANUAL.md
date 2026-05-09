# ReminderAlert User Manual (Front-End)

> Module: `src/modules/reminderalert/*` (Reminders & alerts)

## 1) What this module does
ReminderAlert helps users schedule and manage reminders and receive alert notifications at the right time.

Common capabilities (depending on MVP scope):
- Create a reminder
- View reminder list
- Enable/disable reminder
- Delete reminder
- Notification/alert status

## 2) Entry point in the app
1. Navigate to **ReminderAlert** from the main navigation/menu.

## 3) Step-by-step user flow

### 3.1 Create a reminder
1. Open **ReminderAlert**.
2. Click **Add Reminder**.
3. Enter details:
   - Reminder title/description
   - Date
   - Time
   - Frequency (if provided)
4. Choose whether reminder is enabled.
5. Click **Save**.

Expected result:
- The reminder appears in the reminder list.
- The system schedules an alert.

### 3.2 View and manage reminders
1. Open **ReminderAlert**.
2. Review each reminder card/row:
   - title
   - scheduled date/time
   - status (enabled/disabled)
3. Use actions:
   - **Edit** (if supported)
   - **Disable/Enable**
   - **Delete**

### 3.3 Check alert status
- If reminders support a log/history:
  - Open **Alert History / Notifications** section (if present).

## 4) Troubleshooting (UI-level)
- Alerts not firing:
  - Ensure reminder is enabled.
  - Verify app notification permissions.
  - Check that time/date is correct.
- Reminder missing from list:
  - Refresh the screen.
  - Retry creation.

## 5) UI sections reference
- Reminder creation form
- Reminder list (rows/cards)
- Reminder detail (optional)
- Enable/disable toggle
- Alert history/notification log (if present)

