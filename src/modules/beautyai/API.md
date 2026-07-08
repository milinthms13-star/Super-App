# Beauty AI API Documentation

## Base URL
```
/api/beauty-ai
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Rate Limits
- Analysis endpoints: 12 requests/minute
- Plan endpoints: 16 requests/minute
- Progress endpoints: 30 requests/minute
- Admin endpoints: 15 requests/minute

---

## Endpoints

### Tips

#### GET `/tips/today`
Get daily beauty tips with optional filtering.

**Query Parameters:**
- `language` (string, optional): Language code (default: 'en')
- `category` (string, optional): Tip category filter
- `timezone` (string, optional): User timezone (default: 'Asia/Kolkata')

**Response:**
```json
{
  "success": true,
  "language": "en",
  "category": "all",
  "timezone": "Asia/Kolkata",
  "dateKey": "2026-07-08",
  "todayTip": {
    "_id": "tip123",
    "title": "Daily Sunscreen Matters",
    "text": "Apply broad-spectrum sunscreen...",
    "category": "skin-care",
    "language": "en",
    "status": "published"
  },
  "tips": [...]
}
```

---

### Usage & Quota

#### GET `/me/usage`
Get current user's usage statistics and feature flags.

**Response:**
```json
{
  "success": true,
  "usage": {
    "tier": "free",
    "analyzeSelfie": {
      "used": 1,
      "limit": 3,
      "remaining": 2,
      "dateKey": "2026-07-08"
    },
    "plan": {
      "used": 2,
      "limit": 3,
      "remaining": 1,
      "dateKey": "2026-07-08"
    },
    "progressLog": {
      "used": 5,
      "limit": 100,
      "remaining": 95,
      "dateKey": "2026-07-08"
    }
  },
  "featureFlags": {
    "selfieAnalysis": true,
    "planGeneration": true,
    "progressTracking": true,
    "premiumReports": false,
    "dermatologistReferral": false
  },
  "apiVersion": "beauty-ai-v1.1",
  "modelVersion": "heuristic-selfie-v2"
}
```

---

### Consent Management

#### GET `/consent/status`
Get user's consent status for different features.

**Response:**
```json
{
  "success": true,
  "planGeneration": {
    "granted": true,
    "grantedAt": "2026-07-01T10:00:00Z"
  },
  "selfieAnalysis": {
    "granted": true,
    "grantedAt": "2026-07-01T10:00:00Z"
  },
  "consentVersion": "v1.0"
}
```

#### POST `/consent/grant`
Grant consent for a specific feature.

**Request Body:**
```json
{
  "consentType": "selfieAnalysis"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent granted successfully",
  "consent": {
    "granted": true,
    "grantedAt": "2026-07-08T10:00:00Z"
  }
}
```

#### POST `/consent/revoke`
Revoke previously granted consent.

**Request Body:**
```json
{
  "consentType": "planGeneration"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Consent revoked successfully"
}
```

---

### Selfie Analysis

#### POST `/analyze-selfie`
Analyze uploaded selfie for skin analysis.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `selfie` (file, required): Image file (max 8MB, JPEG/PNG/WebP)
- `knownSkinType` (string, optional): User's known skin type
- `concern` (string, optional): Primary concern
- `eventMode` (string, optional): Event mode
- `eventType` (string, optional): Event type
- `language` (string, optional): Language preference
- `hairType` (string, optional): Hair type
- `preference` (string, optional): Treatment preference
- `ageRange` (string, optional): Age range
- `selfieConsent` (boolean, required): Consent checkbox
- `budget` (string, optional): Budget level

**Response:**
```json
{
  "success": true,
  "analysis": {
    "skinType": "combination",
    "skinScore": 75,
    "detectedConcerns": ["acne", "oiliness"],
    "selfieSignals": {
      "oiliness": 6,
      "acne": 4,
      "redness": 2,
      "darkSpots": 3
    },
    "recommendations": [
      "Use oil-control cleanser",
      "Apply BHA exfoliant",
      "Use lightweight moisturizer"
    ]
  },
  "selfieId": "selfie123",
  "photoUrl": "https://...",
  "quota": {
    "tier": "free",
    "used": 2,
    "limit": 3,
    "remaining": 1
  }
}
```

#### GET `/selfies/mine`
Get user's saved selfies.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "selfie123",
      "userId": "user123",
      "photoUrl": "https://...",
      "thumbnailUrl": "https://...",
      "analysis": {
        "skinType": "oily",
        "skinScore": 72,
        "detectedConcerns": ["acne"]
      },
      "createdAt": "2026-07-08T10:00:00Z"
    }
  ]
}
```

