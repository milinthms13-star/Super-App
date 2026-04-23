# Voice Call Reminders - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Open ReminderAlert Module
1. Navigate to the application
2. Go to **Modules** → **ReminderAlert - Todo List**

### Step 2: Create a Voice Call Reminder
1. Click **"Add reminder"** button
2. Fill in the basic fields:
   - **Title**: e.g., "Take Medicine"
   - **Description**: e.g., "Afternoon medication dose"
   - **Category**: Select appropriate category
   - **Priority**: Choose urgency level
   - **Due Date & Time**: When reminder should trigger

### Step 3: Configure Voice Call
1. **Check the "Call" checkbox** in reminder types
2. A new **"Voice Call Reminder Setup"** section will appear
3. Fill in:
   - **Phone Number**: `+1234567890` or `2345678900`
   - **Message Type**: Select "Text-to-Speech" (recommended for testing)
   - **Voice Message**: Type your message (max 500 chars)
   - Example: *"Hi, please remember to take your medicine at 2 PM today"*
4. **Check the "Enable automated voice call"** checkbox

### Step 4: Schedule the Reminder
1. Choose **Recurring** option:
   - `none` - One-time reminder
   - `daily` - Every day at this time
   - `weekly` - Every 7 days
   - `monthly` - Same date each month
2. Click **"Save reminder"**

### Step 5: Monitor the Call Status
1. Reminder appears in your reminder list
2. Shows **Phone Number** and **Call Status**
3. Status indicators:
   - 🟡 **pending** - Waiting to be called
   - 📞 **ringing** - Call in progress
   - ✅ **answered** - Call successful
   - ❌ **failed** - Call failed
   - 🔄 Shows attempts: `1/3`, `2/3`, etc.

### Step 6: Test Manually (Optional)
1. Click **"🔔 Call Now"** button on any voice call reminder
2. Simulated call will be triggered immediately
3. Check browser console or server logs for details

## 📋 Example Reminders

### Medicine Reminder (Recurring Daily)
```
Title: Take Morning Medicine
Description: 500mg tablet with water
Phone: +1-555-0123
Message: "Good morning! Remember to take your medicine with water"
Recurring: Daily
Time: 08:00 AM
```

### Food Reminder (One-time)
```
Title: Lunch Reminder for Kids
Description: Call to eat lunch
Phone: +1-555-0456
Message: "Hi buddy, it's lunch time! Come and eat your lunch now"
Recurring: None
Date & Time: 2026-04-24 at 12:30 PM
```

### Appointment Reminder (Specific Date)
```
Title: Doctor Appointment Tomorrow
Description: Reminder call 1 hour before
Phone: +1-555-0789
Message: "Reminder: You have a doctor appointment tomorrow at 3 PM. Please be ready"
Recurring: None
Date: 2026-04-25 at 2:00 PM
```

## 🧪 Testing Without Real Calls

The system works in **simulation mode** by default (no Twilio credentials needed):

### Simulation Features
✅ No actual phone calls made  
✅ All calls logged to console  
✅ Status returned as "ringing" (simulated)  
✅ Perfect for testing and development  
✅ Zero cost, no phone charges  

### How to Test
1. Create a reminder with any phone number
2. Watch server logs: `SIMULATED VOICE CALL`
3. Check reminder status in UI
4. See call history and attempts

## 📞 Real Calls (When Twilio Added Later)

Once you add Twilio credentials, real calls will work:

### Setup Twilio (Future)
```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1-555-YOUR-NUMBER
```

### Then
- Click "Save reminder" → Real call placed
- All other features remain same
- No code changes needed

## 💡 Pro Tips

### Best Message Content
- ✅ *"Remember to take your medicine"*
- ✅ *"It's time for your afternoon walk"*
- ✅ *"Don't forget your appointment at 2 PM"*
- ❌ *"!@#$%^&*()"* (special characters)
- ❌ *"This is a very long message that goes on and on..."* (keep under 100 chars)

### Phone Numbers That Work
- ✅ `+1 234-567-8900` (with formatting)
- ✅ `+12345678900` (without formatting)
- ✅ `2345678900` (assumes US +1)
- ✅ `+91-9876543210` (international)
- ❌ `234567890` (missing country code)

### Recurring Reminders
- **Daily**: Set once, auto-repeats tomorrow at same time
- **Weekly**: Repeats every 7 days
- **Monthly**: Repeats on same date next month
- System automatically calculates next call time

### Monitoring
- Check **Call Status** section on reminder card
- See **attempt count** (e.g., "1/3 attempts")
- View full **call history** with timestamps
- Click **"Call Now"** to trigger manually

## ❓ FAQ

**Q: Will this actually call the phone number?**  
A: Not yet - Twilio credentials not configured. System logs calls but doesn't make real ones. Perfect for testing!

**Q: Can I send to multiple numbers?**  
A: Currently one number per reminder. Create multiple reminders for different recipients.

**Q: What if the call fails?**  
A: System retries automatically (up to 3 attempts). You can also click "Call Now" to trigger manually.

**Q: How long is the message?**  
A: Maximum 500 characters. System estimates ~10 seconds per 150 words.

**Q: Can I upload my own voice?**  
A: Select "Pre-recorded Audio" option (feature ready, upload pending).

**Q: What if number is wrong?**  
A: System validates format. Edit the reminder and save again.

**Q: Does it work on weekends?**  
A: Yes! It follows the schedule regardless of day. You can set different reminders for different days if needed.

**Q: Can I disable a reminder?**  
A: Mark as "Complete" to pause, or "Reopen" to resume.

## 🛠️ Troubleshooting

### Call not being made
1. Check that phone number is valid
2. Verify reminder status is "pending" (not "completed")
3. Check that voice message is filled in
4. Check server logs for errors

### Can't save reminder
1. Fill all required fields (title, date, message)
2. Use valid phone format
3. Enable the voice call checkbox
4. Check for validation errors in red text

### Status not updating
1. Refresh the page
2. Check if scheduler is running (server logs)
3. Wait 60 seconds (scheduler runs every minute)

## 📊 What's Happening Behind the Scenes

1. **You create reminder** → Saved to database
2. **Scheduler checks every 60 seconds** → Finds due reminders
3. **Call initiated** → Service logs or calls real number
4. **Status updated** → Database records call attempt
5. **You notified** → Live update in your UI

## 🎯 Next Steps

- ✅ Test creating reminders
- ✅ Try different message types
- ✅ Test recurring reminders
- ✅ Monitor call status
- ⏳ Add Twilio credentials (when ready)
- ⏳ Test real calls
- ⏳ Set up production schedule

## 📞 Example Commands (For Developers)

### Check Scheduler Status
```bash
curl http://localhost:5000/api/reminders/voice/scheduler-status
```

### Trigger Manual Call
```bash
curl -X POST http://localhost:5000/api/reminders/{reminderId}/trigger-call
```

### Get Call Status
```bash
curl http://localhost:5000/api/reminders/{reminderId}/voice-call-status
```

## 🔗 Resources

- [Full Documentation](./VOICE_CALL_REMINDERS_GUIDE.md)
- [API Endpoints Documentation](./VOICE_CALL_REMINDERS_GUIDE.md#api-endpoints)
- [Troubleshooting Guide](./VOICE_CALL_REMINDERS_GUIDE.md#troubleshooting)

---

**Ready to send your first voice call reminder?**  
Go to ReminderAlert and create one now! 🚀

Need help? Check the full guide or troubleshooting section.
