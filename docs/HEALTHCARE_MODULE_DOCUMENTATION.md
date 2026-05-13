# Healthcare Module Technical Documentation

## Overview
The Healthcare module (NilaCare) provides a comprehensive digital healthcare ecosystem within the Malabar Bazaar platform. It integrates doctor consultations, lab bookings, pharmacy services, health records management, emergency services, and elderly care features.

## Architecture

### Frontend Structure
```
src/modules/healthcare/
├── Healthcare.js              # Main module component
├── Healthcare.css             # Module styles
├── components/                # Sub-components
│   ├── DoctorConsultation.js
│   ├── LabBooking.js
│   ├── RecordsVault.js
│   ├── PharmacyDelivery.js
│   ├── EmergencySOS.js
│   ├── ElderlyCare.js
│   ├── HealthcareNav.js
│   ├── HealthcareHero.js
│   ├── FamilyProfiles.js
│   ├── NotificationsCenter.js
│   ├── PartnerDashboard.js
│   ├── RefillReminders.js
│   └── ...
├── data/
│   └── healthcareMockData.js  # Mock data for development
└── services/
    └── healthcareApi.js       # API service layer
```

### Backend Structure
```
backend/
├── routes/healthcare.js       # Healthcare API routes
├── models/healthcare/         # MongoDB models
│   ├── HealthcareDoctor.js
│   ├── HealthcareAppointment.js
│   ├── HealthcareLabTest.js
│   ├── HealthcarePackage.js
│   ├── HealthcareMedicine.js
│   ├── HealthcareRecord.js
│   ├── HealthcareFamilyProfile.js
│   ├── HealthcareRefillReminder.js
│   ├── HealthcareEmergencyIncident.js
│   ├── HealthcarePartnerApplication.js
│   ├── HealthcareNotification.js
│   └── HealthcarePharmacyOrder.js
└── middleware/                # Authentication middleware
```

## API Endpoints

### Doctor Services
- `GET /api/doctors` - List doctors with filtering
- `POST /api/appointments` - Book appointment
- `GET /api/appointments` - Get user appointments

### Lab Services
- `GET /api/lab-tests` - List available tests
- `GET /api/health-packages` - List health packages
- `POST /api/lab-tests/book` - Book lab test

### Pharmacy Services
- `GET /api/medicines` - Search medicines
- `POST /api/pharmacy/orders` - Place pharmacy order
- `GET /api/pharmacy/orders` - Get order history

### Health Records
- `GET /api/records` - Get health records
- `POST /api/records` - Upload health record
- `GET /api/family-profiles` - Get family profiles

### Emergency Services
- `POST /api/emergency/sos` - Send SOS alert
- `GET /api/emergency/incidents` - Get emergency history
- `POST /api/emergency/location` - Update location for emergency

### Elderly Care
- `GET /api/refill-reminders` - Get medicine reminders
- `POST /api/refill-reminders` - Set refill reminder
- `GET /api/notifications` - Get health notifications

## Data Models

### HealthcareDoctor
```javascript
{
  name: String,
  specialty: String,
  qualifications: String,
  experienceYears: Number,
  consultationFee: Number,
  rating: Number,
  reviewsCount: Number,
  languages: [String],
  clinicAddress: String,
  availableModes: ['clinic', 'video'],
  availableSlots: [{
    date: String,
    times: [String]
  }]
}
```

### HealthcareAppointment
```javascript
{
  userId: ObjectId,
  doctorId: ObjectId,
  appointmentDate: Date,
  appointmentTime: String,
  consultationMode: String,
  status: String,
  notes: String,
  paymentStatus: String
}
```

### HealthcareRecord
```javascript
{
  userId: ObjectId,
  familyProfileId: ObjectId,
  recordType: String, // 'prescription', 'lab_report', 'scan_report'
  title: String,
  fileUrl: String,
  uploadDate: Date,
  recordDate: Date,
  doctorName: String,
  notes: String
}
```

## Authentication & Security

### JWT Authentication
All healthcare endpoints require JWT authentication via Bearer token in Authorization header.

### File Upload Security
- File uploads limited to 10MB
- Accepted formats: PDF, JPG, PNG for prescriptions and reports
- Files stored securely in AWS S3 with signed URLs

### Data Privacy
- Health records encrypted at rest
- Family profile data segregated by user
- Emergency data logged with timestamps

## Features Implementation

### Doctor Consultation
- Specialty-based doctor filtering
- Real-time availability checking
- Video call and clinic visit booking
- Appointment history and management

### Lab Booking
- Comprehensive test catalog
- Health package bundles
- Home collection scheduling
- Test result tracking

### Pharmacy Delivery
- Prescription upload and OCR
- Medicine search and cart functionality
- Delivery tracking
- Order history

### Health Records Vault
- Secure document storage
- Family profile management
- Record sharing capabilities
- Digital health passport

### Emergency & SOS
- One-click emergency alerts
- Location sharing
- Ambulance booking
- Hospital finder integration

### Elderly Care
- Medicine refill reminders
- Appointment notifications
- Health monitoring alerts
- Family caregiver coordination

## Testing Strategy

### Unit Tests
- Component rendering tests
- API service mocking
- State management testing
- Form validation testing

### Integration Tests
- API endpoint testing
- Database operations
- File upload workflows
- Authentication flows

### E2E Tests
- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Performance testing

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] AWS S3 bucket configured
- [ ] SSL certificates installed
- [ ] Domain configured

### Testing
- [ ] Unit tests passing (100% coverage)
- [ ] E2E tests passing
- [ ] Load testing completed
- [ ] Security audit passed

### Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] User analytics enabled
- [ ] Backup systems verified

## Performance Optimization

### Frontend
- Lazy loading of components
- Image optimization
- Caching strategies
- Bundle splitting

### Backend
- Database indexing
- API response caching
- Rate limiting
- Connection pooling

### Database
- Optimized queries
- Proper indexing
- Data archiving strategy
- Backup automation

## Future Enhancements

### Phase 2 Features
- AI-powered health recommendations
- Telemedicine integration
- Wearable device connectivity
- Health insurance integration

### Phase 3 Features
- Multi-language support
- Offline capability
- Advanced analytics dashboard
- Integration with government health schemes

## Support & Maintenance

### Monitoring
- Application performance monitoring
- Error logging and alerting
- User feedback collection
- Regular security updates

### Documentation
- User manuals updated
- API documentation maintained
- Troubleshooting guides
- Release notes published

---

*Last updated: May 13, 2026*
*Version: 1.0.0*</content>
<parameter name="filePath">c:\Users\Dhanya\malabarbazaar\docs\HEALTHCARE_MODULE_DOCUMENTATION.md