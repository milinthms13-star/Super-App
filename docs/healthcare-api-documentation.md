# Healthcare Module - API Documentation

## Overview

The Healthcare Module API provides comprehensive endpoints for managing doctor consultations, lab tests, pharmacy orders, health records, emergency services, insurance claims, and wearable device integration.

**Base URL**: `/api/healthcare`

**Authentication**: All endpoints require authentication via JWT token in the `Authorization` header.

```
Authorization: Bearer <your-jwt-token>
```

---

## Table of Contents

1. [Doctor Management](#doctor-management)
2. [Appointments](#appointments)
3. [Lab Tests & Packages](#lab-tests--packages)
4. [Pharmacy Orders](#pharmacy-orders)
5. [Health Records](#health-records)
6. [Family Profiles](#family-profiles)
7. [Refill Reminders](#refill-reminders)
8. [Emergency Services](#emergency-services)
9. [Insurance Claims](#insurance-claims)
10. [Wearables Integration](#wearables-integration)
11. [Video Consultation](#video-consultation)
12. [Notifications](#notifications)
13. [Partner Dashboard](#partner-dashboard)
14. [Admin Operations](#admin-operations)

---

## Doctor Management

### Get All Doctors

Retrieve list of available doctors.

**Endpoint**: `GET /api/healthcare/doctors`

**Query Parameters**:
- `specialty` (optional): Filter by specialty
- `approvalStatus` (optional): Filter by approval status (default: "approved")

**Example Request**:
```bash
GET /api/healthcare/doctors?specialty=Cardiologist
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "doc-123",
      "name": "Dr. Sarah Johnson",
      "specialty": "Cardiologist",
      "qualifications": "MBBS, DM (Cardiology)",
      "experienceYears": 12,
      "consultationFee": 700,
      "rating": 4.8,
      "reviewsCount": 156,
      "languages": ["English", "Tamil"],
      "clinicAddress": "Malabar Heart Institute",
      "availableModes": ["clinic", "video"],
      "availableSlots": [
        {
          "date": "2026-05-14",
          "times": ["11:30", "12:30", "16:30"]
        }
      ]
    }
  ]
}
```

### Create Doctor Profile

Add a new doctor profile (requires authentication).

**Endpoint**: `POST /api/healthcare/doctors`

**Request Body**:
```json
{
  "name": "Dr. John Doe",
  "specialty": "Pediatrician",
  "qualifications": "MBBS, MD (Pediatrics)",
  "experienceYears": 8,
  "consultationFee": 500,
  "languages": ["English", "Hindi"],
  "clinicAddress": "City Hospital",
  "availableModes": ["clinic", "video"],
  "biography": "Specialist in child healthcare"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "doc-456",
    "name": "Dr. John Doe",
    "approvalStatus": "pending",
    "createdAt": "2026-05-10T10:30:00Z"
  }
}
```

### Update Doctor Approval (Admin Only)

Approve or reject doctor applications.

**Endpoint**: `PATCH /api/healthcare/doctors/:doctorId/approval`

**Request Body**:
```json
{
  "approvalStatus": "approved",
  "reviewNotes": "Verified credentials"
}
```

---

## Appointments

### Get User Appointments

Retrieve appointments for the authenticated user.

**Endpoint**: `GET /api/healthcare/appointments`

**Query Parameters**:
- `category` (optional): Filter by category (doctor, lab, scan, package)
- `status` (optional): Filter by status

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "apt-789",
      "doctorName": "Dr. Sarah Johnson",
      "specialty": "Cardiologist",
      "category": "doctor",
      "appointmentDate": "2026-05-14",
      "appointmentTime": "11:30",
      "mode": "video",
      "status": "confirmed",
      "paymentStatus": "paid",
      "amountDue": 700,
      "patientName": "John Smith",
      "reason": "Follow-up consultation"
    }
  ]
}
```

### Create Appointment

Book a new appointment.

**Endpoint**: `POST /api/healthcare/appointments`

**Headers**:
- `X-Idempotency-Key` (optional): Unique key to prevent duplicate bookings

**Request Body**:
```json
{
  "doctorId": "doc-123",
  "doctorName": "Dr. Sarah Johnson",
  "specialty": "Cardiologist",
  "category": "doctor",
  "appointmentDate": "2026-05-14",
  "appointmentTime": "11:30",
  "mode": "video",
  "reason": "Chest pain consultation",
  "patientName": "John Smith",
  "patientPhone": "+919876543210",
  "familyMember": "Self",
  "amountDue": 700
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "apt-new-123",
    "status": "requested",
    "paymentReference": "HC-APT-1715345678-a1b2c3d4",
    "createdAt": "2026-05-10T11:00:00Z"
  }
}
```

### Update Appointment

Modify appointment details or status.

**Endpoint**: `PATCH /api/healthcare/appointments/:appointmentId`

**Request Body**:
```json
{
  "status": "confirmed",
  "appointmentDate": "2026-05-15",
  "appointmentTime": "10:00"
}
```

**Status Transitions**:
- **Doctor Appointments**: requested → confirmed → in_progress → completed
- **Lab Appointments**: booked → sample_collected → under_processing → results_ready → delivered

### Initiate Appointment Payment

Generate payment reference for appointment.

**Endpoint**: `POST /api/healthcare/appointments/:appointmentId/payment/initiate`

**Request Body**:
```json
{
  "paymentProvider": "razorpay"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "appointmentId": "apt-789",
    "paymentReference": "HC-APT-1715345678-xyz123",
    "paymentProvider": "razorpay",
    "amountDue": 700,
    "paymentStatus": "pending"
  }
}
```

### Verify Appointment Payment

Confirm payment completion.

**Endpoint**: `POST /api/healthcare/appointments/:appointmentId/payment/verify`

**Request Body**:
```json
{
  "paymentReference": "HC-APT-1715345678-xyz123",
  "paymentStatus": "success"
}
```

---

## Lab Tests & Packages

### Get Lab Tests

Retrieve available lab tests.

**Endpoint**: `GET /api/healthcare/lab-tests`

**Query Parameters**:
- `type` (optional): Filter by type (blood, scan)
- `approvalStatus` (optional): Default "approved"

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "lab-001",
      "name": "Complete Blood Count",
      "price": 300,
      "homeCollection": true,
      "type": "blood",
      "turnaroundHours": 24,
      "info": {
        "purpose": "Measures blood cell counts",
        "usedFor": "Diagnosis of anemia, infection, disorders"
      }
    }
  ]
}
```

### Get Lab Test Info

Get AI-powered explanation of lab tests.

**Endpoint**: `GET /api/healthcare/lab-tests/info`

**Query Parameters**:
- `q`: Search query

**Example Request**:
```bash
GET /api/healthcare/lab-tests/info?q=diabetes
```

### Get Health Packages

Retrieve health check packages.

**Endpoint**: `GET /api/healthcare/health-packages`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "pkg-001",
      "name": "Full Body Checkup",
      "tests": 45,
      "price": 2999,
      "discount": "20% off",
      "description": "Comprehensive health screening"
    }
  ]
}
```

---

## Pharmacy Orders

### Get Medicines

Search and retrieve medicines.

**Endpoint**: `GET /api/healthcare/medicines`

**Query Parameters**:
- `q` (optional): Search query
- `approvalStatus` (optional): Default "approved"

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "med-001",
      "name": "Paracetamol 500mg",
      "price": 25,
      "category": "Pain Relief",
      "requiresPrescription": false,
      "stock": 200,
      "info": {
        "purpose": "Pain relief and fever reduction",
        "ingredients": "Paracetamol",
        "warning": "Do not exceed recommended dosage"
      }
    }
  ]
}
```

### Create Pharmacy Order

Place a new medicine order.

**Endpoint**: `POST /api/healthcare/pharmacy/orders`

**Headers**:
- `X-Idempotency-Key` (optional)
- `Content-Type`: `multipart/form-data` (for prescription upload)

**Request Body (FormData)**:
```
items: [{"medicineId":"med-001","name":"Paracetamol","quantity":2,"unitPrice":25}]
deliveryAddress: "123 Main St, City"
phone: "+919876543210"
customerName: "John Smith"
prescriptionFile: <file> (if required)
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "pharm-order-123",
    "totalAmount": 50,
    "orderStatus": "placed",
    "prescriptionRequired": false,
    "interactionAlerts": [],
    "requiresPharmacistCall": false,
    "paymentReference": "HC-PHARM-1715345678-abc123"
  }
}
```

### Get Pharmacy Orders

Retrieve user's pharmacy orders.

**Endpoint**: `GET /api/healthcare/pharmacy/orders`

### Update Pharmacy Order

Update order status (Admin for prescription review).

**Endpoint**: `PATCH /api/healthcare/pharmacy/orders/:orderId`

**Request Body**:
```json
{
  "orderStatus": "processing",
  "prescriptionReviewStatus": "approved",
  "prescriptionReviewNotes": "Prescription verified"
}
```

### Verify Pharmacy Payment

Confirm pharmacy order payment.

**Endpoint**: `POST /api/healthcare/pharmacy/orders/:orderId/payment/verify`

---

## Health Records

### Get Health Records

Retrieve user's health records.

**Endpoint**: `GET /api/healthcare/records`

**Query Parameters**:
- `familyMember` (optional): Filter by family member
- `includeDeleted` (optional): Include archived records

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "rec-001",
      "title": "Blood Test Report",
      "category": "Lab Report",
      "recordDate": "2026-05-10",
      "fileName": "blood-test-may2026.pdf",
      "fileUrl": "https://...",
      "familyMember": "Self",
      "visibility": "private",
      "consentAccepted": true,
      "consentExpiryDate": "2027-05-10",
      "isDeleted": false
    }
  ]
}
```

### Upload Health Record

Upload a new health record.

**Endpoint**: `POST /api/healthcare/records`

**Headers**:
- `X-Idempotency-Key` (optional)
- `Content-Type`: `multipart/form-data`

**Request Body (FormData)**:
```
title: "Blood Test Report"
category: "Lab Report"
recordDate: "2026-05-10"
familyMember: "Self"
visibility: "private"
consentAccepted: true
consentExpiryDate: "2027-05-10"
file: <file>
```

### Get Record Download Link

Generate secure download URL.

**Endpoint**: `GET /api/healthcare/records/:recordId/download`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://presigned-url...",
    "fileName": "blood-test-may2026.pdf"
  }
}
```

### Archive Health Record

Soft delete a record (retention: 30 days).

**Endpoint**: `DELETE /api/healthcare/records/:recordId`

**Request Body**:
```json
{
  "reason": "Outdated report"
}
```

### Restore Archived Record

Restore a previously archived record.

**Endpoint**: `PATCH /api/healthcare/records/:recordId/restore`

### Renew Record Consent

Update consent and visibility settings.

**Endpoint**: `PATCH /api/healthcare/records/:recordId/consent`

**Request Body**:
```json
{
  "visibility": "family",
  "consentAccepted": true,
  "consentExpiryDate": "2028-05-10"
}
```

### Get Record Audit Logs

View record access and modification history.

**Endpoint**: `GET /api/healthcare/records/audit`

**Query Parameters**:
- `action` (optional): Filter by action type
- `from` (optional): Start date
- `to` (optional): End date
- `page` (optional): Page number
- `limit` (optional): Items per page

---

## Family Profiles

### Get Family Profiles

**Endpoint**: `GET /api/healthcare/family-profiles`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "fam-001",
      "name": "Sarah Smith",
      "relation": "Spouse",
      "gender": "Female",
      "dateOfBirth": "1990-06-15",
      "bloodGroup": "O+",
      "phone": "+919876543210",
      "allergies": ["Penicillin"],
      "chronicConditions": ["Asthma"],
      "isEmergencyContact": true,
      "emergencyPhone": "+919876543210"
    }
  ]
}
```

### Create Family Profile

**Endpoint**: `POST /api/healthcare/family-profiles`

**Request Body**:
```json
{
  "name": "Sarah Smith",
  "relation": "Spouse",
  "gender": "Female",
  "dateOfBirth": "1990-06-15",
  "bloodGroup": "O+",
  "allergies": ["Penicillin"],
  "chronicConditions": ["Asthma"],
  "isEmergencyContact": true
}
```

### Update Family Profile

**Endpoint**: `PATCH /api/healthcare/family-profiles/:profileId`

### Delete Family Profile

**Endpoint**: `DELETE /api/healthcare/family-profiles/:profileId`

---

## Refill Reminders

### Get Refill Reminders

**Endpoint**: `GET /api/healthcare/refill-reminders`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "refill-001",
      "medicineName": "Metformin 500mg",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "nextRefillDate": "2026-05-20",
      "reminderDaysBefore": 5,
      "active": true,
      "adherenceStatus": "pending",
      "channels": ["in_app", "sms"]
    }
  ]
}
```

