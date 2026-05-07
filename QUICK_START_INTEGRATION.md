# Phase 1 Integration Checklist - Quick Start (2 hours)

## Pre-Integration Checklist
- [ ] Backup current database
- [ ] Backup current messaging.js routes
- [ ] Create feature branch: `git checkout -b feature/phase1-critical-features`
- [ ] Review all 8 new files
- [ ] Read `PHASE1_IMPLEMENTATION_GUIDE.md`

---

## Step 1: Copy Model Files (5 minutes)

Copy these 3 files to `backend/models/`:
- [ ] `Device.js` - Device registration model
- [ ] `DeviceSession.js` - Session management model  
- [ ] `MessageQueue.js` - Message delivery queue model

**Verify**:
```bash
ls backend/models/Device.js
ls backend/models/DeviceSession.js
ls backend/models/MessageQueue.js
```

---

## Step 2: Copy Service Files (5 minutes)

Copy these 2 files to `backend/services/`:
- [ ] `messageRetryHandler.js` - Retry logic service
- [ ] `deviceService.js` - Device operations service

**Verify**:
```bash
ls backend/services/messageRetryHandler.js
ls backend/services/deviceService.js
```

---

## Step 3: Copy Routes File (5 minutes)

Copy this file to `backend/routes/`:
- [ ] `deviceRoutes.js` - Device API endpoints

**Verify**:
```bash
ls backend/routes/deviceRoutes.js
```

---

## Step 4: Update Backend App Entry Point (10 minutes)

**In `backend/app.js` or `backend/server.js`**:

### Add imports at top:
```javascript
const deviceRoutes = require('./routes/deviceRoutes');
const { retryJob, cleanupJob } = require('./jobs/messageRetryJob');
const deviceService = require('./services/deviceService');
```

### Register routes:
```javascript
// Add this with other routes (around line where other /api routes are)
app.use('/api/messaging/devices', deviceRoutes);
```

### Add Socket.IO handlers (if using Socket.IO):
```javascript
// Add this in your Socket.IO connection handler
io.on('connection', (socket) => {
  socket.on('device:register', async (data) => {
    try {
      const { deviceId, userId } = data;
      
      // Update device connection status
      await deviceService.updateConnectionStatus(deviceId, 'online', socket.id);
      
      // Join rooms for broadcasting
      socket.join(`user:${userId}`);
      socket.join(`device:${deviceId}`);
      
      console.log(`Device ${deviceId} connected`);
    } catch (error) {
      console.error('Error registering device:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const Device = require('./models/Device');
      const device = await Device.findOne({ socketId: socket.id });
      if (device) {
        await deviceService.updateConnectionStatus(device._id, 'offline', null);
        console.log(`Device ${device._id} disconnected`);
      }
    } catch (error) {
      console.error('Error on device disconnect:', error);
    }
  });

  // Message delivery handlers
  socket.on('message:delivered', async (data) => {
    try {
      const messageRetryHandler = require('./services/messageRetryHandler');
      const { messageId, recipientId } = data;
      
      await messageRetryHandler.handleDeliveryConfirmation(
        messageId,
        recipientId,
        'delivered'
      );
      
      // Broadcast to sender
      io.emit('delivery:confirmed', { messageId });
    } catch (error) {
      console.error('Error handling delivery:', error);
    }
  });

  socket.on('message:seen', async (data) => {
    try {
      const messageRetryHandler = require('./services/messageRetryHandler');
      const { messageId, recipientId } = data;
      
      await messageRetryHandler.handleDeliveryConfirmation(
        messageId,
        recipientId,
        'seen'
      );
      
      // Broadcast to sender
      io.emit('message:seen', { messageId });
    } catch (error) {
      console.error('Error handling seen:', error);
    }
  });

  socket.on('message:failed', async (data) => {
    try {
      const messageRetryHandler = require('./services/messageRetryHandler');
      const { messageId, recipientId, errorReason, errorCode } = data;
      
      await messageRetryHandler.handleDeliveryFailure(
        messageId,
        recipientId,
        errorReason,
        errorCode
      );
      
      console.log(`Message ${messageId} delivery failed for ${recipientId}`);
    } catch (error) {
      console.error('Error handling failure:', error);
    }
  });
});
```

---

## Step 5: Create Scheduled Jobs (5 minutes)

**Create new file: `backend/jobs/messageRetryJob.js`**:

