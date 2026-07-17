# Professional Classified Module - Implementation Guide

## 🎯 Overview
This guide covers the complete implementation of the professional classified ads module with subscription-based contact access and integrated messaging.

---

## ✅ Completed Implementation (Tasks #1-8)

### Backend Infrastructure

#### 1. Database Models
- **ClassifiedAd Model** (`backend/models/ClassifiedAd.js`)
  - Added: `contactVisibility`, `contactPhone`, `contactEmail`, `contactWhatsApp`
  - Added: `linkedChatIds[]`, `contactUnlocks`, `unlockedByUsers[]`
  - Added: `sellerSubscriptionTier`, `sellerSubscriptionExpiry`

- **ClassifiedSubscription Model** (`backend/models/ClassifiedSubscription.js`)
  - Complete subscription lifecycle management
  - Payment tracking with history
  - Usage limits and entitlements
  - Virtual properties and helper methods

- **User Model** (`backend/models/User.js`)
  - Added: `classifiedsSubscriptionTier`, `classifiedsSubscriptionExpiry`
  - Added: `classifiedsContactUnlocksRemaining`, `classifiedsContactUnlocksUsed`

#### 2. API Routes (`backend/routes/classified-subscription.js`)

**Subscription Management:**
```
POST   /api/classifieds/subscription/create
GET    /api/classifieds/subscription/current
POST   /api/classifieds/subscription/check-access
POST   /api/classifieds/subscription/unlock-contact/:adId
GET    /api/classifieds/subscription/usage
GET    /api/classifieds/subscription/plans
GET    /api/classifieds/subscription/history
PATCH  /api/classifieds/subscription/:id/cancel
PATCH  /api/classifieds/subscription/:id/toggle-auto-renew
```

**Payment Processing:**
```
POST   /api/classifieds/subscription/payments/razorpay/create
POST   /api/classifieds/subscription/payments/razorpay/verify
POST   /api/classifieds/subscription/payments/upi/create
GET    /api/classifieds/subscription/payments/upi/status
GET    /api/classifieds/subscription/payments/history
POST   /api/classifieds/subscription/payments/retry
GET    /api/classifieds/subscription/payments/:paymentId/invoice
```

**Admin Routes:**
```
GET    /api/classifieds/subscription/admin/all
PATCH  /api/classifieds/subscription/admin/:id/refund
```

#### 3. Business Logic (`backend/utils/classifiedStore.js`)
- `canAccessContact()` - Permission checking
- `getUserSubscription()` - Fetch active subscription
- `hasEntitlement()` - Feature access validation
- `canPostFeaturedAd()` - Featured ad slot checking
- `serializeClassifiedAdWithContactFilter()` - Contact info filtering
- `updateSellerSubscriptionTier()` - Bulk tier updates

### Frontend Components

#### 1. SubscriptionPlansModal
**File:** `src/modules/classifieds/components/SubscriptionPlansModal.js`

**Features:**
- Billing cycle selector (monthly/quarterly/yearly)
- Dynamic pricing with discounts
- Feature comparison
- Current tier highlighting
- Responsive design

**Usage:**
```jsx
import SubscriptionPlansModal from './components/SubscriptionPlansModal';

<SubscriptionPlansModal
  isOpen={showPlans}
  onClose={() => setShowPlans(false)}
  currentTier={user.classifiedsSubscriptionTier}
  onSubscribe={(tier, cycle) => handleSubscribe(tier, cycle)}
/>
```

#### 2. ContactUnlockPrompt
**File:** `src/modules/classifieds/components/ContactUnlockPrompt.js`

**Features:**
- Conditional contact display
- Unlock button for subscribed users
- Upgrade prompts for free users
- Remaining unlocks counter

**Usage:**
```jsx
import ContactUnlockPrompt from './components/ContactUnlockPrompt';

<ContactUnlockPrompt
  ad={selectedListing}
  user={currentUser}
  onContactUnlocked={(details, remaining) => {
    console.log('Contact unlocked:', details);
  }}
  onOpenSubscription={() => setShowPlans(true)}
/>
```

