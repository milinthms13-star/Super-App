# Backend Routes Integration Guide

## Overview
This guide documents all new backend routes that need to be registered in `backend/app.js` to complete the BusinessBuilder module integration.

## New Routes to Register

### 1. Business Builder Advanced Routes
**File**: `backend/routes/businessBuilderAdvancedRoutes.js`
**Mount Path**: `/api/business-builder/advanced`
**Description**: Search, filtering, bulk operations, and lead management

```javascript
const businessBuilderAdvancedRoutes = require('./routes/businessBuilderAdvancedRoutes');
app.use('/api/business-builder/advanced', businessBuilderAdvancedRoutes);
```

**Endpoints**:
- `GET /search` - Search businesses, mini apps, orders
- `GET /filter` - Advanced filtering with pagination
- `POST /bulk/update-status` - Bulk status updates
- `POST /bulk/delete` - Bulk delete operations
- `GET /leads` - Get leads with filtering
- `POST /leads` - Create new lead
- `PUT /leads/:leadId` - Update lead
- `DELETE /leads/:leadId` - Delete lead
- `GET /leads/stats` - Lead statistics
- `POST /leads/:leadId/convert` - Convert lead to customer

### 2. File Upload Routes
**File**: `backend/routes/businessBuilderUploadRoutes.js`
**Mount Path**: `/api/business-builder/upload`
**Description**: Image and document upload for businesses, mini apps, and products

```javascript
const businessBuilderUploadRoutes = require('./routes/businessBuilderUploadRoutes');
app.use('/api/business-builder/upload', businessBuilderUploadRoutes);
```

**Endpoints**:
- `POST /business-logo` - Upload business logo
- `POST /miniapp-banner` - Upload mini app banner
- `POST /product-image` - Upload product image
- `POST /invoice-attachment` - Upload invoice attachment
- `DELETE /file/:filename` - Delete uploaded file

**Dependencies**: 
- `multer` for multipart/form-data
- `sharp` for image processing
- `aws-sdk` (optional) for S3 storage

### 3. QR Code Routes
**File**: `backend/routes/qrCodeRoutes.js`
**Mount Path**: `/api/qrcode`
**Description**: QR code generation for mini apps, contacts, and payments

```javascript
const qrCodeRoutes = require('./routes/qrCodeRoutes');
app.use('/api/qrcode', qrCodeRoutes);
```

**Endpoints**:
- `POST /miniapp` - Generate QR for mini app
- `POST /contact` - Generate vCard QR code
- `POST /payment` - Generate UPI/payment QR
- `POST /generate` - Generate generic QR code
- `POST /bulk` - Bulk QR generation
- `DELETE /:filePath` - Delete QR code file
- `GET /preview` - QR code preview

**Dependencies**: 
- `qrcode` npm package

### 4. Webhook Routes
**File**: `backend/routes/webhookRoutes.js`
**Mount Path**: `/api/webhooks`
**Description**: Webhook testing, triggering, and management

```javascript
const webhookRoutes = require('./routes/webhookRoutes');
app.use('/api/webhooks', webhookRoutes);
```

**Endpoints**:
- `POST /test` - Test webhook delivery
- `POST /trigger/business` - Trigger business webhook
- `POST /trigger/miniapp` - Trigger mini app webhook
- `POST /trigger/order` - Trigger order webhook
- `POST /verify-signature` - Verify webhook signature
- `GET /stats/:webhookId` - Webhook statistics
- `POST /retry/:deliveryId` - Retry failed delivery
- `DELETE /retry/:deliveryId` - Cancel retries
- `POST /generate-signature` - Generate test signature

### 5. Audit Log Routes
**File**: `backend/routes/auditLogRoutes.js`
**Mount Path**: `/api/audit-logs`
**Description**: Audit trail, activity tracking, and compliance

```javascript
const auditLogRoutes = require('./routes/auditLogRoutes');
app.use('/api/audit-logs', auditLogRoutes);
```

