# Matrimonial Frontend Quick Integration Reference

**Quick Start:** 10 min integration checklist  
**Created:** May 7, 2026

---

## 📋 5-Minute Integration (Minimal)

### 1. Import Components
```javascript
// src/modules/matrimonial/Matrimonial.js - Line ~30

import KYCVerification from './KYCVerification';
import BlueTickBadge from './BlueTickBadge';
import HoroscopeMatching from './HoroscopeMatching';
import SubscriptionManagement from './SubscriptionManagement';
import PaymentGateway from './PaymentGateway';
import * as matrimonialAPI from './matrimonialAPI';
import '../../styles/MatrimonialFrontend.css';
```

### 2. Add Component Visibility Toggle
```javascript
// In state section
const [activeTab, setActiveTab] = useState("discover");

// In existing render - find existing tab buttons and add these:
<button onClick={() => setActiveTab("kyc")}>KYC</button>
<button onClick={() => setActiveTab("blue-tick")}>Blue Tick</button>
<button onClick={() => setActiveTab("horoscope")}>Horoscope</button>
<button onClick={() => setActiveTab("subscription")}>Premium</button>
```

### 3. Add Component Rendering
```javascript
// In existing render section - add after current tab content:

{activeTab === 'kyc' && <KYCVerification currentProfile={matrimonialProfile} />}
{activeTab === 'blue-tick' && matrimonialProfile && <BlueTickBadge profileId={matrimonialProfile._id} />}
{activeTab === 'horoscope' && selectedProfileId && <HoroscopeMatching profile1Id={matrimonialProfile?._id} profile2Id={selectedProfileId} onClose={() => setSelectedProfileId(null)} />}
{activeTab === 'subscription' && <SubscriptionManagement userEmail={currentUser?.email} />}
```

**Time: 3 minutes**  
**Difficulty: Easy**  
**Immediate Result: Components visible and functional**

---

## 🔌 30-Minute Full Integration

### Step 1: Copy Files (5 min)
Files already created in:
- `src/modules/matrimonial/KYCVerification.js` ✅
- `src/modules/matrimonial/BlueTickBadge.js` ✅
- `src/modules/matrimonial/HoroscopeMatching.js` ✅
- `src/modules/matrimonial/SubscriptionManagement.js` ✅
- `src/modules/matrimonial/PaymentGateway.js` ✅
- `src/modules/matrimonial/matrimonialAPI.js` ✅
- `src/styles/MatrimonialFrontend.css` ✅

**Status: Done ✓**

### Step 2: Update Matrimonial.js (10 min)

Add at top:
```javascript
import KYCVerification from './KYCVerification';
import BlueTickBadge from './BlueTickBadge';
import HoroscopeMatching from './HoroscopeMatching';
import SubscriptionManagement from './SubscriptionManagement';
import PaymentGateway from './PaymentGateway';
import * as matrimonialAPI from './matrimonialAPI';
import '../../styles/MatrimonialFrontend.css';
```

Add to state:
```javascript
const [activeTab, setActiveTab] = useState("discover");
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedPaymentTier, setSelectedPaymentTier] = useState(null);
```

