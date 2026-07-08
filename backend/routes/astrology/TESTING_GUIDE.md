# Astrology Module Testing Guide

## Overview
Comprehensive testing guide for the AstroNila astrology module covering unit tests, integration tests, end-to-end tests, and manual testing procedures.

---

## Table of Contents
1. [Test Setup](#test-setup)
2. [Running Tests](#running-tests)
3. [Backend Tests](#backend-tests)
4. [Frontend Tests](#frontend-tests)
5. [Integration Tests](#integration-tests)
6. [Manual Testing Procedures](#manual-testing-procedures)
7. [Test Coverage](#test-coverage)
8. [CI/CD Integration](#cicd-integration)

---

## Test Setup

### Prerequisites

Ensure you have the following installed:
- Node.js v16+
- Jest test framework
- Supertest for API testing
- React Testing Library for component tests

### Installation

```bash
# Install backend test dependencies
cd backend
npm install --save-dev jest supertest @types/jest

# Install frontend test dependencies
cd ../frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Environment Configuration

Create a `.env.test` file for test environment:

```env
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/malabarbazaar_test
RAZORPAY_KEY_ID=rzp_test_mock_key
RAZORPAY_KEY_SECRET=mock_secret_key
JWT_SECRET=test_jwt_secret
DISABLE_BACKGROUND_SERVICES=true
```

---

## Running Tests

### Backend Tests

```bash
# Run all backend tests
cd backend
npm test

# Run specific test file
npm test -- routes/astrology/__tests__/profile.routes.test.js

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run only astrology module tests
npm test -- astrology
```

### Frontend Tests

```bash
# Run all frontend tests
cd frontend
npm test

# Run specific test file
npm test -- src/modules/astrology/__tests__/hooks/useAstrologyAI.test.js

# Run tests with coverage
npm test -- --coverage --watchAll=false

# Run tests in watch mode
npm test
```

---

## Backend Tests

### Route Tests

**Profile Routes** (`profile.routes.test.js`)
- GET /api/astrology/profile - Retrieve user profile
- PUT /api/astrology/profile - Update user profile
- DELETE /api/astrology/profile - Delete user profile
- Validation and authorization tests

**Consultation Routes** (`consultations.routes.test.js`)
- GET /api/astrology/consultations/consultants - List all consultants
- POST /api/astrology/consultations/bookings - Create new booking
- GET /api/astrology/consultations/bookings - Get user bookings
- PATCH /api/astrology/consultations/:id/status - Update booking status
- POST /api/astrology/consultations/consultants/add-slot - Add availability slot
- Authorization checks for consultants and admins
- Slot conflict detection tests

**Payment Routes** (`payments.routes.test.js`)
- POST /api/astrology/payments/:bookingId/create-order - Create Razorpay order
- POST /api/astrology/payments/:bookingId/verify - Verify payment signature
- GET /api/astrology/payments/:bookingId/status - Get payment status
- POST /api/astrology/payments/:bookingId/refund - Process refund
- GET /api/astrology/payments/:bookingId/receipt - Download receipt PDF
- Signature verification tests
- Idempotency checks
- Webhook processing tests

**Analytics Routes** (`analytics.routes.test.js`)
- GET /api/astrology/analytics/dashboard - Dashboard metrics
- GET /api/astrology/analytics/alerts - Operational alerts
- POST /api/astrology/analytics/reports - Generate reports (PDF/CSV)
- GET /api/astrology/analytics/consultants - Consultant statistics
- GET /api/astrology/analytics/revenue - Revenue trends
- GET /api/astrology/analytics/users - User statistics
- Admin authorization tests
- Data aggregation tests

### Service Tests

**Astrology Backend Service** (`astrologyBackendService.test.js`)
```javascript
describe('astrologyBackendService', () => {
  it('should normalize sign names correctly');
  it('should calculate Nakshatra from birth details');
  it('should generate daily horoscope');
  it('should calculate compatibility score');
  it('should generate Kundli data');
  it('should handle consultant management');
  it('should process booking operations');
  it('should generate analytics metrics');
});
```

**Notification Scheduler** (`astrologyNotificationScheduler.test.js`)
```javascript
describe('AstrologyNotificationScheduler', () => {
  it('should initialize all cron jobs');
  it('should send daily horoscopes at 6 AM');
  it('should send festival reminders');
  it('should detect and alert Dasha period changes');
  it('should send Muhurat alerts');
  it('should send consultation reminders 30 min before');
  it('should handle email template loading');
  it('should gracefully shutdown all jobs');
});
```

---

## Frontend Tests

### Hook Tests

**useAstrologyAI** (`useAstrologyAI.test.js`)
- Initialize with empty conversation history
- Load history from localStorage
- Ask question and update history
- Handle errors gracefully
- Clear conversation history
- Persist history to localStorage

**useAstrologyPayments** (`useAstrologyPayments.test.js`)
- Create payment order
- Verify payment signature
- Request refund
- Download receipt
- Handle payment errors
- Track payment status

**useAstrologyNotifications** (`useAstrologyNotifications.test.js`)
- Load notification preferences
- Update individual preference
- Toggle preference on/off
- Enable all notifications
- Disable all notifications
- Handle update errors

**useAstrologyFamilyProfiles** (`useAstrologyFamilyProfiles.test.js`)
- Add family member profile
- Edit existing profile
- Delete profile
- Generate Kundli for family member
- Check compatibility between members
- Duplicate profile

### Component Tests

**View Components**
- `ProfileView.test.js` - Profile form, validation, save operations
- `ConsultView.test.js` - Consultant list, booking flow, slot selection
- `YearlyView.test.js` - Yearly horoscope display, PDF download
- `TotalView.test.js` - Total life reading, life area insights
- `AIView.test.js` - AI assistant interface, conversation history
- `PanchangamView.test.js` - Daily Panchangam, auspicious times
- `FamilyProfilesView.test.js` - Family member CRUD, compatibility checks

**Main Components**
- `AstrologyHome.test.js` - Navigation, tab switching, search
- `AnalyticsDashboard.test.js` - Metrics display, charts, filters
- `ConsultantAdminPanel.test.js` - Booking management, earnings, availability

---

## Integration Tests

### Payment Flow Integration

```javascript
describe('End-to-End Payment Flow', () => {
  it('should complete full payment cycle', async () => {
    // 1. Create booking
    const booking = await createBooking(consultant, slot, user);
    
    // 2. Create payment order
    const order = await createPaymentOrder(booking.id);
    
    // 3. Simulate payment success
    const payment = await simulatePayment(order.id);
    
    // 4. Verify payment
    const verified = await verifyPayment(booking.id, payment);
    
    // 5. Check booking status
    expect(verified.status).toBe('confirmed');
    expect(verified.paymentStatus).toBe('completed');
  });
});
```

### Consultation Booking Flow

```javascript
describe('Consultation Booking Flow', () => {
  it('should complete booking from selection to confirmation', async () => {
    // 1. Load consultants
    const consultants = await getConsultants();
    
    // 2. Select consultant and slot
    const selected = consultants[0];
    const slot = selected.availableSlots[0];
    
    // 3. Create booking
    const booking = await createBooking({
      consultantId: selected.id,
      slotId: slot.id,
      notes: 'Test booking',
    });
    
    // 4. Process payment
    const payment = await processPayment(booking.id);
    
    // 5. Verify confirmation email sent
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'booking-confirmation',
      })
    );
  });
});
```

---

## Manual Testing Procedures

### User Profile Management

**Test Case 1: Create Profile**
1. Navigate to Astrology → Profile
2. Enter birth details (date, time, place, timezone)
3. Select zodiac sign
4. Enter Nakshatra and Rashi
5. Save profile
6. Verify success message
7. Check profile persists on page reload

**Expected Result**: Profile saved successfully with all details

**Test Case 2: Update Profile**
1. Navigate to Profile
2. Modify existing details
3. Save changes
4. Verify updated values displayed
5. Check database record updated

**Expected Result**: Changes saved and reflected immediately

### Consultation Booking

**Test Case 3: Book Consultation**
1. Navigate to Astrology → Consultations
2. Browse available consultants
3. Select consultant
4. Choose available time slot
5. Add optional notes
6. Click "Book Consultation"
7. Proceed to payment
8. Complete Razorpay payment
9. Verify booking confirmation

**Expected Result**: Booking created, payment processed, confirmation email received

**Test Case 4: Cancel Booking**
1. Go to "My Bookings"
2. Select active booking
3. Click "Cancel"
4. Confirm cancellation
5. Verify refund initiated
6. Check booking status updated

**Expected Result**: Booking cancelled, refund processed

### Payment Operations

**Test Case 5: Payment Verification**
1. Create booking
2. Initiate payment
3. Complete payment on Razorpay
4. Return to application
5. Verify signature validated
6. Check payment status updated
7. Download receipt

**Expected Result**: Payment verified, receipt generated

**Test Case 6: Refund Request**
1. Find completed booking
2. Request refund with reason
3. Submit refund request
4. Verify admin notified
5. Check refund status
6. Confirm amount refunded

**Expected Result**: Refund processed within 5-7 days

### Analytics Dashboard (Admin Only)

**Test Case 7: View Dashboard**
1. Login as admin
2. Navigate to Analytics
3. Select time period (week/month/quarter)
4. View key metrics
5. Check operational alerts
6. Download PDF report
7. Download CSV report

**Expected Result**: All metrics displayed correctly, reports downloadable

### Notifications

**Test Case 8: Daily Horoscope**
1. Enable daily horoscope notifications
2. Wait for 6:00 AM (or trigger manually in test)
3. Check email received
4. Verify in-app notification
5. Check horoscope content accurate

**Expected Result**: Notification received on time with correct content

**Test Case 9: Consultation Reminder**
1. Book consultation for 30 minutes from now
2. Wait for reminder time
3. Check email reminder
4. Verify in-app notification
5. Check booking link works

**Expected Result**: Reminder received 30 minutes before consultation

---

## Test Coverage

### Coverage Goals

- **Backend Routes**: 85%+ coverage
- **Frontend Components**: 80%+ coverage
- **Hooks**: 90%+ coverage
- **Services**: 85%+ coverage
- **Critical Paths**: 100% coverage (payment, booking, authentication)

### Generating Coverage Reports

```bash
# Backend coverage
cd backend
npm test -- --coverage --coverageDirectory=coverage

# Frontend coverage
cd frontend
npm test -- --coverage --coverageDirectory=coverage --watchAll=false

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Requirements by Module

| Module | Lines | Functions | Branches | Statements |
|--------|-------|-----------|----------|------------|
| Routes | 85% | 80% | 80% | 85% |
| Services | 85% | 85% | 75% | 85% |
| Hooks | 90% | 90% | 85% | 90% |
| Components | 80% | 75% | 70% | 80% |
| Utils | 90% | 90% | 85% | 90% |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Astrology Module Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      - name: Run backend tests
        run: npm test -- --coverage
        working-directory: ./backend
      - name: Upload coverage
        uses: codecov/codecov-action@v2

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
        working-directory: ./frontend
      - name: Run frontend tests
        run: npm test -- --coverage --watchAll=false
        working-directory: ./frontend
```

### Pre-commit Hooks

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before commit
npm test -- --bail --findRelatedTests
```

---

## Troubleshooting

### Common Test Issues

**Issue: MongoDB connection timeout**
```bash
# Solution: Use in-memory MongoDB
npm install --save-dev mongodb-memory-server
```

**Issue: Razorpay mock not working**
```bash
# Solution: Ensure Razorpay is mocked at module level
jest.mock('razorpay');
```

**Issue: LocalStorage not defined in tests**
```javascript
// Solution: Add to test setup
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
```

**Issue: Axios requests failing in tests**
```javascript
// Solution: Mock axios at module level
jest.mock('axios');
```

---

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock External Services**: Don't call real APIs in tests
3. **Test Edge Cases**: Invalid input, network errors, authorization failures
4. **Use Descriptive Names**: Test names should explain what they verify
5. **Avoid Test Interdependencies**: Tests should not rely on execution order
6. **Clean Up**: Reset mocks and state between tests
7. **Test User Journeys**: Include integration tests for critical flows
8. **Monitor Coverage**: Maintain coverage above thresholds
9. **Fast Tests**: Keep unit tests under 100ms
10. **Readable Assertions**: Use clear, specific assertions

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest API Testing](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