### Create Refill Reminder

**Endpoint**: `POST /api/healthcare/refill-reminders`

**Headers**:
- `X-Idempotency-Key` (optional)

**Request Body**:
```json
{
  "medicineName": "Metformin 500mg",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "nextRefillDate": "2026-05-20",
  "reminderDaysBefore": 5,
  "familyMember": "Self",
  "channels": ["in_app", "sms"]
}
```

### Update Refill Reminder

**Endpoint**: `PATCH /api/healthcare/refill-reminders/:reminderId`

### Delete Refill Reminder

**Endpoint**: `DELETE /api/healthcare/refill-reminders/:reminderId`

---

## Emergency Services

### Create Emergency Incident

Send an SOS alert.

**Endpoint**: `POST /api/healthcare/emergency/sos`

**Headers**:
- `X-Idempotency-Key` (optional)

**Request Body**:
```json
{
  "incidentType": "medical",
  "message": "Severe chest pain",
  "familyMember": "Self",
  "location": {
    "latitude": 11.2588,
    "longitude": 75.7804,
    "address": "Kozhikode, Kerala"
  },
  "actions": {
    "call108": true,
    "call112": false,
    "locationShared": true,
    "familyNotified": true
  },
  "contactsNotified": ["+919876543210"]
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "incident-001",
    "status": "open",
    "escalationLevel": "high",
    "ackDueAt": "2026-05-10T11:10:00Z",
    "timeline": [
      {
        "step": "incident_created",
        "at": "2026-05-10T11:00:00Z"
      }
    ]
  }
}
```

