# Phase 2: Delivery Verification Implementation Guide

**Status:** ✅ IMPLEMENTED  
**Date:** May 2026  
**Objective:** Add delivery proof upload, OTP verification, and delivery location tracking to GlobeMart ecommerce module.

---

## Overview

Phase 2 extends the GlobeMart order lifecycle with **delivery verification** features that enable:
- Delivery partners to upload proof of delivery (image/receipt)
- Generation and verification of OTP for customer confirmation
- Capture of actual delivery location (latitude/longitude) with Google Maps integration

These features enhance trust and provide accountability for both customers and sellers.

---

## Backend Implementation

### 1. Database Schema Updates

**File:** `backend/models/Order.js`

Added three new fields to Order model:

```javascript
deliveryProof: {
  type: mongoose.Schema.Types.Mixed,
  default: null,
  // Contains: { imageUrl, uploadedAt, uploadedBy, notes }
}

deliveryOTP: {
  type: mongoose.Schema.Types.Mixed,
  default: null,
  // Contains: { otp, verified, verifiedAt, attempts, maxAttempts, generatedAt, expiresAt }
}

deliveryLocation: {
  type: mongoose.Schema.Types.Mixed,
  default: null,
  // Contains: { lat, lng, address, googleMapsLink, capturedAt, capturedBy }
}
```

### 2. API Endpoints

**File:** `backend/routes/orders.js`

#### POST `/api/orders/:orderId/delivery-proof`
Upload delivery proof image for an order.

**Request Body:**
```json
{
  "imageUrl": "https://cdn.example.com/proof/order123.jpg",
  "notes": "Delivered at front gate"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delivery proof uploaded successfully.",
  "order": { /* serialized order object */ }
}
```

**Rules:**
- Only valid for orders in "Out for Delivery" or "Delivered" status
- Image URL is required
- Notes are optional

---

#### POST `/api/orders/:orderId/delivery-otp/generate`
Generate a random 6-digit OTP for delivery verification.

**Access:** Seller/Admin only

**Response:**
```json
{
  "success": true,
  "message": "Delivery OTP generated successfully.",
  "otp": "123456",
  "expiresIn": "10 minutes",
  "order": { /* serialized order object */ }
}
```

**Rules:**
- Only sellers and admins can generate OTP
- OTP is valid for 10 minutes
- Only for orders in "Out for Delivery" or "Delivered" status
- OTP is returned in response (in production, send via SMS/WhatsApp)

---

#### POST `/api/orders/:orderId/delivery-otp/verify`
Verify customer-provided OTP.

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delivery OTP verified successfully.",
  "order": { /* serialized order object with status updated to Delivered */ }
}
```

**Rules:**
- Customer enters OTP received from delivery partner
- Max 3 attempts (configurable in model)
- OTP expires after 10 minutes
- Updates order status to "Delivered" if currently "Out for Delivery"
- Generates GST invoice upon successful verification
- Each failed attempt increments counter

---

#### POST `/api/orders/:orderId/delivery-location`
Capture delivery location with coordinates.

**Request Body:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "address": "123 Main Street, Delhi"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delivery location captured successfully.",
  "deliveryLocation": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "123 Main Street, Delhi",
    "googleMapsLink": "https://www.google.com/maps?q=28.6139,77.2090",
    "capturedAt": "2026-05-07T10:30:00Z",
    "capturedBy": "delivery@example.com"
  },
  "order": { /* serialized order object */ }
}
```

**Rules:**
- Latitude must be between -90 and 90
- Longitude must be between -180 and 180
- Address is optional
- Automatically generates Google Maps link
- Records who captured the location and when

---

### 3. Utility Service

**File:** `backend/utils/deliveryLocationService.js`

Provides helper functions:

- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula for distance calculation
- `validateDeliveryLocation(deliveryLocation, expectedLocation, maxDistanceKm)` - Validates if delivery was within reasonable distance
- `buildGoogleMapsLink(lat, lng, label)` - Creates shareable Google Maps URL
- `buildGoogleMapsEmbedUrl(lat, lng)` - Creates embed URL for iframes
- `geocodeAddress(address)` - Convert address to coordinates (mock, needs Google API)
- `reverseGeocodeCoordinates(lat, lng)` - Convert coordinates to address (mock, needs Google API)
- `formatDeliveryLocation(deliveryLocation)` - Format for display

---

## Frontend Implementation

### 1. OrdersPage Component Updates

**File:** `src/modules/ecommerce/OrdersPage.js`

Added new "Delivery Verification" section that displays:

- **📷 Delivery Proof**
  - Upload time
  - Link to view proof image
  - Delivery partner notes

- **🔐 OTP Status**
  - Verification status (Verified/Pending)
  - Verification timestamp

- **📍 Delivery Location**
  - Address and coordinates
  - Clickable Google Maps link
  - Capture timestamp

**Display Logic:**
- Section only visible when order is expanded
- Only shows data if available in order object
- Provides direct links to view proof images and maps

---

## Workflow Examples

### Scenario 1: Delivery Partner Completes Delivery

1. **Delivery Partner:** Captures delivery location via GPS
   ```
   POST /api/orders/order-123/delivery-location
   { lat: 28.6139, lng: 77.2090 }
   ```

2. **Delivery Partner:** Uploads proof photo
   ```
   POST /api/orders/order-123/delivery-proof
   { imageUrl: "https://cdn.../proof.jpg", notes: "Delivered to receiver" }
   ```

3. **Seller:** Generates OTP for customer verification
   ```
   POST /api/orders/order-123/delivery-otp/generate
   // Returns OTP: 123456, shared with customer via SMS/WhatsApp
   ```

4. **Customer:** Enters OTP to confirm receipt
   ```
   POST /api/orders/order-123/delivery-otp/verify
   { otp: "123456" }
   // Order status updates to Delivered, Invoice generated
   ```