---

## 🚀 Integration Steps

### Step 1: Register Routes
Add to your main server file (`server.js` or `app.js`):

```javascript
// Classified subscription routes
const classifiedSubscriptionRoutes = require('./routes/classified-subscription');
app.use('/api/classifieds', classifiedSubscriptionRoutes);
```

### Step 2: Environment Variables
Add to `.env`:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Optional: Payment Gateway Settings
PAYMENT_GATEWAY_TIMEOUT=30000
ENABLE_UPI_PAYMENTS=true
```

### Step 3: Import Styles
Add to your main CSS file or import in components:

```css
@import './styles/SubscriptionPlansModal.css';
```

---

## 📋 Remaining Tasks (#9-15)

### Task #9: Messaging Integration

**Backend Integration:**
```javascript
// In classified-subscription.js, add route to create chat from ad
router.post('/classifieds/messages/start-chat/:adId', authenticate, async (req, res) => {
  const { adId } = req.params;
  const { message } = req.body;
  
  // Find ad
  const ad = await ClassifiedAd.findById(adId);
  
  // Create chat using existing messaging system
  const chat = await Chat.create({
    type: 'classified-inquiry',
    participants: [req.user._id, ad.sellerId],
    metadata: {
      adId: ad._id,
      adTitle: ad.title,
      adCategory: ad.category,
    },
  });
  
  // Send initial message
  if (message) {
    await Message.create({
      chatId: chat._id,
      senderId: req.user._id,
      content: message,
      messageType: 'text',
    });
  }
  
  // Link chat to ad
  await ClassifiedAd.findByIdAndUpdate(adId, {
    $push: { linkedChatIds: chat._id.toString() },
  });
  
  res.json({ success: true, chat });
});
```

**Frontend: Update ContactUnlockPrompt**
```jsx
const handleSendMessage = async () => {
  const response = await fetch(`/api/classifieds/messages/start-chat/${ad.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      message: 'Hi, I\'m interested in your ad.',
    }),
  });
  
  const data = await response.json();
  if (data.success) {
    // Navigate to messaging app with chat ID
    window.location.href = `/messaging?chatId=${data.chat._id}`;
  }
};
```

### Task #10: Post Ad Flow Enhancement

**Create PostAdWizard Component:**
```jsx
// src/modules/classifieds/components/PostAdWizard.js
const PostAdWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    location: '',
    contactVisibility: 'subscribers-only',
    contactPhone: '',
    contactEmail: '',
    images: [],
  });

  const steps = [
    { id: 1, label: 'Category', component: CategorySelector },
    { id: 2, label: 'Details', component: AdDetailsForm },
    { id: 3, label: 'Photos', component: ImageUploader },
    { id: 4, label: 'Contact', component: ContactInfoForm },
    { id: 5, label: 'Preview', component: AdPreview },
  ];

  return (
    <div className="post-ad-wizard">
      <StepIndicator steps={steps} currentStep={step} />
      <StepContent 
        step={step} 
        formData={formData} 
        onChange={setFormData} 
      />
      <WizardNavigation
        currentStep={step}
        totalSteps={steps.length}
        onNext={() => setStep(step + 1)}
        onPrev={() => setStep(step - 1)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
```

### Task #11: Subscription Status Indicators

**Create SubscriptionBadge Component:**
```jsx
// src/modules/classifieds/components/SubscriptionBadge.js
const SubscriptionBadge = ({ tier, compact = false }) => {
  const colors = {
    free: '#6c757d',
    basic: '#17a2b8',
    pro: '#28a745',
    business: '#6f42c1',
  };

  const labels = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    business: 'Business',
  };

  return (
    <span 
      className={`subscription-badge ${compact ? 'compact' : ''}`}
      style={{ backgroundColor: colors[tier] }}
    >
      {labels[tier]}
    </span>
  );
};
```

**Usage in Ad Cards:**
```jsx
<div className="ad-card">
  <SubscriptionBadge tier={ad.sellerSubscriptionTier} compact />
  <h3>{ad.title}</h3>
  {/* Rest of ad card */}
</div>
```

### Task #12: User Dashboard

**Create SubscriptionDashboard Component:**
```jsx
// src/modules/classifieds/components/SubscriptionDashboard.js
const SubscriptionDashboard = () => {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    // Fetch current subscription
    const subResponse = await fetch('/api/classifieds/subscription/current', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    const subData = await subResponse.json();
    setSubscription(subData.data);

    // Fetch usage
    const usageResponse = await fetch('/api/classifieds/subscription/usage', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    const usageData = await usageResponse.json();
    setUsage(usageData.data);

    // Fetch payment history
    const historyResponse = await fetch('/api/classifieds/subscription/payments/history', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    const historyData = await historyResponse.json();
    setPaymentHistory(historyData.data);
  };

  return (
    <div className="subscription-dashboard">
      <CurrentPlanCard subscription={subscription} />
      <UsageStats usage={usage} />
      <PaymentHistory payments={paymentHistory} />
      <ManageSubscription subscription={subscription} />
    </div>
  );
};
```

### Task #13: Remove Old Code

**Files to Archive/Remove:**
```bash
# Create backup directory
mkdir -p .archive/classifieds-old

# Move old embedded messaging code
mv src/modules/classifieds/ChatBox.js .archive/classifieds-old/
mv src/modules/classifieds/MessageThread.js .archive/classifieds-old/

# Remove deprecated utilities
rm src/modules/classifieds/classifiedsUtils-old.js
```

**Clean Up Unused Fields:**
- Remove `monetizationPlan` field (replaced by `sellerSubscriptionTier`)
- Remove old `subscriptionTier` enum values
- Update all references to new field names

### Task #14: Routing Updates

**Add Routes to App Router:**
```javascript
// In your main routing file (App.js or routes.js)
import SubscriptionDashboard from './modules/classifieds/components/SubscriptionDashboard';

const routes = [
  // Existing routes...
  {
    path: '/classifieds',
    component: Classifieds,
    exact: true,
  },
  {
    path: '/classifieds/post',
    component: PostAdWizard,
    requireAuth: true,
  },
  {
    path: '/classifieds/subscription',
    component: SubscriptionDashboard,
    requireAuth: true,
  },
  {
    path: '/classifieds/ad/:id',
    component: AdDetailView,
  },
];
```

**Update Navigation Menu:**
```jsx
{user && (
  <NavItem to="/classifieds/subscription">
    My Subscription
    {user.classifiedsSubscriptionTier !== 'free' && (
      <Badge tier={user.classifiedsSubscriptionTier} />
    )}
  </NavItem>
)}
```

### Task #15: Error Handling & Validation

**Backend Middleware:**
```javascript
// backend/middleware/classifiedsValidator.js
const { body, param, validationResult } = require('express-validator');

const validateAdCreation = [
  body('title').trim().isLength({ min: 3, max: 140 }).withMessage('Title must be 3-140 characters'),
  body('description').trim().isLength({ max: 1500 }).withMessage('Description too long'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('contactPhone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('contactEmail').optional().isEmail().withMessage('Invalid email'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateAdCreation };
```

**Frontend Error Boundary:**
```jsx
// src/components/ErrorBoundary.js
class ClassifiedsErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Classifieds Error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 🧪 Testing Checklist

### Backend Tests
- [ ] Subscription creation (all tiers)
- [ ] Payment flow (Razorpay order → verification)
- [ ] Contact unlock with limit enforcement
- [ ] Access control (owner/public/subscribers-only)
- [ ] Usage tracking accuracy
- [ ] Subscription expiry handling
- [ ] Admin refund processing

### Frontend Tests
- [ ] Plan selection and billing cycle toggle
- [ ] Contact unlock UI states
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Error handling and retry mechanisms
- [ ] Loading states
- [ ] Subscription badge display
- [ ] Dashboard data display

### Integration Tests
- [ ] End-to-end subscription purchase
- [ ] Contact unlock → usage decrement
- [ ] Messaging from ad
- [ ] Payment webhook processing
- [ ] User tier updates across models

---

## 📊 Database Indexes

Ensure these indexes are created:

```javascript
// ClassifiedAd
ClassifiedAd.index({ sellerEmail: 1, createdAt: -1 });
ClassifiedAd.index({ contactVisibility: 1, moderationStatus: 1 });

// ClassifiedSubscription
ClassifiedSubscription.index({ userId: 1, isActive: 1 });
ClassifiedSubscription.index({ userEmail: 1, isActive: 1 });
ClassifiedSubscription.index({ endDate: 1, isActive: 1 });

// User
User.index({ classifiedsSubscriptionTier: 1, classifiedsSubscriptionExpiry: 1 });
```

---

## 🚀 Deployment Steps

1. **Database Migration**
   ```bash
   # Run migration to add new fields
   node scripts/migrate-classifieds-schema.js
   ```

2. **Environment Setup**
   ```bash
   # Copy example env
   cp .env.classifieds.example .env
   
   # Add Razorpay keys
   # Add payment webhook URLs
   ```

3. **Build Frontend**
   ```bash
   npm run build
   ```

4. **Start Services**
   ```bash
   # Start backend
   npm run server
   
   # Start frontend (dev)
   npm start
   ```

5. **Verify Routes**
   ```bash
   # Test subscription API
   curl -X GET http://localhost:5000/api/classifieds/subscription/plans
   ```

---

## 📈 Monitoring & Analytics

**Key Metrics to Track:**
- Subscription conversion rate (free → paid)
- Average revenue per user (ARPU)
- Contact unlock usage patterns
- Churn rate
- Popular subscription tiers
- Payment success/failure rates

**Logging Points:**
```javascript
// Add logging for key events
logger.info('Subscription created', { userId, tier, billingCycle });
logger.info('Contact unlocked', { userId, adId, remaining });
logger.info('Payment verified', { subscriptionId, amount });
logger.warn('Unlock limit reached', { userId, tier });
logger.error('Payment failed', { orderId, error });
```

---

## 🔒 Security Considerations

1. **Contact Info Protection**
   - Never expose contact details in GET /ads list
   - Always validate subscription before unlock
   - Track unlock attempts for abuse detection

2. **Payment Security**
   - Verify Razorpay signature on every payment
   - Use HTTPS for all payment endpoints
   - Store sensitive payment data encrypted

3. **Rate Limiting**
   - Enforced on all subscription endpoints
   - Prevent brute force unlock attempts
   - Monitor for suspicious patterns

4. **Data Privacy**
   - GDPR-compliant data storage
   - User data deletion on account closure
   - Payment info retention policy

---

## 📞 Support & Troubleshooting

**Common Issues:**

1. **"Payment verification failed"**
   - Check Razorpay key configuration
   - Verify webhook URL is accessible
   - Check server logs for signature errors

2. **"Contact unlock limit reached"**
   - Verify subscription tier in database
   - Check contactUnlocksUsed counter
   - Confirm subscription not expired

3. **"Subscription not activating"**
   - Check payment status in Razorpay dashboard
   - Verify webhook received
   - Check ClassifiedSubscription.isActive flag

---

## 🎓 Additional Resources

- [Razorpay Payment Gateway Docs](https://razorpay.com/docs/)
- [React Hooks Best Practices](https://react.dev/reference/react)
- [Express.js Security Guide](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Indexing Strategies](https://www.mongodb.com/docs/manual/indexes/)

---

**Last Updated:** 2026-07-17  
**Version:** 1.0.0  
**Status:** Implementation Complete (8/15 tasks), Documentation Ready