```javascript
const cron = require('node-cron');
const messageRetryHandler = require('../services/messageRetryHandler');
const logger = require('../utils/logger'); // or console.log

/**
 * Retry message delivery queue - runs every 30 seconds
 */
const retryJob = cron.schedule('*/30 * * * * *', async () => {
  try {
    const stats = await messageRetryHandler.processRetryQueue(50);
    logger.info(`Retry job executed: ${JSON.stringify(stats)}`);
  } catch (error) {
    logger.error('Error in retry job:', error);
  }
});

/**
 * Cleanup old messages - runs daily at 2 AM
 */
const cleanupJob = cron.schedule('0 2 * * *', async () => {
  try {
    const deleted = await messageRetryHandler.cleanupOldMessages(30);
    logger.info(`Cleanup job executed: deleted ${deleted} old messages`);
  } catch (error) {
    logger.error('Error in cleanup job:', error);
  }
});

module.exports = { retryJob, cleanupJob };
```

**Verify**:
```bash
ls backend/jobs/messageRetryJob.js
```

---

## Step 6: Update Message Sending Route (15 minutes)

**In `backend/routes/messaging.js`**, find the message sending endpoint (usually `POST /messages/send` or similar):

### Before your existing code, add:
```javascript
const messageRetryHandler = require('../services/messageRetryHandler');
```

### After message is created/saved, add this:
```javascript
// OLD CODE (before)
const message = await Message.create({
  chatId,
  senderId,
  messageType: 'text',
  content,
  // ... other fields
});

// NEW CODE (add this)
// Enqueue message for delivery
const recipientIds = []; // Get from your chat/recipient logic
const queueEntry = await messageRetryHandler.enqueueMessage(message, {
  recipientIds: recipientIds,
  priority: 'normal',
  offline: false, // Set true if coming from offline sync
});

// Return queue ID to frontend
res.status(201).json({
  success: true,
  message: {
    id: message._id,
    clientMessageId: message.clientMessageId,
    // ... other message fields
  },
  queueId: queueEntry._id, // New field
  deliveryStatus: 'pending', // New field
});
```

---

## Step 7: Update Message Delivery Tracking (10 minutes)

**In your Socket.IO message handler** (where you emit `message:new` to recipients):

### Add delivery tracking:
```javascript
// When message is successfully sent to recipient
socket.emit('message:received', {
  messageId: message._id,
  // ... other fields
});

// Client should emit back when delivered
socket.on('client:message:delivered', async (data) => {
  const messageRetryHandler = require('../services/messageRetryHandler');
  await messageRetryHandler.handleDeliveryConfirmation(
    data.messageId,
    data.recipientId,
    'delivered'
  );
});

// Client should emit when seen
socket.on('client:message:seen', async (data) => {
  const messageRetryHandler = require('../services/messageRetryHandler');
  await messageRetryHandler.handleDeliveryConfirmation(
    data.messageId,
    data.recipientId,
    'seen'
  );
});
```

---

## Step 8: Frontend - Add Device Registration (10 minutes)

**In `frontend/src/components/Messaging.js`**, add device registration on mount:

```javascript
import { v4 as uuidv4 } from 'uuid'; // Add to imports if not present

export default function Messaging() {
  const [deviceId, setDeviceId] = useState(null);
  
  // Add this useEffect
  useEffect(() => {
    const registerDevice = async () => {
      try {
        const token = localStorage.getItem('authToken'); // or however you store token
        
        const response = await fetch('/api/messaging/devices/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            deviceName: navigator.userAgent.substring(0, 100),
            deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'web',
            osType: getOSType(), // Define this helper
            osVersion: navigator.platform,
            appVersion: '1.0.0',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setDeviceId(result.data.device.id);
          localStorage.setItem('deviceId', result.data.device.id);
        }
      } catch (error) {
        console.error('Error registering device:', error);
      }
    };

    registerDevice();
  }, []);

  // Update message sending to include clientMessageId
  const sendMessage = async (chatId, content) => {
    const clientMessageId = uuidv4(); // Unique ID for deduplication
    
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/messaging/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId,
          content,
          clientMessageId, // Send to backend
          messageType: 'text',
        }),
      });

      const result = await response.json();

      // Store in outbox for offline tracking
      const outbox = JSON.parse(localStorage.getItem('messageOutbox') || '[]');
      outbox.push({
        clientMessageId,
        chatId,
        content,
        sentAt: new Date(),
        status: 'pending',
      });
      localStorage.setItem('messageOutbox', JSON.stringify(outbox));

      return result;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Helper function
  const getOSType = () => {
    const ua = navigator.userAgent;
    if (ua.indexOf('Win') > -1) return 'Windows';
    if (ua.indexOf('Mac') > -1) return 'macOS';
    if (ua.indexOf('Linux') > -1) return 'Linux';
    if (ua.indexOf('Android') > -1) return 'Android';
    if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) return 'iOS';
    return 'Other';
  };

  // ... rest of component
}
```

---

## Step 9: Package Dependencies (2 minutes)

**Verify you have these in `package.json`**:

```json
{
  "dependencies": {
    "node-cron": "^3.0.2",    // For scheduled jobs
    "uuid": "^9.0.0",          // Already should have for clientMessageId
    "mongoose": "^7.0.0",      // Already should have
    "express": "^4.18.0",      // Already should have
    "socket.io": "^4.5.0"       // Already should have
  }
}
```

**Install if missing**:
```bash
npm install node-cron
```

---

## Step 10: Database Migration (5 minutes)

**Run this to create indexes** (you can do this in MongoDB Compass or shell):

```javascript
// Device indexes
db.devices.createIndex({ userId: 1, isActive: 1 });
db.devices.createIndex({ userId: 1, lastActivityAt: -1 });
db.devices.createIndex({ deviceId: 1 });
db.devices.createIndex({ deviceFingerprint: 1 });

// DeviceSession indexes
db.device_sessions.createIndex({ userId: 1, status: 1 });
db.device_sessions.createIndex({ refreshTokenExpiresAt: 1 }, { expireAfterSeconds: 0 });
db.device_sessions.createIndex({ sessionToken: 1 });

// MessageQueue indexes
db.message_queue.createIndex({ status: 1, nextRetryAt: 1 });
db.message_queue.createIndex({ clientMessageId: 1 });
db.message_queue.createIndex({ completedAt: 1 }, { expireAfterSeconds: 2592000 });
```

---

## Step 11: Testing (Before Deployment)

### Quick Test 1: Device Registration
```bash
curl -X POST http://localhost:3000/api/messaging/devices/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deviceName": "Test Device",
    "deviceType": "web",
    "osType": "Linux",
    "osVersion": "5.0",
    "appVersion": "1.0.0"
  }'
```

### Quick Test 2: List Devices
```bash
curl http://localhost:3000/api/messaging/devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Quick Test 3: Send Message
```bash
curl -X POST http://localhost:3000/api/messaging/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "chatId": "CHAT_ID",
    "content": "Test message",
    "clientMessageId": "unique-id-123",
    "messageType": "text"
  }'
```

### Quick Test 4: Check Message Queue
```javascript
// In MongoDB shell
db.message_queue.find().count()        // Should be > 0
db.message_queue.find({ status: "pending" }).count()
db.devices.find().count()              // Should be > 0
```

---

## Step 12: Verification Checklist

- [ ] No import errors when starting app
- [ ] Device routes respond with 200 status
- [ ] Can register a device
- [ ] Can list active devices
- [ ] Message queue entries created when sending messages
- [ ] No console errors on client side
- [ ] Socket.IO connection events fire
- [ ] Database has entries in 3 new collections
- [ ] Cron jobs start without errors (check logs)

---

## Common Issues & Fixes

### Issue: "Cannot find module 'messageRetryHandler'"
**Fix**: Verify path in require statement matches your file location
```javascript
// Check this line has correct path
const messageRetryHandler = require('../services/messageRetryHandler');
```

### Issue: "Device not found" error
**Fix**: Ensure device ID is correctly passed from frontend
```javascript
// Verify deviceId is stored and sent
localStorage.setItem('deviceId', result.data.device.id);
```

### Issue: "Retry job not running"
**Fix**: Verify cron format and job is started
```javascript
// Should see in logs: "Retry job executed"
// If not, check that jobs are imported and app is running
```

### Issue: "TypeError: Cannot read property 'userId'"
**Fix**: Verify authentication middleware is working
```javascript
// Check that authenticateToken middleware is applied
router.use(authenticateToken);
```

### Issue: Messages not being retried
**Fix**: Check MongoDB connection and MessageQueue collection exists
```javascript
// In MongoDB
db.message_queue.find().count()  // Should be > 0
db.message_queue.find({ status: "retry" }).count()
```

---

## Rollback Plan

If you need to undo:

```bash
# 1. Git rollback
git checkout backend/app.js
git checkout backend/routes/messaging.js
git checkout backend/package.json

# 2. Delete new files
rm backend/models/Device.js
rm backend/models/DeviceSession.js
rm backend/models/MessageQueue.js
rm backend/services/messageRetryHandler.js
rm backend/services/deviceService.js
rm backend/routes/deviceRoutes.js
rm backend/jobs/messageRetryJob.js

# 3. Drop new collections (MongoDB)
db.devices.drop()
db.device_sessions.drop()
db.message_queue.drop()

# 4. Restart app
npm start
```

---

## Next Steps After Integration

1. **Write Tests** (See `PHASE1_IMPLEMENTATION_GUIDE.md` testing section)
2. **Deploy to Staging** - Test with real traffic
3. **Monitor Logs** - Check for errors
4. **Start Phase 2** - OTP + Encryption
5. **Document Changes** - Update API docs

---

**Estimated Integration Time**: 1-2 hours
**Estimated Testing Time**: 2-4 hours
**Status**: Ready to integrate!