### Get Emergency Incidents

Retrieve user's emergency incidents.

**Endpoint**: `GET /api/healthcare/emergency/incidents`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "incident-001",
      "incidentType": "medical",
      "status": "acknowledged",
      "escalationLevel": "high",
      "message": "Severe chest pain",
      "location": {
        "latitude": 11.2588,
        "longitude": 75.7804,
        "address": "Kozhikode, Kerala"
      },
      "acknowledgedAt": "2026-05-10T11:05:00Z",
      "timeline": []
    }
  ]
}
```

### Update Emergency Incident

Update incident status.

**Endpoint**: `PATCH /api/healthcare/emergency/incidents/:incidentId`

**Request Body**:
```json
{
  "status": "acknowledged",
  "responderNote": "Ambulance dispatched"
}
```

**Status Transitions**:
- open → acknowledged → resolved

**Escalation Levels**: low → medium → high → critical → resolved

### Update Emergency Location

Share real-time location during emergency.

**Endpoint**: `POST /api/healthcare/emergency/location`

**Request Body**:
```json
{
  "incidentId": "incident-001",
  "latitude": 11.2590,
  "longitude": 75.7806,
  "accuracy": 10,
  "address": "Near City Hospital"
}
```

---

## Insurance Claims

### Get Insurance Claims

Retrieve user's insurance claims.

**Endpoint**: `GET /api/healthcare/insurance/claims`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "claim-001",
      "claimNumber": "CLM-2026-001",
      "insuranceProvider": "Health Insurance Co.",
      "policyNumber": "POL123456",
      "patientName": "John Smith",
      "claimType": "hospitalization",
      "claimAmount": 50000,
      "approvedAmount": 45000,
      "treatmentDate": "2026-05-01",
      "status": "approved",
      "submittedAt": "2026-05-05T10:00:00Z"
    }
  ]
}
```

