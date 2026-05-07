# ✅ PHASE 1: QUICK START CHECKLIST

**Objective**: Get Phase 1 running locally in 5 minutes  
**Status**: Ready to execute  

---

## ☑️ 5-MINUTE QUICK START

### Step 1: Install Dependencies (1 min)
```bash
cd backend
npm install
# Should see: "up to date, audited 834 packages"
```

### Step 2: Start Server (1 min)
```bash
npm start
# Should see:
✓ Server running on port 5000
✓ MongoDB connected
✓ Message retry processor started
✓ Message cleanup job started
✓ WebSocket server initialized
```

### Step 3: Verify Device Routes (1 min)
```bash
# In another terminal, check if routes exist
curl -X GET http://localhost:5000/api/messaging/devices \
  -H "Authorization: Bearer test-token"

# Should respond with 401 (auth required) or device list
```

### Step 4: Check Database (1 min)
```bash
# MongoDB shell
mongo malabarbazaar

# Check collections exist
db.devices.countDocuments()        # Should be ≥0
db.device_sessions.countDocuments()  # Should be ≥0
db.message_queue.countDocuments()    # Should be ≥0
```

### Step 5: Monitor Retry Job (1 min)
```bash
# Watch logs for every 30 seconds:
tail -f logs/app.log | grep "retry"
# Should see: "Processed X messages from retry queue"
```

---

## 📋 FULL TESTING CHECKLIST

### Pre-Testing
- [ ] Read PHASE1_COMPLETION_SUMMARY.md
- [ ] Review PHASE1_INTEGRATION_COMPLETE.md
- [ ] Have terminal ready
- [ ] Have MongoDB running
- [ ] Have API client ready (Postman/curl)

### Testing Device Registration
- [ ] Test: POST /api/messaging/devices/register
- [ ] Expected: 201 response with deviceId
- [ ] Verify: Device stored in MongoDB
- [ ] Check: Device has fingerprint

### Testing Message Enqueueing
- [ ] Send message: POST /api/messaging/messages
- [ ] Expected: Message queued
- [ ] Verify: Entry in message_queue collection
- [ ] Check: Status is "pending"

### Testing Retry Processing
- [ ] Wait 30 seconds
- [ ] Check logs for retry processor
- [ ] Simulate offline user
- [ ] Message should retry automatically
- [ ] After 5 attempts, should be marked "failed"

### Testing Delivery Confirmation
- [ ] Send message to another user
- [ ] Mark as read: PUT /api/messaging/messages/read
- [ ] Verify: Queue entry marked "delivered"
- [ ] Check: No more retries

### Testing Offline Sync
- [ ] Send message to offline user
- [ ] Simulate device coming online
- [ ] Verify: Message synced automatically
- [ ] Check: No duplicates (clientMessageId)

### Testing Database Cleanup
- [ ] Check message_queue collection size
- [ ] Wait 24 hours (or simulate cron)
- [ ] Messages >30 days should be deleted
- [ ] Database size should decrease

### Testing WebSocket Tracking
- [ ] Connect via Socket.IO
- [ ] Verify: Device status becomes "online"
- [ ] Check: socketId stored
- [ ] Disconnect
- [ ] Verify: Device status becomes "offline"

### Testing Session Expiry
- [ ] Create device session
- [ ] Wait 24 hours (or edit test token)
- [ ] Verify: Access token expired
- [ ] Use refresh token to get new access token
- [ ] Verify: Works
- [ ] Wait 30 days (or simulate)
- [ ] Verify: Session auto-deleted

---

## 🚨 COMMON ISSUES & FIXES

### Issue: "node-cron not found"
**Solution**: Run `npm install`

### Issue: "Message retry processor not started"
**Solution**: Check server.js line 148 has messageRetryJob.startAll()

### Issue: "Cannot find module './services/messageRetryHandler'"
**Solution**: Check file path is correct, re-run npm install

### Issue: "MongoDB connection timeout"
**Solution**: Verify MongoDB is running, check connection string

### Issue: "Socket.IO not emitting events"
**Solution**: Check websocket.js has device connection tracking

### Issue: "Messages not enqueueing"
**Solution**: Check messaging.js has messageRetryHandler integration

---

## 📊 SUCCESS INDICATORS

### Phase 1 is Working If:
✅ Server starts without errors  
✅ Retry processor logs appear every 30s  
✅ Device registration returns 201  
✅ Messages are queued  
✅ Retry processing happens automatically  
✅ Delivery confirmation works  
✅ Offline sync works  
✅ Database cleanup scheduled  

### Phase 1 Has Issues If:
❌ Server crashes on startup  
❌ Retry processor doesn't start  
❌ Device registration fails  
❌ Messages not queuing  
❌ Retry job not running  
❌ Database errors appear  

