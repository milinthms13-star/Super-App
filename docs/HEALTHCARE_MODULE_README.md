# Healthcare Module - Complete Implementation Guide

## 📋 Overview

The Healthcare Module is a comprehensive telemedicine and health management platform integrated into the Malabar Bazaar ecosystem. It provides end-to-end healthcare services including doctor consultations, lab bookings, pharmacy delivery, health records management, and more.

## 🎯 Key Features

### 1. **Doctor Consultation & Telemedicine**
- **Video Consultations**: Real-time WebRTC video calls with doctors
- **Multi-mode Support**: Video, audio, and chat consultations
- **Appointment Management**: Book, reschedule, and cancel appointments
- **Doctor Availability**: Advanced scheduling with recurring patterns
- **Specialty Filtering**: Search doctors by specialty, experience, and ratings
- **Consultation History**: Complete timeline of past consultations

### 2. **Lab Testing & Health Packages**
- **Lab Test Booking**: Book individual tests or health packages
- **Home Sample Collection**: Request home visits for sample collection
- **Lab Report Management**: View and download test results
- **Health Packages**: Curated packages for different age groups and conditions
- **Result Notifications**: Real-time alerts when results are ready
- **OCR Processing**: AI-powered extraction of test results from reports

### 3. **Health Records Vault**
- **Secure Storage**: Encrypted storage of medical records
- **Version Control**: Track document versions and updates
- **Family Profiles**: Manage records for entire family
- **Consent Management**: HIPAA-compliant consent tracking
- **Audit Logging**: Complete audit trail of record access
- **Download & Preview**: Secure access to stored documents
- **Retention Policies**: Automated archival based on retention rules

### 4. **Pharmacy & Medicine Delivery**
- **Medicine Search**: Browse and search medications
- **Prescription Upload**: Upload and verify prescriptions
- **Order Tracking**: Real-time order status updates
- **Refill Reminders**: Automated medication refill alerts
- **Payment Integration**: Razorpay and Stripe support
- **Delivery Scheduling**: Flexible delivery time slots

### 5. **Emergency SOS**
- **Quick Emergency Alerts**: One-tap emergency activation
- **Location Tracking**: Real-time GPS location sharing
- **Contact Notifications**: Auto-notify emergency contacts
- **Ambulance Dispatch**: Integration with emergency services
- **Incident Management**: Track and update emergency incidents

### 6. **Wearables Integration**
- **Device Connectivity**: Apple Health, Google Fit, Fitbit integration
- **Health Metrics**: Steps, heart rate, sleep, calories tracking
- **Anomaly Detection**: AI-powered health anomaly alerts
- **Data Visualization**: Interactive charts and trends
- **Sync Management**: Automatic and manual data synchronization

### 7. **Insurance & Claims**
- **Insurance Card Management**: Store insurance information
- **Claim Submission**: Submit claims with document upload
- **Claim Tracking**: Monitor claim status in real-time
- **Co-pay Calculator**: Calculate patient responsibility
- **Provider Integration**: Direct claim filing with insurance providers

### 8. **Healthcare Analytics**
- **Health Score**: AI-calculated overall health score
- **Trend Analysis**: Track health metrics over time
- **Predictive Insights**: AI-powered health recommendations
- **PDF Reports**: Generate comprehensive health reports
- **Visualization**: Interactive charts and graphs

### 9. **Telemedicine Compliance**
- **License Verification**: Automatic doctor credential verification
- **State Restrictions**: State-specific telemedicine rules enforcement
- **Informed Consent**: Digital consent management
- **Compliance Reporting**: Audit reports for regulatory compliance
- **HIPAA Compliance**: Full healthcare data privacy compliance

### 10. **Multi-language Support**
- **5 Languages**: English, Hindi, Malayalam, Tamil, Telugu
- **Regional Content**: Localized health information
- **RTL Support**: Right-to-left text for supported languages
- **Dynamic Translation**: Runtime language switching

### 11. **AI Health Assistant**
- **Natural Language Q&A**: Ask health questions in plain language
- **Context-Aware**: Understands user's health history
- **Appointment Booking**: Book appointments via conversation
- **Medication Reminders**: Set reminders through chat
- **Health Tips**: Personalized wellness recommendations

