# New Dependencies Required for Finance Module

## Installation Command

```bash
npm install @sendgrid/mail twilio tesseract.js pdfkit exceljs
```

## Dependencies Details

### 1. @sendgrid/mail (^7.7.0)
- **Purpose**: Email notifications via SendGrid
- **Usage**: Sending application confirmations, status updates, consultant assignments
- **Configuration**: Requires `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` environment variables

### 2. twilio (^4.19.0)
- **Purpose**: SMS and WhatsApp notifications
- **Usage**: Sending SMS alerts, WhatsApp opt-in messages
- **Configuration**: Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_WHATSAPP_NUMBER`

### 3. tesseract.js (^5.0.4)
- **Purpose**: OCR (Optical Character Recognition) for document text extraction
- **Usage**: Extracting text from Aadhaar, PAN, bank statements, salary slips
- **Alternative**: Google Cloud Vision API (if `GOOGLE_VISION_API_KEY` is configured)

### 4. pdfkit (^0.13.0)
- **Purpose**: PDF generation for reports
- **Usage**: Generating lead reports, analytics reports
- **Features**: Creates formatted PDF documents with headers, tables, and styling

### 5. exceljs (^4.3.0)
- **Purpose**: Excel file generation
- **Usage**: Bulk lead exports, analytics reports
- **Features**: Creates XLSX files with multiple sheets, styling, formulas

## Environment Variables to Add

Add these to your `.env` file:

```env
# Email Notifications (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@malabarbazaar.com
SENDGRID_FROM_NAME=Malabar Bazaar Finance

# SMS & WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# Credit Bureau Integration
CIBIL_API_URL=https://api.cibil.com
CIBIL_API_KEY=your_cibil_api_key
CIBIL_MEMBER_ID=your_member_id
EXPERIAN_API_URL=https://api.experian.com
EXPERIAN_API_KEY=your_experian_api_key
EXPERIAN_CLIENT_ID=your_client_id
CREDIT_BUREAU_PROVIDER=cibil

# Document Verification (DigiLocker)
DIGILOCKER_CLIENT_ID=your_digilocker_client_id
DIGILOCKER_CLIENT_SECRET=your_digilocker_client_secret
DIGILOCKER_API_URL=https://api.digitallocker.gov.in

# Google Cloud Vision (Optional, for better OCR)
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# Application URLs
APP_URL=https://malabarbazaar.com
```

## Optional: Production-Grade Alternatives

### For OCR
- **Google Cloud Vision API**: More accurate than Tesseract for complex documents
- **AWS Textract**: Better for structured documents like forms
- **Azure Computer Vision**: Good balance of features and pricing

### For SMS
- **AWS SNS**: Cost-effective for high volume
- **Kaleyra**: Popular in India with good delivery rates
- **MSG91**: India-focused SMS provider

### For Credit Bureau
- **CIBIL TransUnion**: Primary credit bureau in India
- **Experian**: Alternative credit bureau
- **Equifax**: Another alternative option

## Development vs Production

### Development (Mock Mode)
All services include fallback mock responses when APIs are not configured. This allows you to:
- Test the complete flow without real API keys
- Develop features without incurring costs
- Mock responses are clearly marked with `isMock: true` flag

### Production
Configure all necessary API keys for:
- Real notifications sent to users
- Actual credit bureau data
- Document verification via DigiLocker
- Proper fraud detection

## Testing the Services

### Without API Keys (Mock Mode)
```javascript
// All services will return mock data
const result = await creditBureauService.fetchCreditReport(payload);
// result.data.isMock === true
```

### With API Keys
```javascript
// Services will call real APIs
const result = await creditBureauService.fetchCreditReport(payload);
// result.success === true (or false with error)
// result.data contains real data
```

## Cost Estimates (Monthly for 1000 leads)

- **SendGrid**: Free tier (100 emails/day), Pro $19.95/mo (40,000 emails)
- **Twilio SMS**: ~$0.0075/SMS in India = ~$7.50 for 1000 SMS
- **Twilio WhatsApp**: ~$0.005/message = ~$5 for 1000 messages
- **Google Vision**: $1.50 per 1000 images (first 1000 free)
- **CIBIL API**: Varies by agreement, typically ₹10-50 per report
- **DigiLocker**: Free for verified organizations

**Total estimated cost for 1000 leads: ~₹2000-5000/month**