#### DELETE `/selfies/:id`
Delete a specific selfie.

**Response:**
```json
{
  "success": true,
  "message": "Selfie deleted successfully"
}
```

---

### Beauty Plans

#### POST `/plan`
Generate a personalized beauty plan.

**Request Body:**
```json
{
  "consent": true,
  "language": "en",
  "skinType": "combination",
  "hairType": "normal",
  "concern": "acne",
  "selectedConcerns": ["acne", "oiliness"],
  "eventType": "daily-glow",
  "budget": "medium",
  "preference": "balanced",
  "ageRange": "20-29",
  "selfieSignals": {
    "oiliness": 6,
    "acne": 4
  }
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "title": "7-Day Acne Clear Plan",
    "skinType": "combination",
    "concern": "acne",
    "plan": {
      "morning": ["Cleanser", "Serum", "Moisturizer", "Sunscreen"],
      "evening": ["Double cleanse", "Toner", "Treatment"],
      "night": ["Night cream", "Spot treatment"],
      "weekly": ["Clay mask 2x/week"],
      "lifestyle": ["Stay hydrated", "Clean pillowcases"]
    },
    "products": ["CeraVe Cleanser", "Niacinamide Serum"],
    "safety": {
      "warnings": ["Patch test new products"],
      "severity": "low"
    }
  },
  "quota": {...}
}
```

#### GET `/plans/my`
Get user's saved beauty plans.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "plan123",
      "userId": "user123",
      "title": "7-Day Acne Clear Plan",
      "skinType": "combination",
      "plan": {...},
      "status": "active",
      "createdAt": "2026-07-08T10:00:00Z"
    }
  ]
}
```

#### GET `/plans/:id`
Get a specific beauty plan by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "plan123",
    "title": "7-Day Acne Clear Plan",
    "plan": {...},
    "photoUrl": "https://..."
  }
}
```

#### PUT `/plans/:id`
Update a beauty plan.

**Request Body:**
```json
{
  "notes": "Updated notes",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plan updated successfully",
  "data": {...}
}
```

#### DELETE `/plans/:id`
Delete a beauty plan.

**Response:**
```json
{
  "success": true,
  "message": "Plan deleted successfully"
}
```

#### POST `/plans/:id/duplicate`
Duplicate an existing plan.

**Response:**
```json
{
  "success": true,
  "message": "Plan duplicated successfully",
  "data": {
    "_id": "plan456",
    "title": "7-Day Acne Clear Plan (Copy)"
  }
}
```

#### PUT `/plans/:id/photo`
Update the selfie photo for a plan.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `selfie` (file, required): New selfie image

**Response:**
```json
{
  "success": true,
  "message": "Plan photo updated successfully",
  "photoUrl": "https://..."
}
```

---

### Progress Tracking

#### GET `/progress-log/mine`
Get user's progress logs.

