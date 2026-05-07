# 🚀 SOS Module Phase 2 - Architecture & Features Plan

**Date:** May 8, 2026  
**Phase 1 Status:** ✅ COMPLETE  
**Phase 2 Timeline:** 4-5 weeks | **Effort:** 100-120 hours

---

## 📊 PHASE 2 OVERVIEW

**Total Features Planned:** 8 advanced safety features  
**Expected Impact:** Module rating 8.8 → 9.3+ (feature coverage 85% → 95%)

---

## 🎯 PHASE 2 FEATURES (Prioritized)

### Feature 1: Audio Recording During SOS (Priority 1 - 15 hours)
**Impact:** 📊 HIGH - Evidence preservation, legal documentation  
**Complexity:** MEDIUM

```
What: Record ambient audio during emergency alert
Why: Capture threats/surroundings for evidence
Technical:
  - MediaRecorder API for audio recording
  - 5-second automatic start after alert
  - 30-minute max duration
  - Automatic stop on alert resolution
  - Server-side audio processing (noise filter)
  - S3 storage with encryption

Database Changes:
  - Add audioUrl to SOSIncident
  - Add audioMetadata (duration, format, quality)
  - Add audioTranscript (future AI feature)

Frontend Components:
  - SOSAudioRecorder.js (108 lines)
  - Real-time audio level display
  - Manual stop/pause controls

API Endpoints:
  - POST /sos/upload-recording (multipart/form-data)
  - GET /sos/incident/:id/recording (presigned URL)
```

**Security Concerns:**
- Privacy: Get consent before recording
- Storage: End-to-end encryption
- Access: Only authorized users can access
- Deletion: Auto-delete after retention period (30 days)

**Testing Requirements:**
- Unit: Recording lifecycle, error handling
- Integration: Audio upload, retrieval
- Performance: Large file handling (500MB max)

---

### Feature 2: Spam/Abuse Detection (Priority 1 - 12 hours)
**Impact:** 📊 HIGH - System abuse prevention, trust building  
**Complexity:** LOW

```
What: Detect false/spam emergency alerts
Why: Prevent misuse, maintain emergency system credibility
Technical:
  - Frequency analysis (alerts per hour/day)
  - Geolocation clustering (too many from same spot)
  - Time-based patterns (business hours bias detection)
  - Contact patterns (always same contacts)
  - Incident reason distribution

Rules Engine:
  - Rule 1: Max 5 alerts per user per day (flag at 4)
  - Rule 2: Max 2 alerts within 5km per hour (flag at 1)
  - Rule 3: Same contact > 80% of time (flag)
  - Rule 4: All incidents > 100km away (flag)
  - Rule 5: All incidents same reason (flag)

Actions:
  - Score: 0-100 (confidence)
  - Action: Log, Alert, Suspend (score >= 80)

Database Schema:
  - Add abuseScore to SOSIncident
  - Create AbuseReport model
  - Add suspicionFlags array

Endpoints:
  - POST /sos/report-false-alert (user-initiated)
  - GET /sos/abuse-stats (admin-only)
  - PATCH /sos/incident/:id/verify (admin verify legit)
```

---

### Feature 3: Travel Mode (Priority 2 - 18 hours)
**Impact:** 📊 MEDIUM - Long-distance travel safety  
**Complexity:** HIGH

```
What: Automatic SOS trigger based on timer + location
Why: Safe traveling, unconsciousness protection
Technical:
  - Background timer (5-120 minutes configurable)
  - Location tracking during timer
  - Auto-check-in UI (stop timer)
  - SMS/app check-in options
  - Auto-trigger on timer expiry

UI Flow:
  1. User sets timer (default 30 min)
  2. Start travel mode
  3. Timer counts down in background
  4. User can check-in anytime to reset
  5. On timer expiry → Auto SOS alert
  6. Alert includes: Final location, travel duration, route

Database:
  - Create TravelSession model
  - Add travelMode to User
  - Track check-in history

Service Architecture:
  - Background job queue (Bull)
  - Timer expiry handler
  - Automatic alert dispatcher

Frontend:
  - TravelMode.js component (120 lines)
  - Animated countdown
  - Quick check-in button
  - History view

Endpoints:
  - POST /sos/travel-mode/start
  - POST /sos/travel-mode/check-in
  - GET /sos/travel-mode/status
  - POST /sos/travel-mode/end
```

---

### Feature 4: Video Recording (Priority 2 - 20 hours)
**Impact:** 📊 HIGH - Strong evidence, legal admissibility  
**Complexity:** HIGH

