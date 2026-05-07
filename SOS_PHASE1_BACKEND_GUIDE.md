# 🔧 Phase 1 Backend Implementation Guide

## Quick Start for Backend Team

**Status:** Frontend ✅ Complete | Backend 🔄 In Progress | Integration ⏳ Pending

---

## 📋 Required Endpoints (5 Total)

### 1. Send OTP to Phone Number

**Endpoint:** `POST /sos/send-contact-otp`

**Request:**
```javascript
{
  phone: "+919876543210"  // E.164 format required
}
```

**Response (Success):**
```javascript
{
  success: true,
  message: "OTP sent to +919876543210",
  expiresIn: 300  // seconds
}
```

**Response (Error):**
```javascript
{
  success: false,
  error: "Invalid phone number" | "SMS service unavailable"
}
```

**Implementation Notes:**
- Generate random 6-digit OTP
- Store in Redis with 5-minute expiry: `otp:{phone}:{timestamp}` = `{otp}`
- Send via SMS (Twilio/AWS SNS/MessageBird)
- Log OTP attempts for abuse detection
- Rate limit: 3 attempts per phone per hour

**Code Template:**
```javascript
router.post('/send-contact-otp', async (req, res) => {
  const { phone } = req.body;
  
  // Validate phone format
  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({ success: false, error: "Invalid phone" });
  }
  
  // Rate limiting check
  const attempts = await redis.incr(`otp:attempts:${phone}`);
  if (attempts > 3) {
    return res.status(429).json({ success: false, error: "Too many attempts" });
  }
  
  const otp = Math.floor(100000 + Math.random() * 900000);
  
  // Store with 5-min expiry
  await redis.setex(`otp:${phone}`, 300, otp);
  
  // Send SMS
  await smsProvider.send({
    to: phone,
    message: `Your MalarBazaar SOS contact verification code is: ${otp}`
  });
  
  res.json({ success: true, message: "OTP sent", expiresIn: 300 });
});
```

**Testing Command:**
```bash
curl -X POST http://localhost:5000/sos/send-contact-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'
```

---

### 2. Verify OTP Code

**Endpoint:** `POST /sos/verify-contact-otp`

**Request:**
```javascript
{
  phone: "+919876543210",
  otp: "123456"
}
```

**Response (Success):**
```javascript
{
  verified: true,
  message: "Phone number verified",
  token: "verification_token_for_session" // optional
}
```

**Response (Error):**
```javascript
{
  verified: false,
  error: "Invalid OTP" | "OTP expired" | "Verification failed"
}
```

**Implementation Notes:**
- Retrieve OTP from Redis
- Verify exact match
- Delete OTP after verification (prevent replay)
- Mark contact as verified in session
- Optional: Generate JWT token for verification proof

**Code Template:**
```javascript
router.post('/verify-contact-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  // Retrieve stored OTP
  const storedOtp = await redis.get(`otp:${phone}`);
  
  if (!storedOtp) {
    return res.json({ verified: false, error: "OTP expired" });
  }
  
  if (storedOtp !== otp) {
    return res.json({ verified: false, error: "Invalid OTP" });
  }
  
  // Mark as verified
  await redis.del(`otp:${phone}`);
  await redis.setex(`verified:${phone}`, 3600, "true");
  
  res.json({ verified: true, message: "Phone number verified" });
});
```

---

### 3. Create Tracking Link

**Endpoint:** `POST /sos/create-tracking-link`

**Request:**
```javascript
{
  incidentId: "incident_12345"
}
```

**Response:**
```javascript
{
  trackingUrl: "https://malabarbazaar.com/sos/track/abc123xyz789",
  token: "abc123xyz789",
  expiresAt: "2026-05-09T12:00:00Z"
}
```

**Implementation Notes:**
- Generate 32-character secure random token
- Store mapping: `tracking:{token}` = `{incidentId, createdAt, expiresAt}`
- 24-hour expiry
- Include in SMS sent to emergency contacts
- Make URL short-friendly (QR code ready)

**Code Template:**
```javascript
router.post('/create-tracking-link', async (req, res) => {
  const { incidentId } = req.body;
  const token = crypto.randomBytes(16).toString('hex'); // 32 chars
  
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  
  // Store in Redis
  await redis.setex(`tracking:${token}`, 86400, JSON.stringify({
    incidentId,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString()
  }));
  
  const trackingUrl = `${process.env.FRONTEND_URL}/sos/track/${token}`;
  
  res.json({
    trackingUrl,
    token,
    expiresAt
  });
});
```

---

### 4. Fetch Live Location (Tracking)