**Query Parameters:**
- `planId` (string, optional): Filter by plan ID

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "_id": "log123",
      "userId": "user123",
      "planId": "plan123",
      "day": 1,
      "done": true,
      "note": "Feeling good!",
      "skinScore": 75,
      "createdAt": "2026-07-08T10:00:00Z"
    }
  ]
}
```

#### POST `/progress-log`
Save a progress log entry.

**Request Body:**
```json
{
  "planId": "plan123",
  "day": 2,
  "done": true,
  "note": "Skin feels better",
  "skinScore": 76
}
```

**Response:**
```json
{
  "success": true,
  "message": "Progress saved successfully",
  "log": {
    "_id": "log456",
    "day": 2,
    "done": true
  }
}
```

---

### Admin Endpoints

All admin endpoints require admin role.

#### GET `/admin/subscription-rules`
Get subscription rules for all tiers.

**Response:**
```json
{
  "success": true,
  "subscriptionRules": {
    "free": {
      "dailyAnalysisLimit": 3,
      "weeklyPlanLengthDays": 7,
      "allowPremiumReport": false,
      "allowDermatologistReferral": false
    },
    "premium": {
      "dailyAnalysisLimit": 20,
      "weeklyPlanLengthDays": 30,
      "allowPremiumReport": true,
      "allowDermatologistReferral": true
    }
  }
}
```

#### PUT `/admin/subscription-rules`
Update subscription rules.

**Request Body:**
```json
{
  "free": {
    "dailyAnalysisLimit": 5,
    "weeklyPlanLengthDays": 7
  },
  "premium": {
    "dailyAnalysisLimit": 25,
    "weeklyPlanLengthDays": 30
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription rules updated",
  "subscriptionRules": {...}
}
```

#### GET `/admin/alerts`
Get system alerts and operational events.

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "_id": "alert123",
      "type": "quota_warning",
      "severity": "warning",
      "message": "User approaching quota limit",
      "userId": "user456",
      "createdAt": "2026-07-08T10:00:00Z"
    }
  ]
}
```

#### GET `/admin/stats`
Get platform statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 1250,
    "activeUsers": 487,
    "totalPlans": 3421,
    "totalSelfies": 5678,
    "popularConcerns": [
      {"concern": "acne", "count": 456},
      {"concern": "aging", "count": 321}
    ],
    "recentActivity": {
      "last24h": {
        "plans": 45,
        "selfies": 67,
        "progressLogs": 123
      }
    }
  }
}
```

#### POST `/admin/tips`
Create a new beauty tip.

**Request Body:**
```json
{
  "title": "New Beauty Tip",
  "text": "Tip content here...",
  "category": "skin-care",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tip created successfully",
  "tip": {
    "_id": "tip789",
    "title": "New Beauty Tip",
    "status": "published"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "requestId": "req-123"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **413 Payload Too Large**: File size exceeds limit
- **429 Too Many Requests**: Rate limit or quota exceeded
- **500 Internal Server Error**: Server error

### Quota Exceeded Response

```json
{
  "success": false,
  "message": "Daily analysis limit reached",
  "quota": {
    "tier": "free",
    "used": 3,
    "limit": 3,
    "remaining": 0,
    "nextAllowedAt": "2026-07-09T00:00:00Z"
  }
}
```

---

## Webhooks

The Beauty AI module can emit events to configured webhooks:

### Events
- `selfie.analyzed`: Selfie analysis completed
- `plan.generated`: Beauty plan generated
- `progress.logged`: Progress entry saved
- `quota.exceeded`: User exceeded quota
- `consent.changed`: Consent status changed

### Webhook Payload
```json
{
  "event": "plan.generated",
  "timestamp": "2026-07-08T10:00:00Z",
  "userId": "user123",
  "data": {
    "planId": "plan123",
    "skinType": "combination",
    "concerns": ["acne"]
  }
}
```

---

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const beautyAI = axios.create({
  baseURL: 'https://api.example.com/api/beauty-ai',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Fetch tips
const tips = await beautyAI.get('/tips/today');

// Generate plan
const plan = await beautyAI.post('/plan', {
  consent: true,
  skinType: 'combination',
  concern: 'acne',
  budget: 'medium'
});

// Save progress
const progress = await beautyAI.post('/progress-log', {
  planId: 'plan123',
  day: 1,
  done: true
});
```

### Python

```python
import requests

BASE_URL = 'https://api.example.com/api/beauty-ai'
headers = {'Authorization': f'Bearer {token}'}

# Fetch tips
response = requests.get(f'{BASE_URL}/tips/today', headers=headers)
tips = response.json()

# Generate plan
response = requests.post(f'{BASE_URL}/plan', 
    headers=headers,
    json={
        'consent': True,
        'skinType': 'combination',
        'concern': 'acne'
    })
plan = response.json()
```

---

## Testing

### Using cURL

```bash
# Get tips
curl -X GET "https://api.example.com/api/beauty-ai/tips/today" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate plan
curl -X POST "https://api.example.com/api/beauty-ai/plan" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "consent": true,
    "skinType": "combination",
    "concern": "acne",
    "budget": "medium"
  }'

# Upload selfie
curl -X POST "https://api.example.com/api/beauty-ai/analyze-selfie" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "selfie=@/path/to/image.jpg" \
  -F "selfieConsent=true" \
  -F "skinType=combination"
```

---

## Versioning

API version is included in responses:
```json
{
  "apiVersion": "beauty-ai-v1.1",
  "modelVersion": "heuristic-selfie-v2"
}
```

Breaking changes will result in new API versions (e.g., `/api/v2/beauty-ai`).

---

## Support

For API support:
- Documentation: [Link to docs]
- Support email: support@example.com
- GitHub Issues: [Link to repo]

---

## Changelog

### v1.1 (Current)
- Added offline support indicators
- Enhanced consent management
- Improved error responses
- Added admin stats endpoint
- Plan duplication support

### v1.0
- Initial API release
- Basic CRUD operations
- Selfie analysis
- Plan generation
- Progress tracking