### 12. **Partner Dashboard**
- **Healthcare Provider Onboarding**: Streamlined registration
- **Admin Enrollment**: Dedicated admin interface
- **Application Review**: Multi-stage approval workflow
- **Operations Metrics**: Real-time platform analytics
- **Compliance Monitoring**: Track regulatory compliance

## 🏗️ Architecture

### Frontend Components
```
src/modules/healthcare/
├── Healthcare.js                          # Main module orchestrator
├── Healthcare10Home.js                    # Dashboard home page
├── components/
│   ├── DoctorConsultation.js             # Doctor booking & consultations
│   ├── VideoConsultation.js              # WebRTC video consultation UI
│   ├── LabBooking.js                     # Lab test booking
│   ├── LabReportProcessing.js            # OCR-powered report processing
│   ├── RecordsVault.js                   # Medical records management
│   ├── PharmacyDelivery.js               # Medicine ordering
│   ├── RefillReminders.js                # Medication reminders
│   ├── EmergencySOS.js                   # Emergency services
│   ├── InsuranceClaims.js                # Insurance management
│   ├── WearablesIntegration.js           # Wearable device integration
│   ├── FamilyProfiles.js                 # Family member management
│   ├── DoctorAvailabilityManager.js      # Doctor scheduling
│   ├── HealthcareAdminPanel.js           # Admin oversight
│   ├── HealthcareAdminEnrollment.js      # Admin registration
│   ├── HealthcareAIAssistant.js          # AI chatbot
│   ├── NotificationsCenter.js            # Notification hub
│   └── PartnerDashboard.js               # Provider dashboard
├── services/
│   └── healthcareApi.js                  # API service layer
└── data/
    └── healthcareMockData.js             # Mock data for development
```

### Backend Services
```
backend/
├── routes/
│   └── healthcare.js                     # 60+ API endpoints
├── services/
│   ├── healthcareAnalyticsService.js     # Health analytics & scoring
│   ├── telemedicineComplianceService.js  # Compliance & licensing
│   ├── paymentGatewayService.js          # Payments & installments
│   └── offlineSyncService.js             # Offline data sync
└── models/healthcare/
    ├── HealthcareDoctor.js               # Doctor profiles
    ├── HealthcareAppointment.js          # Appointments
    ├── HealthcareLabReport.js            # Lab results
    ├── HealthcarePrescription.js         # Prescriptions
    ├── HealthcareRecord.js               # Medical records
    ├── HealthcareWearableData.js         # Wearable device data
    ├── HealthcareInsuranceClaim.js       # Insurance claims
    ├── HealthcareLicenseVerification.js  # License verification
    ├── HealthcareInformedConsent.js      # Consent records
    └── [15 more models...]
```

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js and npm
node --version  # v14+ required
npm --version   # v6+ required

# MongoDB
mongod --version  # v4.4+ required

# Environment variables
cp .env.example .env
```

### Installation

1. **Install Dependencies**
```bash
npm install
```

2. **Required NPM Packages**
```bash
# Core dependencies (already in package.json)
npm install react react-dom react-router-dom
npm install axios mongoose express

# WebRTC for video consultations
npm install simple-peer socket.io-client

# Payment gateways
npm install razorpay stripe

# PDF generation
npm install pdfkit

# OCR (optional, for production)
npm install tesseract.js

# Wearables integration
npm install @fitbit/web-api apple-healthkit
```

3. **Configure Environment Variables**
```bash
# Add to .env file

# Payment Gateway
PAYMENT_PROVIDER=razorpay  # or 'stripe'
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/malabarbazaar

# WebRTC (optional, for TURN server)
TURN_SERVER_URL=turn:your-turn-server.com
TURN_USERNAME=username
TURN_PASSWORD=password

# File Storage (AWS S3 or local)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=your_bucket_name
AWS_REGION=us-east-1

# External APIs (optional)
MEDICAL_COUNCIL_API_KEY=your_api_key
INSURANCE_PROVIDER_API_KEY=your_api_key
```

4. **Database Setup**
```bash
# Start MongoDB
mongod