```
What: Record video during emergency (front camera)
Why: Visual evidence for legal proceedings, situational context
Technical:
  - MediaRecorder API for video
  - Front camera auto-select
  - 5-minute max per segment
  - Auto-segment on 5min boundary
  - Adaptive bitrate (1-5 Mbps)
  - Automatic compression for upload

Video Pipeline:
  1. Start recording on alert
  2. Real-time preview in modal
  3. Stop button available
  4. Auto-upload when upload area available
  5. Chunked upload (5MB chunks)
  6. Server-side transcoding to MP4

Database:
  - Add videoUrls array to SOSIncident
  - Add videoMetadata (duration, resolution, size)
  - Add transcodeStatus

S3 Storage:
  - Bucket: nilahub-sos-videos
  - TTL: 60 days
  - Encryption: AES-256
  - Access: Presigned URLs (24h expiry)

Endpoints:
  - POST /sos/upload-video-chunk
  - POST /sos/finalize-video
  - GET /sos/incident/:id/videos
```

**Performance Optimization:**
- Browser-side compression before upload
- Chunked upload with retry
- WebRTC for real-time streaming (future)

---

### Feature 5: Multi-Contact Group Alerts (Priority 2 - 14 hours)
**Impact:** 📊 MEDIUM - Redundancy, faster response  
**Complexity:** MEDIUM

```
What: Group emergency contacts for faster notification
Why: Increase response probability, maintain privacy
Technical:
  - Create contact groups (Family, Friends, Work)
  - Smart group selection per incident type
  - Parallel vs sequential alert option
  - Fallback chain (Group 1 fails → Group 2)

Database:
  - Create SOSContactGroup model
  - Add groups reference to SOSIncident
  - Add groupAlertStrategy field

Schema:
  {
    userId: ObjectId,
    name: "Family",
    description: "Immediate family",
    contacts: [contactId],
    priority: "Primary",
    alertStrategy: "parallel", // parallel/sequential
    maxRetries: 3,
    retryDelay: 30, // seconds
    notificationTemplate: "customized",
    isActive: true
  }

Endpoints:
  - POST /sos/groups
  - GET /sos/groups
  - PATCH /sos/groups/:id
  - DELETE /sos/groups/:id
  - POST /sos/groups/:id/contacts/add
  - POST /sos/send-alert-group (alternative endpoint)
```

---

### Feature 6: Panic Button Customization (Priority 3 - 10 hours)
**Impact:** 📊 LOW - UX improvement  
**Complexity:** LOW

```
What: Customize SOS trigger mechanism
Why: Accessibility, quick activation in emergency
Options:
  - Long press (3 seconds)
  - Double tap (500ms gap)
  - Volume button combo (3 presses)
  - Shake gesture (5G force)
  - Voice command ("Help")

Implementation:
  - Gesture detection library
  - Accelerometer for shake
  - Voice recognition (Web Speech API)
  - Configurable in settings

Endpoints:
  - PATCH /sos/settings (save trigger preference)
  - GET /sos/settings
```

---

### Feature 7: SOS Statuses & Updates (Priority 3 - 12 hours)
**Impact:** 📊 MEDIUM - Communication, peace of mind  
**Complexity:** MEDIUM

```
What: Real-time status updates for emergency responders
Why: Transparency, responder coordination
Statuses:
  - Initial → Acknowledged
  - Acknowledged → En-route
  - En-route → Arrived
  - Arrived → Resolved/Escalated

Implementation:
  - WebSocket connection for live updates
  - Real-time location sharing paused during updates
  - Notification to user on each status change

Database:
  - Add statusHistory array to SOSIncident
  - Track timestamp, status, updatedBy

Endpoints:
  - PATCH /sos/incident/:id/status (responder update)
  - GET /sos/incident/:id/timeline
  - WS /sos/incident/:id/live-updates
```

---

### Feature 8: Fake Shutdown Mode (Priority 4 - 15 hours)
**Impact:** 📊 MEDIUM - Safety in extreme situations  
**Complexity:** HIGH

```
What: Trigger emergency alert while appearing to shut down
Why: Protection from aggressor watching phone
Technical:
  - Custom shutdown animation
  - Background alert dispatch (hidden)
  - Location tracking continues
  - Photo/audio recording continues
  - Responder can see "fake shutdown" status

Implementation:
  - Custom overlay animation
  - Background tasks queue
  - Obfuscated operation

Endpoints:
  - POST /sos/trigger-fake-shutdown
  - GET /sos/incident/:id/fake-shutdown-status
```

---

## 🏗️ ARCHITECTURE CHANGES

