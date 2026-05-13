# ReminderAlert User Manual (Front-End)

> Module: `src/modules/reminderalert/*` (Reminders & alerts)

## 1) What this module does
**ReminderAlert** helps users schedule and manage reminders and receive alert notifications at the right time.

Depending on your MVP scope, it may support:
- Create reminders
- Enable/disable reminders
- View a reminder list
- Delete reminders
- View alert/notification status (and optionally history/log)

## 2) Entry point in the app
1. Navigate to **ReminderAlert** from the main navigation/menu.
2. The module loads your reminder list/dashboard.

## 3) Main screen layout (what you see)

### 3.1 Reminder list (table/cards/rows)
Each reminder item typically shows:
- Title/description
- Scheduled date & time
- Enabled/disabled status
- Optional frequency (daily/weekly/monthly) or recurrence info

### 3.2 Reminder creation area
- **Add Reminder** button
- A form/modal to enter reminder details

## 4) Step-by-step user flows

### 4.1 Create a reminder
1. Open **ReminderAlert**.
2. Click **Add Reminder**.
3. Enter reminder details:
   - Reminder title/description
   - Date
   - Time
   - Frequency/recurrence (if provided by your UI)
4. Choose whether the reminder is **enabled**.
5. Click **Save**.

Expected result:
- The reminder appears in the list.
- The system schedules the alert.

### 4.2 Edit a reminder (if supported)
1. In the reminder list, select **Edit** for a reminder.
2. Update the fields (date/time/title/frequency as allowed).
3. Click **Update/Save**.

Expected result:
- The reminder’s schedule/status is updated.

### 4.3 Enable/disable a reminder
1. Find the reminder you want in the list.
2. Use the **Enable/Disable** toggle/action.
3. Confirm any prompt (if your UI shows one).

Expected result:
- Enabled reminders remain eligible to fire.
- Disabled reminders do not trigger alerts.

### 4.4 Delete a reminder
1. In the reminder list, click **Delete** (if supported).
2. Confirm deletion.

Expected result:
- The reminder is removed from the list.

### 4.5 Check alert status / history (if available)
1. Look for **Alert History** / **Notifications** / **Log** (if your app provides it).
2. Open it to see previous alerts and their delivery status.

Expected result:
- You can verify whether reminders triggered successfully.

## 5) Troubleshooting (UI-level)

- Alerts not firing:
  - Ensure the reminder is **enabled**.
  - Verify app notification permissions (system-level permission).
  - Confirm your device/app time/date and timezone are correct.
  - If reminders support frequency, confirm recurrence is set correctly.
  - Refresh the reminder list to ensure schedule updates are applied.

- Reminder missing from list:
  - Refresh the page.
  - Verify you saved successfully (no validation errors on form).
  - Retry creation if needed.

- Wrong time triggering:
  - Check timezone settings and time format used by the reminder form.
  - Ensure date/time fields were entered correctly.

## 6) UI sections reference
- Reminder creation form/modal (**Add Reminder**)
- Reminder list (cards/rows)
- Enable/disable toggle or actions
- Edit action (if supported)
- Delete action (if supported)
- Alert history / notifications log (if present)