# The application will automatically create collections
# on first use with proper indexes
```

5. **Run the Application**
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Quick Test
```bash
# Navigate to healthcare module
http://localhost:3000/healthcare

# Test user credentials (if using mock auth)
Email: patient@example.com
Password: password123

# Admin credentials
Email: admin@malabarbazaar.com
Password: admin123
```

## 📱 Usage Examples

### 1. Book a Doctor Consultation
```javascript
// Via API
const appointment = await healthcareApi.createAppointment({
  doctorId: 'DOC123',
  doctorName: 'Dr. Sharma',
  appointmentDate: '2026-07-15',
  appointmentTime: '10:00 AM',
  category: 'doctor',
  mode: 'video',
  patientName: 'John Doe',
  reason: 'General checkup',
  amount: 500,
});
```

### 2. Upload Medical Record
```javascript
const record = await healthcareApi.createRecord({
  meta: {
    title: 'Blood Test Report',
    category: 'Lab Report',
    familyMember: 'Self',
    recordDate: '2026-07-01',
  },
  file: fileObject,
});
```

### 3. Process Lab Report with OCR
```javascript
// Component automatically handles OCR
<LabReportProcessing
  onSaveReport={handleCreateRecord}
  familyMembers={['Self', 'Spouse', 'Child']}
  loading={false}
/>
```

### 4. Check Insurance Co-pay
```javascript
const copay = await paymentGatewayService.calculateInsuranceCoPay({
  totalAmount: 5000,
  insuranceProvider: 'Star Health',
  policyNumber: 'POL123456',
  treatmentType: 'surgery',
});

console.log(`Insurance covers: ₹${copay.insuranceCoverage}`);
console.log(`Patient pays: ₹${copay.coPayAmount}`);
```

### 5. Create Installment Plan
```javascript
const plan = await paymentGatewayService.createInstallmentPlan({
  orderId: 'ORD123',
  totalAmount: 10000,
  numberOfInstallments: 4,
  frequency: 'monthly',
  customerInfo: { name: 'John Doe', email: 'john@example.com' },
});
```

### 6. Verify Telemedicine Compliance
```javascript
const compliance = await telemedicineComplianceService.performComplianceCheck({
  doctorId: 'DOC123',
  appointmentId: 'APT123',
  patientState: 'Kerala',
  consultationType: 'video',
});

if (compliance.compliant) {
  // Proceed with consultation
} else {
  // Show compliance errors
  console.log(compliance.errors);
}
```

## 🔒 Security & Compliance

### Data Security
- **Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access control (RBAC)
- **Audit Logging**: Complete audit trail of all data access
- **Data Retention**: Automated archival based on policies

### Healthcare Compliance
- **HIPAA Compliance**: Full healthcare data privacy compliance
- **Informed Consent**: Digital consent management
- **License Verification**: Automatic credential checking
- **State Regulations**: Enforcement of state-specific telemedicine rules

### Payment Security
- **PCI DSS**: Compliant payment processing
- **Secure Tokens**: Tokenized payment information
- **3D Secure**: Support for 3D Secure authentication

## 🌐 API Documentation

Complete API documentation is available at:
- **Documentation File**: `docs/healthcare-api-documentation.md`
- **Postman Collection**: Available on request
- **OpenAPI Spec**: Coming soon

### Key Endpoints
```
POST   /api/healthcare/appointments          # Create appointment
GET    /api/healthcare/appointments          # List appointments
PUT    /api/healthcare/appointments/:id      # Update appointment
DELETE /api/healthcare/appointments/:id      # Cancel appointment

POST   /api/healthcare/records               # Upload record
GET    /api/healthcare/records               # List records
DELETE /api/healthcare/records/:id           # Archive record

POST   /api/healthcare/pharmacy/orders       # Create pharmacy order
GET    /api/healthcare/pharmacy/orders       # List orders
PUT    /api/healthcare/pharmacy/orders/:id   # Update order status

GET    /api/healthcare/analytics/health-score # Get health score
GET    /api/healthcare/analytics/trends       # Get health trends
POST   /api/healthcare/analytics/report       # Generate PDF report

