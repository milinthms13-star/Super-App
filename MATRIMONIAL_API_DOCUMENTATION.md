# Matrimonial Module - API Documentation

Complete API reference for all implemented endpoints (Phases 1-3)

---

## Authentication

All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Phase 1 APIs

### Photo Gallery

#### Upload Photos
```
POST /api/matrimonial/photos/upload
Content-Type: multipart/form-data

Body:
- photos: File[] (max 10 files, 10MB each)
- captions: string[] (JSON array)
- photoTypes: string[] (JSON array)
- isPrivate: boolean
- visibleTo: enum('everyone', 'premium', 'connected', 'none')

Response: {
  success: true,
  data: Photo[]
}
```

#### Get My Photos
```
GET /api/matrimonial/photos

Response: {
  success: true,
  data: Photo[]
}
```

#### Set Primary Photo
```
PATCH /api/matrimonial/photos/:photoId/set-primary

Response: {
  success: true,
  data: Photo
}
```

#### Delete Photo
```
DELETE /api/matrimonial/photos/:photoId

Response: {
  success: true
}
```

### Enhanced Messaging

#### Send Image
```
POST /api/matrimonial/messages/image
Content-Type: multipart/form-data

Body:
- image: File
- toProfileId: string

Response: {
  success: true,
  data: Message
}
```

#### Send Voice Note
```
POST /api/matrimonial/messages/voice
Content-Type: multipart/form-data

Body:
- voiceNote: File (audio/webm)
- toProfileId: string

Response: {
  success: true,
  data: Message
}
```

#### Add Reaction
```
POST /api/matrimonial/messages/:messageId/react

Body: {
  emoji: string
}

Response: {
  success: true
}
```

### Success Stories

#### Get Public Stories
```
GET /api/matrimonial/success-stories/public?page=1&limit=12&featured=true

Response: {
  success: true,
  data: SuccessStory[],
  meta: {
    page, limit, total, pages
  }
}
```

#### Submit Story
```
POST /api/matrimonial/success-stories/submit
Content-Type: multipart/form-data

Body:
- groomProfileId, brideProfileId, groomName, brideName
- title, story, marriageDate, location
- photos: File[] (max 5)
- consentGiven: 'true'

Response: {
  success: true,
  data: SuccessStory
}
```

### Notifications

#### Get Preferences
```
GET /api/matrimonial/notifications/preferences

Response: {
  success: true,
  data: NotificationPreference
}
```

#### Update Preferences
```
PUT /api/matrimonial/notifications/preferences

Body: {
  email: { enabled, newMatch, interestReceived, ... },
  sms: { enabled, ... },
  whatsapp: { enabled, ... },
  quietHours: { enabled, startTime, endTime }
}

Response: {
  success: true,
  data: NotificationPreference
}
```

### Saved Searches

#### Get Saved Searches
```
GET /api/matrimonial/saved-searches

Response: {
  success: true,
  data: SavedSearch[]
}
```

#### Create Saved Search
```
POST /api/matrimonial/saved-searches

Body: {
  name: string,
  description: string,
  filters: { ageMin, ageMax, religion, ... },
  notifyOnNewMatches: boolean,
  notificationFrequency: enum('instant', 'daily', 'weekly')
}

Response: {
  success: true,
  data: SavedSearch
}
```

---

## Phase 2 APIs

### Verification

#### Upload Document
```
POST /api/matrimonial/verification/upload-document
Content-Type: multipart/form-data

Body:
- document: File
- documentType: enum('aadhaar', 'pan', 'passport', ...)
- documentNumber: string (optional)

Response: {
  success: true,
  data: VerificationDocument
}
```

#### Upload Video Profile
```
POST /api/matrimonial/verification/upload-video
Content-Type: multipart/form-data

Body:
- video: File (max 20MB)

Response: {
  success: true,
  data: VerificationDocument
}
```

#### Verify LinkedIn
```
POST /api/matrimonial/verification/verify-linkedin

Body: {
  linkedInUrl: string
}

Response: {
  success: true,
  data: { success, profileExists, nameMatches }
}
```

#### Get Trust Score
```
GET /api/matrimonial/verification/trust-score

Response: {
  success: true,
  data: {
    overallScore: number (0-100),
    level: enum('bronze', 'silver', 'gold', 'platinum'),
    verifications: {
      email: { verified, verifiedAt, score },
      phone: { verified, verifiedAt, score },
      ...
    },
    badges: string[]
  }
}
```