### Submit Insurance Claim

**Endpoint**: `POST /api/healthcare/insurance/claims`

**Headers**:
- `Content-Type`: `multipart/form-data`

**Request Body (FormData)**:
```
insuranceProvider: "Health Insurance Co."
policyNumber: "POL123456"
policyHolderName: "John Smith"
patientName: "John Smith"
patientRelation: "Self"
claimType: "hospitalization"
claimAmount: 50000
treatmentDate: "2026-05-01"
hospitalName: "City Hospital"
diagnosis: "Appendicitis surgery"
documents: [<file1>, <file2>]
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "claim-new-001",
    "claimNumber": "CLM-2026-NEW-001",
    "status": "submitted",
    "submittedAt": "2026-05-10T11:00:00Z"
  }
}
```

### Update Claim Status

Update or appeal claim (Users can only update draft claims).

**Endpoint**: `PATCH /api/healthcare/insurance/claims/:claimId`

**Request Body**:
```json
{
  "status": "appealed",
  "appealReason": "Incorrect assessment of treatment necessity"
}
```

---

## Wearables Integration

### Get Wearables Data

Retrieve health data from connected wearables.

**Endpoint**: `GET /api/healthcare/wearables/data`

**Query Parameters**:
- `timeRange`: today, week, month, year

**Example Response**:
```json
{
  "success": true,
  "data": {
    "connectedDevices": [
      {
        "id": "apple_health",
        "name": "Apple Health",
        "icon": "🍎",
        "lastSyncAt": "2026-05-10T10:30:00Z",
        "dataPoints": 15240
      }
    ],
    "healthData": {
      "steps": 8547,
      "heartRate": 72,
      "sleep": 420,
      "calories": 1850,
      "distance": 6200,
      "bloodPressure": {
        "systolic": 120,
        "diastolic": 80
      },
      "bloodOxygen": 98
    },
    "syncStatus": {
      "apple_health": "synced"
    },
    "anomalies": [
      {
        "metric": "heartRate",
        "value": 110,
        "message": "Elevated heart rate detected",
        "severity": "high",
        "detectedAt": "2026-05-10T08:00:00Z"
      }
    ]
  }
}
```