---

### Scenario 2: Proof-First Workflow

1. **Delivery Partner:** Uploads proof
   ```
   POST /api/orders/order-456/delivery-proof
   { imageUrl: "https://cdn.../receipt.jpg" }
   ```

2. **Customer:** Views order tracking and verifies delivery proof
   - Checks image for package condition
   - Reviews delivery notes

3. **Seller:** Generates OTP for verification (if needed)
   ```
   POST /api/orders/order-456/delivery-otp/generate
   ```

4. **Customer:** Verifies OTP and marks order as received
   ```
   POST /api/orders/order-456/delivery-otp/verify
   { otp: "789012" }
   ```

---

## Error Handling

| Scenario | Response Code | Message |
|----------|---------------|---------|
| Order not found | 404 | Order not found |
| Invalid order status | 400 | Delivery proof can only be uploaded for orders in "Out for Delivery" or "Delivered" status |
| Missing OTP | 400 | OTP is required |
| Expired OTP | 400 | OTP has expired. Please request a new OTP. |
| Incorrect OTP | 400 | Incorrect OTP. X attempts remaining. |
| Max attempts exceeded | 400 | Maximum OTP verification attempts exceeded |
| Invalid coordinates | 400 | Invalid coordinates. Latitude must be -90 to 90, longitude must be -180 to 180 |
| Unauthorized (OTP generation) | 403 | Only seller or admin can generate delivery OTP |
| Unauthorized (delivery proof) | 403 | Only authenticated users can upload delivery proof |

---

## Security Considerations

1. **OTP Expiration:** 10-minute window to prevent replay attacks
2. **Attempt Limiting:** Max 3 attempts to prevent brute force
3. **Location Validation:** Service supports distance validation (future: compare with delivery address)
4. **Image Validation:** URL validation only (future: implement server-side image upload with virus scanning)
5. **Authentication:** All endpoints require `authenticate` middleware
6. **Role-Based Access:** OTP generation restricted to sellers/admins

---

## Future Enhancements

### Phase 2.1: Geocoding Integration
- Integrate Google Geocoding API for address ↔ coordinates conversion
- Implement distance validation between expected and actual delivery locations
- Generate warnings if delivery location is too far from address

### Phase 2.2: Image Processing
- Server-side image upload instead of CDN URLs
- Image compression and WebP conversion
- Virus/malware scanning with ClamAV
- Optical Character Recognition (OCR) for receipt verification

### Phase 2.3: SMS/WhatsApp Integration
- Send OTP via SMS (Twilio)
- Send delivery proof link via WhatsApp
- Send delivery location link via SMS
- Two-way confirmations via WhatsApp bot

### Phase 2.4: Analytics & Reporting
- Delivery proof upload rate per seller
- OTP verification success rate
- Average time to deliver verification
- Geographic heat maps of delivery locations
- Fraud detection for unusual delivery patterns

### Phase 2.5: Advanced Verification
- QR code generation for one-click verification
- Blockchain-based proof of delivery
- Digital signature from customer
- Photo upload with geotag metadata
- Real-time video recording of delivery

---

## Testing Checklist

- [ ] Generate delivery OTP successfully
- [ ] Verify correct OTP
- [ ] Reject incorrect OTP after 3 attempts
- [ ] Handle expired OTP
- [ ] Upload delivery proof with valid image URL
- [ ] Capture delivery location with valid coordinates
- [ ] View delivery verification details in OrdersPage
- [ ] Update order status to Delivered after OTP verification
- [ ] Generate GST invoice upon successful verification
- [ ] Test with missing required fields
- [ ] Test with invalid coordinates
- [ ] Test with orders in wrong status

---

## Deployment Checklist

- [ ] Update Order model in MongoDB
- [ ] Deploy backend routes (orders.js)
- [ ] Deploy delivery location service
- [ ] Update frontend OrdersPage component
- [ ] Test all endpoints with local backend
- [ ] Push changes to main branch
- [ ] Redeploy on Render
- [ ] Test in production environment
- [ ] Monitor error logs for issues
- [ ] Send Phase 2 announcement to users

---

## API Integration Example (Frontend)

```javascript
// Upload delivery proof
const uploadDeliveryProof = async (orderId, imageUrl, notes = '') => {
  const response = await fetch(`/api/orders/${orderId}/delivery-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, notes }),
  });
  return response.json();
};

// Generate OTP
const generateDeliveryOTP = async (orderId) => {
  const response = await fetch(`/api/orders/${orderId}/delivery-otp/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.json();
};

// Verify OTP
const verifyDeliveryOTP = async (orderId, otp) => {
  const response = await fetch(`/api/orders/${orderId}/delivery-otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp }),
  });
  return response.json();
};

// Capture delivery location
const captureDeliveryLocation = async (orderId, lat, lng, address = '') => {
  const response = await fetch(`/api/orders/${orderId}/delivery-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, address }),
  });
  return response.json();
};
```

---

## Status Summary

✅ Order model extended with delivery verification fields  
✅ Four new API endpoints implemented  
✅ Delivery location service utility created  
✅ Frontend OrdersPage updated with delivery verification UI  
✅ Error handling and validation implemented  
✅ Documentation complete

**Next Steps:**
1. Run local backend tests
2. Test endpoints with Postman or curl
3. Update frontend to call new endpoints (delivery partner mobile app)
4. Test end-to-end workflow
5. Deploy to production
6. Monitor and iterate based on feedback

---

**Created:** May 7, 2026  
**Phase:** 2 (Delivery Verification)  
**Module:** GlobeMart Ecommerce  
**Developer Notes:** All endpoints require authentication. Sellers can generate OTP, customers verify. Location tracking enables trust and accountability.
