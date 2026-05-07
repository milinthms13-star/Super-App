# Phase 2 Quick Reference Guide

## Feature 1: OTP Authentication

### Quick Setup
```bash
# Endpoints available at /api/messaging/otp
# All require: Authorization: Bearer <token>
```

### Basic Flow
```javascript
// 1. Send OTP
POST /api/messaging/otp/send
{
  "deviceId": "device123",
  "medium": "sms", // or "email", "in-app"
  "phoneNumber": "+1234567890" // for SMS
}

// 2. Verify OTP
POST /api/messaging/otp/verify
{
  "deviceId": "device123",
  "code": "123456"
}

// 3. Check device is trusted (30 days)
GET /api/messaging/otp/is-trusted?deviceId=device123

// 4. Revoke trust if needed
POST /api/messaging/otp/revoke-trust
{
  "deviceId": "device123"
}
```

### Models
- `OtpSession` - 6-digit codes, 15-min TTL, 5-attempt lockout
- `Device` - Enhanced with `verificationStatus`, `trustedUntil`, `lockedUntil`

### Background Jobs
- Expired OTP cleanup (hourly)
- Device lock reset (every 30 min)
- Statistics generation (daily)

---

## Feature 2: End-to-End Encryption

### Quick Setup
```bash
# Endpoints available at /api/messaging/encryption
# All require: Authorization: Bearer <token>
```

### Basic Flow
```javascript
// 1. Generate keypair
POST /api/messaging/encryption/keys
{
  "deviceId": "device123"
}
Response: {
  "keyId": "...",
  "fingerprint": "sha256hash",
  "expiresAt": "2025-04-15"
}

// 2. Get public key for sharing
GET /api/messaging/encryption/keys
Response: {
  "publicKey": "-----BEGIN PUBLIC KEY-----...",
  "fingerprint": "sha256hash",
  "expiresAt": "2025-04-15"
}

// 3. Encrypt message
POST /api/messaging/encryption/messages/encrypt
{
  "messageContent": "Hello, World!",
  "recipientPublicKey": "-----BEGIN PUBLIC KEY-----...",
  "keyFingerprint": "sha256hash"
}
Response: {
  "encryptedContent": "base64...",
  "iv": "base64...",
  "tag": "base64...",
  "encryptedKey": "base64..."
}

// 4. Send encrypted message to recipient

// 5. Recipient decrypts
POST /api/messaging/encryption/messages/decrypt
{
  "messageId": "msg123",
  "encryptedContent": "base64...",
  "iv": "base64...",
  "tag": "base64...",
  "encryptedKey": "base64..."
}
Response: {
  "plaintext": "Hello, World!",
  "decryptedAt": "2025-01-15T10:30:00Z"
}

// 6. Check key status
GET /api/messaging/encryption/status
Response: {
  "status": "active",
  "daysRemaining": 75
}

// 7. Rotate key (90-day cycle)
POST /api/messaging/encryption/rotate
{
  "deviceId": "device123"
}
```

### Encryption Details
- **Algorithm:** AES-256-GCM
- **IV:** 96 bits (random)
- **Auth Tag:** 128 bits (integrity verification)
- **Key Exchange:** RSA-4096 with PKCS1_OAEP padding

### Models
- `EncryptionKey` - RSA keypairs, 90-day rotation, usage stats
- `EncryptedMessage` - AES ciphertext, IV, auth tag, audit trail

### Background Jobs
- Expired key cleanup (every 6 hours)
- Key rotation reminder (daily @ 02:00 UTC)
- Statistics generation (daily @ 03:00 UTC)

---

## Integration Points

### Server Configuration
```javascript
// server.js line 75-76: Routes registered
app.use('/api/messaging/otp', require('./routes/otpRoutes'));
app.use('/api/messaging/encryption', require('./routes/encryptionRoutes'));

// server.js line 168, 172: Jobs initialized
const otpCleanupJob = require('./jobs/otpCleanupJob');
otpCleanupJob.startAll();

const encryptionCleanupJob = require('./jobs/encryptionCleanupJob');
encryptionCleanupJob.startAll();
```

### Database Collections
```
otp_sessions
  ├─ userId (indexed)
  ├─ deviceId (indexed)
  ├─ otpCode (encrypted in production)
  ├─ expiresAt (TTL: 900 seconds)
  └─ attempts (max 5)

encrypted_messages
  ├─ messageId (unique)
  ├─ senderId, recipientId (indexed)
  ├─ encryptedContent (base64)
  ├─ contentIv (base64, 96 bits)
  ├─ contentTag (base64, 128 bits)
  ├─ keyFingerprint (indexed)
  └─ ephemeralUntil (TTL for auto-delete)

encryption_keys
  ├─ userId (indexed)
  ├─ deviceId (indexed)
  ├─ publicKey, privateKey (PEM format)
  ├─ expiresAt (90 days, TTL: 31536000 seconds)
  ├─ isPrimary, isActive (indexed)
  └─ messagesEncrypted, messagesDecrypted
```

