# ReminderAlert Module Documentation

> Module route: **`/reminderalert`**  
> Client entry: `src/modules/reminderalert/ReminderAlert.js`  
> Client API service: `src/services/remindersService.js`

---

## 1) Purpose

**ReminderAlert** is the app module that lets users create reminders/tasks, schedule alerts for the due time, and manage delivery across multiple channels (in-app and extended channels such as SMS, Voice Call, Email, WhatsApp, Telegram, Push).

It also supports:
- Recurrence
- Snoozing
- Missed reminder tracking
- Delivery analytics & retry flows
- Trusted contacts + sharing reminders
- Optional attachment support

---

## 2) Frontend UI: Key components

The module UI is composed from the following frontend components (under `src/modules/reminderalert/`):

- **`ReminderAlert.js`**: Main container/orchestrator (form + list + alerts + voice call panel + trusted contacts integration)
- **`components/ReminderForm.js`**: Reminder creation/edit form (supports reminder channels + voice call configuration UI)
- **`components/ReminderList.js`**: List UI for reminders
- **`components/ReminderCard.js`**: Individual reminder card/row (priority/category/due/status + actions like edit/delete/complete)
- **`components/ReminderFilters.js`**: Filter chip UI (by category/status)
- **`components/ReminderStats.js`**: Summary stats UI
- **`TrustedContacts.js`**: Trusted contacts management + invite/share flows
- **Voice call UI components**
  - `components/VoiceCallPanel.js`
  - `components/CountdownTimer.js`
- **`utils/a11y.js`**: ReminderAlert accessibility helpers
- **`index.js`**: Exports module components

Styling:
- `src/styles/ReminderAlert.css`
- `src/styles/TrustedContacts.css`

---

## 3) User flows (high-level)

### 3.1 Create a reminder
1. Open **ReminderAlert**
2. Click **Add Reminder**
3. Fill:
   - title/description
   - due date/time
   - category/priority
   - reminder channels (e.g., in-app, SMS, call)
   - recurrence (if applicable)
4. Save
5. The reminder appears in the list and will be scheduled for alerts

### 3.2 Manage reminders
From the reminder list/card:
- Edit (if supported)
- Enable/disable (if supported by API/state)
- Mark complete/incomplete
- Delete

### 3.3 Voice call reminders (channel-specific)
When a reminder is configured for **Call**, the module supports:
- viewing voice-call status
- manually triggering a call
- showing call UI state (via `VoiceCallPanel`)

### 3.4 Trusted contacts + sharing
Users can:
- invite trusted contacts
- accept/reject invites
- share reminders
- acknowledge shared reminders (as the trusted contact)

---

## 4) Client API surface (`remindersService.js`)

All ReminderAlert network calls are centralized in:

- `src/services/remindersService.js`

### 4.1 Authentication / transport
- Uses `axios` with:
  - `baseURL: API_BASE_URL`
  - `withCredentials: true` (cookie-based auth)

So the backend is expected to use cookies/session/JWT in cookies.

---

## 5) Reminder CRUD (core)

### 5.1 `fetchReminders(options)`
- **GET** `/reminders`
- Query params supported by the client:
  - `category` (e.g., Work, Personal, Urgent; `All` is omitted)
  - `completed` (boolean)
  - `limit`
  - `skip`

### 5.2 `createReminder(reminderData)`
- **POST** `/reminders`
- Client normalizes `dueDate` before sending.

### 5.3 `updateReminder(reminderId, reminderData)`
- **PUT** `/reminders/:id`
- Client converts `dueDate` if provided.

### 5.4 `deleteReminder(reminderId)`
- **DELETE** `/reminders/:id`

### 5.5 `toggleReminderCompletion(reminderId, completed)`
- **PUT** `/reminders/:id`
- Sends `{ completed }`

---

## 6) Voice Call support

