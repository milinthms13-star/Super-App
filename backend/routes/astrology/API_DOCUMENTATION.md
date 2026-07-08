# Astrology Module API Documentation

## Overview
Complete REST API documentation for the AstroNila astrology module, including user profiles, consultations, payments, and analytics.

**Base URL**: `/api/astrology`

**Authentication**: Most endpoints require JWT authentication via Bearer token in the `Authorization` header.

---

## Table of Contents
1. [Profile Management](#profile-management)
2. [Consultation Booking](#consultation-booking)
3. [Payment Operations](#payment-operations)
4. [Analytics & Reporting](#analytics--reporting)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Profile Management

### Get User Profile
Retrieve the authenticated user's astrology profile.

**Endpoint**: `GET /api/astrology/profile`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "sign": "aries",
    "birthDate": "1990-01-01",
    "birthTime": "10:30 AM",
    "birthPlace": "Mumbai, India",
    "birthTimezone": "Asia/Kolkata",
    "nakshatra": "Ashwini",
    "rashi": "Mesha",
    "lagna": "Mesha",
    "gender": "male",
    "preferences": {
      "receiveDailyHoroscope": true,
      "favoriteTopics": ["career", "finance"]
    },
    "notifications": {
      "dailyHoroscope": true,
      "goodMuhurtam": true,
      "festivalReminders": true,
      "dashaAlerts": true
    },
    "familyProfiles": [],
    "savedReadings": [],
    "kundliHistory": [],
    "compatibilityHistory": [],
    "updatedAt": "2026-07-07T10:00:00.000Z"
  }
}
```

---

### Update User Profile
Update the authenticated user's astrology profile.

**Endpoint**: `PUT /api/astrology/profile`

**Authentication**: Required

**Request Body**:
```json
{
  "sign": "taurus",
  "birthDate": "1990-01-01",
  "birthTime": "10:30 AM",
  "birthPlace": "Delhi, India",
  "birthTimezone": "Asia/Kolkata",
  "nakshatra": "Krittika",
  "rashi": "Vrishabha",
  "lagna": "Vrishabha",
  "gender": "female",
  "preferences": {
    "receiveDailyHoroscope": true,
    "favoriteTopics": ["love", "career"]
  },
  "notifications": {
    "dailyHoroscope": true,
    "goodMuhurtam": true,
    "festivalReminders": true,
    "dashaAlerts": true
  },
  "familyProfiles": [
    {
      "name": "John Doe",
      "relation": "Spouse",
      "sign": "gemini",
      "birthDate": "1992-05-15",
      "birthTime": "08:00 AM"
    }
  ]
}
```

**Validation Rules**:
- `sign`: Required, 3-20 characters, valid zodiac sign
- `birthDate`: Optional, ISO8601 date format
- `birthTime`: Optional, format: HH:MM AM/PM
- `birthPlace`: Optional, 2-120 characters
- `gender`: Optional, lowercase string
- `familyProfiles`: Optional array, max 20 profiles

**Response**: Same as GET /profile with updated data

**Error Responses**:
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### Delete User Profile
Delete the authenticated user's astrology profile.

**Endpoint**: `DELETE /api/astrology/profile`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

---

## Consultation Booking

### List Consultants
Get all available astrology consultants.

**Endpoint**: `GET /api/astrology/consultations/consultants`

**Authentication**: Not Required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "consultant-123",
      "name": "Madhav Acharya",
      "specialty": "Kerala Jathakam, Matchmaking, Remedies",
      "rate": "₹1,200 / 15 min",
      "amountInr": 1200,
      "availability": "Today 4:00 PM - 7:00 PM",
      "availableSlots": [
        {
          "id": "slot-1",
          "label": "Today 4:00 PM",
          "date": "2026-07-07"
        }
      ],
      "languages": ["English", "Hindi", "Malayalam"],
      "rating": 4.8,
      "bio": "Expert in Vedic astrology with 15 years of experience..."
    }
  ]
}
```

---

### Get Consultant Details
Get details of a specific consultant.

**Endpoint**: `GET /api/astrology/consultations/consultants/:consultantId`

**Authentication**: Required

**URL Parameters**:
- `consultantId`: Consultant ID (required)

**Response**: Same as single consultant object from list endpoint

---

### Create Consultation Booking
Book a consultation with an astrologer.

**Endpoint**: `POST /api/astrology/consultations/book`

**Authentication**: Required

**Rate Limiting**: 5 requests per minute per user

**Request Body**:
```json
{
  "consultantId": "consultant-123",
  "slotId": "slot-1",
  "preferredDate": "2026-07-07T16:00:00.000Z",
  "notes": "Want to discuss career prospects"
}
```

**Headers**:
- `X-Idempotency-Key`: Optional, prevents duplicate bookings

**Validation**:
- `consultantId`: Required, 3-80 characters
- `slotId`: Required, 2-80 characters
- `preferredDate`: Optional, ISO8601 format, cannot be in the past
- `notes`: Optional, max 280 characters

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "userId": "user123",
    "consultantId": "consultant-123",
    "consultantName": "Madhav Acharya",
    "slotId": "slot-1",
    "slot": "Today 4:00 PM",
    "preferredDate": "2026-07-07T16:00:00.000Z",
    "notes": "Want to discuss career prospects",
    "status": "pending_payment",
    "confirmationCode": "ASTRO-ABC123-456",
    "amountInr": 1200,
    "currency": "INR",
    "paymentStatus": "pending",
    "createdAt": "2026-07-07T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid data or slot unavailable
- `409 Conflict`: Slot already booked
- `429 Too Many Requests`: Rate limit exceeded

---

### Get User's Bookings
Get consultation booking history for authenticated user.

**Endpoint**: `GET /api/astrology/consultations`

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-123",
      "consultantName": "Madhav Acharya",
      "slot": "Today 4:00 PM",
      "preferredDate": "2026-07-07T16:00:00.000Z",
      "status": "confirmed",
      "paymentStatus": "completed",
      "confirmationCode": "ASTRO-ABC123-456",
      "amountInr": 1200,
      "createdAt": "2026-07-07T10:00:00.000Z"
    }
  ]
}
```

---

### Update Booking Status
Update the status of a consultation booking.

**Endpoint**: `PATCH /api/astrology/consultations/:bookingId/status`

**Authentication**: Required

**Authorization**: 
- Booking owner can only cancel own bookings
- Consultants can update their consultation statuses
- Admins can update any booking

**URL Parameters**:
- `bookingId`: Booking ID (required)

**Request Body**:
```json
{
  "status": "confirmed"
}
```

**Valid Status Values**:
- `confirmed` - Booking is confirmed
- `pending` - Awaiting confirmation
- `pending_payment` - Awaiting payment
- `completed` - Consultation completed
- `cancelled` - Booking cancelled

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "status": "confirmed",
    ...
  }
}
```

