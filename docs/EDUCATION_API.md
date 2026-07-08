# Education Module API Documentation

## Overview

The Education Module provides a comprehensive learning ecosystem with tuition booking, skill courses, scholarships, certificates, and student support features.

**Base URL:** `/api/education` and `/api/app-data/education`

**Authentication:** All endpoints require Bearer token authentication.

---

## Table of Contents

1. [Education State Management](#education-state-management)
2. [Course Enrollment](#course-enrollment)
3. [Skill Learning](#skill-learning)
4. [Tuition Management](#tuition-management)
5. [Scholarships](#scholarships)
6. [Certificates](#certificates)
7. [Community](#community)
8. [360 Dashboard](#360-dashboard)

---

## Education State Management

### Get Education State

Get the current user's education state including enrolled courses, scholarships, and profile.

**Endpoint:** `GET /api/education/state`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "state": {
      "enrolledCourseIds": ["course-1", "course-2"],
      "appliedScholarships": ["scholarship-1"],
      "joinedGroups": ["group-1"],
      "courseProgress": {
        "course-1": 45,
        "course-2": 10
      },
      "roleProfile": {
        "primaryRole": "student",
        "studentName": "John Doe",
        "classLevel": "Class 10",
        "targetExam": "SSLC",
        "preferredLanguage": "English",
        "careerGoal": "Software Engineer"
      },
      "interventionsDismissed": []
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid authentication token
- `500 Internal Server Error`: Server error

---

### Update Education State

Update the user's education state.

**Endpoint:** `PATCH /api/education/state`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "enrolledCourseIds": ["course-1", "course-2"],
  "appliedScholarships": ["scholarship-1"],
  "joinedGroups": ["group-1"],
  "courseProgress": {
    "course-1": 50
  },
  "roleProfile": {
    "primaryRole": "student",
    "classLevel": "Class 10"
  },
  "interventionsDismissed": ["intervention-1"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "state": { /* updated state */ }
  }
}
```

**Validation Rules:**
- `courseProgress` values must be between 0-100
- `primaryRole` must be one of: student, parent, tutor, institute_admin

---

## Course Enrollment

### Enroll in Course

Enroll a user in a skill course.

**Endpoint:** `POST /api/education/enroll`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "courseId": "gulf-hotel-operations-pro",
  "courseTitle": "Gulf Hotel Operations Pro",
  "amount": 0,
  "paymentMethod": "upi",
  "paymentGateway": "razorpay"
}
```

**Response (Free Course):**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "enrollmentId": "enroll-123456",
      "status": "enrolled"
    },
    "state": { /* updated state */ },
    "requiresPayment": false
  }
}
```

**Response (Paid Course):**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "enrollmentId": "enroll-123456",
      "status": "payment_pending"
    },
    "requiresPayment": true,
    "paymentDetails": {
      "paymentId": "payment-123",
      "gateway": "razorpay",
      "razorpayOrderId": "order_xyz",
      "razorpayKeyId": "rzp_test_key",
      "amount": 1000,
      "currency": "INR",
      "notes": {}
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or already enrolled
- `500 Internal Server Error`: Payment order creation failed

---

### Confirm Payment

Confirm payment for a course enrollment.

**Endpoint:** `POST /api/education/enroll/:enrollmentId/confirm-payment`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentId": "payment-123",
  "razorpay_order_id": "order_xyz",
  "razorpay_payment_id": "pay_abc",
  "razorpay_signature": "signature_hash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "state": { /* updated state with enrolled course */ }
  }
}
```

---

## Skill Learning

### Get Courses

Get list of all available skill courses.

**Endpoint:** `GET /api/skilllearning/courses`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` (optional): Filter by category
- `level` (optional): Filter by level (Beginner, Intermediate, Advanced)
- `search` (optional): Search query

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "courseId": "gulf-hotel-operations-pro",
        "title": "Gulf Hotel Operations Pro",
        "level": "Beginner",
        "duration": "45 hours",
        "price": 0,
        "description": "Hospitality training for Gulf careers",
        "modules": [],
        "certificateAvailable": true,
        "jobLinked": true,
        "category": "Hospitality"
      }
    ]
  }
}
```

---

### Get Course Details

Get detailed information about a specific course.

**Endpoint:** `GET /api/skilllearning/courses/:courseId`

**Response:**
```json
{
  "success": true,
  "data": {
    "course": {
      "courseId": "gulf-hotel-operations-pro",
      "title": "Gulf Hotel Operations Pro",
      "modules": [
        {
          "title": "Gulf Service Culture",
          "lessons": [
            {
              "title": "Introduction to Gulf Hospitality",
              "duration": "30 mins"
            }
          ]
        }
      ]
    }
  }
}
```

---

### Get Question Bank

Get assessment questions for a category.

**Endpoint:** `GET /api/skilllearning/questions`

**Query Parameters:**
- `category` (required): Question category (e.g., "Gulf Ready", "IT & Software")

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "What is the primary language in Gulf countries?",
        "options": ["Hindi", "English", "Arabic", "Malayalam"],
        "correctAnswer": 2,
        "category": "Gulf Ready"
      }
    ]
  }
}
```

---

### Submit Test

Submit test answers for evaluation.

**Endpoint:** `POST /api/skilllearning/tests/submit`

**Request Body:**
```json
{
  "category": "Gulf Ready",
  "answers": [
    {
      "questionId": "q1",
      "selectedIndex": 2
    },
    {
      "questionId": "q2",
      "selectedIndex": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": {
      "score": 85,
      "correct": 8,
      "wrong": 2,
      "weakAreas": ["Customer Service"]
    },
    "insight": "You scored 85%. Great job!"
  }
}
```

---

### Upload Certificate

Upload a skill certificate.

**Endpoint:** `POST /api/skilllearning/certificates/upload`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (required): Certificate title (min 3 chars)
- `issuer` (optional): Issuing organization
- `completedOn` (required): Completion date (ISO format)
- `credentialId` (optional): Credential ID
- `certificateFile` (optional): Certificate file (JPEG, PNG, PDF, max 5MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "certificate": {
      "certificateId": "cert-123456",
      "userEmail": "user@example.com",
      "title": "AWS Certified Developer",
      "issuer": "Amazon Web Services",
      "completedOn": "2024-01-15T00:00:00.000Z",
      "credentialId": "AWS-123",
      "verificationStatus": "uploaded",
      "fileUrl": "/api/files/abc123",
      "uploadedAt": "2024-01-20T10:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation error or invalid file type
- `413 Payload Too Large`: File size exceeds 5MB

---

## Tuition Management

### Create Tuition Request

Request tuition for a subject.

**Endpoint:** `POST /api/education/tuition`

**Request Body:**
```json
{
  "subject": "Mathematics",
  "classLevel": "Class 10",
  "contactPhone": "9876543210",
  "preferredMode": "online",
  "preferredTime": "evenings",
  "details": "Need help with algebra"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tuitionRequest": {
      "requestId": "tuition-123456",
      "status": "submitted",
      "subject": "Mathematics",
      "classLevel": "Class 10"
    },
    "tutorMatches": [
      {
        "tutorId": "tutor-1",
        "name": "Priya Kumar",
        "experience": "5 years",
        "rating": 4.8,
        "matchScore": 95,
        "hourlyFee": 500
      }
    ]
  }
}
```

---

### Get Tuition Requests

Get user's tuition requests.

**Endpoint:** `GET /api/education/tuition/requests`

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "requestId": "tuition-123456",
        "subject": "Mathematics",
        "status": "matched",
        "sessions": [],
        "assignedTutor": {
          "name": "Priya Kumar"
        }
      }
    ]
  }
}
```