### Initiate Wearable Auth

Start OAuth flow to connect a wearable device.

**Endpoint**: `POST /api/healthcare/wearables/auth/initiate`

**Request Body**:
```json
{
  "deviceId": "apple_health"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://oauth.provider.com/authorize?...",
    "deviceId": "apple_health"
  }
}
```

### Check Wearable Connection

Poll for connection status after OAuth.

**Endpoint**: `GET /api/healthcare/wearables/connection/:deviceId`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "deviceId": "apple_health"
  }
}
```

### Disconnect Wearable

Remove wearable device connection.

**Endpoint**: `DELETE /api/healthcare/wearables/:deviceId`

### Sync Wearable Data

Manually trigger data sync from wearable.

**Endpoint**: `POST /api/healthcare/wearables/:deviceId/sync`

---

## Video Consultation

### Get Video Consultation

Get consultation details and meeting info.

**Endpoint**: `GET /api/healthcare/video-consultation/:appointmentId`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "consult-001",
    "appointmentId": "apt-789",
    "meetingId": "meet-xyz-123",
    "meetingProvider": "zoom",
    "status": "scheduled",
    "startTime": "2026-05-14T11:30:00Z",
    "duration": 30,
    "joinUrl": "https://zoom.us/j/xyz123"
  }
}
```

