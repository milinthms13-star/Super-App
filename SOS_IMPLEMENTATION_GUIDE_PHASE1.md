# 🛠️ SOS Module - Implementation Guide (Priority 1)

## Feature 1: OTP Verification for Emergency Contacts

### Current Code Location
File: `src/modules/sos/SOSAlert.js` - Lines 605-640 (handleAddContact function)

### Implementation Steps

#### Step 1: Backend Endpoint for OTP
Create `/sos/send-contact-otp` endpoint:
```javascript
// Backend Route
app.post('/sos/send-contact-otp', async (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  
  // Store in Redis: `otp:${phone}:${Date.now()}` = otp (5 min expiry)
  // Send SMS: "Your MalarBazaar SOS contact verification code is: " + otp
  
  res.json({ success: true, message: "OTP sent" });
});
```

#### Step 2: Frontend Form Changes
Modify `SOSAlert.js` state to add OTP verification:
```javascript
const [contactForm, setContactForm] = useState({
  name: "",
  relation: "",
  phone: "",
  priority: "Backup",
  notifyBy: ["SMS", "Call"],
  otpSent: false,        // ← ADD
  otpCode: "",           // ← ADD
  otpVerified: false,    // ← ADD
});

const [otpError, setOtpError] = useState("");
```

#### Step 3: Add OTP Request Handler
```javascript
const handleSendOTP = async () => {
  if (!contactForm.phone.trim()) {
    setStatusMessage("Enter phone number first");
    return;
  }

  try {
    const response = await apiCall('/sos/send-contact-otp', 'POST', {
      phone: contactForm.phone
    });
    
    if (response?.success) {
      setContactForm(prev => ({ ...prev, otpSent: true }));
      setStatusMessage("OTP sent to phone. Enter code below.");
    }
  } catch (error) {
    setOtpError("Failed to send OTP");
  }
};
```

#### Step 4: Add OTP Verification Handler
```javascript
const handleVerifyOTP = async () => {
  try {
    const response = await apiCall('/sos/verify-contact-otp', 'POST', {
      phone: contactForm.phone,
      otp: contactForm.otpCode
    });
    
    if (response?.verified) {
      setContactForm(prev => ({ ...prev, otpVerified: true }));
      setStatusMessage("Contact verified!");
    } else {
      setOtpError("Invalid OTP. Try again.");
    }
  } catch (error) {
    setOtpError("Verification failed");
  }
};
```

#### Step 5: Update Form UI
In the form JSX (around line 630):
```jsx
{!contactForm.otpSent ? (
  <>
    <input type="text" name="phone" placeholder="Phone Number" ... />
    <button onClick={handleSendOTP} type="button">
      Send OTP
    </button>
  </>
) : !contactForm.otpVerified ? (
  <>
    <input 
      type="text" 
      placeholder="Enter 6-digit OTP" 
      value={contactForm.otpCode}
      onChange={(e) => setContactForm(prev => ({...prev, otpCode: e.target.value}))}
    />
    <button onClick={handleVerifyOTP} type="button">
      Verify OTP
    </button>
    {otpError && <p className="error">{otpError}</p>}
  </>
) : (
  <p className="success">✓ Contact verified</p>
)}
```

#### Step 6: Update handleAddContact
```javascript
const handleAddContact = async (event) => {
  event.preventDefault();

  if (!contactForm.name.trim() || !contactForm.phone.trim()) {
    setStatusMessage("Add a name and phone number.");
    return;
  }

  // ← NEW: Check OTP verification
  if (!contactForm.otpVerified) {
    setStatusMessage("Please verify phone number with OTP first");
    return;
  }

  try {
    const response = await apiCall('/sos/contacts', 'POST', {
      name: contactForm.name,
      relation: contactForm.relation,
      phone: contactForm.phone,
      priority: contactForm.priority,
      notifyBy: contactForm.notifyBy,
      verified: true,  // ← ADD
      verifiedAt: new Date().toISOString()  // ← ADD
    });
    
    if (response?.data) {
      setContacts(prev => [...prev, { ...response.data, acknowledged: false }]);
      setContactForm({  // Reset form
        name: "",
        relation: "",
        phone: "",
        priority: "Backup",
        notifyBy: ["SMS", "Call"],
        otpSent: false,
        otpCode: "",
        otpVerified: false
      });
      setStatusMessage(`${contactForm.name} verified and saved.`);
      loadData();
    }
  } catch (error) {
    setStatusMessage('Failed to save contact.');
  }
};
```

**Effort: 4 hours | Impact: HIGH - Prevents invalid contacts**

---

## Feature 2: Siren/Alarm on SOS Trigger

### Implementation Steps