---

### Get Consultant Bookings
Get all bookings for a specific consultant (consultant/admin only).

**Endpoint**: `GET /api/astrology/consultations/consultant-bookings`

**Authentication**: Required

**Authorization**: Consultant or Admin only

**Query Parameters**:
- `consultantId`: Optional, filter by consultant ID (admins only)

**Response**: Array of bookings (same format as user bookings)

---

### Get Consultant Earnings
Get earnings summary for a consultant.

**Endpoint**: `GET /api/astrology/consultations/consultant-earnings`

**Authentication**: Required

**Authorization**: Consultant or Admin only

**Query Parameters**:
- `consultantId`: Optional, filter by consultant ID (admins only)

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 50000,
    "month": 12000,
    "bookings": 42
  }
}
```

---

## Payment Operations

### Create Payment Order
Create a Razorpay payment order for a booking.

**Endpoint**: `POST /api/astrology/payments/:bookingId/create-order`

**Authentication**: Required

**Authorization**: Booking owner only

**Rate Limiting**: 10 requests per minute

**URL Parameters**:
- `bookingId`: Booking ID (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "bookingId": "booking-123",
    "orderId": "order_Abc123xyz",
    "amountInr": 1200,
    "currency": "INR",
    "keyId": "rzp_live_xxxxx",
    "reused": false
  }
}
```