### 6.1 `createVoiceCallReminder(reminderData)`
- **POST** `/reminders/voice-call`
- Forces reminders type to:
  - `reminders: ['Call']`

### 6.2 `getVoiceCallStatus(reminderId)`
- **GET** `/reminders/:id/voice-call-status`

### 6.3 `triggerVoiceCall(reminderId)`
- **POST** `/reminders/:id/trigger-call`

---

## 7) Trusted contacts API

All endpoints are prefixed under `/reminders/trusted-contacts`.

### 7.1 Invites
- `sendTrustedContactInvite(recipientId, message?, relationship?)`
  - **POST** `/reminders/trusted-contacts/invite`
- `getSentTrustedContactInvites()`
  - **GET** `/reminders/trusted-contacts/sent`
- `getReceivedTrustedContactInvites()`
  - **GET** `/reminders/trusted-contacts/received`
- `acceptTrustedContactInvite(inviteId)`
  - **POST** `/reminders/trusted-contacts/:inviteId/accept`
- `rejectTrustedContactInvite(inviteId)`
  - **POST** `/reminders/trusted-contacts/:inviteId/reject`
- `removeTrustedContact(contactId)`
  - **DELETE** `/reminders/trusted-contacts/:contactId`

### 7.2 Sharing reminders
- `shareReminderWithContacts(reminderId, contactIds)`
  - **PUT** `/reminders/:reminderId/share-with-contacts`
- `getRemindersSharedWithMe()`
  - **GET** `/reminders/shared-with-me/list`
- `acknowledgeSharedReminder(reminderId)`
  - **POST** `/reminders/shared-with-me/:reminderId/acknowledge`

---

## 8) Attachments (optional)

### 8.1 Upload attachment
- `uploadReminderAttachment(reminderId, file, description?, duration?)`
  - **POST** `/reminders/:reminderId/attachments`
  - Sends multipart/form-data

### 8.2 List attachments
- `getRemindersAttachments(reminderId)`
  - **GET** `/reminders/:reminderId/attachments`
- `getAttachmentsByType(reminderId, fileType)`
  - **GET** `/reminders/:reminderId/attachments/type/:fileType`

### 8.3 Delete attachment
- `deleteRemindersAttachment(reminderId, attachmentId)`
  - **DELETE** `/reminders/:reminderId/attachments/:attachmentId`

---

## 9) Snoozing & missed reminders

### 9.1 Snooze
- `snoozeReminder(reminderId, minutesToSnooze)`
  - **POST** `/reminders/:id/snooze`
  - Body: `{ minutesToSnooze }`

### 9.2 Missed reminders
- `getMissedReminders({ limit?, skip? })`
  - **GET** `/reminders/missed`
- `markReminderAsMissed(reminderId)`
  - **POST** `/reminders/:id/mark-missed`
- `resendMissedReminder(reminderId, { rescheduleFor?, channels? })`
  - **POST** `/reminders/:id/resend`

---

## 10) Notification offsets (advanced reminders)

### 10.1 Read offsets
- `getNotificationOffsets(reminderId)`
  - **GET** `/reminders/:id/notification-offsets`

### 10.2 Update offsets
- `setNotificationOffsets(reminderId, reminderBeforeOffsets)`
  - **PUT** `/reminders/:id/notification-offsets`
  - Body: `{ reminderBeforeOffsets }`

---

## 11) Delivery channel APIs (extended)

The service includes delivery support for:
- **SMS**:
  - `getSMSDeliveryStatus`
  - `resendSMS`
  - `setSMSConfig`
- **Email**:
  - `getEmailDeliveryStatus`
  - `resendEmail`
  - `setEmailConfig`
- **WhatsApp**:
  - `getWhatsAppDeliveryStatus`
  - `resendWhatsApp`
  - `setWhatsAppConfig`
- **Telegram**:
  - `getTelegramDeliveryStatus`
  - `resendTelegram`
  - `setTelegramConfig`