### Database Schema Updates
```javascript
// New Collections
- AudioRecording
- VideoRecording
- SOSContactGroup
- TravelSession
- AbuseReport
- SettingsPhase2

// Updated SOSIncident
{
  audioUrl: String,
  audioMetadata: {},
  audioTranscript: String,
  videoUrls: [String],
  videoMetadata: [],
  abuseScore: Number,
  suspicionFlags: [String],
  statusHistory: [{}],
  groupId: ObjectId,
  isFakeShutdown: Boolean,
  customTriggerType: String
}
```

### Backend Services
```
services/
├── audioService.js (recording, transcoding)
├── videoService.js (recording, transcoding)
├── abuseDetectionService.js (scoring, flagging)
├── travelModeService.js (background jobs)
├── groupAlertService.js (group coordination)
└── contentModerationService.js (AI-based)
```

### Frontend Components
```
components/
├── SOSAudioRecorder.js
├── SOSVideoRecorder.js
├── TravelModeCountdown.js
├── ContactGroups.js
├── CustomTriggerSettings.js
├── AbuseDetectionBanner.js
└── LiveStatusUpdates.js
```

---

## 📈 ROLLOUT STRATEGY

### Week 1: Audio & Video Recording
- Audio recording component
- Video recording component
- S3 integration for media
- Upload handlers

### Week 2: Travel Mode & Groups
- Travel mode UI & logic
- Contact groups management
- Background job setup
- Alert retry logic

### Week 3: Abuse Detection & Status Updates
- Abuse scoring system
- Admin dashboard
- Status update pipeline
- WebSocket integration

### Week 4: Polish & Optimization
- Performance optimization
- Security audit
- Cross-browser testing
- Documentation

### Week 5: Testing & Deployment
- Integration testing (full suite)
- Staging deployment
- Load testing
- Production rollout

---

## 🧪 TESTING PLAN

### Unit Tests (Per Feature)
- Audio recording lifecycle
- Video encoding options
- Travel mode timer
- Group alert logic
- Abuse detection rules

### Integration Tests
- End-to-end alert with audio/video
- Multi-contact group alerts
- Travel mode auto-trigger
- Fake shutdown detection

### E2E Tests (Cypress)
- Record audio during alert
- Record video with playback
- Travel mode check-in flow
- Group alert coordination

### Performance Tests
- Video upload (500MB max)
- Audio transcoding speed
- Group alert dispatch (100+ contacts)
- Database query optimization

### Security Tests
- Audio/video encryption
- Private URL access (presigned URLs)
- Abuse detection bypass attempts
- Fake shutdown legitimacy

---

## 💰 RESOURCE ESTIMATION

| Feature | Hours | Cost ($) | Priority |
|---------|-------|----------|----------|
| Audio Recording | 15 | 750 | P1 |
| Spam Detection | 12 | 600 | P1 |
| Travel Mode | 18 | 900 | P2 |
| Video Recording | 20 | 1000 | P2 |
| Multi-Group Alerts | 14 | 700 | P2 |
| Custom Triggers | 10 | 500 | P3 |
| Status Updates | 12 | 600 | P3 |
| Fake Shutdown | 15 | 750 | P4 |
| Testing/QA | 30 | 1500 | Core |
| Deployment | 8 | 400 | Core |
| **TOTAL** | **154** | **$7,700** | - |

---

## 🎯 SUCCESS METRICS

### Safety Metrics
- Response time reduction: Target 40% (30m → 18m)
- Evidence capture rate: Target 90%+ (audio/video attached)
- Abuse report rate: Target < 2% of all alerts
- False alert rate: Target < 5%

### Performance Metrics
- Video upload: < 30s for 50MB file
- Audio transcoding: < 5 min for 30min recording
- Database query: < 100ms for group alerts
- Alert dispatch: < 2s for 50 contacts

### Adoption Metrics
- Feature adoption: Target 60%+ (travel mode, groups)
- Audio recording: 40%+ of incidents
- Video recording: 30%+ of incidents
- Group alerts: 50%+ of incidents

---

## 🚀 GO-TO-MARKET PLAN

### Launch Strategy
1. Beta release to 1,000 users (Week 4)
2. Gather feedback (Week 4-5)
3. Fix issues & optimize (Week 5)
4. General availability (Week 6)

### Marketing Messaging
- "Advanced evidence collection: Audio & video"
- "Travel smart: Automatic SOS if you're unresponsive"
- "Multiple contacts, faster response"
- "Stop abuse: AI-powered fraud detection"

### Training Materials
- Video tutorials (2-3 min each)
- In-app help popups
- Knowledge base articles
- FAQ section

---

**Ready to proceed with Phase 2 kickoff?**

Next: Feature specs deep-dive, backend architecture review, frontend component design