### Start Video Consultation

Initiate a video call session.

**Endpoint**: `POST /api/healthcare/video-consultation/:consultationId/start`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "status": "in_progress",
    "startedAt": "2026-05-14T11:30:00Z",
    "rtcConfig": {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
      ]
    }
  }
}
```

### End Video Consultation

End the video call and generate summary.

**Endpoint**: `POST /api/healthcare/video-consultation/:consultationId/end`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "endedAt": "2026-05-14T12:00:00Z",
    "duration": 30,
    "recordingUrl": "https://recordings.../consult-001.mp4"
  }
}
```

---

## Notifications

### Get Notifications

Retrieve user notifications.

**Endpoint**: `GET /api/healthcare/notifications`

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "notif-001",
      "title": "Appointment Reminder",
      "message": "Your appointment with Dr. Sarah is tomorrow at 11:30 AM",
      "notificationType": "appointment",
      "metadata": {
        "appointmentId": "apt-789"
      },
      "readAt": null,
      "createdAt": "2026-05-13T10:00:00Z"
    }
  ]
}
```

### Mark Notification as Read

**Endpoint**: `PATCH /api/healthcare/notifications/:notificationId/read`

---

## Partner Dashboard

### Get Partner Dashboard

Retrieve partner statistics and applications (for healthcare providers).

**Endpoint**: `GET /api/healthcare/partner/dashboard`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "applications": [],
    "stats": {
      "pendingApplications": 2,
      "approvedApplications": 5,
      "totalAppointments": 45,
      "totalPharmacyOrders": 23,
      "totalRevenue": 45600,
      "avgReviewTurnaroundHours": 36,
      "avgOrderFulfillmentHours": 12,
      "appointmentCompletionRate": 92.5
    }
  }
}
```

### Submit Partner Application

Apply as a healthcare partner (doctor, lab, pharmacy).

**Endpoint**: `POST /api/healthcare/partner/applications`

**Headers**:
- `X-Idempotency-Key` (optional)
- `Content-Type`: `multipart/form-data`

**Request Body (FormData)**:
```
entityType: "doctor"
vendorName: "Dr. John's Clinic"
contactName: "Dr. John Doe"
phone: "+919876543210"
email: "john@example.com"
address: "123 Medical St"
licenseNumber: "MED123456"
specialtyOrService: "General Physician"
notes: "10 years experience"
documents: [<license.pdf>, <certificate.pdf>]
```

### Get Partner Applications (Admin)

View all partner applications.

**Endpoint**: `GET /api/healthcare/partner/applications/admin`

**Requires**: Admin authentication

### Review Partner Application (Admin)

Approve or reject partner applications.

**Endpoint**: `PATCH /api/healthcare/partner/applications/:applicationId/review`

**Request Body**:
```json
{
  "status": "approved",
  "reviewNotes": "All credentials verified"
}
```

**Status Options**: approved, rejected, revision_requested, pending

---

## Admin Operations

### Get Dashboard Summary

Get healthcare dashboard metrics.

