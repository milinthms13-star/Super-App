# Finance Module - Quick Start Guide

## 🎯 What Was Built

A complete **Finance Lead Management System** with:
- ✅ SMS/Email/WhatsApp notifications
- ✅ Credit bureau integration (CIBIL/Experian)
- ✅ Document verification (OCR + DigiLocker)
- ✅ Fraud detection system
- ✅ PDF/Excel reporting
- ✅ Automated workflow & lead assignment
- ✅ CRM features (calls, notes, tasks, meetings)
- ✅ Multi-language support (6 languages)
- ✅ Institution partner portal

## 🚀 Step-by-Step Setup

### 1. Install Dependencies

```bash
cd backend
npm install @sendgrid/mail twilio tesseract.js pdfkit exceljs
```

### 2. Run Setup Verification

```bash
node scripts/setupFinanceServices.js
```

This will check:
- ✅ All files are present
- ✅ Dependencies are installed
- ⚠️ Environment variables (shows what's missing)

### 3. Configure Environment Variables

Create or update `backend/.env`:

```env
# ===== REQUIRED FOR PRODUCTION =====

# Email Notifications
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@malabarbazaar.com
SENDGRID_FROM_NAME=Malabar Bazaar Finance

# SMS & WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# ===== OPTIONAL (Will use mock data if not configured) =====

# Credit Bureau
CIBIL_API_URL=https://api.cibil.com
CIBIL_API_KEY=xxxxx
CIBIL_MEMBER_ID=xxxxx

EXPERIAN_API_URL=https://api.experian.com
EXPERIAN_API_KEY=xxxxx
EXPERIAN_CLIENT_ID=xxxxx

CREDIT_BUREAU_PROVIDER=cibil

# DigiLocker
DIGILOCKER_CLIENT_ID=xxxxx
DIGILOCKER_CLIENT_SECRET=xxxxx
DIGILOCKER_API_URL=https://api.digitallocker.gov.in

# Google Vision (Better OCR)
GOOGLE_VISION_API_KEY=xxxxx

# App URL
APP_URL=https://malabarbazaar.com
```

### 4. Test in Development (Mock Mode)

**Without API keys**, all services work in mock mode:

```javascript
// Returns mock credit report
const report = await creditBureauService.fetchCreditReport(data);
// report.data.isMock === true

// Logs but doesn't send
const notification = await notificationService.sendSMS(phone, message);
// notification.success === false, reason: 'twilio-not-configured'
```

### 5. Start Server

```bash
npm start
```

## 📍 Available Endpoints

### Core Finance APIs
- `GET /api/finance/institutions` - List financial institutions
- `POST /api/finance/eligibility` - Check eligibility
- `POST /api/finance/leads` - Create lead
- `GET /api/finance/leads` - List leads (consultant/admin)
- `PATCH /api/finance/leads/:leadId/status` - Update status

### New APIs - Notifications
- Automatic on lead events (create, status change, assignment)
- Templates: Lead Received, Documents Pending, Consultant Assigned, Approved, Rejected

### New APIs - Credit Bureau
- `POST /api/finance/credit-bureau/check` - Fetch credit report
  ```json
  {
    "fullName": "John Doe",
    "pan": "ABCDE1234F",
    "phone": "9876543210",
    "dob": "1990-01-01",
    "gender": "Male",
    "state": "Kerala",
    "district": "Trivandrum",
    "pincode": "695001"
  }
  ```

### New APIs - Document Verification
- `POST /api/finance/documents/verify` - Verify document with OCR
  ```bash
  curl -X POST /api/finance/documents/verify \
    -F "document=@aadhaar.jpg" \
    -F "documentType=aadhaar" \
    -F "aadhaarNumber=123456789012"
  ```

### New APIs - Fraud Detection
- `POST /api/finance/fraud/check` - Check fraud risk
  ```json
  {
    "phone": "9876543210",
    "pan": "ABCDE1234F",
    "aadhaarNumber": "123456789012"
  }
  ```

### New APIs - Reporting
- `GET /api/finance/reports/lead/:leadId/pdf` - Generate PDF report
- `POST /api/finance/reports/leads/excel` - Export leads to Excel
- `GET /api/finance/reports/analytics` - Analytics report

### New APIs - Workflow
- `POST /api/finance/workflow/assign-lead` - Auto-assign lead
  ```json
  {
    "leadId": "FIN-1234",
    "strategy": "load-balanced"
  }
  ```
  Strategies: `round-robin`, `load-balanced`, `skill-based`, `geographic`

- `POST /api/finance/workflow/bulk-assign` - Bulk assign leads

### New APIs - CRM
- `POST /api/finance/crm/calls` - Log call
- `POST /api/finance/crm/notes` - Add note
- `POST /api/finance/crm/tasks` - Create task
- `PATCH /api/finance/crm/tasks/:taskId/complete` - Complete task
- `GET /api/finance/crm/tasks/pending` - Get pending tasks
- `GET /api/finance/crm/timeline/:leadId` - Get activity timeline
- `GET /api/finance/crm/activity-summary` - Get activity summary
- `POST /api/finance/crm/meetings` - Schedule meeting

### New APIs - Institution Portal
- `GET /api/finance/institution/profile` - Get profile
- `PATCH /api/finance/institution/profile` - Update profile
- `GET /api/finance/institution/leads` - Get assigned leads
- `PATCH /api/finance/institution/leads/:leadId/review` - Review lead
- `GET /api/finance/institution/dashboard` - Get dashboard
- `GET /api/finance/institution/offers` - Get offers
- `POST /api/finance/institution/offers` - Add/update offer
- `GET /api/finance/institution/analytics` - Get analytics

### New APIs - Multi-Language
- `GET /api/finance/locales` - Get supported languages
  ```json
  {
    "success": true,
    "locales": [
      { "code": "en", "name": "English", "nativeName": "English" },
      { "code": "ml", "name": "Malayalam", "nativeName": "മലയാളം" },
      { "code": "te", "name": "Telugu", "nativeName": "తెలుగు" },
      { "code": "ta", "name": "Tamil", "nativeName": "தமிழ்" },
      { "code": "hi", "name": "Hindi", "nativeName": "हिन्दी" },
      { "code": "kn", "name": "Kannada", "nativeName": "ಕನ್ನಡ" }
    ]
  }
  ```

## 🧪 Testing

### Test Notification Service
```javascript
const notificationService = require('./backend/services/notificationService');

// Send test SMS (mock mode if not configured)
await notificationService.sendSMS('9876543210', 'Test message');

// Send test email
await notificationService.sendEmail(
  'test@example.com',
  'Test Subject',
  '<h1>Test Email</h1>'
);
```

### Test Credit Bureau
```javascript
const creditBureauService = require('./backend/services/creditBureauService');

const report = await creditBureauService.fetchCreditReport({
  fullName: 'Test User',
  pan: 'ABCDE1234F',
  phone: '9876543210',
  consentTimestamp: new Date().toISOString()
});

console.log('Score:', report.data.score);
console.log('Is Mock:', report.data.isMock);
```

### Test Document Verification
```javascript
const docService = require('./backend/services/documentVerificationService');

const result = await docService.extractTextFromDocument(
  '/path/to/aadhaar.jpg',
  'aadhaar'
);

console.log('Extracted:', result.extracted);
```

### Test Fraud Detection
```javascript
const fraudService = require('./backend/services/fraudDetectionService');

const check = await fraudService.performFraudCheck(
  { phone: '9876543210', pan: 'ABCDE1234F' },
  '192.168.1.1',
  'Mozilla/5.0...'
);

console.log('Risk Score:', check.riskScore);
console.log('Risk Level:', check.overallRisk);
console.log('Blocked:', check.blocked);
```

### Test Auto-Assignment
```javascript
const workflowService = require('./backend/services/workflowService');

const result = await workflowService.assignLeadToConsultant(
  'FIN-1234',
  'load-balanced'
);

console.log('Assigned to:', result.consultant.name);
```

## 📊 Monitoring

### Check Service Health
```bash
# All services log their status
grep "not configured" logs/app.log
```

### Check Mock Mode Status
```bash
# Look for mock mode indicators
grep "isMock" logs/app.log
```

## 🐛 Troubleshooting

### Issue: Notifications not sending
**Solution**: Check `.env` for `SENDGRID_API_KEY` and `TWILIO_*` variables

### Issue: OCR not working
**Solution**: 
1. Install Tesseract dependencies: `brew install tesseract` (Mac) or `apt-get install tesseract-ocr` (Linux)
2. Or configure `GOOGLE_VISION_API_KEY` for better results

### Issue: Credit bureau always returns mock
**Solution**: Configure `CIBIL_API_KEY` or `EXPERIAN_API_KEY` in `.env`

### Issue: High fraud scores for all leads
**Solution**: Review thresholds in `fraudDetectionService.js` - adjust `calculateOverallRiskScore()`

### Issue: PDF generation fails
**Solution**: Ensure `pdfkit` is installed: `npm install pdfkit`

## 📚 Documentation Files

1. **FINANCE_IMPLEMENTATION_SUMMARY.md** - Complete overview of everything built
2. **backend/FINANCE_NEW_DEPENDENCIES.md** - Dependencies and configuration guide
3. **FINANCE_MODULE_ANALYSIS.md** - Original gap analysis
4. **QUICK_START_GUIDE.md** - This file

## 🎯 Next Steps

### For Backend Developers
1. ✅ Backend is complete
2. Test all endpoints with Postman/Insomnia
3. Configure production environment variables
4. Set up monitoring and logging

### For Frontend Developers
Build UI components to consume these APIs:
1. Notification settings panel
2. Credit score viewer
3. Document upload with OCR results
4. Fraud alert widget
5. CRM timeline view
6. Task manager
7. Meeting scheduler
8. Institution portal dashboard
9. Language switcher
10. Analytics charts

### For DevOps
1. Configure API keys in production
2. Set up Redis for caching
3. Configure log aggregation
4. Set up monitoring (Sentry, New Relic)
5. Configure auto-scaling
6. Set up backup strategy

## 💰 Cost Estimates

For 1000 leads/month:
- SendGrid: Free (100 emails/day) or $19.95/mo
- Twilio SMS: ~$7.50 (India rates)
- Twilio WhatsApp: ~$5
- Google Vision: $1.50 (first 1000 free)
- CIBIL API: ₹10-50 per report (varies)
- DigiLocker: Free

**Total: ~₹2000-5000/month**

## 🔒 Security Checklist

- [ ] All API keys stored in environment variables (not in code)
- [ ] Rate limiting enabled on all routes
- [ ] Virus scanning on all file uploads
- [ ] Input validation with Joi schemas
- [ ] Authentication required on all sensitive routes
- [ ] Role-based access control implemented
- [ ] Audit logging enabled
- [ ] HTTPS enforced in production
- [ ] CORS configured properly
- [ ] SQL injection prevention (using Mongoose ODM)

## ✅ You're Ready!

The Finance Module backend is **100% complete** with all missing features implemented. All services include mock modes for development and will work seamlessly once you configure the production API keys.

**Happy coding! 🚀**
