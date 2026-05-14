# REMINDER MODULE FEATURE AUDIT

**Date:** May 7, 2026  
**Status:** Corrected feature audit based on current code  
**Purpose:** Replace outdated "missing feature" claims that no longer match the implementation

---

## Audit Reconciliation

Two Reminder audits in the repo disagreed. Code verification shows the disagreement is caused by **stale audit content**, not by the four disputed features being absent.

The following capabilities are present in the codebase today:

- Snooze
- Configurable remind-before offsets
- Missed reminder tracking
- SMS reminder scheduler wiring

Because earlier versions of this audit marked those items as missing, any old completion percentages that depended on those claims are no longer reliable without a full recount.

---

## Corrected Feature Status

### 1. Basic Reminder Features

**Correction:** Snooze is implemented and should not be listed as missing.

Verified evidence:

- Model support in `backend/models/Reminder.js`
  - `snoozedUntil`
  - `snoozeCount`
  - `snoozeHistory`
  - `snoozeOptions`
  - `snooze(...)`
- API support in `backend/routes/reminders.js`
  - `POST /api/reminders/:id/snooze`
  - `POST /api/reminders/bulk/snooze`
- Frontend support
  - `src/services/remindersService.js`
  - `src/modules/reminderalert/components/ReminderForm.js`

**Revised conclusion:** Snooze is a shipped feature, though UX polish can still be improved if needed.

---

### 2. Notification Channels

**Correction:** SMS is not absent from the Reminder module. Scheduler and route wiring exist.

Verified evidence:

- `backend/services/smsReminderScheduler.js`
  - periodic scheduler
  - checks due reminders
  - skips snoozed reminders
  - skips missed reminders
  - uses `reminderBeforeOffsets`
- `backend/server.js`
  - `smsReminderScheduler.start()`
- `backend/routes/reminders.js`
  - `GET /api/reminders/:id/sms-delivery-status`
  - `POST /api/reminders/:id/resend-sms`
- `src/services/remindersService.js`
  - `getSMSDeliveryStatus(...)`
  - `resendSMS(...)`
  - `setSMSConfig(...)`
- `src/modules/reminderalert/components/ReminderForm.js`
  - SMS setup UI

**Revised conclusion:** SMS reminder delivery is implemented at the scheduler/API level. Remaining work, if any, should be framed as enhancement work such as billing, callback enrichment, or analytics, not "SMS missing."

---

### 3. Smart Reminder Options

**Correction:** This category is not empty.

#### Snooze

Implemented:

- `backend/models/Reminder.js`
- `backend/routes/reminders.js`
- `src/services/remindersService.js`
- `src/modules/reminderalert/components/ReminderForm.js`

#### Remind-Before Offsets

Implemented:

- `backend/models/Reminder.js`
  - `reminderBeforeOffsets`
  - `notificationLog`
  - `needsNotification()`
  - `getNextNotificationOffset()`
- `backend/routes/reminders.js`
  - `GET /api/reminders/:id/notification-offsets`
  - `PUT /api/reminders/:id/notification-offsets`
- `src/services/remindersService.js`
  - fetch/update helpers
- `src/modules/reminderalert/components/ReminderForm.js`
  - selectable offsets

#### Missed Reminder Tracking

Implemented:

- `backend/models/Reminder.js`
  - `missedAt`
  - `missedHistory`
- `backend/routes/reminders.js`
  - `GET /api/reminders/missed`
  - `POST /api/reminders/:id/mark-missed`
  - `POST /api/reminders/:id/resend`
- `backend/services/missedReminderScheduler.js`

**Revised conclusion:** Smart reminder options are partially implemented, not `0/9`.

Still-unclear or still-missing items in this category:

- Escalation / multi-step fallback rules
- Location-based reminders
- Calendar-triggered reminders
- AI reminder suggestions

---

### 4. SMS and Call Integration

**Correction:** This category should not describe Reminder SMS support as absent.

Voice reminders are already implemented, and SMS reminder scheduling is also present.

Verified SMS-related code:

- Scheduler: `backend/services/smsReminderScheduler.js`
- Startup wiring: `backend/server.js`
- Status/resend routes: `backend/routes/reminders.js`
- Frontend API client: `src/services/remindersService.js`

**Revised conclusion:** The remaining gaps in this category are better framed as:

- SMS cost tracking
- Admin reporting
- deeper delivery analytics
- retry policy refinement

not as "no SMS scheduler found."

---

### 5. Often-Missed Critical Features

**Correction:** Several items previously listed as missing are implemented.

Implemented here:

- Snooze logic
- Missed reminder tracking
- Reminder history for missed reminders
- Multiple notify-before offsets
- SMS resend and SMS delivery status endpoints

Still real candidates for follow-up:

- export
- offline sync
- broader notification preference management
- admin cost tracking

---

## Remaining High-Confidence Gaps

After this correction pass, the more credible Reminder gaps are:

### Advanced recurring rules

Current recurrence is limited to:

- `none`
- `daily`
- `weekly`
- `monthly`

Still missing:

- weekday sets
- every X days/weeks/months
- last day of month
- end-date / occurrence-limit controls
- pause/resume recurrence

### Escalation logic

Not enough evidence was found for a complete escalation engine with timed fallback steps such as:

- notify in-app first
- then SMS
- then call
- then trusted contact escalation

### Export and calendar sync

No verified export or calendar sync implementation was confirmed in this pass.

### Admin / billing / operational analytics

No verified reminder-specific admin reporting was confirmed for:

- SMS usage costs
- per-channel spend
- failed delivery dashboards
- premium / billing analytics

---

## What Should Change in Planning

Use the corrected planning lens below:

1. Do not create new "Phase 1" tasks for snooze, missed reminder tracking, or configurable offsets as if they are absent.
2. Treat SMS work as enhancement/hardening unless the task is specifically about callbacks, analytics, or billing.
3. Re-run any percentage-based audit scoring before using it in roadmaps or executive summaries.
4. Focus implementation planning on true gaps such as advanced recurrence, escalation, export, and admin reporting.

---

## Verified Code Paths

- `backend/models/Reminder.js`
- `backend/routes/reminders.js`
- `backend/services/missedReminderScheduler.js`
- `backend/services/smsReminderScheduler.js`
- `backend/server.js`
- `src/services/remindersService.js`
- `src/modules/reminderalert/components/ReminderForm.js`

