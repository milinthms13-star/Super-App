# 🧪 PHASE 1 VERIFICATION & TESTING GUIDE

## Quick Local Testing (5-10 minutes)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Start Server
```bash
npm start
```

**Expected Output**:
```
Server started on port 5000
Message retry processor started (every 30 seconds)
Message cleanup job started (daily at 2 AM UTC)
WebSocket server initialized
```

### Step 3: Test Device Registration

**Request**:
```bash
curl -X POST http://localhost:5000/api/messaging/devices/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "deviceName": "iPhone 14",
    "deviceType": "mobile",
    "osType": "iOS",
    "osVersion": "17.0",
    "appVersion": "1.0.0"
  }'
```

**Expected Response** (201):
```json
{
  "success": true,
  "message": "Device registered successfully",
  "device": {
    "_id": "...",
    "deviceId": "uuid-...",
    "deviceName": "iPhone 14",
    "deviceType": "mobile",
    "isActive": true,
    "isVerified": false,
    "lastActivityAt": "2026-05-07T10:30:00Z"
  },
  "isNew": true,
  "verificationRequired": true
}
```

### Step 4: Test Message Sending

**Request**:
```bash
curl -X POST http://localhost:5000/api/messaging/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "chatId": "CHAT_ID",
    "content": "Hello World",
    "messageType": "text",
    "clientMessageId": "msg-' $(date +%s) '"
  }'
```

**Expected Response** (201):
```json
{
  "message": {
    "_id": "...",
    "chatId": "...",
    "content": "Hello World",
    "messageType": "text",
    "deliveryStatus": [...]
  }
}
```

**Server Logs Should Show**:
```
Message enqueued for delivery: ...
Message sent in chat ... by ...
```

### Step 5: Verify Queue Processing

**Check in Logs** (every 30 seconds):
```
Processed X messages from retry queue
```

**OR directly from database**:
```javascript
db.message_queues.find({ status: "pending" })
db.message_queues.find({ status: "delivered" })
```

---

## Comprehensive Testing (30-45 minutes)

### Test 1: Multi-Device Registration
```bash
# Register 3 devices for same user
for i in {1..3}; do
  curl -X POST http://localhost:5000/api/messaging/devices/register \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -d '{
      "deviceName": "Device-'"$i"'",
      "deviceType": "mobile",
      "osType": "Android",
      "osVersion": "13",
      "appVersion": "1.0.0"
    }'
done
```

**Verify**:
- [ ] 3 devices created with different device IDs
- [ ] All marked as isActive: true
- [ ] Device fingerprints are unique

### Test 2: Get Active Devices
```bash
curl -X GET http://localhost:5000/api/messaging/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Verify**:
- [ ] Returns array of 3+ devices
- [ ] Each has unique deviceId
- [ ] Last activity timestamps are recent

### Test 3: Message Retry Processing
```bash
# In MongoDB shell:
use malabarbazaar

# Check queue status
db.message_queues.find({ status: "pending" }).count()
db.message_queues.find({ status: "delivered" }).count()

# Watch for changes
setInterval(() => {
  print("Pending:", db.message_queues.find({ status: "pending" }).count())
}, 1000)
```

**Verify**:
- [ ] Pending count decreases over time
- [ ] Delivered count increases
- [ ] Completed messages auto-cleanup after 30 days

### Test 4: Delivery Confirmation

**Send message**:
```bash
curl -X POST http://localhost:5000/api/messaging/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "chatId": "CHAT_ID",
    "content": "Test message",
    "messageType": "text"
  }'
```

**Mark as read**:
```bash
curl -X PUT http://localhost:5000/api/messaging/messages/MESSAGE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{ "status": "seen" }'
```

**Verify in logs**:
```
Delivery confirmation tracked: ... seen by ...
```

### Test 5: Socket.IO Connection
```javascript
// From frontend, connect Socket.IO with device fingerprint
const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_TOKEN',
    deviceFingerprint: 'device-fingerprint-123'
  }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('message:received', (msg) => {
  console.log('Message received:', msg);
});
```

**Verify in logs**:
```
User ... connected: socket-...
Message enqueued for delivery...
```

**Verify in database**:
```javascript
db.devices.findOne({ deviceFingerprint: "..." })
// Should have: connectionStatus: "online", socketId: "socket-..."
```

### Test 6: Offline Message Sync

1. Connect device A (mark online)
2. Send message from device B while A is "online"
3. Simulate disconnection of A
4. Message should be queued for retry
5. Reconnect A
6. Message should be delivered

---

## Database Verification

### Check Device Collection
```javascript
db.devices.find().pretty()
```

**Should have**:
- [ ] deviceId (UUID)
- [ ] userId
- [ ] deviceFingerprint
- [ ] connectionStatus (online/offline/idle)
- [ ] lastActivityAt (recent timestamp)
- [ ] isActive: true/false

### Check Device Sessions Collection
```javascript
db.device_sessions.find().pretty()
```

**Should have**:
- [ ] userId
- [ ] deviceId
- [ ] sessionToken (unique)
- [ ] refreshToken (unique)
- [ ] status (active/suspended/revoked)
- [ ] accessTokenExpiresAt (24h from creation)
- [ ] refreshTokenExpiresAt (30d from creation)

### Check Message Queue Collection
```javascript
db.message_queues.find().pretty()
```

**Should have**:
- [ ] messageId
- [ ] chatId
- [ ] senderId
- [ ] status (pending/sent/delivered/failed)
- [ ] deliveryStatus array with per-recipient tracking
- [ ] nextRetryAt (for pending messages)
- [ ] retryAttempts count

---

## Log Analysis

### Expected Log Patterns

#### On Server Start
```
Server started on port 5000
Message retry processor started (every 30 seconds)
Message cleanup job started (daily at 2 AM UTC)
WebSocket server initialized
```

#### On Device Registration
```
User ... connected: socket-...
Device registered: ...
Device fingerprint generated: ...
```

#### On Message Send
```
Message enqueued for delivery: ...
Message sent in chat ... by ...
Socket emit failed: ... (expected if offline)
```

#### Every 30 Seconds (Retry Processor)
```
Processed X messages from retry queue
(or "0 messages" if queue is empty)
```

#### On Message Read
```
Delivery confirmation tracked: ... seen by ...
```

---

## Common Issues & Solutions

### Issue: "node-cron not found"
```bash
npm install node-cron
```

### Issue: "Device routes return 404"
**Check**: Is deviceRoutes imported in server.js?
```bash
grep -n "deviceRoutes" backend/server.js
```

### Issue: "Retry processor not running"
**Check**: Is messageRetryJob initialized?
```bash
grep -n "messageRetryJob" backend/server.js
```

### Issue: "Messages not enqueueing"
**Check**: Check server logs for errors
```bash
npm start 2>&1 | grep -i "enqueue\|error"
```

### Issue: "Socket.IO device tracking not working"
**Check**: Is deviceFingerprint passed in auth?
```javascript
const socket = io(url, {
  auth: {
    token: jwt,
    deviceFingerprint: 'your-device-fingerprint' // REQUIRED
  }
});
```

---

## Performance Testing

### Load Test Setup
```bash
# Install load testing tool
npm install -g autocannon

