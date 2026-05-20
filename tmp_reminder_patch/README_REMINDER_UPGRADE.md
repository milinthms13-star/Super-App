# Reminder Module Upgrade Patch

## Main gaps found

1. First screen is powerful but not fast enough for normal users.
2. No natural-language quick reminder flow.
3. Categories are too limited for a super app reminder product.
4. Reminder-before offsets exist in backend model, but frontend does not expose them clearly.
5. Channels are inconsistent: model supports Email/WhatsApp/Telegram/Push fields, route validation only allows In-app/SMS/Call.
6. Due date/time handling can create timezone surprises if date-only strings are converted through UTC.
7. Cards do not show clear overdue/due-soon status pill.
8. Templates for medicine, bill, birthday, office signing, etc. are missing.

## Files included

- `src/modules/reminderalert/reminderSmartUtils.js`
- `src/modules/reminderalert/components/ReminderQuickCreate.js`
- `src/modules/reminderalert/REMINDER_UPGRADE_CSS.css`
- `backend/utils/reminderValidationUpgrade.js`
- `backend/services/reminderEscalationHelper.js`

## How to connect in ReminderAlert.js

Import:

```js
import ReminderQuickCreate from './components/ReminderQuickCreate';
```

Add this helper inside component:

```js
const handleTemplateApply = (template) => {
  setFormData((current) => ({
    ...current,
    title: template.title,
    category: template.category,
    priority: template.priority,
    reminders: template.reminders,
    reminderBeforeOffsets: template.reminderBeforeOffsets,
  }));
  setShowAddForm(true);
};
```

Render above stats/list:

```jsx
<ReminderQuickCreate
  submitting={submitting}
  onCreate={async (payload) => {
    setSubmitting(true);
    try {
      await createReminder(payload);
    } finally {
      setSubmitting(false);
    }
  }}
  onApplyToForm={handleTemplateApply}
/>
```

## Update INITIAL_FORM

Add:

```js
reminderBeforeOffsets: [10],
```

## Show overdue/due-soon pill in ReminderCard.js

Import:

```js
import { getReminderUrgency } from '../reminderSmartUtils';
```

Inside component:

```js
const urgency = getReminderUrgency(reminder);
```

Inside meta row:

```jsx
<span className={`reminderalert-status-pill ${urgency.className}`}>{urgency.label}</span>
```

## Backend validation upgrade

In `backend/routes/reminders.js`, replace local reminder validation gradually with:

```js
const { validateReminderPayload, parseDueDateTime } = require('../utils/reminderValidationUpgrade');
const { getLeadStatus } = require('../services/reminderEscalationHelper');
```

In POST route:

```js
const validation = validateReminderPayload(req.body);
if (!validation.valid) {
  return res.status(400).json({ success: false, message: Object.values(validation.errors)[0], errors: validation.errors });
}
```

Create reminder using local-safe due date:

```js
dueDate: parseDueDateTime(dueDate, dueTime),
status: getLeadStatus({ ...req.body, completed: false }),
reminderBeforeOffsets: Array.isArray(req.body.reminderBeforeOffsets) ? req.body.reminderBeforeOffsets : [10],
```

Also update route `VALID_REMINDERS` to include:

```js
['Email', 'In-app', 'SMS', 'Call', 'WhatsApp', 'Telegram', 'Push']
```

## Paste CSS

Copy content from `REMINDER_UPGRADE_CSS.css` to bottom of `src/styles/ReminderAlert.css`.