**Endpoint:** `GET /sos/tracking/:token`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (Active):**
```javascript
{
  incidentId: "incident_12345",
  status: "active",
  location: {
    latitude: 28.7041,
    longitude: 77.1025,
    accuracy: 15,
    timestamp: "2026-05-08T12:00:00Z"
  },
  reason: "Unsafe situation",
  contacts: 3,
  expiresAt: "2026-05-09T12:00:00Z"
}
```

**Response (Expired):**
```javascript
{
  error: "Tracking link expired or invalid",
  status: 404
}
```

**Implementation Notes:**
- Validate token from Redis
- Fetch latest location from incident record
- No authentication required (token is the auth)
- Return basic incident info, not sensitive data
- Polling endpoint (called every 5 seconds from frontend)

**Code Template:**
```javascript
router.get('/tracking/:token', async (req, res) => {
  const { token } = req.params;
  
  // Verify token exists
  const trackingData = await redis.get(`tracking:${token}`);
  if (!trackingData) {
    return res.status(404).json({ error: "Tracking link expired" });
  }
  
  const { incidentId } = JSON.parse(trackingData);
  
  // Fetch incident details
  const incident = await Incident.findById(incidentId)
    .select('location status reason contacts expiresAt');
  
  if (!incident) {
    return res.status(404).json({ error: "Incident not found" });
  }
  
  res.json({
    incidentId,
    status: incident.status,
    location: incident.location,
    reason: incident.reason,
    contacts: incident.contacts.length,
    expiresAt: incident.expiresAt
  });
});
```

---

### 5. Send Alert with Photos & Retry

**Endpoint:** `POST /sos/send-alert` (ENHANCED)

**Request:**
```javascript
{
  reason: "Medical",
  latitude: 28.7041,
  longitude: 77.1025,
  accuracy: 15,
  mapsUrl: "https://www.google.com/maps?q=28.7041,77.1025",
  location: "Delhi, India",
  channels: ["SMS", "Call", "WhatsApp"],
  photos: [
    {
      data: "data:image/jpeg;base64,/9j/4AAQSkZJ...",
      timestamp: "2026-05-08T12:00:00Z"
    }
  ],
  timestamp: "2026-05-08T12:00:00Z"
}
```

**Response:**
```javascript
{
  incidentId: "incident_12345",
  recipients: [
    { name: "Mom", phone: "+919876543210", status: "sent" },
    { name: "Friend", phone: "+919876543211", status: "pending" }
  ],
  videoRecipientCount: 1,
  trackingUrl: "https://malabarbazaar.com/sos/track/abc123",
  message: "Alert dispatched to 2 contacts"
}
```

**Implementation Notes:**
- Create incident record with photos
- Store photos in S3/Azure Blob (not database)
- Send to all emergency contacts
- Implement retry logic for failures
- Log all attempts for audit trail

**Retry Configuration:**
```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [30000, 60000, 120000], // 30s, 1m, 2m
  backoffMultiplier: 1
};
```

**Code Template:**
```javascript
// src/services/sosRetryService.js
class SOSRetryService {
  async sendAlertWithRetry(alertData) {
    let lastError;
    
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await this.sendAlert(alertData);
      } catch (error) {
        lastError = error;
        console.log(`Alert send failed (attempt ${attempt + 1})`);
        
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          const delay = RETRY_CONFIG.delays[attempt];
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async sendAlert(alertData) {
    // Store photos
    const photoUrls = await this.storePhotos(alertData.photos);
    
    // Create incident
    const incident = await Incident.create({
      userId: alertData.userId,
      reason: alertData.reason,
      location: {
        type: 'Point',
        coordinates: [alertData.longitude, alertData.latitude],
        accuracy: alertData.accuracy,
        address: alertData.location
      },
      photos: photoUrls,
      channels: alertData.channels,
      status: 'active',
      createdAt: new Date()
    });
    
    // Send to contacts
    const recipients = await this.dispatchToContacts(incident, alertData);
    
    return {
      incidentId: incident._id,
      recipients,
      trackingUrl: alertData.trackingUrl
    };
  }

  async storePhotos(photos) {
    if (!photos || photos.length === 0) return [];
    
    const urls = [];
    for (const photo of photos) {
      const buffer = Buffer.from(photo.data.split(',')[1], 'base64');
      const key = `sos/${Date.now()}-${Math.random()}.jpg`;
      
      const url = await s3.upload({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg'
      });
      
      urls.push(url);
    }
    
    return urls;
  }

  async dispatchToContacts(incident, alertData) {
    const user = await User.findById(incident.userId);
    const contacts = await EmergencyContact.find({ userId: incident.userId });
    
    const recipients = [];
    
    for (const contact of contacts) {
      try {
        if (alertData.channels.includes('SMS')) {
          await smsProvider.send({
            to: contact.phone,
            message: `SOS Alert: ${alertData.reason}. Location: ${alertData.mapsUrl}`
          });
        }
        
        if (alertData.channels.includes('Call')) {
          // Initiate call
          await callProvider.initiateCall(contact.phone);
        }
        
        if (alertData.channels.includes('WhatsApp')) {
          await whatsappProvider.send({
            to: contact.phone,
            message: `🆘 SOS Alert from ${user.name}: ${alertData.reason}. Location: ${alertData.mapsUrl}`
          });
        }
        
        recipients.push({
          name: contact.name,
          phone: contact.phone,
          status: 'sent'
        });
      } catch (error) {
        recipients.push({
          name: contact.name,
          phone: contact.phone,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return recipients;
  }
}

module.exports = new SOSRetryService();
```