# Run load test
autocannon -c 100 -d 30 http://localhost:5000/api/messaging/devices
```

### Expected Results
- **Concurrent Users**: 100
- **Duration**: 30 seconds
- **Expected RPS**: 500-1000 req/sec
- **Error Rate**: <1%
- **P95 Latency**: <100ms
- **Memory**: Stable, <500MB

---

## Database Indexes Verification

```javascript
// Check Device indexes
db.devices.getIndexes()

// Expected:
// - userId_1_isActive_1
// - userId_1_lastActivityAt_1
// - deviceFingerprint_1
// - connectionStatus_1
// - ipAddress_1

// Check DeviceSession indexes
db.device_sessions.getIndexes()

// Expected:
// - userId_1_status_1
// - userId_1_lastActivityAt_1
// - deviceId_1_status_1
// - sessionToken_1 (unique)
// - refreshToken_1 (unique)
// - refreshTokenExpiresAt_1 (TTL index)

// Check MessageQueue indexes
db.message_queues.getIndexes()

// Expected:
// - messageId_1
// - chatId_1_createdAt_-1
// - senderId_1_status_1
// - status_1_nextRetryAt_1
// - priority_1_createdAt_-1
// - clientMessageId_1
// - completedAt_1 (TTL index)
```

---

## Verification Checklist

### Before Testing
- [ ] All Phase 1 files exist
- [ ] npm install completed successfully
- [ ] No TypeScript errors
- [ ] No linting errors

### After Server Start
- [ ] Server logs show "started on port 5000"
- [ ] "Message retry processor started" in logs
- [ ] "Message cleanup job started" in logs
- [ ] No error stack traces
- [ ] WebSocket connected successfully

### API Endpoints
- [ ] POST /api/messaging/devices/register returns 201
- [ ] GET /api/messaging/devices returns 200 with array
- [ ] POST /api/messaging/messages returns 201 with queued message
- [ ] PUT /messages/:id returns 200 with updated status

### Database
- [ ] Device collection has entries
- [ ] DeviceSession collection has entries
- [ ] MessageQueue collection has entries
- [ ] Indexes are created
- [ ] TTL fields are set

### Socket.IO
- [ ] Connection successful with auth
- [ ] Device status updates to "online"
- [ ] Message events received
- [ ] Disconnection updates device status to "offline"

### Queue Processing
- [ ] Every 30 seconds: processor runs
- [ ] Pending messages decrease
- [ ] Delivered messages increase
- [ ] Failed messages are logged
- [ ] No memory leaks

---

## Success Criteria ✅

All tests pass if:
1. ✅ No error messages in logs (warnings OK)
2. ✅ Device registration returns 201 with device ID
3. ✅ Messages enqueue successfully
4. ✅ Retry processor runs every 30 seconds
5. ✅ Delivery status updates tracked
6. ✅ Socket.IO device tracking works
7. ✅ Database entries created and updated
8. ✅ TTL cleanup fields present
9. ✅ No memory growth over 5 minutes
10. ✅ Load test completes without crashing

---

## When Phase 1 Is Ready For Production

- ✅ All verification tests pass
- ✅ Load testing successful (100+ concurrent users)
- ✅ No errors in 24-hour monitoring
- ✅ Database cleanup working (TTL fields active)
- ✅ Device tracking accurate (online/offline status)
- ✅ Message retry working (0% message loss)
- ✅ Delivery confirmation accurate
- ✅ Socket.IO stable with multi-device support

---

**Next**: Deploy to staging for 48-hour monitoring, then to production

**Questions?** Check `PHASE1_INTEGRATION_COMPLETE.md` for detailed explanations