#### Step 1: Create SOSAlarm Component
Create `src/modules/sos/SOSAlarm.js`:
```javascript
import React, { useEffect, useRef, useState } from 'react';

const SOSAlarm = ({ active, muted = false }) => {
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);

  useEffect(() => {
    if (!active || muted) {
      if (audioContextRef.current) {
        oscillatorsRef.current.forEach(osc => {
          try { osc.stop(); } catch(e) {}
        });
        oscillatorsRef.current = [];
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    // Siren: Alternating high-low frequency pattern
    const playSiren = () => {
      const frequencies = [800, 1200]; // Hz
      let freqIndex = 0;

      const interval = setInterval(() => {
        if (!audioContextRef.current || !active) {
          clearInterval(interval);
          return;
        }

        // Stop previous oscillators
        oscillatorsRef.current.forEach(osc => {
          try { osc.stop(); } catch(e) {}
        });

        // Create new oscillators for the current frequency
        const freq = frequencies[freqIndex % 2];
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);

        osc.frequency.setValueAtTime(freq, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 30% volume

        osc.start();
        oscillatorsRef.current = [osc];

        freqIndex++;
      }, 400); // Switch frequency every 400ms
    };

    playSiren();

    // Vibration pattern on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200, 100]); // Vibrate pattern
    }

    return () => {
      oscillatorsRef.current.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
      if (audioContext) audioContext.close();
    };
  }, [active, muted]);

  return null; // Alarm is audio-only, no UI needed
};

export default SOSAlarm;
```

#### Step 2: Import and Use in SOSAlert.js
Add to imports:
```javascript
import SOSAlarm from './SOSAlarm';
```

Add state for alarm muting:
```javascript
const [alarmMuted, setAlarmMuted] = useState(false);
```

In JSX (emergency controls section):
```jsx
<SOSAlarm active={alertState.active} muted={alarmMuted} />

{alertState.active && (
  <button 
    className="sos-control-button mute" 
    onClick={() => setAlarmMuted(!alarmMuted)}
  >
    {alarmMuted ? '🔇 Muted' : '🔊 Mute Alarm'}
  </button>
)}
```

**Effort: 2 hours | Impact: MEDIUM - Audible alert for safety**

---

## Feature 3: Photo Capture on SOS Trigger

### Implementation Steps

#### Step 1: Create PhotoCapture Component
Create `src/modules/sos/PhotoCapture.js`:
```javascript
import React, { useRef, useState, useEffect } from 'react';

const PhotoCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user'); // user | environment

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (error) {
        console.error('Camera access denied:', error);
        alert('Camera permission required');
        onClose();
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, onClose]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;

      // Mirror front camera
      if (facingMode === 'user') {
        context.scale(-1, 1);
        context.drawImage(video, -video.videoWidth, 0, video.videoWidth, video.videoHeight);
      } else {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      }

      canvasRef.current.toBlob(blob => {
        onCapture(blob);
        onClose();
      }, 'image/jpeg');
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="photo-capture-modal">
      <div className="photo-capture-container">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={{ 
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            width: '100%',
            height: '300px',
            objectFit: 'cover'
          }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        <div className="photo-capture-controls">
          <button onClick={capturePhoto} className="capture-button">
            📷 Capture Photo
          </button>
          <button onClick={toggleCamera} className="toggle-button">
            🔄 Switch Camera
          </button>
          <button onClick={onClose} className="close-button">
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;
```

#### Step 2: Update SOSAlert.js
Add state:
```javascript
const [showCamera, setShowCamera] = useState(false);
const [capturedPhotos, setCapturedPhotos] = useState([]);
```

Add handler:
```javascript
const handlePhotoCapture = (photoBlob) => {
  const photoUrl = URL.createObjectURL(photoBlob);
  setCapturedPhotos(prev => [...prev, {
    url: photoUrl,
    blob: photoBlob,
    timestamp: new Date().toISOString()
  }]);
  setStatusMessage("Photo captured and saved as evidence");
};
```

#### Step 3: Add Photo Capture to Emergency Controls
In JSX (emergency controls):
```jsx
{alertState.active && (
  <>
    <button 
      className="sos-control-button capture"
      onClick={() => setShowCamera(true)}
    >
      📷 Capture Evidence
    </button>
    {showCamera && (
      <PhotoCapture 
        onCapture={handlePhotoCapture} 
        onClose={() => setShowCamera(false)}
      />
    )}
  </>
)}

{capturedPhotos.length > 0 && (
  <div className="captured-photos">
    <h3>Evidence Photos ({capturedPhotos.length})</h3>
    <div className="photo-grid">
      {capturedPhotos.map((photo, idx) => (
        <img key={idx} src={photo.url} alt={`Evidence ${idx + 1}`} />
      ))}
    </div>
  </div>
)}
```

#### Step 4: Include Photos in Alert Payload
Update `handleTriggerSOS`:
```javascript
// When sending alert, include photos
const photoData = await Promise.all(
  capturedPhotos.map(async (photo) => ({
    data: await blobToBase64(photo.blob),
    timestamp: photo.timestamp
  }))
);

await apiCall("/sos/send-alert", "POST", {
  reason,
  longitude: geoLocation?.longitude,
  latitude: geoLocation?.latitude,
  photos: photoData,  // ← ADD
  // ... other fields
});
```

