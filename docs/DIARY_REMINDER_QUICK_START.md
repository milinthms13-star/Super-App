# Diary Reminder System - Quick Start Guide

## 🎯 What Was Implemented

Your diary now has a **smart reminder notification system** that:
- 📱 Sends browser notifications at reminder time
- 🔔 Shows all today's notes and reminders in one place
- ⏰ Automatically checks reminders every minute
- 🎵 Plays notification sound when reminder is due
- 📊 Shows statistics (pending reminders, total notes, etc.)

---

## 🚀 How to Use

### Step 1: Open the Diary
1. Navigate to the **Diary** module in your app
2. You'll see a new **"Today's Summary"** section at the top

### Step 2: Create a Reminder
1. Click on **"Calendar"** view tab
2. Click on a date
3. Click **"Add Note or Reminder"**
4. Select type: **"Reminder"** (not "Note")
5. Fill in:
   - **Title:** What to remind about
   - **Reminder time:** Date and time
   - **Notes:** Additional details
6. Click **"Save item"**

### Step 3: Give Notification Permission
- Browser will ask: "Allow notifications?"
- Click **"Allow"** to enable notifications

### Step 4: Wait for Reminder
- When reminder time arrives, you'll get:
  - 🔔 Browser notification popup
  - 🎵 Notification sound
  - 📝 Update in "Today's Summary"

---

## 📍 Key Features

### Today's Summary Section
Located at top of Diary page, shows:

**📝 Notes Section**
- All notes created for today
- Expandable with details

**🔔 Reminders Section**
- Shows time of each reminder
- Status: ⏳ Pending or ✓ Done
- Mark as complete when done

**⚠️ Alert Section**
- Shows how many reminders are pending
- Quick visual indicator

**📊 Stats Footer**
- Total notes count
- Pending reminders count
- Total reminders count

### Notification Popup
When reminder is due:
```
┌─────────────────────────────────────┐
│ 🔔 Team Meeting                     │
│ 10:30 - Discuss Q2 results...       │
└─────────────────────────────────────┘
```

Click popup to focus app, or close it.

---

## ⚙️ Settings

### Auto-Refresh
Today's Summary refreshes automatically every 60 seconds
- Click ↻ button to refresh manually

### Notification Sound
- Enabled by default
- Plays when reminder is due
- Muted if browser is muted

### Permission Status
**Three states:**
1. ✅ **Granted** - You'll get notifications
2. ❓ **Prompt** - Browser will ask on first reminder
3. ❌ **Denied** - No notifications (change in browser settings)

---

## 🔧 Troubleshooting

### "I'm not getting notifications"

**Check 1: Permission Status**
1. Open Diary page
2. Open browser console (F12)
3. Type:
   ```javascript
   window.notificationService.getPermissionStatus()
   ```
4. Look for `canNotify: true`

**Check 2: WebSocket Connection**
```javascript
// In browser console
console.log(socket?.connected); // Should show: true
```

**Check 3: Browser Settings**
1. Click lock icon next to URL
2. Find "Notifications"
3. Change from "Block" to "Allow"

### "Reminder doesn't appear in Today's Summary"

**Check 1: Correct Date**
- Today's Summary only shows today's items
- For tomorrow's reminders, check Calendar view

**Check 2: Reminder Type**
- Must be type "Reminder", not "Note"
- Check the badge in calendar

### "Multiple notifications for same reminder"

**This shouldn't happen!**
- System prevents duplicates using tracking
- If it occurs: Refresh page

---

## 📱 Mobile Support

✅ **Fully supported on mobile**

On iOS:
1. Reminders work when app is open
2. May need to allow in Settings > Notifications
3. Sound may not play if phone is silent

On Android:
1. Reminders work in background
2. Notification appears even if app is closed
3. Click notification to open app

---

## 🔐 Privacy

- ✅ Only YOU see your reminders
- ✅ Notifications are device-local
- ✅ No cloud storage of notifications
- ✅ Notifications cleared after shown
- ✅ All data encrypted in transit

---

## 📊 Example Workflows

### Workflow 1: Daily Meeting Reminder
1. Create reminder: "Team Standup"
2. Set time: 09:30 AM
3. Next day at 09:30: Get notification
4. Complete meeting
5. Click "Mark done" in Today's Summary