**Notes**:
- Returns existing order if already created and pending
- Validates booking status (cannot create order for cancelled bookings)
- Amount validation (minimum ₹100)

---

### Verify Payment
Verify Razorpay payment signature.

**Endpoint**: `POST /api/astrology/payments/:bookingId/verify`

**Authentication**: Required

**Authorization**: Booking owner only

**Request Body**:
```json
{
  "orderId": "order_Abc123xyz",
  "paymentId": "pay_Xyz789abc",
  "signature": "signature_hash_here"
}
```

**Validation**:
- `orderId`: Optional if already in booking
- `paymentId`: Required, 5-120 characters
- `signature`: Required, hex digest 16-256 characters

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "status": "confirmed",
    "paymentStatus": "completed",
    "paymentOrderId": "order_Abc123xyz",
    "paymentId": "pay_Xyz789abc",
    "paymentDate": "2026-07-07T10:30:00.000Z",
    ...
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid signature or missing data
- `409 Conflict`: Payment already completed with different reference

---

### Get Payment Status
Check payment status for a booking.

**Endpoint**: `GET /api/astrology/payments/:bookingId/status`

**Authentication**: Required

**Authorization**: Booking owner only

**Response**:
```json
{
  "success": true,
  "data": {
    "bookingId": "booking-123",
    "paymentStatus": "completed",
    "bookingStatus": "confirmed",
    "paymentOrderId": "order_Abc123xyz",
    "paymentId": "pay_Xyz789abc",
    "amountInr": 1200
  }
}
```

---

### Request Refund
Request a refund for a completed payment.

**Endpoint**: `POST /api/astrology/payments/:bookingId/refund`

**Authentication**: Required

**Authorization**: Booking owner, Consultant, or Admin

**Request Body**:
```json
{
  "reason": "Consultant cancelled the session"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "refundId": "rfnd_Xyz123abc",
    "refundStatus": "processing",
    "refundAmount": 1200,
    "booking": { ... }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Payment not completed or no payment ID
- `409 Conflict`: Refund already initiated

---

### Download Receipt
Download PDF receipt for a completed payment.

**Endpoint**: `GET /api/astrology/payments/:bookingId/receipt`

**Authentication**: Required

**Authorization**: Booking owner only

**Response**: PDF file (application/pdf)

**Headers**:
- `Content-Type`: application/pdf
- `Content-Disposition`: attachment; filename="receipt-{bookingId}.pdf"

**Error Responses**:
- `400 Bad Request`: Receipt only available for completed payments

---

### Razorpay Webhook
Handle Razorpay webhook events.

**Endpoint**: `POST /api/astrology/payments/webhook/razorpay`

**Authentication**: Webhook signature validation

**Headers**:
- `X-Razorpay-Signature`: Required, HMAC signature
- `X-Razorpay-Event-Id`: Optional, event ID

**Request Body**: Razorpay webhook payload

**Supported Events**:
- `payment.captured` - Payment successfully captured
- `payment.authorized` - Payment authorized
- `payment.failed` - Payment failed
- `order.paid` - Order marked as paid
- `refund.processed` - Refund processed

**Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Security**:
- Validates webhook signature using HMAC-SHA256
- Rejects webhooks with invalid signatures
- Implements idempotency to prevent duplicate processing
- Logs all webhook events for audit

---

## Analytics & Reporting

### Get Analytics Dashboard
Get analytics metrics for admin dashboard.

**Endpoint**: `GET /api/astrology/analytics/dashboard`

**Authentication**: Required

**Authorization**: Admin only

**Query Parameters**:
- `period`: Optional, values: week|month|quarter|year|total (default: month)

**Response**:
```json
{
  "success": true,
  "data": {
    "totalBookings": 150,
    "completedBookings": 120,
    "cancelledBookings": 10,
    "totalRevenue": 180000,
    "averageRating": 4.7,
    "topConsultants": [
      {
        "consultantId": "consultant-123",
        "name": "Madhav Acharya",
        "bookings": 45,
        "revenue": 54000
      }
    ],
    "bookingTrends": [
      {
        "date": "2026-07-01",
        "bookings": 12
      }
    ],
    "userRetention": 75
  }
}
```

---

### Get Operational Alerts
Get operational alerts and warnings.

**Endpoint**: `GET /api/astrology/analytics/alerts`

**Authentication**: Required

**Authorization**: Admin only

**Query Parameters**:
- `lookbackHours`: Optional, integer 1-240 (default: 24)

**Response**:
```json
{
  "success": true,
  "data": {
    "windowHours": 24,
    "generatedAt": "2026-07-07T10:00:00.000Z",
    "signals": {
      "paymentVerificationFailures": {
        "count": 2,
        "severity": "warn"
      },
      "slotConflictSpikes": {
        "count": 0,
        "severity": "info"
      },
      "webhookErrors": {
        "count": 1,
        "severity": "critical"
      }
    }
  }
}
```

---

### Download Analytics Report
Download analytics report as PDF or CSV.

**Endpoint**: `GET /api/astrology/analytics/report`

**Authentication**: Required

**Authorization**: Admin only

**Query Parameters**:
- `period`: Optional, values: week|month|quarter|year|total (default: month)
- `format`: Optional, values: pdf|csv (default: pdf)

**Response**: File download (PDF or CSV)

**Headers**:
- `Content-Type`: application/pdf or text/csv
- `Content-Disposition`: attachment; filename="astrology-report-{period}.{format}"

---

### Get Bookings by Consultant
Get booking statistics grouped by consultant.

**Endpoint**: `GET /api/astrology/analytics/bookings-by-consultant`

**Authentication**: Required

**Authorization**: Admin only

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "consultantId": "consultant-123",
      "consultantName": "Madhav Acharya",
      "totalBookings": 45,
      "completedBookings": 40,
      "cancelledBookings": 2,
      "totalRevenue": 54000,
      "completedRevenue": 48000
    }
  ]
}
```