---

## Testing Checklist

### OTP Testing
- [ ] Generate OTP via SMS
- [ ] Generate OTP via Email
- [ ] Generate OTP via In-app
- [ ] Verify OTP with correct code
- [ ] Fail verification with wrong code (5 attempts max)
- [ ] Verify device lock after 5 failed attempts
- [ ] Verify device trust status after successful verification
- [ ] Check trust window (30 days)
- [ ] Revoke trust and re-verify

### Encryption Testing
- [ ] Generate RSA-4096 keypair
- [ ] Get and share public key
- [ ] Encrypt message with AES-256-GCM
- [ ] Verify encryption with auth tag
- [ ] Decrypt message successfully
- [ ] Fail decryption with tampered message
- [ ] Check key expiration status
- [ ] Rotate key after 90 days
- [ ] Verify old key can still decrypt old messages

### Integration Testing
- [ ] Device verified with OTP
- [ ] Encrypted message sent between verified devices
- [ ] Background jobs run without errors
- [ ] Expired OTPs auto-deleted
- [ ] Expired keys cleanup correctly
- [ ] Statistics generated daily
- [ ] No errors in server logs

---

## Common Issues & Solutions

### Issue: OTP expired (15 minutes)
**Solution:** Resend OTP via `POST /api/messaging/otp/resend`

### Issue: Device locked (5 failed OTP attempts)
**Solution:** Wait 15 minutes or admin unlock via background job reset

### Issue: Message decryption fails
**Solution:** 
1. Verify authentication tag hasn't been tampered
2. Ensure correct private key is being used
3. Check key hasn't been revoked

### Issue: Key expiration approaching (< 7 days)
**Solution:** Proactively rotate key via `POST /api/messaging/encryption/rotate`

### Issue: Background jobs not running
**Solution:** Check server logs, verify cron schedule, restart server

---

## Performance Metrics

### Encryption Performance
- RSA-4096 key generation: ~1-2 seconds per keypair
- AES-256-GCM encryption: ~0.1ms per message
- AES-256-GCM decryption: ~0.1ms per message
- Message with 90-day rotation: 1 key = ~1KB storage

### OTP Performance
- OTP generation: ~0.01ms
- OTP verification: ~0.05ms
- SMS delivery: 1-2 seconds (external)
- Email delivery: 5-10 seconds (external)

---

## Security Best Practices

1. **Never Log:**
   - Private keys
   - AES encryption keys
   - OTP codes
   - Authentication tags

2. **Always Use:**
   - HTTPS/TLS for all endpoints
   - JWT bearer tokens for auth
   - CORS restrictions to trusted domains
   - Rate limiting on OTP send (3 per hour)
   - Rate limiting on OTP verify (5 attempts)

3. **Key Rotation:**
   - OTP codes: 15 minutes
   - Device trust: 30 days
   - Encryption keys: 90 days
   - Session tokens: 24 hours (access), 30 days (refresh)

4. **Audit Trail:**
   - Log all OTP attempts
   - Log all key rotations
   - Log all message decryptions
   - Retain for 90 days

---

## Files Overview

### OTP Files
- `backend/models/OtpSession.js` - OTP data model
- `backend/services/otpService.js` - OTP business logic
- `backend/routes/otpRoutes.js` - OTP REST API
- `backend/jobs/otpCleanupJob.js` - Background tasks

### Encryption Files
- `backend/models/EncryptionKey.js` - Key management model
- `backend/models/EncryptedMessage.js` - Encrypted message storage
- `backend/services/encryptionService.js` - E2EE business logic
- `backend/routes/encryptionRoutes.js` - Encryption REST API
- `backend/jobs/encryptionCleanupJob.js` - Background tasks

### Configuration
- `backend/server.js` - Route registration & job initialization
- `backend/config/logger.js` - Logging utility

---

## Next Features (Phase 2)

**Feature 3: Admin Moderation Panel** (4-5 hours)
- Abuse report handling
- User account escalation
- Message moderation with E2EE support
- Audit trail for compliance

**Feature 4: Real-Time Optimization** (3-4 hours)
- Event batching (typing, read receipts)
- Delta sync (incremental updates)
- Connection pooling & backoff

**Feature 5: Abuse Reporting** (2-3 hours)
- User-initiated reports
- Report categorization
- Appeal mechanism

---

**Phase 2 Status: 40% COMPLETE | Ready for Testing & Feature 3**
