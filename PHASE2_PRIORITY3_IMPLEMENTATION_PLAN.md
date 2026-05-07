# 🚨 SOS Module - Phase 2 Priority 3: Real-Time Status Updates

**Status:** 📋 PLANNING  
**Estimated Duration:** 12 hours  
**Complexity:** MEDIUM  
**Target:** May 8-9, 2026  

---

## 🎯 Feature Overview

**What:** Real-time status tracking for emergency incidents with responder coordination  
**Why:** Transparency, responder coordination, caller peace of mind  
**Impact:** MEDIUM - Significantly improves user experience during emergencies

### Status Flow
```
Initial (triggered)
    ↓
Acknowledged (responder accepted)
    ↓
En-route (responder traveling to location)
    ↓
Arrived (responder at location)
    ↓
Resolved or Escalated
```

---

## 📦 Deliverables (3 Main Components)

### 1. Backend Database & API (6 hours)

#### Database Changes
- ✅ Add `statusHistory` array to `SOSIncident` model
- ✅ Add status tracking fields: `timestamp`, `status`, `updatedBy`, `notes`
- ✅ Create TTL indexes for status history cleanup
- ✅ Add `currentStatus` field for quick queries

#### API Endpoints (3 total)
1. **PATCH `/api/sos/incident/:incidentId/status`**
   - Update incident status (responder only)
   - Body: `{ status, notes, responderLocation }`
   - Returns: updated status and history
   - Auth: JWT + responder verification

2. **GET `/api/sos/incident/:incidentId/timeline`**
   - Get full status history for incident
   - Query params: `limit`, `offset`, `filterStatus`
   - Returns: paginated status timeline
   - Auth: JWT (user or responder)

3. **GET `/api/sos/incident/:incidentId/status`**
   - Get current status snapshot
   - Returns: latest status, last update time, responder info
   - Auth: JWT (user or responder)

### 2. Backend WebSocket Service (3 hours)

#### WebSocket Events
- **`sos:status:updated`** - Broadcast when status changes
  - Listeners: User + all responders
  - Data: `{ incidentId, newStatus, timestamp, responderName, notes }`

- **`sos:status:history`** - Stream full history on demand
  - Listeners: User + responders
  - Data: `{ incidentId, timeline: [], count: 0 }`

- **`sos:incident:timeline` room** - Real-time updates for specific incident
  - Auto-join when viewing incident
  - Auto-leave when navigating away

#### Implementation
- Extend existing WebSocket config
- Add status update event handlers
- Implement room-based broadcasting
- Add reconnection logic with state replay

### 3. Frontend Components & UI (3 hours)

#### New Components
1. **`SOSStatusTracker.js`** (280 lines)
   - Display current status with visual timeline
   - Show responder info when available
   - Real-time updates via WebSocket
   - Animations for status transitions
   - Estimated time to arrival (if available)

2. **`SOSStatusUpdateForm.js`** (200 lines)
   - Responder UI to update status
   - Status dropdown with required fields
   - Location capture on status change
   - Notes field for additional info
   - Form validation and submission

3. **`SOSStatusTimeline.js`** (220 lines)
   - Visual timeline of all status changes
   - Card-based history display
   - Filter by status
   - Show responder details for each update
   - Timestamp and notes display

4. **`SOSLiveUpdates.js`** (180 lines)
   - Real-time WebSocket listener
   - Update parent components on new status
   - Reconnection handling
   - Notification badges

#### UI Features
- Color-coded status badges (pending, acknowledged, en-route, arrived, resolved)
- Animated status progression indicators
- Responder name and profile (if available)
- Last update timestamp
- "Waiting since..." duration counter
- Mobile-responsive timeline

---

## 📋 Implementation Checklist

### Phase 1: Database & Models (2 hours)
- [ ] 1. Update `SOSIncident` model with `statusHistory` array
- [ ] 2. Add indexes for status queries
- [ ] 3. Create migration script if needed
- [ ] 4. Add schema validation for status values
- [ ] 5. Add TTL index for old status records
- [ ] 6. Test model changes

### Phase 2: Backend API Endpoints (2 hours)
- [ ] 7. Create `PATCH /incident/:id/status` endpoint
- [ ] 8. Create `GET /incident/:id/timeline` endpoint
- [ ] 9. Create `GET /incident/:id/status` endpoint
- [ ] 10. Add authentication/authorization checks
- [ ] 11. Add input validation and error handling
- [ ] 12. Add logging for all status changes
- [ ] 13. Add rate limiting
- [ ] 14. Test all 3 endpoints with Postman/curl

