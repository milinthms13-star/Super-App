# Automated Voice Call Reminders - Feature Guide

## Overview

The ReminderAlert module now supports **automated voice call reminders** - allowing users to send scheduled reminder calls to specific phone numbers. The system will automatically place calls at scheduled times or recurring intervals, delivering the reminder message via text-to-speech or pre-recorded audio.

## Use Cases

- **Medicine Reminders**: Send reminder calls to patients to take their medication
- **Food Reminders**: Remind kids or family members about meals
- **Appointment Reminders**: Call clients before appointments
- **Task Reminders**: Recurring reminders for important tasks
- **Scheduled Alerts**: Time-based automated notifications

## Features

### 1. **Specific Date Scheduling**
- Set reminders for a specific date and time
- Call will be placed at the scheduled time (or when due)
- One-time reminders

### 2. **Recurring Intervals**
- **Daily**: Call placed every day at the same time
- **Weekly**: Call placed every 7 days at the same time
- **Monthly**: Call placed on the same date each month
- **No Recurrence**: Single call only

### 3. **Multiple Retry Attempts**
- Configurable maximum call attempts (default: 3)
- System will retry if call fails
- Track all call attempts and results

### 4. **Message Delivery Options**
- **Text-to-Speech**: System reads your message aloud
- **Pre-recorded Audio**: Upload your own voice recording
- Message length limited to 500 characters for clarity

### 5. **Real-time Tracking**
- View call status (pending, ringing, answered, failed, completed)
- See call history with timestamps
- Track attempt count
- Manual trigger option for immediate calls

## Backend Architecture

### Database Model - Reminder.js

New voice call fields added:
```javascript
{
  recipientId: String,              // User ID of recipient
  recipientPhoneNumber: String,     // Phone number to call
  voiceMessage: String,              // Message content (max 500 chars)
  messageType: 'text' | 'audio',    // TTS or pre-recorded
  voiceNoteUrl: String,              // S3 URL for audio files
  callStatus: String,                // pending, ringing, answered, failed, completed
  lastCallTime: Date,                // When last call was placed
  nextCallTime: Date,                // Next scheduled call
  callHistory: [{
    callTime: Date,
    status: String,
    duration: Number,
    callId: String,
    error: String
  }],
  callAttempts: Number,              // Number of attempts made
  maxCallAttempts: Number            // Max retries (default: 3)
}
```

### Services

#### `voiceCallService.js`
Handles voice call execution:
- `initiateVoiceCall(reminderData)` - Start a voice call
- `generateTTSMessage(text)` - Create text-to-speech
- `handleCallStatusCallback(data)` - Process Twilio webhooks
- Simulates calls when Twilio not configured
- Works with or without Twilio credentials

#### `voiceCallScheduler.js`
Automated background scheduler:
- Runs every 60 seconds to check for due reminders
- Finds reminders with voice calls that need execution
- Initiates calls for reminders that are due
- Handles recurring reminders by calculating next call time
- Notifies users via WebSocket on call status
- Manages concurrent calls (max 5 at a time)

### API Endpoints

#### `POST /api/reminders/voice-call`
Create a voice call reminder
```json
{
  "title": "Take Medicine",
  "description": "Don't forget your afternoon medicine",
  "category": "Personal",
  "priority": "High",
  "dueDate": "2026-04-24",
  "dueTime": "14:30",
  "reminders": ["Call"],
  "recurring": "daily",
  "recipientPhoneNumber": "+1234567890",
  "voiceMessage": "Please remember to take your medicine at 2 PM",
  "messageType": "text",
  "maxCallAttempts": 3
}
```

#### `GET /api/reminders/:id/voice-call-status`
Get voice call status and history
```json
Response: {
  "reminderId": "...",
  "title": "...",
  "callStatus": "pending|ringing|answered|completed|failed|no-answer",
  "recipientPhoneNumber": "...",
  "lastCallTime": "2026-04-24T14:35:00Z",
  "nextCallTime": "2026-04-25T14:30:00Z",
  "callAttempts": 1,
  "maxCallAttempts": 3,
  "callHistory": [
    {
      "callTime": "2026-04-24T14:35:00Z",
      "status": "no-answer",
      "duration": 0,
      "callId": "SIM-123456-abc789",
      "error": null
    }
  ],
  "recurring": "daily"
}
```

#### `POST /api/reminders/:id/trigger-call`
Manually trigger a voice call immediately
```json
Request: {}
Response: {
  "success": true,
  "message": "Voice call triggered successfully",
  "reminderId": "..."
}
```

#### `POST /api/reminders/voice/callback`
Webhook for Twilio status callbacks (when configured)
- Called by Twilio after call completion
- Updates reminder with call status
- No authentication required (Twilio callback)

#### `GET /api/voice/scheduler-status`
Get scheduler service status
```json
Response: {
  "isRunning": true,
  "currentCalls": 2,
  "maxConcurrentCalls": 5,
  "checkIntervalMs": 60000
}
```

## Frontend Implementation

### ReminderAlert Component Updates

#### New State
- `voiceCallData` - Voice call form fields
- `voiceCallStatus` - Track call status by reminder ID