Add to JSX:
```javascript
<div className="matrimonial-tabs">
  <button onClick={() => setActiveTab("discover")} className={activeTab === "discover" ? "active" : ""}>Discover</button>
  <button onClick={() => setActiveTab("kyc")} className={activeTab === "kyc" ? "active" : ""}>KYC</button>
  <button onClick={() => setActiveTab("blue-tick")} className={activeTab === "blue-tick" ? "active" : ""}>Blue Tick</button>
  <button onClick={() => setActiveTab("horoscope")} className={activeTab === "horoscope" ? "active" : ""}>Horoscope</button>
  <button onClick={() => setActiveTab("subscription")} className={activeTab === "subscription" ? "active" : ""}>Premium</button>
</div>

<div className="matrimonial-content">
  {activeTab === 'kyc' && <KYCVerification currentProfile={matrimonialProfile} />}
  {activeTab === 'blue-tick' && matrimonialProfile && <BlueTickBadge profileId={matrimonialProfile._id} />}
  {activeTab === 'horoscope' && selectedProfileId && <HoroscopeMatching profile1Id={matrimonialProfile?._id} profile2Id={selectedProfileId} onClose={() => setSelectedProfileId(null)} />}
  {activeTab === 'subscription' && <SubscriptionManagement userEmail={currentUser?.email} onSubscriptionChange={(sub) => localStorage.setItem('userSubscription', JSON.stringify(sub))} />}
</div>

{showPaymentModal && selectedPaymentTier && (
  <PaymentGateway
    subscriptionTier={selectedPaymentTier}
    amount={getTierPrice(selectedPaymentTier)}
    onSuccess={() => {
      setShowPaymentModal(false);
      setActiveTab('subscription');
    }}
    onCancel={() => setShowPaymentModal(false)}
  />
)}
```

### Step 3: Add CSS Classes (5 min)

Add to Matrimonial.css:
```css
.matrimonial-tabs {
  display: flex;
  gap: 10px;
  border-bottom: 2px solid #eee;
  overflow-x: auto;
  padding-bottom: 0;
}

.matrimonial-tabs button {
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}

.matrimonial-tabs button.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.matrimonial-content {
  padding: 20px 0;
}
```

### Step 4: Environment Setup (5 min)

Update `.env`:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=your_key
REACT_APP_STRIPE_KEY=your_key
```

Update backend `.env`:
```
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
STRIPE_SECRET_KEY=your_secret
```

### Step 5: Test (5 min)

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm start
```

Visit: `http://localhost:3000/matrimonial`

Click each tab and verify:
- ✅ KYC tab shows upload form
- ✅ Blue Tick shows eligibility
- ✅ Horoscope tab accessible
- ✅ Subscription shows 4 tiers
- ✅ No console errors

---

## 🎯 Common Integration Mistakes

### ❌ Mistake 1: Forgot to import CSS
```javascript
// WRONG - CSS missing
import KYCVerification from './KYCVerification';

// CORRECT
import KYCVerification from './KYCVerification';
import '../../styles/MatrimonialFrontend.css';
```

### ❌ Mistake 2: Wrong prop names
```javascript
// WRONG
<KYCVerification profile={matrimonialProfile} />

// CORRECT
<KYCVerification currentProfile={matrimonialProfile} />
```

### ❌ Mistake 3: Forgot to pass required props
```javascript
// WRONG - Missing profileId
<BlueTickBadge />

// CORRECT
<BlueTickBadge profileId={matrimonialProfile._id} />
```

### ❌ Mistake 4: Not handling callbacks
```javascript
// WRONG - Ignoring changes
<SubscriptionManagement userEmail="user@email.com" />

// CORRECT - Handle changes
<SubscriptionManagement 
  userEmail="user@email.com"
  onSubscriptionChange={(sub) => {
    localStorage.setItem('userSubscription', JSON.stringify(sub));
  }}
/>
```

---

## 🧪 Testing Checklist

### KYC Component
- [ ] Page loads without errors
- [ ] Can select document type
- [ ] File upload works
- [ ] Camera permission request appears
- [ ] Selfie capture button works
- [ ] Risk score displays correctly

### Blue Tick Component
- [ ] Eligibility score calculates
- [ ] Requirement checkboxes display
- [ ] Manual review button appears
- [ ] Status badge shows correctly

### Horoscope Component
- [ ] Two profiles load
- [ ] Compatibility calculated
- [ ] Guna breakdown displays
- [ ] Color bars show correctly
- [ ] Analysis section has content

### Subscription Component
- [ ] 4 tier cards display
- [ ] Current tier highlighted
- [ ] Upgrade button works
- [ ] FAQ section displays

### Integration Test
- [ ] Tab switching works
- [ ] Active tab style applies
- [ ] No component cross-contamination
- [ ] Tab state persists (optional)