---

### Get Revenue Trends
Get revenue trends over time.

**Endpoint**: `GET /api/astrology/analytics/revenue-trends`

**Authentication**: Required

**Authorization**: Admin only

**Query Parameters**:
- `period`: Optional, values: week|month|quarter|year (default: month)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-07-01",
      "bookings": 12,
      "revenue": 14400,
      "completedRevenue": 12000
    },
    {
      "date": "2026-07-02",
      "bookings": 15,
      "revenue": 18000,
      "completedRevenue": 15600
    }
  ]
}
```

---

### Get User Statistics
Get user engagement statistics.

**Endpoint**: `GET /api/astrology/analytics/user-stats`

**Authentication**: Required

**Authorization**: Admin only

**Response**:
```json
{
  "success": true,
  "data": {
    "totalProfiles": 500,
    "profilesWithBirthDetails": 450,
    "profilesWithFamilyMembers": 200,
    "profilesWithSavedReadings": 350,
    "usersWithBookings": 180,
    "completionRate": 90
  }
}
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "birthDate",
      "message": "Invalid date format"
    }
  ]
}
```

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate booking, etc.)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Rate Limiting

### Limits by Endpoint Category
- **Booking Creation**: 5 requests per minute per user
- **Payment Operations**: 10 requests per minute per user
- **Status Updates**: 10 requests per minute per user
- **Analytics**: 30 requests per minute per admin
- **General**: 100 requests per minute per user

### Rate Limit Headers
Response includes rate limit information:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1657184400
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

---

## Authentication

### JWT Token Format
Include JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload
```json
{
  "id": "user123",
  "_id": "user123",
  "role": "user",
  "email": "user@example.com",
  "iat": 1657180800,
  "exp": 1657267200
}
```

---

## Pagination

Endpoints that return lists support pagination (future enhancement):
```
GET /api/astrology/consultations?page=1&limit=20
```

**Response includes pagination metadata**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Versioning

Current API Version: **v1**

API version is implicit in the base URL. Future versions will use:
```
/api/v2/astrology/...
```

---

## Support

For API support or questions:
- Email: api-support@astronila.com
- Documentation: https://docs.astronila.com
- Status Page: https://status.astronila.com

---

**Last Updated**: July 7, 2026
**API Version**: 1.0.0