**Endpoint**: `GET /api/healthcare/dashboard/summary`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "appointments": 12,
    "pharmacyOrders": 8,
    "records": 25,
    "reminders": 5,
    "emergencyCases": 1,
    "healthScore": 78
  }
}
```

### Get Operations Metrics (Admin)

View operational metrics and SLAs.

**Endpoint**: `GET /api/healthcare/ops/metrics`

**Requires**: Admin authentication

**Example Response**:
```json
{
  "success": true,
  "data": {
    "pendingPrescriptionReviews": 5,
    "criticalIncidents": 2,
    "openIncidents": 8,
    "archivedRecordsPendingPurge": 15,
    "archivedRecordsExpiredPurge": 3,
    "generatedAt": "2026-05-10T11:00:00Z"
  }
}
```

### Run Retention Purge (Admin)

Manually trigger expired record purge.

**Endpoint**: `POST /api/healthcare/ops/retention/purge`

**Request Body**:
```json
{
  "limit": 200
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "purged": 12,
    "failed": 0,
    "triggeredAt": "2026-05-10T11:00:00Z"
  }
}
```

### Get Healthcare Analytics (Admin)

Retrieve analytics and insights.

**Endpoint**: `GET /api/healthcare/analytics`

**Query Parameters**:
- `timeRange`: day, week, month, year
- `metric`: appointments, revenue, patients, satisfaction

**Example Response**:
```json
{
  "success": true,
  "data": {
    "appointmentTrend": [
      { "date": "2026-05-01", "count": 15 },
      { "date": "2026-05-02", "count": 18 }
    ],
    "totalRevenue": 125000,
    "avgRevenue": 750,
    "popularServices": [
      { "name": "General Consultation", "count": 45 },
      { "name": "Lab Tests", "count": 32 }
    ],
    "patientSatisfaction": 4.7
  }
}
```

### AI Healthcare Assistant

Ask healthcare-related questions to AI assistant.

**Endpoint**: `POST /api/healthcare/ai/assist`

**Request Body**:
```json
{
  "question": "What are the symptoms of diabetes?",
  "context": {
    "upcomingAppointments": 2,
    "activeRefills": 3,
    "openIncidents": 0
  }
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "answer": "Common symptoms of diabetes include...",
    "confidence": 0.95,
    "sources": ["medical_knowledge_base"],
    "suggestions": [
      "Book a diabetes screening test",
      "Consult an endocrinologist"
    ],
    "generatedAt": "2026-05-10T11:00:00Z"
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (in development only)"
}
```

### Common HTTP Status Codes

- `200 OK`: Request succeeded
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Idempotency key conflict
- `410 Gone`: Resource expired or purged
- `500 Internal Server Error`: Server error

---

## Idempotency

Idempotency keys prevent duplicate operations. Include the `X-Idempotency-Key` header in requests that create resources:

```
X-Idempotency-Key: unique-key-12345
```

- Keys are valid for 24 hours
- Same key with different payload returns 409 Conflict
- Same key with same payload returns cached response (200 OK)
- Applies to: appointments, records, pharmacy orders, refill reminders, emergency incidents, partner applications

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Search endpoints: 30 requests/minute
- File uploads: 10 requests/minute
- Emergency endpoints: No rate limit

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1715345678
```

---

## Pagination

Paginated endpoints support these query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 25, max: 100)

Response includes pagination metadata:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 25,
    "totalCount": 150,
    "totalPages": 6,
    "hasNextPage": true
  }
}
```

---

## Webhooks

Configure webhooks to receive real-time updates (Admin only).

### Available Events

- `appointment.created`
- `appointment.confirmed`
- `appointment.cancelled`
- `appointment.completed`
- `pharmacy.order.placed`
- `pharmacy.order.delivered`
- `emergency.incident.created`
- `emergency.incident.escalated`
- `record.uploaded`
- `insurance.claim.submitted`
- `insurance.claim.approved`

### Webhook Payload

```json
{
  "event": "appointment.confirmed",
  "timestamp": "2026-05-10T11:00:00Z",
  "data": {
    "appointmentId": "apt-789",
    "doctorName": "Dr. Sarah Johnson",
    "patientName": "John Smith"
  }
}
```

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Never expose sensitive data** in client-side code
4. **Validate file uploads** on client and server
5. **Use idempotency keys** for critical operations
6. **Implement CSRF protection** for state-changing requests
7. **Enable 2FA** for admin accounts
8. **Rotate API keys** regularly
9. **Monitor audit logs** for suspicious activity
10. **Follow GDPR/HIPAA compliance** for health data

---

## Support

For API support and questions:
- Email: api-support@malabarbazaar.com
- Documentation: https://docs.malabarbazaar.com/healthcare
- Status: https://status.malabarbazaar.com

---

**Last Updated**: May 10, 2026  
**API Version**: 2.0  
**Documentation Version**: 1.0