- **Push notifications**:
  - `getPushDeliveryStatus`
  - `setPushConfig`

> See `src/services/remindersService.js` for exact endpoints per channel.

---

## 12) Delivery analytics & retry

### 12.1 Analytics
- `getDeliveryAnalytics(daysBack?, channel?)`
  - **GET** `/reminders/analytics/delivery-stats`

### 12.2 Failed deliveries
- `getFailedDeliveries(channel?, limit?)`
  - **GET** `/reminders/analytics/failed-deliveries`

### 12.3 Retry a failed delivery
- `retryFailedDelivery(logId)`
  - **POST** `/reminders/analytics/retry/:logId`

---

## 13) Templates (customization & library)

### 13.1 User templates
- `createTemplate`, `getUserTemplates`, `getTemplate`, `updateTemplate`, `deleteTemplate`
- `cloneTemplate(templateId, newName)`

### 13.2 Bulk apply template
- `applyTemplateToBulk(templateId, reminderIds)`
  - **POST** `/reminders/bulk/apply-template`

### 13.3 Library templates
- `browseLibraryTemplates(query, category, tags)`
- `getLibraryCategories`, `getLibraryTags`
- `installLibraryTemplate(libraryTemplateId, customName?)`

### 13.4 AI suggestions (template generation)
- `generateAISuggestions(...)`
- `acceptAISuggestion(...)`
- `enhanceTemplateWithAI(templateId)`

---

## 14) Bulk operations

- `bulkSnoozeReminders(reminderIds, snoozeMinutes)`
  - **POST** `/reminders/bulk/snooze`
- `bulkDeleteReminders(reminderIds)`
  - **POST** `/reminders/bulk/delete`
- `bulkUpdatePriority(reminderIds, priority)`
  - **POST** `/reminders/bulk/update-priority`
- `getReminderGroupSummary(groupBy = 'priority')`
  - **GET** `/reminders/bulk/group-summary`

---

## 15) WhatsApp groups (advanced)

- `configureWhatsAppGroup(reminderId, whatsappGroupId, whatsappGroupName)`
  - **PUT** `/reminders/:reminderId/whatsapp-group-config`
- `getWhatsAppGroupStatus(reminderId)`
  - **GET** `/reminders/:reminderId/whatsapp-group-status`

---

## 16) Implementation notes / normalization

`remindersService.js` normalizes backend reminder records via:
- `normalizeReminderRecord(reminder)`
- `normalizeReminderResponse(responseData)`

It also converts `dueDate` to the correct input format via:
- `toDateInputValue(dueDate)`

---

## 17) Where to look for changes

- UI:
  - `src/modules/reminderalert/ReminderAlert.js`
  - `src/modules/reminderalert/components/*`
- API client:
  - `src/services/remindersService.js`
- Styling:
  - `src/styles/ReminderAlert.css`
  - `src/styles/TrustedContacts.css`
- User-level doc:
  - `docs/user-manuals/reminderalert/USER_MANUAL.md`
- Feature summaries:
  - `REMINDERALERT_PHASE1_COMPLETED.md`
  - `REMINDERALERT_IMPROVEMENTS_ANALYSIS.md`
  - `REMINDER_MODULE_FEATURE_AUDIT.md`

---

## 18) Quick reference: important exported functions

In `remindersService.js`, the module default export includes the functions:
- CRUD: `fetchReminders`, `createReminder`, `updateReminder`, `deleteReminder`, `toggleReminderCompletion`
- Voice call: `createVoiceCallReminder`, `getVoiceCallStatus`, `triggerVoiceCall`
- Trusted contacts: invite/share/accept/reject/ack flows
- Attachments: upload/list/by type/delete
- Snooze & missed flows
- Offsets
- Channel delivery status + resend + configs
- Analytics + retry
- Templates + library + AI suggestions
- Bulk operations
- WhatsApp group config/status