#### New Handlers
- `handleVoiceCallChange()` - Update voice call form fields
- `handleTriggerVoiceCall()` - Manually trigger voice call

#### UI Enhancements

1. **Voice Call Form Section**
   - Appears when "Call" is selected in reminder types
   - Phone number input with validation
   - Message type selector (TTS vs. audio)
   - Message text area (max 500 chars)
   - Enable/disable toggle for voice call

2. **Task Card Display**
   - Shows recipient phone number if voice call configured
   - Displays call status with attempt count
   - Color-coded status (green for completed, orange for pending)
   - "Call Now" button to trigger immediate call

3. **Form Validation**
   - Phone number format validation
   - Required message validation
   - Character limit checking

### Service Updates - `remindersService.js`

New functions:
- `createVoiceCallReminder(reminderData)` - Create voice call reminder
- `getVoiceCallStatus(reminderId)` - Fetch call status
- `triggerVoiceCall(reminderId)` - Manually trigger call

## Development Mode (Without Twilio)

When Twilio credentials are not configured:

1. **Simulation Mode Active**
   - All calls are simulated
   - Calls are logged to console
   - Call status returned as "ringing" (simulated)
   - No actual phone calls made
   - Perfect for testing and development

2. **Log Output Example**
   ```
   SIMULATED VOICE CALL (Twilio not configured)
     Recipient: +1234567890
     From: John Smith
     Message Type: text
     Message: "Please remember to take your medicine..."
   ```

3. **When to Add Twilio**
   - Set environment variables:
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_PHONE_NUMBER`
   - System automatically detects and switches to real calls

## Phone Number Format

Accepts multiple formats:
- `+1 234-567-8900` (with formatting)
- `+12345678900` (E.164)
- `2345678900` (10 digits, assumes US +1)
- `+91-9876543210` (International)

Normalized to E.164 format internally.

## Message Duration Estimation

Text-to-speech message duration calculated as:
- Average speech rate: ~150 words/minute
- Average 5 characters per word
- ~750 characters per minute
- Calculation: (length / 750) * 60 seconds

## Call Status Lifecycle

```
pending → ringing → answered → completed
              ↓
           no-answer → retry (if attempts < max)
              ↓
            failed (after max attempts)
```

## Scheduler Behavior

- **Check Interval**: 60 seconds
- **Max Concurrent Calls**: 5
- **Retry Strategy**: Automatic retry up to maxCallAttempts
- **Recurring Calculation**: Automatic nextCallTime calculation
- **WebSocket Notifications**: Real-time updates to connected users

## Error Handling

Graceful error handling with:
- User-friendly error messages
- Fallback to simulation if Twilio unavailable
- Comprehensive logging for debugging
- Rate limiting to prevent abuse

## Webhook Integration (Future)

When Twilio configured:
- Receives call status updates
- Processes recordings
- Updates reminder status
- Tracks call duration
- Handles call failures

## Best Practices

1. **Message Content**
   - Keep messages clear and concise
   - Speak naturally (for TTS)
   - Test with text-to-speech first
   - Use plain English without special characters

2. **Scheduling**
   - Set times when recipient is available
   - Allow time for message to be delivered
   - Consider time zones for recurring reminders
   - Use reasonable retry attempts (3-5)

3. **Phone Numbers**
   - Use correct format with country code
   - Verify number before scheduling
   - Ensure recipient is willing to receive calls
   - Update if number changes

4. **Monitoring**
   - Check call history regularly
   - Monitor failed attempts
   - Adjust message if not effective
   - Track completion rates

## Future Enhancements

- [ ] Voice message recording UI
- [ ] Audio upload and preview
- [ ] Twilio TwiML builder
- [ ] Call transcription
- [ ] Analytics dashboard
- [ ] Delivery reports
- [ ] Failed call notifications
- [ ] Batch reminder scheduling
- [ ] Group calling
- [ ] Interactive voice response (IVR)

## Testing

1. **Simulation Testing** (without Twilio)
   - Create voice call reminder
   - Check scheduler logs
   - View call status
   - Trigger manual call

2. **Real Call Testing** (with Twilio)
   - Configure Twilio credentials
   - Create test reminder
   - Receive call on test phone
   - Verify message delivery

3. **Recurring Testing**
   - Test daily reminders
   - Verify nextCallTime calculation
   - Check call history growth

## Troubleshooting

### Calls not being made
- Check if scheduler is running
- Verify phone number format
- Check browser console for errors
- Verify reminder status is 'pending'

### Message not clear
- Use simple, clear language
- Test TTS with short messages
- Avoid special characters
- Consider pre-recorded audio

### Phone validation errors
- Ensure country code is included
- Remove special formatting
- Verify number is reachable

### Recurring reminders not working
- Check recurring setting is not 'none'
- Verify dueTime is set
- Check nextCallTime in database

## Credits

Built with:
- Express.js backend
- MongoDB for storage
- Twilio API for voice calls (optional)
- React frontend
- WebSocket for real-time updates
- Node.js scheduler

---

**Version**: 1.0  
**Last Updated**: April 23, 2026  
**Status**: Production Ready (Simulation Mode) / Ready for Twilio Integration
