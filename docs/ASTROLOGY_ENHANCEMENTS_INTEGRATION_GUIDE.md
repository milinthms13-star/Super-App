# Astrology Module Optional Enhancements - Integration Guide

## Quick Start for Production Integration

### 1️⃣ Payment Gateway Integration

**In `backend/server.js` or main Express app:**
```javascript
const paymentRoutes = require('./routes/payments');
app.use('/api/astrology', paymentRoutes);
```

**In frontend booking confirmation handler (`src/modules/astrology/AstrologyHome.js`):**
```javascript
// After successful booking, show payment button:
const handleInitiatePayment = async (bookingData) => {
  try {
    // 1. Create Razorpay order
    const orderResponse = await axios.post('/api/astrology/payment/create-order', {
      bookingId: bookingData._id,
      amount: consultationRate * 100, // Razorpay expects amount in paise
      consultantName: bookingData.consultantName,
    });
    
    // 2. Open Razorpay checkout
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY,
      amount: orderResponse.data.amount,
      order_id: orderResponse.data.id,
      handler: handlePaymentSuccess,
      prefill: {
        email: currentUser.email,
        contact: currentUser.phone,
      },
    };
    
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
};

const handlePaymentSuccess = async (response) => {
  try {
    // 3. Verify payment signature
    const verifyResponse = await axios.post('/api/astrology/payment/verify', {
      orderId: response.order_id,
      paymentId: response.razorpay_payment_id,
      signature: response.razorpay_signature,
    });
    
    if (verifyResponse.data.success) {
      showNotification('Payment successful! Consultation booked.');
      // Update booking status in UI
    }
  } catch (error) {
    showNotification('Payment verification failed');
  }
};
```

**Add Razorpay SDK to `public/index.html`:**
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

### 2️⃣ Notifications Integration

**In `backend/services/notificationService.js`, wire email provider:**
```javascript
// Replace mock _sendEmail with real Nodemailer
const nodemailer = require('nodemailer');

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// In any notification method:
await emailTransporter.sendMail({
  from: process.env.EMAIL_USER,
  to: userEmail,
  subject: 'Your Subject',
  html: emailContent,
});
```

**Integrate into booking endpoint (`backend/routes/astrology.js`, ~line 619):**
```javascript
// After booking is created:
const notificationService = require('../services/notificationService');

await notificationService.sendBookingConfirmationEmail({
  userEmail: user.email,
  userName: user.name,
  consultantName: consultant.name,
  slotTime: booking.slotId,
  confirmationCode: booking.confirmationCode,
});

// Send SMS if phone available
if (user.phone) {
  await notificationService.sendBookingConfirmationSMS({
    phoneNumber: user.phone,
    consultantName: consultant.name,
    slotTime: booking.slotId,
    confirmationCode: booking.confirmationCode,
  });
}

// Notify consultant
await notificationService.notifyConsultantOfBooking({
  consultantEmail: consultant.email,
  consultantName: consultant.name,
  userName: user.name,
  slotTime: booking.slotId,
  bookingCode: booking.confirmationCode,
});
```

**Set up reminder scheduler (use `node-cron`):**
```javascript
const cron = require('node-cron');

// Every hour, check for bookings in next 30 minutes
cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const in30mins = new Date(now.getTime() + 30 * 60000);
  
  const upcomingBookings = await AstrologyConsultationBooking.find({
    slotTime: { $gte: now, $lte: in30mins },
  }).populate(['userId', 'consultantId']);
  
  for (const booking of upcomingBookings) {
    if (!booking.reminderSent) {
      await notificationService.sendReminderEmail({
        userEmail: booking.userId.email,
        userName: booking.userId.name,
        consultantName: booking.consultantId.name,
        slotTime: booking.slotId,
      });
      
      booking.reminderSent = true;
      await booking.save();
    }
  }
});
```

---

### 3️⃣ Admin Panel Integration

**In `backend/server.js`:**
```javascript
// Register admin panel routes (create if not exists)
const consultantRoutes = require('./routes/consultant');
app.use('/api/astrology/consultants', consultantRoutes);
```