### Workflow 2: Task Deadline Reminders
1. Create note for deadline details
2. Create reminder for day before
3. Create reminder for day of
4. System notifies you both days
5. Mark complete when done

### Workflow 3: Personal Reminders
1. Set reminders for doctor appointments
2. Set reminders for bill payments
3. Set reminders for birthdays
4. Get notifications automatically
5. Check completed in Summary

---

## 🎨 Visual Guide

### Today's Summary Layout

```
┌─ 📅 Today's Summary ──────────────────────┐
│                                            │
│ 📝 Notes (2)                               │
│ ├─ Team Meeting Notes                      │
│ │  Discussion points and action items      │
│ └─ Budget Review                           │
│                                            │
│ 🔔 Reminders (3)                           │
│ ├─ 09:30 ⏳ Team Meeting                    │
│ │  Discuss Q2 results...                   │
│ ├─ 02:00 ✓ Doctor Appointment              │
│ └─ 05:00 ⏳ Project Deadline                │
│                                            │
│ ⚠️ 2 pending reminders today               │
│                                            │
│ Stats: 2 Notes | 2 Pending | 3 Total      │
└────────────────────────────────────────────┘
```

### Reminder Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| ⏳ Pending | Orange | Not done yet |
| ✓ Done | Green | Completed |
| ⚠️ Urgent | Red | Overdue |

---

## 💡 Tips & Tricks

1. **Batch Create Reminders**
   - Go to Calendar view
   - Create multiple reminders for same date
   - All appear in Today's Summary

2. **Quick Mark Done**
   - In Today's Summary
   - Click "Mark done" button
   - Removes from pending count

3. **Refresh Today's Summary**
   - Click ↻ button anytime
   - Gets latest data from server
   - Useful if you edit via calendar

4. **Check Upcoming**
   - Switch to Calendar view
   - Navigate to future dates
   - See all planned reminders

5. **Disable for a Reminder**
   - Delete the reminder
   - Or skip notification permission (see browser)
   - Or close notification popup

---

## 🆘 Support

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| No notification sound | Check browser volume & phone settings |
| Notification blocked | Check browser notification settings |
| Reminder not shown | Verify correct date/time set |
| Duplicate notifications | Refresh page (bug mitigation) |
| Today's Summary empty | Check if reminders set for today |

### Contact Support
If issues persist:
1. Note the issue details
2. Open browser console (F12)
3. Share error messages
4. Contact support team

---

## 📝 Best Practices

1. ✅ **Set specific times** for important reminders
2. ✅ **Use notes** to add context
3. ✅ **Mark done** when completed
4. ✅ **Create a day early** for prep time
5. ✅ **Use calendar view** for month overview
6. ✅ **Allow notifications** for timely alerts
7. ❌ **Don't rely** on sound alone (can be muted)
8. ❌ **Don't create** duplicate reminders

---

## 🚀 Advanced Features (For Developers)

### Access Notification Service
```javascript
// In browser console
const service = window.notificationService;

// Check permission
service.getPermissionStatus();

// Manually show notification
service.notifyReminder({
  title: "Test Reminder",
  reminderAt: new Date(),
  note: "This is a test"
});

// Clear active reminders
service.clearActiveReminders();
```

### Check WebSocket Events
```javascript
// Listen for incoming reminders
window.addEventListener('reminderNotification', (e) => {
  console.log('Reminder received:', e.detail);
});
```

### Backend Endpoints
```
GET  /api/diary/today/summary           - Today's items
GET  /api/diary/upcoming-reminders      - Next 7 days
PUT  /api/diary/calendar-items/:id/mark-notified - Mark done
```

---

## 📚 Related Documentation

- Main Diary Guide: `DIARY_DOCUMENTATION.md`
- Complete Implementation: `DIARY_REMINDER_NOTIFICATION_IMPLEMENTATION.md`
- API Reference: Backend Routes in `diary.js`

---

## ✨ What's Next?

Future planned enhancements:
- 📧 Email reminders as backup
- 📱 SMS notifications
- 🔁 Recurring reminders
- 📊 Reminder analytics
- 🎯 Smart reminder timing
- 🏷️ Reminder categories

---

**Happy organizing! 🎉**