**In Controller:**
```javascript
router.post('/send-alert', async (req, res) => {
  try {
    const alertData = {
      userId: req.user.id,
      ...req.body
    };
    
    const result = await sosRetryService.sendAlertWithRetry(alertData);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to dispatch alert',
      message: error.message
    });
  }
});
```

---

## 🗄️ Database Schema Updates

### Contacts Table - ADD Fields
```sql
ALTER TABLE emergency_contacts ADD COLUMN (
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  otp_attempts INT DEFAULT 0,
  otp_last_sent TIMESTAMP
);

CREATE INDEX idx_contacts_verified ON emergency_contacts(user_id, verified);
```

### Incidents Table - ADD Fields
```sql
ALTER TABLE sos_incidents ADD COLUMN (
  photos JSON,  -- Array of S3 URLs
  video_call_sid VARCHAR(255),
  tracking_token VARCHAR(255) UNIQUE,
  tracking_expires_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  retry_log JSON
);

CREATE INDEX idx_incidents_tracking ON sos_incidents(tracking_token);
CREATE INDEX idx_incidents_created ON sos_incidents(user_id, created_at DESC);
```

### Tracking Table - NEW
```sql
CREATE TABLE tracking_links (
  id VARCHAR(255) PRIMARY KEY,
  incident_id VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  accessed_count INT DEFAULT 0,
  last_accessed_at TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES sos_incidents(id)
);

CREATE INDEX idx_tracking_token ON tracking_links(token);
CREATE INDEX idx_tracking_expires ON tracking_links(expires_at);
```

---

## 🧪 Testing Endpoints

### Test Suite (Postman/curl)

**Test 1: OTP Flow**
```bash
# Send OTP
curl -X POST http://localhost:5000/sos/send-contact-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'

# Verify OTP (use actual OTP from SMS)
curl -X POST http://localhost:5000/sos/verify-contact-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","otp":"123456"}'
```

**Test 2: Tracking Link**
```bash
# Create tracking link
curl -X POST http://localhost:5000/sos/create-tracking-link \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"incidentId":"incident_12345"}'

# Fetch tracking link
curl -X GET http://localhost:5000/sos/tracking/abc123xyz789
```

**Test 3: Send Alert with Photos**
```bash
curl -X POST http://localhost:5000/sos/send-alert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason":"Medical",
    "latitude":28.7041,
    "longitude":77.1025,
    "accuracy":15,
    "location":"Delhi",
    "photos":[{"data":"data:image/jpeg;base64,...","timestamp":"2026-05-08T12:00:00Z"}],
    "channels":["SMS","Call"]
  }'
```

---

## 🚀 Deployment Checklist

### Before Production
- [ ] All 5 endpoints implemented and tested
- [ ] SMS service integrated and tested
- [ ] S3/Blob storage configured
- [ ] Redis configured for OTP/tracking
- [ ] Rate limiting configured
- [ ] Error logging configured
- [ ] Monitoring/alerting setup
- [ ] Database migrations applied
- [ ] Load testing completed
- [ ] Security review passed

### Environment Variables
```
OTP_EXPIRY=300
SMS_PROVIDER=twilio # or aws_sns, messagebird
SMS_API_KEY=...
S3_BUCKET=...
REDIS_URL=...
FRONTEND_URL=https://malabarbazaar.com
```

---

## 📊 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| OTP Delivery Rate | 99% | - |
| Photo Upload Success | 95% | - |
| Tracking Link Generation | 100% | - |
| Alert Dispatch Time | <2s | - |
| Retry Success Rate | 85% | - |

---

**Ready for Backend Implementation!**
Estimated effort: 8-10 hours for experienced team
Estimated timeline: Week 1