**Create `backend/routes/consultant.js`:**
```javascript
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

// Get consultant profile
router.get('/:consultantId', authenticate, async (req, res) => {
  try {
    const consultant = await Consultant.findById(req.params.consultantId);
    res.json(consultant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get consultant's bookings
router.get('/:consultantId/bookings', authenticate, async (req, res) => {
  try {
    const bookings = await AstrologyConsultationBooking.find({
      consultantId: req.params.consultantId,
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update booking status
router.patch('/:bookingId/status', authenticate, async (req, res) => {
  try {
    const booking = await AstrologyConsultationBooking.findByIdAndUpdate(
      req.params.bookingId,
      { status: req.body.status },
      { new: true }
    );
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add available slot
router.post('/add-slot', authenticate, async (req, res) => {
  try {
    const consultant = await Consultant.findByIdAndUpdate(
      req.user._id,
      { $push: { availableSlots: req.body.slotTime } },
      { new: true }
    );
    res.json(consultant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**In frontend app routing (`src/index.js` or `src/App.js`):**
```javascript
import ConsultantAdminPanel from './modules/astrology/ConsultantAdminPanel';

// Add route:
<Route path="/consultant-admin" element={<ConsultantAdminPanel />} />
```

---

### 4️⃣ Analytics Dashboard Integration

**Create `backend/routes/analytics.js`:**
```javascript
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(now.getFullYear() - 1);
    
    // Get bookings in period
    const bookings = await AstrologyConsultationBooking.find({
      createdAt: { $gte: startDate, $lte: now },
    });
    
    const completed = bookings.filter(b => b.status === 'completed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const revenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    res.json({
      totalBookings: bookings.length,
      completedBookings: completed,
      cancelledBookings: cancelled,
      totalRevenue: revenue,
      // ... add more metrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Register in main app:**
```javascript
const analyticsRoutes = require('./routes/analytics');
app.use('/api/astrology/analytics', analyticsRoutes);
```

**Add route to frontend:**
```javascript
<Route path="/astrology-analytics" element={<AnalyticsDashboard />} />
```

---

### 5️⃣ A/B Testing Integration

**In booking/consultation components, pass variant:**
```javascript
import ABTestingService from '../../services/abTestingService';

const [variant, setVariant] = useState(null);

useEffect(() => {
  if (currentUser?.id) {
    const variants = ABTestingService.assignVariants(currentUser.id);
    setVariant(variants.consultantCardLayout);
  }
}, [currentUser]);

// Use variant in rendering:
{variant === 'control' && <ControlCardLayout consultant={consultant} />}
{variant === 'compact' && <CompactCardLayout consultant={consultant} />}
{variant === 'expandable' && <ExpandableCardLayout consultant={consultant} />}

// Track interaction:
const handleCardClick = async () => {
  await ABTestingService.trackEvent(
    currentUser.id,
    'consultantCardLayout',
    'click',
    { consultantId: consultant._id }
  );
};
```

---

## Environment Variables Checklist

```bash
# Payment Gateway
RAZORPAY_KEY_ID=xxxx
RAZORPAY_KEY_SECRET=xxxx
REACT_APP_RAZORPAY_KEY=xxxx

# Email Notifications
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-specific-password

# SMS Notifications (choose one)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxxx
AWS_SECRET_ACCESS_KEY=xxxx
# OR
TWILIO_ACCOUNT_SID=xxxx
TWILIO_AUTH_TOKEN=xxxx

# A/B Testing
AB_TEST_ENABLED=true
```

---

## Testing Checklist

- [ ] Payment: Create order → Verify signature → Status check
- [ ] Email: Booking confirmation → Reminder → Consultant notification
- [ ] Admin Panel: Load bookings → Update status → Manage slots
- [ ] Analytics: Load metrics → Filter periods → Export report
- [ ] A/B Test: Assign variant → Track events → View results

---

## Production Deployment Steps

1. Add environment variables to hosting platform
2. Run database migrations for new models
3. Deploy backend with new routes
4. Deploy frontend with new components
5. Test all features in staging
6. Monitor logs for errors
7. Enable notifications gradually (start with email only)
8. Publish admin panel access to consultants

