# Voice Call Troubleshooting: No Call Received at 2:37 AM

## Issue Summary
Automated voice call was not triggered at the scheduled time (2:37 AM).

---

## Root Cause Analysis

### 1. **Scheduler Check Interval Gap** ⚠️ CRITICAL
**Problem**: The scheduler only checks for due reminders every **60 seconds**.

**Impact**:
- If reminder is due at exactly 2:37:00, but scheduler checks at:
  - 2:36:00 → Not yet due
  - 2:38:00 → Might have passed the time window
- There's NO grace period/margin for exact time matching

**Location**: `backend/services/voiceCallScheduler.js:24`
```javascript
this.checkIntervalMs = 60 * 1000; // Check every 60 seconds
```

**Solution**: 
- Reduce check interval to 30 seconds (or less)
- Add a 2-minute grace window to catch reminders that were due

---

### 2. **Call Status Transition Issue** ⚠️ MEDIUM
**Problem**: Once a call returns 'ringing' status, it's never retried.

**Current behavior**:
1. Reminder created with `callStatus: 'pending'`
2. Scheduler initiates call → returns `status: 'ringing'`
3. `recordCallAttempt('ringing', ...)` sets `callStatus = 'ringing'`
4. Next scheduler run looks for `callStatus: { $in: ['pending', 'no-answer', 'failed'] }`
5. Reminder with status 'ringing' is **skipped** ❌

**Location**: `backend/services/voiceCallScheduler.js:106`
```javascript
callStatus: { $in: ['pending', 'no-answer', 'failed'] },
```

**Location**: `backend/models/Reminder.js:281-283`
```javascript
} else if (status === 'completed' || this.callAttempts >= this.maxCallAttempts) {
  this.callStatus = 'completed';
}
```

**Solution**: Add 'ringing' to allowed statuses for retry, or add a timeout to transition from 'ringing' to 'no-answer'

---

### 3. **nextCallTime Not Being Used** ⚠️ MEDIUM
**Problem**: If `nextCallTime` is not set, scheduler falls back to `dueDate` (which is just the date, not time).

**Current behavior**:
```javascript
$lte: [{ $ifNull: ['$nextCallTime', '$dueDate'] }, new Date()]
```

- If `nextCallTime` is missing → uses `dueDate` (e.g., "April 25 at 00:00")
- Reminder would trigger at **midnight** instead of 2:37 AM

**Location**: `backend/services/voiceCallScheduler.js:94`

**Verification needed**:
- Check if `nextCallTime` is actually being saved
- MongoDB shell: `db.reminders.findOne({_id: "<reminder_id>"})` and check `nextCallTime` field

---

### 4. **Timezone Mismatch** ⚠️ POSSIBLE
**Problem**: dueTime string "02:37" might be interpreted in different timezones.

**Current behavior**:
```javascript
// Backend creates Date in LOCAL timezone
const scheduleTime = new Date(year, month - 1, day, 2, 37, 0, 0);

// Scheduler compares with current time (also in LOCAL timezone)
$lte: [..., new Date()]
```

**Check**: Verify server timezone matches user timezone
```bash
# On server
date  # Check current time and timezone
echo $TZ  # Check timezone env var
```

---

## Diagnostic Checklist

### Step 1: Check Scheduler Status
```bash
# Look for scheduler initialization messages in server logs
# Should see: "Starting voice call scheduler..."
grep -i "voice call scheduler" /path/to/logs
```

### Step 2: Verify Reminder Data
```javascript
// In MongoDB or via API
db.reminders.findOne({ title: "Your Reminder Title" })
```

**Check these fields**:
- `dueDate`: Should be April 25, 2026
- `dueTime`: Should be "02:37"
- `nextCallTime`: Should be `2026-04-25T02:37:00Z` or similar combined datetime
- `callStatus`: Should be 'pending' (before call attempt)
- `recipientPhoneNumber`: Should exist and be non-empty
- `voiceMessage`: Should exist and be non-empty

### Step 3: Check Scheduler Logs
Look for scheduler execution at or near 2:37 AM:
```
INFO: Found X reminders due for voice calls
INFO: Processing voice call reminder:...
```

### Step 4: Check for Network/Service Issues
- Was the backend service running at 2:37 AM?
- Was there a deployment or restart between 2:30-2:40 AM?
- Check server resource usage (CPU, memory, disk) around that time

---

## Immediate Fixes

### Fix 1: Reduce Scheduler Check Interval
**File**: `backend/services/voiceCallScheduler.js`

```javascript
// Current
this.checkIntervalMs = 60 * 1000; // Check every 60 seconds

// Change to
this.checkIntervalMs = 30 * 1000; // Check every 30 seconds
```

### Fix 2: Add Grace Period for Time Matching
**File**: `backend/services/voiceCallScheduler.js`

```javascript
// Current query
$expr: {
  $lte: [{ $ifNull: ['$nextCallTime', '$dueDate'] }, new Date()]
}

// Add grace period (allow up to 5 minutes after due time)
$expr: {
  $lte: [
    { $ifNull: ['$nextCallTime', '$dueDate'] },
    new Date(Date.now() + 5 * 60 * 1000) // Add 5 minute grace period
  ]
}
```

### Fix 3: Verify nextCallTime is Being Set
**File**: `backend/routes/reminders.js` (line 630)

```javascript
// Add logging before save
logger.info(`Voice call reminder nextCallTime: ${reminder.nextCallTime}`);
await reminder.save();
```

### Fix 4: Add 'ringing' to Retryable Statuses
**File**: `backend/services/voiceCallScheduler.js` (line 106)

```javascript
// Current
callStatus: { $in: ['pending', 'no-answer', 'failed'] },

// Change to (for testing - may need timeout logic)
callStatus: { $in: ['pending', 'no-answer', 'failed', 'ringing'] },
```

---

## Testing the Fix

1. **Create a test reminder** due 2 minutes from now with voice call enabled
2. **Monitor server logs** for scheduler execution
3. **Watch for**:
   - "SIMULATED VOICE CALL" message (if in simulation mode)
   - Status update to "ringing" or "answered"
   - WebSocket notification to client

4. **Verify in MongoDB**:
   ```javascript
   db.reminders.findOne({ title: "Test" })
   ```
   Check `callHistory` array contains the test call

---

## Prevention

1. **Enable verbose logging** around scheduler execution
2. **Set up monitoring** to alert if scheduler stops running
3. **Add health check endpoint** to verify scheduler is running
4. **Implement call delivery confirmation** instead of just "ringing" status
5. **Add timezone-aware scheduling** if users are in different timezones

---

## Files to Review
- `backend/services/voiceCallScheduler.js` - Scheduler logic
- `backend/services/voiceCallService.js` - Call initiation
- `backend/models/Reminder.js` - Data model and methods
- `backend/routes/reminders.js` - API endpoints
- Server logs from 2:30-2:45 AM on the incident date