**Effort: 3 hours | Impact: HIGH - Critical evidence collection**

---

## Feature 4: Public Tracking Link (No Login Required)

### Backend Implementation

#### Step 1: Create Tracking Token
```javascript
// Backend Route: POST /sos/create-tracking-link
app.post('/sos/create-tracking-link', async (req, res) => {
  const { incidentId } = req.body;
  const token = generateSecureToken(); // 32-char random token
  
  // Store: trackingToken -> { incidentId, createdAt, expiresAt: now + 24h }
  await redis.setex(`tracking:${token}`, 86400, JSON.stringify({
    incidentId,
    createdAt: Date.now()
  }));

  const trackingUrl = `${process.env.FRONTEND_URL}/sos/track/${token}`;
  res.json({ trackingUrl, token });
});
```

#### Step 2: Create Tracking Page
Create `src/modules/sos/SOSTrackingPage.js`:
```javascript
import React, { useEffect, useState } from 'react';

const SOSTrackingPage = ({ token }) => {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    const pollLocation = setInterval(async () => {
      try {
        const response = await fetch(`/sos/tracking/${token}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLocation(data.location);
          setStatus(data.status);
        }
      } catch (err) {
        setError('Unable to fetch location');
      }
    }, 5000); // Poll every 5s

    return () => clearInterval(pollLocation);
  }, [token]);

  if (error) return <div className="error">{error}</div>;
  if (status === 'loading') return <div>Loading...</div>;

  return (
    <div className="tracking-view">
      <h2>Live SOS Tracking</h2>
      <div id="map" style={{ width: '100%', height: '400px' }} />
      <p>Last update: {location?.timestamp}</p>
      <p>Accuracy: {location?.accuracy}m</p>
    </div>
  );
};

export default SOSTrackingPage;
```

#### Step 3: Update SOSAlert to Generate Link
```javascript
const handleTriggerSOS = useCallback(async () => {
  // ... existing code ...
  
  const response = await apiCall("/sos/send-alert", "POST", { ... });

  if (response?.data?.incidentId) {
    // Generate tracking link
    const trackingRes = await apiCall('/sos/create-tracking-link', 'POST', {
      incidentId: response.data.incidentId
    });

    // Send tracking URL to contacts
    if (trackingRes?.trackingUrl) {
      setStatusMessage(
        `SOS live. Tracking link sent to contacts: ${trackingRes.trackingUrl}`
      );
    }
  }
}, [...deps]);
```

**Effort: 3 hours | Impact: HIGH - Critical for emergency response**

---

## Feature 5: Retry Logic for Failed SMS

### Backend Implementation

#### Step 1: Add Retry Queue
```javascript
// src/services/sosRetryService.js
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [30000, 60000, 120000] // 30s, 1m, 2m
};

class SosRetryService {
  async sendAlertWithRetry(alertData) {
    let lastError;
    
    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await this.sendAlert(alertData);
      } catch (error) {
        lastError = error;
        console.log(`Alert send failed (attempt ${attempt + 1}), retrying...`);
        
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          await delay(RETRY_CONFIG.delays[attempt]);
        }
      }
    }
    
    throw lastError;
  }

  async sendAlert(alertData) {
    // Send SMS/Call logic
    // If fails, throw error for retry
  }
}

module.exports = new SosRetryService();
```

#### Step 2: Track Retry Status
```javascript
// Update alert log
const retryLog = [{
  attempt: 1,
  timestamp: Date.now(),
  status: 'pending',
  nextRetry: Date.now() + 30000
}];

// In SOSAlert component, display retry attempts
{alertState.log.map((item) => (
  <li key={item.id}>
    <span>{formatTimestamp(item.timestamp)}</span>
    <p>{item.entry}</p>
    {item.retryAttempt && (
      <small>Retry {item.retryAttempt.attempt} of {RETRY_CONFIG.maxRetries}</small>
    )}
  </li>
))}
```

**Effort: 2 hours | Impact: MEDIUM - Reliability improvement**

---

## 📋 IMPLEMENTATION CHECKLIST

### Week 1 Deliverables
- [ ] OTP Verification (4 hrs)
- [ ] Siren Alarm (2 hrs)
- [ ] Photo Capture (3 hrs)
- [ ] Public Tracking Link (3 hrs)
- [ ] Retry Logic (2 hrs)
- **Total: 14 hours**

### Testing Checklist
- [ ] OTP flow: Send, verify, save
- [ ] Alarm: Play, mute, stop
- [ ] Photos: Capture, store, attach to alert
- [ ] Tracking: Generate link, verify access, expire after 24h
- [ ] Retry: Fail, wait, retry successfully

### Files to Modify
1. `src/modules/sos/SOSAlert.js` - Main component updates
2. `src/modules/sos/SOSAlarm.js` - NEW
3. `src/modules/sos/PhotoCapture.js` - NEW
4. `src/modules/sos/SOSTrackingPage.js` - NEW
5. Backend: SOS controllers & services

---

**Next: Create detailed feature specifications for Phase 2 (Advanced Features)**