#### Get Documents
```
GET /api/matrimonial/verification/documents

Response: {
  success: true,
  data: VerificationDocument[]
}
```

#### Admin: Get Pending Verifications
```
GET /api/matrimonial/verification/admin/pending

Response: {
  success: true,
  data: VerificationDocument[]
}
```

#### Admin: Verify/Reject Document
```
PATCH /api/matrimonial/verification/admin/:documentId/verify

Body: {
  action: enum('verify', 'reject'),
  rejectionReason: string (if reject),
  extractedData: object (if verify)
}

Response: {
  success: true,
  data: VerificationDocument
}
```

---

## Phase 3 APIs

### Astrology

#### Create Kundali
```
POST /api/matrimonial/astrology/kundali

Body: {
  dateOfBirth: string (YYYY-MM-DD),
  timeOfBirth: string (HH:mm),
  placeOfBirth: string,
  latitude: number,
  longitude: number
}

Response: {
  success: true,
  data: {
    kundali: {
      ascendant, moonSign, sunSign, nakshatra,
      planets: { sun, moon, mars, ... }
    },
    doshas: [ { name, severity, description, remedies } ]
  }
}
```

#### Get My Kundali
```
GET /api/matrimonial/astrology/kundali

Response: {
  success: true,
  data: Horoscope
}
```

#### Get Profile Kundali
```
GET /api/matrimonial/astrology/kundali/:profileId

Response: {
  success: true,
  data: Horoscope (if public)
}
```

#### Calculate Guna Milan
```
POST /api/matrimonial/astrology/guna-milan

Body: {
  otherProfileId: string
}

Response: {
  success: true,
  data: {
    totalPoints: number (0-36),
    maxPoints: 36,
    percentage: number,
    compatibility: enum('Poor', 'Average', 'Good', 'Excellent'),
    recommendation: string,
    gunas: {
      varna: { points, max, name },
      vashya: { points, max, name },
      tara: { points, max, name },
      yoni: { points, max, name },
      graha: { points, max, name },
      gana: { points, max, name },
      bhakoot: { points, max, name },
      nadi: { points, max, name }
    }
  }
}
```

#### Get Auspicious Dates
```
GET /api/matrimonial/astrology/auspicious-dates?month=7&year=2026&purpose=marriage

Response: {
  success: true,
  data: [
    {
      date: string,
      day: string,
      tithi: string,
      nakshatra: string,
      muhurats: [ { start, end, name } ],
      suitability: number (0-100)
    }
  ]
}
```

#### Download Kundali PDF
```
GET /api/matrimonial/astrology/kundali/download-pdf

Response: PDF file (application/pdf)
```

---

## Data Models

### Photo
```typescript
{
  _id: ObjectId,
  profileId: ObjectId,
  photoUrl: string,
  thumbnailUrl: string,
  caption: string,
  photoType: enum,
  order: number,
  isPrimary: boolean,
  isVerified: boolean,
  verificationStatus: enum,
  metadata: { fileSize, mimeType, width, height },
  createdAt: Date
}
```

### TrustScore
```typescript
{
  profileId: ObjectId,
  overallScore: number (0-100),
  level: enum('bronze', 'silver', 'gold', 'platinum'),
  verifications: {
    email: { verified, verifiedAt, score },
    phone: { verified, verifiedAt, score },
    photoId: { verified, verifiedAt, documentType, score },
    income: { verified, verifiedAt, documentType, score },
    employment: { verified, verifiedAt, method, score },
    address: { verified, verifiedAt, documentType, score },
    education: { verified, verifiedAt, documentType, score },
    videoProfile: { verified, verifiedAt, score }
  },
  badges: string[],
  lastCalculated: Date
}
```

### Horoscope
```typescript
{
  profileId: ObjectId,
  birthDetails: {
    dateOfBirth: Date,
    timeOfBirth: string,
    placeOfBirth: string,
    latitude: number,
    longitude: number
  },
  kundali: {
    ascendant: string,
    moonSign: string,
    sunSign: string,
    nakshatra: string,
    planets: {
      sun: { sign, house, degree },
      moon: { sign, house, degree },
      // ... all 9 planets
    }
  },
  doshas: [
    {
      name: string,
      severity: enum('None', 'Low', 'Medium', 'High'),
      description: string,
      remedies: string[]
    }
  ],
  isPublic: boolean,
  createdAt: Date
}
```

---

## Error Responses

All APIs return errors in this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

**Total Endpoints Implemented:** 35+  
**Documentation Version:** 1.0  
**Last Updated:** July 15, 2026