### Phase 3: WebSocket Integration (2 hours)
- [ ] 15. Add status event handlers to WebSocket config
- [ ] 16. Implement `sos:incident:timeline` room
- [ ] 17. Add broadcast logic for status updates
- [ ] 18. Add room join/leave on status checks
- [ ] 19. Add reconnection state replay
- [ ] 20. Add event logging

### Phase 4: Frontend Components (2 hours)
- [ ] 21. Create `SOSStatusTracker.js` component
- [ ] 22. Create `SOSStatusUpdateForm.js` component
- [ ] 23. Create `SOSStatusTimeline.js` component
- [ ] 24. Create `SOSLiveUpdates.js` hook
- [ ] 25. Add CSS for all components
- [ ] 26. Add animations for status transitions
- [ ] 27. Add responsive mobile design

### Phase 5: Integration (1 hour)
- [ ] 28. Mount `SOSStatusTracker` in incident detail view
- [ ] 29. Mount `SOSStatusUpdateForm` in responder dashboard
- [ ] 30. Mount `SOSStatusTimeline` in history view
- [ ] 31. Connect WebSocket events to components
- [ ] 32. Test real-time updates end-to-end

### Phase 6: Testing & Deployment (1 hour)
- [ ] 33. Write integration tests
- [ ] 34. Manual E2E testing
- [ ] 35. Performance testing (WebSocket load)
- [ ] 36. Security audit
- [ ] 37. Staging deployment
- [ ] 38. Production deployment

---

## 🔧 Technical Implementation Details

### Database Schema Changes
```javascript
// In SOSIncident model - add:
statusHistory: [{
  status: {
    type: String,
    enum: ['initial', 'acknowledged', 'en-route', 'arrived', 'resolved', 'escalated'],
    default: 'initial'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,  // responder email
    required: true
  },
  responderLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number
  },
  notes: String
}],

currentStatus: {
  type: String,
  enum: ['initial', 'acknowledged', 'en-route', 'arrived', 'resolved', 'escalated'],
  default: 'initial'
},

lastStatusUpdate: Date,
lastUpdatedBy: String
```

### API Response Format
```javascript
// PATCH /incident/:id/status response
{
  success: true,
  data: {
    incidentId: "...",
    previousStatus: "acknowledged",
    newStatus: "en-route",
    statusHistory: [
      {
        status: "initial",
        timestamp: "2026-05-08T10:00:00Z",
        updatedBy: "user@example.com"
      },
      {
        status: "acknowledged",
        timestamp: "2026-05-08T10:01:00Z",
        updatedBy: "responder@example.com"
      }
    ],
    responderName: "John Doe",
    message: "Status updated successfully"
  }
}

// GET /incident/:id/timeline response
{
  success: true,
  data: {
    incidentId: "...",
    timeline: [
      { status: "initial", timestamp: "...", updatedBy: "..." },
      { status: "acknowledged", timestamp: "...", updatedBy: "..." }
    ],
    total: 4,
    limit: 10,
    offset: 0
  }
}
```

### WebSocket Events
```javascript
// When status changes (broadcast to incident room)
socket.emit('sos:status:updated', {
  incidentId: "...",
  newStatus: "en-route",
  previousStatus: "acknowledged",
  timestamp: "2026-05-08T10:02:00Z",
  responderName: "John Doe",
  responderEmail: "responder@example.com",
  notes: "Leaving station now"
});

// Subscribe to incident updates
socket.join(`sos:incident:${incidentId}`);

// Unsubscribe
socket.leave(`sos:incident:${incidentId}`);
```

---

## 🎨 Frontend Component Structure

### SOSStatusTracker.js (Caller View)
```
┌─────────────────────────────────────┐
│  INCIDENT STATUS TRACKER            │
├─────────────────────────────────────┤
│  Status: EN-ROUTE                   │
│  ⏱️  Waiting since: 5 minutes       │
│                                      │
│  Responder: John Doe (Paramedic)     │
│  Last Update: 2 minutes ago          │
│                                      │
│  ─●─────●─────●───○───○             │
│   ✓       ✓     ✓   ?   ?            │
│  Initial Ack  Route Arr. Res.        │
└─────────────────────────────────────┘
```