---

## 📚 REFERENCE

### Key Files
- `backend/server.js` - Main entry point
- `backend/routes/deviceRoutes.js` - Device endpoints
- `backend/services/deviceService.js` - Device logic
- `backend/services/messageRetryHandler.js` - Retry logic
- `backend/jobs/messageRetryJob.js` - Scheduled jobs

### Key Models
- `Device` - Device registration
- `DeviceSession` - Session tokens
- `MessageQueue` - Message retry

### Key Services
- `deviceService` - Device management
- `messageRetryHandler` - Retry processing

### API Endpoints (Test These)
```
POST   /api/messaging/devices/register         - Register device
GET    /api/messaging/devices                  - List devices
GET    /api/messaging/devices/:id              - Get device
DELETE /api/messaging/devices/:id              - Delete device
POST   /api/messaging/devices/:id/session      - Create session
POST   /api/messaging/devices/:id/logout       - Logout device
GET    /api/messaging/devices/sessions/active  - List sessions
POST   /api/messaging/messages                 - Send message
PUT    /api/messaging/messages/:id             - Mark seen
```

---

## ⏱️ TIMING

### Quick Verification: 5 minutes
- Start server
- Check logs
- Test one endpoint

### Full Testing: 30 minutes
- All endpoints
- Database checks
- Retry verification
- Socket.IO tracking

### Staging Deployment: 1 hour
- Push to git
- Deploy to staging
- Run integration tests
- Monitor logs

### Production Monitoring: 48 hours
- Check metrics
- Monitor errors
- Verify delivery rate
- Ensure stability

---

## 🎯 TEST ORDER (PRIORITY)

1. **CRITICAL**: Server starts + retry processor active
2. **CRITICAL**: Device registration works
3. **CRITICAL**: Message enqueueing works
4. **CRITICAL**: Retry processing happens
5. **HIGH**: Delivery confirmation works
6. **HIGH**: Offline sync works
7. **MEDIUM**: Session expiry works
8. **MEDIUM**: Database cleanup works
9. **LOW**: WebSocket tracking works

---

## 📝 TESTING LOG TEMPLATE

```
TEST SESSION: [Date/Time]
Environment: [Local/Staging/Production]

✓ Server started successfully
  - Port: 5000
  - Database: Connected
  - Retry processor: Started

✓ Device Registration
  - Test device: iPhone
  - Response: 201
  - Device ID: [recorded]

✓ Message Enqueueing
  - Message sent
  - Response: 201
  - Queue entry created: YES

✓ Retry Processing
  - Logs checked: YES
  - Every 30s: YES
  - Status updates: YES

✓ Overall Status: PASS/FAIL

Notes:
- [Any issues found]
- [Any improvements needed]
```

---

## 🚀 READY TO TEST?

### Before You Start
- [ ] Read 10 min (PHASE1_COMPLETION_SUMMARY.md)
- [ ] Review architecture (PHASE1_IMPLEMENTATION_GUIDE.md)
- [ ] Have terminal ready

### Testing Steps
- [ ] npm install (1 min)
- [ ] npm start (1 min)
- [ ] Verify logs (1 min)
- [ ] Run tests (follow PHASE1_TESTING_GUIDE.md - 20 min)
- [ ] Check results (5 min)

### Total Time: 30 minutes

### Then
- Deploy to staging (1 hour)
- Monitor for 48 hours
- Deploy to production
- Begin Phase 2

---

## 📞 GETTING HELP

**Question**: Server won't start?  
**Answer**: Check PHASE1_TESTING_GUIDE.md → Troubleshooting

**Question**: Tests failing?  
**Answer**: Check PHASE1_IMPLEMENTATION_GUIDE.md → Architecture

**Question**: Not sure what to do next?  
**Answer**: Follow this checklist, then PHASE1_TESTING_GUIDE.md

**Question**: Ready for Phase 2?  
**Answer**: Check PHASE2_ROADMAP.md

---

## ✨ CONFIDENCE CHECK

After following this checklist, you should be confident:
✅ Phase 1 is working correctly  
✅ Multi-device support is functional  
✅ Message retry system is active  
✅ Code is production-ready  
✅ Ready to deploy  

---

## 🎊 YOU'RE READY!

**Next Action**: Start the 5-minute quick start above!

```
$ cd backend
$ npm install
$ npm start

# Watch for:
✓ Server running on port 5000
✓ MongoDB connected
✓ Message retry processor started
✓ WebSocket server initialized
```

Then follow PHASE1_TESTING_GUIDE.md for full testing.

**Good luck! Phase 1 is ready! 🚀**
