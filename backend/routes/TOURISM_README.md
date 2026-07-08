# Tourism Module - Complete Implementation Guide

## Overview
Complete tourism marketplace module with MongoDB integration, Razorpay payments, email/SMS notifications, image uploads, and invoice generation.

## Features Implemented

### 1. Database Models (MongoDB)
- **TourismPackage**: Tour packages with ratings, reviews, pricing
- **TourismVendor**: Verified travel agencies with KYC
- **TourismBooking**: Customer bookings with payment tracking
- **TourismReview**: Package reviews with images
- **TourismLead**: Lead management for vendors
- **TourismPayment**: Payment transactions with Razorpay
- **TourismComplaint**: Customer complaint management
- **TourismCoupon**: Discount coupon system

### 2. Payment Gateway (Razorpay)
- Order creation and payment intent
- Payment verification with signature validation
- Webhook handling for async updates
- Refund processing
- Manual payment entry (for cash/bank transfer)
- Balance payment support

### 3. Notification System
- **Email notifications** for:
  - Booking confirmations
  - Payment receipts
  - Status updates
  - Vendor lead alerts
- **SMS notifications** for booking confirmations
- HTML email templates with branding

### 4. Invoice Generation
- PDF invoice generation using PDFKit
- GST and service charge calculations
- Professional invoice layout
- Automatic generation on payment completion

### 5. Image Upload System
- Package gallery images (max 10)
- Review images (max 5)
- Vendor KYC documents
- Complaint attachments (max 3)
- File validation and size limits (5MB)

### 6. Authentication & Authorization
- User authentication middleware
- Vendor-specific access control
- Booking ownership verification
- Admin privileges checking
- Package management permissions

## API Endpoints

### Public Endpoints

#### GET /api/tourism/bootstrap
Get initial marketplace data
```javascript
Query params: email, vendorId
Response: { packages, reviews, coupons, vendors, bookings, leads }
```

#### GET /api/tourism/packages
Get approved packages with filters
```javascript
Query params: category, destination, travelerType, minPrice, maxPrice, 
              minDays, maxDays, hotelCategory, search, page, limit
Response: { packages, pagination }
```

#### GET /api/tourism/packages/:id
Get single package details with reviews

#### POST /api/tourism/custom-requests
Submit custom package request
```javascript
Body: { travelerName, phone, destination, days, budget, preferences }
Response: { lead }
```

#### POST /api/tourism/planner/itinerary
Generate AI itinerary
```javascript
Body: { destination, days, travelerType, budget }
Response: { itinerary with day-wise plan }
```

### Booking Endpoints

#### POST /api/tourism/bookings
Create new booking
```javascript
Body: {
  packageId, customerName, customerEmail, customerPhone,
  travelerCount, pickupCity, hotelCategory, travelDate,
  bookingNote, paymentType, couponCode
}
Response: { booking }
```

#### GET /api/tourism/bookings
Get bookings by email or phone
```javascript
Query params: email, phone
Response: { bookings }
```

#### GET /api/tourism/bookings/my
Get authenticated user's bookings (requires auth)

#### PATCH /api/tourism/bookings/:bookingId/status
Update booking status
```javascript
Body: { status }
Allowed: pending, confirmed, paid, cancelled, completed
```

### Payment Endpoints

#### POST /api/tourism/payments/intent
Create Razorpay payment order
```javascript
Body: { bookingId, amount, paymentType }
Response: { orderId, amount, currency, paymentId }
```

#### POST /api/tourism/payments/verify
Verify and capture payment
```javascript
Body: {
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
}
Response: { payment, booking }
```

#### POST /api/tourism/payments/webhook
Razorpay webhook handler (internal)

### Review Endpoints

#### POST /api/tourism/reviews
Submit package review
```javascript
Body: { packageId, reviewerName, rating, comment, bookingId }
Response: { review }
```

#### POST /api/tourism/reviews/:reviewId/images
Upload review images (multipart/form-data)

### Complaint Endpoints

#### POST /api/tourism/packages/:packageId/report
Report package issue
```javascript
Body: { reason, contact, category, severity }
Response: { complaint }
```

### Vendor Endpoints (Requires Vendor Auth)

#### GET /api/tourism/vendor/packages
Get vendor's packages

#### POST /api/tourism/vendor/packages
Create new package
```javascript
Body: {
  title, destination, category, durationDays, startPrice,
  hotelCategory, inclusions, exclusions, cancellationPolicy,
  imageGallery, itinerary, etc.
}
Response: { package }
```

#### PATCH /api/tourism/vendor/packages/:packageId
Update package (requires re-approval if approved)

#### DELETE /api/tourism/vendor/packages/:packageId
Soft delete package (sets isActive: false)

#### POST /api/tourism/vendor/packages/:packageId/images
Upload package images (multipart/form-data)

#### GET /api/tourism/vendor/leads
Get vendor's leads
```javascript
Query params: status
Response: { leads }
```

#### PATCH /api/tourism/vendor/leads/:leadId
Update lead status
```javascript
Body: { status, note }
Allowed: new, contacted, proposal_shared, negotiation, confirmed, lost
```

### Admin Endpoints (Requires Admin Auth)

#### GET /api/tourism/admin/queues
Get all admin review queues
```javascript
Response: {
  packageApprovalQueue,
  vendorApprovalQueue,
  kycQueue,
  riskFlags,
  refundApprovalQueue,
  complaints,
  featuredPackages
}
```