**Endpoints**:
- `GET /` - Get audit logs with filters
- `GET /resource/:resourceType/:resourceId` - Resource audit trail
- `GET /user/:userId/summary` - User activity summary
- `GET /business/:businessId/summary` - Business activity summary
- `POST /` - Create audit log entry
- `GET /export/csv` - Export logs to CSV
- `DELETE /cleanup` - Cleanup old logs (admin)
- `GET /actions` - List available actions
- `GET /stats` - Audit log statistics

### 6. Payment Routes
**File**: `backend/routes/paymentRoutes.js`
**Mount Path**: `/api/payments`
**Description**: Razorpay payment gateway integration

```javascript
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);
```

**Endpoints**:
- `POST /orders` - Create payment order
- `POST /verify` - Verify payment signature
- `POST /capture/:paymentId` - Capture payment
- `GET /:paymentId` - Get payment details
- `POST /refund/:paymentId` - Refund payment
- `GET /:paymentId/refunds` - Get refunds
- `POST /links` - Create payment link
- `POST /links/:linkId/cancel` - Cancel payment link
- `POST /subscriptions` - Create subscription
- `POST /subscriptions/:subscriptionId/cancel` - Cancel subscription
- `POST /customers` - Create customer
- `POST /checkout-config` - Generate checkout config
- `POST /webhook` - Razorpay webhook (PUBLIC)
- `GET /analytics` - Payment analytics

**Dependencies**: 
- `razorpay` npm package

**Environment Variables**:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 7. Export Routes
**File**: `backend/routes/exportRoutes.js`
**Mount Path**: `/api/export`
**Description**: Data export to CSV, Excel, and PDF

```javascript
const exportRoutes = require('./routes/exportRoutes');
app.use('/api/export', exportRoutes);
```

**Endpoints**:
- `POST /businesses` - Export businesses
- `POST /orders` - Export orders
- `POST /leads` - Export leads
- `POST /invoices` - Export invoices
- `POST /payments` - Export payments
- `DELETE /:filename` - Delete export file
- `POST /cleanup` - Cleanup old exports
- `GET /formats` - Available export formats

**Dependencies**: 
- `exceljs` for Excel generation
- `pdfkit` for PDF generation
- `json2csv` for CSV generation

## Complete Integration Example

Update your `backend/app.js`:

```javascript
const express = require('express');
const app = express();

// ... existing middleware ...

// Existing BusinessBuilder routes
const businessBuilderRoutes = require('./routes/businessBuilderRoutes');
app.use('/api/business-builder', businessBuilderRoutes);

// NEW ROUTES - Add these
const businessBuilderAdvancedRoutes = require('./routes/businessBuilderAdvancedRoutes');
const businessBuilderUploadRoutes = require('./routes/businessBuilderUploadRoutes');
const qrCodeRoutes = require('./routes/qrCodeRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const exportRoutes = require('./routes/exportRoutes');

app.use('/api/business-builder/advanced', businessBuilderAdvancedRoutes);
app.use('/api/business-builder/upload', businessBuilderUploadRoutes);
app.use('/api/qrcode', qrCodeRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/export', exportRoutes);

// Serve static files for uploads and exports
app.use('/uploads', express.static('backend/uploads'));
app.use('/exports', express.static('backend/exports'));

// ... rest of app configuration ...
```

## Required NPM Packages

Install these dependencies:

```bash
npm install multer sharp qrcode razorpay exceljs pdfkit json2csv nodemailer handlebars
```

Optional (for S3 storage):
```bash
npm install aws-sdk
```

## Environment Variables

Add to `.env`:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@malabarbazaar.com

# AWS S3 Configuration (optional)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

## Middleware Requirements

Ensure these middleware are configured before routes:

```javascript
// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS (if frontend is on different domain)
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Authentication middleware (should already exist)
// Required for all protected routes
```

## Database Models

Ensure these models are created:

- ✅ `Business.js` (existing)
- ✅ `Invoice.js` (existing)
- ✅ `MiniApp.js` (existing)
- ✅ `MiniAppProduct.js` (existing)
- ✅ `BusinessBuilderOrder.js` (existing)
- ✅ `BusinessBuilderLead.js` (existing)
- ✅ `BusinessBuilderAsset.js` (existing)
- ✅ `BusinessBuilderEvent.js` (existing)
- ⭐ `Payment.js` (NEW - created in this session)

