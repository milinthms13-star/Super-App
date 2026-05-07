# Messaging Phase 2 Feature 4 Quick Start Guide

## What's New?

Feature 4 adds **real-time WebSocket communication** to the moderation panel, enabling:
- 🟢 Live connection status indicator
- 👥 See active moderators online
- 📊 Queue statistics update every 10 seconds
- 🚨 Real-time notifications for new reports, user actions
- 🔄 Auto-reconnect with exponential backoff
- 🛡️ Prevent duplicate task claims

---

## Files to Review

### Backend WebSocket
```
backend/websocket/moderationWebsocket.js    (450 LOC) - WebSocket server
backend/services/realtimeService.js          (480 LOC) - Event integration
backend/server.js                            (modified) - Initialize WS + shutdown
```

### Frontend Client
```
src/websocket/moderationWebSocketClient.js   (420 LOC) - Client library
src/modules/admin/AdminPanel.jsx             (updated) - Real-time integration
src/modules/admin/AdminPanel.css             (updated) - Styling
```

---

## How It Works

### 1. Connection Established
```javascript
// AdminPanel automatically initializes on mount
const wsClient = new ModerationWebSocketClient();
await wsClient.connect(token, userId, role);
// Status indicator turns green ✅
```

### 2. Real-Time Events
```javascript
// All moderators notified of new report
wsClient.on('new_report', (data) => {
  // Queue refreshes automatically
  fetchPendingReports();
  // Toast shows: "New report in queue!"
});

// Stats update every 10 seconds
wsClient.on('queue_stats_update', (data) => {
  // Display active moderators, pending count, etc.
});
```

### 3. Task Management
```javascript
// Claim task (prevents double-claims)
wsClient.claimTask(taskId, reportId);

// Release task back to queue
wsClient.releaseTask(taskId);

// Broadcast prevents conflicts
// If another moderator claimed first:
// "Task already claimed by moderator-name"
```

### 4. User Actions Broadcast
```javascript
// When moderator warns/suspends/bans user:
// All moderators see real-time notification
wsClient.on('user_warned', (data) => {
  addNotification(`User warned (${data.warningCount}/3)`);
});

wsClient.on('user_suspended', (data) => {
  addNotification(`User suspended`);
});
```

---

## Testing Locally

### Terminal 1: Start Backend
```bash
cd backend && npm start
```

### Terminal 2: Start Frontend
```bash
cd frontend && npm start
```

### Browser: Verify Real-Time

1. **Login as moderator** → Navigate to Moderation Panel
2. **Check connection**:
   - Look for green dot + "Real-time Connected" in sidebar
   - Should show "1 moderators active"

3. **Submit abuse report** (from another account/incognito)
   - Toast: "New report in queue!"
   - Report appears in list automatically

4. **Multi-moderator test**:
   - Open AdminPanel in 2 tabs
   - In Tab 1: Click report to view details
   - In Tab 2: Try to claim same task
   - Result: "Task already claimed" notification

5. **View DevTools Console**:
   - Filter by "ModerationWS" or "AdminPanel"
   - See real-time events logging

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (AdminPanel)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ModerationWebSocketClient (WebSocket Connection)    │   │
│  │ - Auto-reconnect (exponential backoff)             │   │
│  │ - Message queuing (when offline)                   │   │
│  │ - Event listeners (new_report, stats, etc.)        │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │ /ws/moderation (WebSocket)            │
│                     ↓                                        │
├─────────────────────────────────────────────────────────────┤
│                    Backend Server                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ModerationWebSocketManager (server.js:210)          │   │
│  │ - Manages moderator connections                     │   │
│  │ - Tracks claimed tasks (prevents doubles)           │   │
│  │ - Pub/sub for report updates                        │   │
│  │ - Broadcasts stats every 10s                        │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ RealtimeService (wraps moderationService)           │   │
│  │ - Integrates actions with WebSocket events          │   │
│  │ - Triggers broadcasts on warn/suspend/ban/etc.      │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     ↓                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ModerationService + MongoDB                         │   │
│  │ - Core business logic                               │   │
│  │ - Database operations                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### WebSocket Server (`moderationWebsocket.js`)
- **Port**: `/ws/moderation` (on main server)
- **Auth**: JWT token via query string
- **Roles**: admin, moderator
- **State**: Maps for moderators, tasks, subscribers
- **Broadcast**: Every 10 seconds for stats

### WebSocket Client (`moderationWebSocketClient.js`)
- **Reconnect**: Auto-reconnect up to 5 times
- **Backoff**: 3s, 6s, 12s, 24s, 48s
- **Queuing**: Messages queued if offline
- **Events**: Listener pattern (on/off/emit)

### AdminPanel Integration
- **Status**: Green/red dot + text
- **Moderators**: Count of active moderators
- **Notifications**: Toast messages for events
- **Events**: Subscribe to 12+ real-time events

---

## Event Types

### Client → Server
```
authenticate         Connect with credentials
claim_task          Claim moderation task
release_task        Release claimed task
subscribe_report    Listen to report updates
unsubscribe_report  Stop listening
queue_stats         Request stats
ping                Health check
```

### Server → Client
```
new_report          New report in queue
task_claimed        Task claimed by moderator
user_warned         User received warning
user_suspended      User suspended
user_banned         User permanently banned
report_resolved     Report action taken
queue_stats_update  Stats broadcast (10s)
moderator_online    Moderator connected
moderator_offline   Moderator disconnected
error              Connection/processing error
```

---

## Troubleshooting

### Connection Not Established
- **Check**: Token in localStorage (use DevTools)
- **Check**: Server logs for errors
- **Check**: Firewall allows WebSocket (port 5000)

### Messages Not Real-Time
- **Check**: Browser console for errors
- **Check**: Network tab shows WebSocket connection
- **Try**: Refresh page to reconnect

### "Task already claimed" Error
- **Expected**: When another moderator claimed first
- **Fix**: Release your current task first, then claim again

### Notifications Not Appearing
- **Check**: Notification system enabled in AdminPanel
- **Check**: CSS loaded (AdminPanel.css)
- **Try**: Check browser console for JS errors

---

## Performance Notes

- **Broadcasts**: 10-second intervals (configurable)
- **Memory**: Each connection ~1KB per moderator
- **Bandwidth**: ~100 bytes per stats broadcast
- **Cleanup**: Automatic on disconnect

---

## Security

- **Authentication**: JWT token required
- **Roles**: Only admin/moderator allowed
- **Validation**: All messages validated server-side
- **Audit**: All actions logged with moderator ID

---

## What's Next?

**Feature 5: Abuse Reporting System** (2-3 hours)
- Enhanced filtering
- Bulk reporting
- Auto-aggregation
- Advanced analytics

See `PHASE2_FEATURE4_COMPLETION_SUMMARY.md` for full documentation.