#### GET /api/tourism/admin/bookings
Get all bookings with filters
```javascript
Query params: status, search, page, limit
Response: bookings array with pagination
```

#### PUT /api/tourism/admin/bookings/:bookingId/status
Update booking status (admin)
```javascript
Body: { status, adminNote }
```

#### PATCH /api/tourism/admin/vendors/:vendorId
Update vendor approval/KYC status
```javascript
Body: { approvalStatus, kycStatus, riskFlag }
Allowed approvalStatus: pending, approved, rejected
Allowed kycStatus: pending, verified, rejected
Allowed riskFlag: low, medium, high
```

#### PATCH /api/tourism/admin/packages/:packageId
Update package approval status
```javascript
Body: { approvalStatus, fraudRisk }
```

## Environment Variables

Add to `.env`:
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Email Configuration (if not already set)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# SMS Configuration (if not already set)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

Add to frontend `.env`:
```env
REACT_APP_RAZORPAY_KEY_ID=rzp_test_your_key_id
```

## Setup Instructions

### 1. Install Dependencies
Backend already has required dependencies. Ensure these are installed:
- `mongoose` - MongoDB ODM
- `razorpay` - Payment gateway
- `pdfkit` - PDF generation
- `multer` - File uploads

### 2. Database Setup
No manual setup needed. Models will auto-create collections and indexes on first use.

### 3. Initial Data Seeding (Optional)
You can seed initial vendors and packages:

```javascript
// Run this script once to seed data
node backend/scripts/seedTourismData.js
```

### 4. Test the Integration

#### Test Public Endpoints:
```bash
# Get bootstrap data
curl http://localhost:5000/api/tourism/bootstrap

# Get packages
curl http://localhost:5000/api/tourism/packages?category=Honeymoon&maxPrice=20000
```

#### Test Booking Flow:
1. Create booking via POST /api/tourism/bookings
2. Create payment intent via POST /api/tourism/payments/intent
3. Complete payment via Razorpay UI (frontend)
4. Verify payment via POST /api/tourism/payments/verify
5. Check booking status updated to 'paid'
6. Invoice auto-generated at `/invoices/tourism/INV-TOUR-*.pdf`

### 5. Razorpay Test Mode
Use these test cards:
- **Success**: 4111 1111 1111 1111
- **Failure**: 4000 0000 0000 0002
- CVV: Any 3 digits
- Expiry: Any future date

## File Structure

```
backend/
├── models/
│   ├── TourismPackage.js
│   ├── TourismVendor.js
│   ├── TourismBooking.js
│   ├── TourismReview.js
│   ├── TourismLead.js
│   ├── TourismPayment.js
│   ├── TourismComplaint.js
│   └── TourismCoupon.js
├── services/
│   ├── TourismPaymentService.js
│   ├── TourismNotificationService.js
│   └── TourismInvoiceService.js
├── middleware/
│   ├── tourismAuth.js
│   └── tourismImageUpload.js
├── routes/
│   └── tourismNew.js
├── invoices/
│   └── tourism/ (auto-created)
└── uploads/
    └── tourism/ (auto-created)

frontend/
├── src/
│   ├── services/
│   │   └── tourismService.js
│   └── modules/
│       └── tourism/
│           ├── TourismMarketplace.js
│           ├── TourismMarketplace.css
│           └── components/
│               ├── PaymentButton.js
│               └── BookingHistory.js
```

## Migration from JSON to MongoDB

The old `backend/routes/tourism.js` used JSON file storage. The new `tourismNew.js` uses MongoDB.

### To Switch:
1. Keep old route temporarily for data migration
2. Export data from JSON: `GET /api/tourism/bootstrap` (old endpoint)
3. Import to MongoDB using migration script
4. Update frontend to use new endpoints (already done)
5. Remove old route after verification

### Backward Compatibility:
Old and new routes can coexist. Mount new route at `/api/tourism` and old at `/api/tourism-legacy`.

## Security Features

1. **Authentication**: JWT-based user authentication
2. **Authorization**: Role-based access control (user, vendor, admin)
3. **Payment Security**: Razorpay signature verification
4. **Input Validation**: Mongoose schema validation
5. **File Upload**: Size limits and file type validation
6. **Rate Limiting**: Applied at app level
7. **XSS Protection**: Input sanitization
8. **CORS**: Configured origins

## Monitoring & Logging

All operations are logged using Winston logger:
- Booking creations
- Payment transactions
- Notification deliveries
- Error tracking
- Admin actions

Check logs at: `backend/logs/`

## Testing Checklist

- [ ] Create package as vendor
- [ ] Search and filter packages
- [ ] Create booking as customer
- [ ] Complete payment via Razorpay
- [ ] Receive email confirmation
- [ ] View booking in history
- [ ] Submit review
- [ ] Upload review images
- [ ] Admin approve vendor
- [ ] Admin approve package
- [ ] Process refund
- [ ] Generate invoice

## Support

For issues or questions:
1. Check logs: `backend/logs/combined.log`
2. Verify environment variables
3. Check Razorpay dashboard for payment status
4. Review MongoDB collections for data

## Next Steps

1. Set up production Razorpay account
2. Configure email service for production
3. Add SMS gateway credentials
4. Set up MongoDB indexes for production
5. Configure CDN for image storage
6. Add analytics tracking
7. Set up monitoring alerts