The `Payment.js` model needs to be added to handle Razorpay transactions.

## Directory Structure

Ensure these directories exist:

```
backend/
├── uploads/
│   ├── business-logos/
│   ├── miniapp-banners/
│   ├── product-images/
│   ├── invoice-attachments/
│   └── qrcodes/
├── exports/
├── email-templates/
│   ├── invoice-created.hbs
│   ├── order-confirmation.hbs
│   ├── lead-notification.hbs
│   ├── invoice-reminder.hbs
│   └── business-welcome.hbs
└── routes/
    ├── businessBuilderRoutes.js (existing)
    ├── businessBuilderAdvancedRoutes.js (NEW)
    ├── businessBuilderUploadRoutes.js (NEW)
    ├── qrCodeRoutes.js (NEW)
    ├── webhookRoutes.js (NEW)
    ├── auditLogRoutes.js (NEW)
    ├── paymentRoutes.js (NEW)
    └── exportRoutes.js (NEW)
```

Create directories with:
```bash
mkdir -p backend/uploads/{business-logos,miniapp-banners,product-images,invoice-attachments,qrcodes}
mkdir -p backend/exports
mkdir -p backend/email-templates
```

## Testing the Integration

### 1. Test File Upload
```bash
curl -X POST http://localhost:5000/api/business-builder/upload/business-logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/image.jpg" \
  -F "businessId=business-123"
```

### 2. Test QR Code Generation
```bash
curl -X POST http://localhost:5000/api/qrcode/miniapp \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "miniAppId": "app-123",
    "miniAppUrl": "https://example.com/app-123",
    "options": { "width": 300 }
  }'
```

### 3. Test Payment Order Creation
```bash
curl -X POST http://localhost:5000/api/payments/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "INR",
    "receipt": "order_123",
    "businessId": "business-123"
  }'
```

### 4. Test Data Export
```bash
curl -X POST http://localhost:5000/api/export/businesses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {}
  }'
```

## Security Considerations

1. **Authentication**: All routes (except payment webhook) require authentication
2. **File Upload Security**:
   - Validate file types
   - Limit file sizes
   - Sanitize filenames
   - Scan for malware (optional)

3. **Payment Security**:
   - Verify webhook signatures
   - Use HTTPS in production
   - Store sensitive keys in environment variables
   - Never expose secret keys to frontend

4. **Rate Limiting**: Consider adding rate limiting for:
   - File uploads
   - QR code generation
   - Export operations
   - Webhook endpoints

5. **CORS**: Configure appropriate CORS settings for production

## Monitoring and Logging

All routes include built-in audit logging through `auditLogService`. Monitor:

- Failed payment transactions
- File upload errors
- Export job failures
- Webhook delivery failures

## Error Handling

All routes follow consistent error response format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": "Technical error details (dev mode only)"
}
```

## Next Steps

After integrating routes:

1. ✅ Test each endpoint individually
2. ✅ Test authentication flow
3. ✅ Verify file uploads work
4. ✅ Test payment flow end-to-end
5. ✅ Verify audit logs are being created
6. ✅ Test export functionality
7. ✅ Set up webhook endpoints with Razorpay
8. ✅ Configure email notifications
9. ✅ Set up monitoring and alerts
10. ✅ Load test critical endpoints

## Troubleshooting

### Common Issues

1. **Routes not found (404)**
   - Verify route is registered in app.js
   - Check middleware order
   - Ensure path matches exactly

2. **File upload fails**
   - Check directory permissions
   - Verify multer configuration
   - Check file size limits

3. **Payment webhook not working**
   - Verify webhook URL is publicly accessible
   - Check webhook secret configuration
   - Review Razorpay dashboard logs

4. **Export files not downloading**
   - Ensure export directory exists
   - Check static file serving configuration
   - Verify file permissions

5. **Emails not sending**
   - Check SMTP credentials
   - Verify email templates exist
   - Review nodemailer logs

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review audit logs for user actions
- Enable debug mode for verbose output
- Consult service-specific documentation (Razorpay, AWS, etc.)