---

### Update Tuition Status

Update status of a tuition request.

**Endpoint:** `PATCH /api/education/tuition/:requestId/status`

**Request Body:**
```json
{
  "status": "booked",
  "note": "Trial session completed successfully"
}
```

**Valid Status Values:**
- submitted
- matched
- trial_scheduled
- trial_completed
- booked
- in_progress
- completed
- cancelled

---

## 360 Dashboard

### Get Dashboard Overview

Get comprehensive 360 dashboard data.

**Endpoint:** `GET /api/education/overview360`

**Response:**
```json
{
  "success": true,
  "data": {
    "state": { /* education state */ },
    "outcomeMetrics": {
      "readinessScore": 75,
      "avgCourseProgress": 60,
      "latestTestScore": 85,
      "tuitionCompletionRate": 80,
      "scholarshipConversionRate": 20,
      "certificationVerificationRate": 100
    },
    "interventions": [
      {
        "id": "low-progress",
        "title": "Course Progress is Low",
        "description": "Your enrolled courses have low completion rates",
        "severity": "medium",
        "action": "Set Study Schedule"
      }
    ],
    "canvaToolkit": {
      "templates": [],
      "campaignSizes": [],
      "translationTargets": ["English", "Malayalam", "Hindi"],
      "suggestedCampaigns": []
    }
  }
}
```

---

### Get KPI Health

Get KPI health metrics.

**Endpoint:** `GET /api/education/kpis`

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": { /* outcome metrics */ },
    "kpiHealth": {
      "readiness": "healthy",
      "progress": "warning",
      "tuition": "healthy",
      "certificates": "attention"
    }
  }
}
```

**Health Status Values:**
- `healthy`: >= 70%
- `warning`: 40-69%
- `attention`: < 40%

---

## Rate Limits

- General education endpoints: 100 requests per 15 minutes
- Enrollment: 10 requests per hour
- Certificate upload: 20 requests per hour
- Test submission: 30 requests per hour

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200 OK`: Request successful
- `400 Bad Request`: Validation error or invalid input
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Best Practices

1. **Authentication**: Always include valid Bearer token in Authorization header
2. **Error Handling**: Check `success` field in response and handle errors appropriately
3. **Rate Limits**: Implement exponential backoff for retries
4. **Idempotency**: Use idempotency keys for critical operations
5. **Validation**: Validate input on client side before sending to API
6. **File Uploads**: Check file size and type before uploading
7. **Payment Security**: Never expose Razorpay key secret on client side

---

## Webhook Events

### Payment Success Webhook

Razorpay will send webhook events to `/api/checkout/verify-razorpay` for payment verification.

**Event Types:**
- `payment.captured`: Payment successfully captured
- `payment.failed`: Payment failed

---

## Support

For API support or bug reports:
- Email: support@malabarbazaar.com
- Documentation: https://docs.malabarbazaar.com/education

---

## Changelog

### Version 1.0.0 (2024-01-20)
- Initial release
- Education state management
- Course enrollment with payment
- Skill learning and assessments
- Tuition booking
- Certificate management
- 360 Dashboard