---

## 🚀 Deployment Checklist

Before going live:

### Frontend Build
```bash
npm run build
# Output: build/ folder ready for deployment
```

### Backend Ready?
- [ ] All matrimonial routes registered
- [ ] KYC endpoints working
- [ ] Blue Tick endpoints working
- [ ] Payment endpoints configured
- [ ] Database connections verified

### Payment Gateways
- [ ] Razorpay API keys added
- [ ] Stripe API keys added
- [ ] Webhooks configured
- [ ] Test payments verified

### Security
- [ ] JWT tokens valid
- [ ] HTTPS enforced
- [ ] Sensitive data not logged
- [ ] CORS configured

### Performance
- [ ] No console errors
- [ ] Images optimized
- [ ] Bundle size < 500KB
- [ ] Load time < 3s

---

## 📊 Component Props Quick Ref

| Component | Required Props | Optional Props |
|-----------|---|---|
| KYCVerification | currentProfile | onKYCComplete |
| BlueTickBadge | profileId | onUpdate |
| HoroscopeMatching | profile1Id, profile2Id | onClose |
| SubscriptionManagement | userEmail | onSubscriptionChange |
| PaymentGateway | subscriptionTier, amount | onSuccess, onCancel |

---

## 🔧 Troubleshooting

### Issue: "KYCVerification is not defined"
**Solution:** Check import at top of Matrimonial.js
```javascript
import KYCVerification from './KYCVerification';
```

### Issue: "Cannot read property 'map' of undefined"
**Solution:** Add null check in component
```javascript
{activeTab === 'kyc' && matrimonialProfile && <KYCVerification currentProfile={matrimonialProfile} />}
```

### Issue: "Styles not applying"
**Solution:** Check CSS import order
```javascript
// Must come AFTER all component imports
import '../../styles/MatrimonialFrontend.css';
```

### Issue: "API calls failing"
**Solution:** Verify API_BASE_URL
```javascript
// Check in browser DevTools
// Network tab → XHR requests
// Verify URL matches backend
```

### Issue: "Payment button not responding"
**Solution:** Check payment keys configured
```bash
# Backend .env must have:
RAZORPAY_KEY_ID=...
STRIPE_SECRET_KEY=...
```

---

## 📈 Performance Tips

### 1. Lazy Load Components
```javascript
const KYCVerification = React.lazy(() => import('./KYCVerification'));
const BlueTickBadge = React.lazy(() => import('./BlueTickBadge'));

// Use with Suspense:
<Suspense fallback={<div>Loading...</div>}>
  {activeTab === 'kyc' && <KYCVerification ... />}
</Suspense>
```

### 2. Memoize Components
```javascript
export default React.memo(KYCVerification);
```

### 3. Optimize Images
```javascript
// Resize large images before upload
const compressImage = (file) => {
  // Use sharp/canvas to compress
};
```

---

## 🎓 Learning Resources

**Related Concepts:**
- [React Hooks](https://react.dev/reference/react/hooks)
- [Axios Requests](https://axios-http.com/)
- [Razorpay Integration](https://razorpay.com/docs/payments/integration/)
- [Stripe Integration](https://stripe.com/docs/payments)
- [JWT Authentication](https://jwt.io/)

---

## ✅ Success Criteria

You know integration is complete when:

✅ All 5 tabs visible and clickable  
✅ KYC upload form displays  
✅ Blue Tick requirements visible  
✅ Horoscope matching works  
✅ Subscription tiers show  
✅ No console errors  
✅ All styles apply correctly  
✅ API calls work with real data  
✅ Payment flows complete  

---

**Integration Complexity:** ⭐⭐☆☆☆ (Intermediate)  
**Time to Complete:** 30 minutes  
**Files Modified:** 1 (Matrimonial.js)  
**Files Created:** 7 ✅ (Already done)  

**Ready to integrate!** 🚀