POST   /api/healthcare/compliance/verify-license  # Verify license
POST   /api/healthcare/compliance/check            # Compliance check
POST   /api/healthcare/compliance/consent          # Create consent

POST   /api/healthcare/payment/create-order        # Create payment
POST   /api/healthcare/payment/installment-plan    # Create installment
POST   /api/healthcare/payment/copay-calculate     # Calculate co-pay
```

## 🌍 Internationalization

The module supports 5 languages with complete translations:

```javascript
import { translations } from 'src/i18n/healthcare-translations';

// Available languages
const languages = ['en', 'hi', 'ml', 'ta', 'te'];

// Use translations
const greeting = translations['hi'].greeting; // "नमस्ते"
```

### Adding New Language
1. Add translations to `src/i18n/healthcare-translations.js`
2. Include language in `availableLanguages` array
3. Update language selector component

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run healthcare module tests
npm test -- --testPathPattern=healthcare

# Run specific component tests
npm test -- VideoConsultation.test.js

# Run with coverage
npm test -- --coverage
```

### Test Coverage
- Unit Tests: Component and service logic
- Integration Tests: API endpoints
- E2E Tests: Complete user workflows

## 🔧 Troubleshooting

### Common Issues

**1. Video Consultation Not Connecting**
```bash
# Check WebRTC dependencies
npm list simple-peer socket.io-client

# Verify TURN server configuration
# Add TURN server credentials to .env
```

**2. Payment Gateway Errors**
```bash
# Verify API keys in .env
echo $RAZORPAY_KEY_ID
echo $STRIPE_SECRET_KEY

# Check payment provider mode (test/live)
```

**3. OCR Not Working**
```bash
# Install Tesseract.js for production
npm install tesseract.js

# Update LabReportProcessing.js to use actual Tesseract
```

**4. Database Connection Issues**
```bash
# Check MongoDB connection
mongosh
use malabarbazaar
db.healthcareappointments.find().limit(1)
```

## 📊 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy load healthcare components
- **Image Optimization**: Compress medical images before upload
- **Caching**: Cache doctor lists and health packages
- **Virtual Scrolling**: For large record lists

### Backend Optimization
- **Database Indexes**: Proper indexing on frequently queried fields
- **Caching**: Redis cache for frequently accessed data
- **Query Optimization**: Aggregation pipelines for analytics
- **File Storage**: CDN for medical records and images

## 🚢 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure CORS policies
- [ ] Set up monitoring (New Relic, Datadog)
- [ ] Configure backup strategy
- [ ] Set up error logging (Sentry)
- [ ] Enable rate limiting
- [ ] Configure CDN for static assets
- [ ] Set up health check endpoints

### Environment-Specific Configs
```javascript
// config/healthcare.config.js
module.exports = {
  development: {
    webrtc: { simulateConnection: true },
    payment: { provider: 'simulated' },
    ocr: { simulateProcessing: true },
  },
  production: {
    webrtc: { turnServer: process.env.TURN_SERVER_URL },
    payment: { provider: 'razorpay' },
    ocr: { engine: 'tesseract' },
  },
};
```

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Appointment booking rate
- Video consultation success rate
- Payment conversion rate
- Lab report processing time
- System uptime and availability
- API response times
- Error rates by endpoint

### Logging
```javascript
// Structured logging
logger.info('Appointment created', {
  userId: 'USER123',
  appointmentId: 'APT456',
  doctorId: 'DOC789',
  timestamp: new Date(),
});
```

## 🤝 Contributing

See the main project contributing guidelines.

## 📄 License

This project is part of Malabar Bazaar. All rights reserved.

## 📞 Support

For technical support:
- Email: support@malabarbazaar.com
- Documentation: docs.malabarbazaar.com/healthcare
- Issue Tracker: github.com/malabarbazaar/issues

## 🙏 Acknowledgments

- WebRTC implementation inspired by Simple-Peer
- OCR powered by Tesseract.js
- Payment integration with Razorpay and Stripe
- Analytics visualizations using Chart.js

---

**Last Updated**: July 7, 2026  
**Version**: 1.0.0  
**Maintained By**: Malabar Bazaar Development Team