### SOSStatusUpdateForm.js (Responder View)
```
┌─────────────────────────────────────┐
│  UPDATE INCIDENT STATUS             │
├─────────────────────────────────────┤
│  Current Status: Acknowledged       │
│  ▼                                   │
│  [ ] Initial                         │
│  [ ] Acknowledged                    │
│  [●] En-Route                        │
│  [ ] Arrived                         │
│  [ ] Resolved                        │
│  [ ] Escalated                       │
│                                      │
│  Notes:                              │
│  ┌───────────────────────────────┐   │
│  │ Leaving station, ETA 8 min    │   │
│  └───────────────────────────────┘   │
│                                      │
│  [📍 Capture Location] [Update]      │
└─────────────────────────────────────┘
```

### SOSStatusTimeline.js (History View)
```
┌─────────────────────────────────────┐
│  STATUS TIMELINE                    │
├─────────────────────────────────────┤
│  ● Initial (10:00 AM)               │
│  │ Triggered by caller              │
│  │ Reason: Medical Emergency        │
│  │                                  │
│  ● Acknowledged (10:01 AM)          │
│  │ Responder: John Doe              │
│  │ Status: Responding               │
│  │                                  │
│  ● En-Route (10:02 AM)              │
│  │ Responder: John Doe              │
│  │ ETA: 5 minutes                   │
│  │ Notes: Heavy traffic on route    │
│  │                                  │
│  ● Arrived (10:07 AM)               │
│  │ Responder: John Doe              │
│  │                                  │
│  ● Resolved (10:25 AM)              │
│  │ Responder: John Doe              │
│  │ Resolution: Taken to hospital    │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// Test status transitions
test('should allow Initial → Acknowledged', () => {})
test('should allow Acknowledged → En-route', () => {})
test('should prevent En-route → Initial', () => {})

// Test timeline queries
test('should fetch full status history', () => {})
test('should filter timeline by status', () => {})

// Test WebSocket events
test('should broadcast status update to incident room', () => {})
test('should handle socket reconnection with state replay', () => {})
```

### Integration Tests
```javascript
// Full workflow
test('Full status workflow: trigger → acknowledge → en-route → arrived → resolved', () => {})

// Real-time updates
test('Caller sees status update in real-time', () => {})
test('Responder can update status and see history', () => {})

// Edge cases
test('Multiple responders updating status', () => {})
test('Network disconnection during status update', () => {})
test('Concurrent status updates handled correctly', () => {})
```

### Manual Testing Scenarios
1. **Single responder workflow**
   - Trigger incident → Responder accepts → Updates to en-route → Arrives → Resolves
   - Verify real-time updates at each step

2. **Multi-responder coordination**
   - Multiple responders responding
   - Verify independent status updates tracked separately

3. **Network interruption**
   - Disconnect during status update
   - Verify state replay on reconnection

4. **High load**
   - 100 concurrent incidents
   - Verify performance is acceptable

---

## 🚀 Priority & Next Steps

**Priority:** HIGH - Core feature for responder coordination  
**Dependencies:** None (can proceed immediately after Priority 2)  
**Blocking:** Future phases (fake shutdown, analytics)

### Immediate Action Items
1. Get user confirmation to proceed
2. Create MongoDB migration script
3. Start with Phase 1: Database changes
4. Parallel track: Backend API endpoints
5. Follow with WebSocket integration
6. Final: Frontend components

### Success Criteria
- ✅ All 3 API endpoints working
- ✅ WebSocket broadcasting status updates
- ✅ Components displaying real-time updates
- ✅ Full integration test suite passing
- ✅ 100% backward compatible with Priority 2
- ✅ No new build errors or warnings

---

## 📊 Effort Estimation

| Task | Hours | Status |
|------|-------|--------|
| Database schema changes | 1 | ⏳ NOT STARTED |
| API endpoints (3) | 2 | ⏳ NOT STARTED |
| WebSocket integration | 2 | ⏳ NOT STARTED |
| Frontend components (3) | 2 | ⏳ NOT STARTED |
| Integration & testing | 2 | ⏳ NOT STARTED |
| Deployment & documentation | 1 | ⏳ NOT STARTED |
| **TOTAL** | **12** | **Ready to begin** |

---

## ✅ Ready to Start?

**This plan is ready for implementation. Confirm and I will:**

1. ✅ Start Phase 1: Update SOSIncident model with statusHistory
2. ✅ Create database migration script
3. ✅ Build 3 API endpoints
4. ✅ Implement WebSocket real-time events
5. ✅ Create frontend components
6. ✅ Run full integration test suite
7. ✅ Build and verify no errors
8. ✅ Create final delivery report

**Estimated completion: 12 hours (1.5 days)**

---

**Type "START" or "YES" to begin Priority 3 implementation 🚀**
