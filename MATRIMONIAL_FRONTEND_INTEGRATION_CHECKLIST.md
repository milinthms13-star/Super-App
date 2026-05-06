# MATRIMONIAL MODULE 2.0 - FRONTEND INTEGRATION CHECKLIST

**For:** Frontend Developers  
**Date:** May 7, 2026  
**Status:** All backend complete, frontend integration ready

---

## 🎯 INTEGRATION PRIORITIES

### Phase 1: CRITICAL (This Sprint)
- [ ] Wire KYC verification component
- [ ] Wire BlueTick badge component
- [ ] Wire subscription management component
- [ ] Wire payment gateway component
- [ ] Test all entitlement middleware

### Phase 2: HIGH (Next Sprint)
- [ ] Implement typing indicators (WebSocket)
- [ ] Implement read receipts (real-time)
- [ ] Implement voice/video calls (Jitsi/Twilio)
- [ ] Implement horoscope matching display
- [ ] Implement admin analytics dashboard

### Phase 3: MEDIUM (Sprint After)
- [ ] Implement referral system UI
- [ ] Implement chat moderation display
- [ ] Implement multilingual UI
- [ ] Implement SEO meta tags
- [ ] Implement profile boost UI

### Phase 4: NICE-TO-HAVE (Polish)
- [ ] Implement WhatsApp integration
- [ ] Implement voice notes
- [ ] Implement leaderboard
- [ ] Implement campaign analytics
- [ ] Mobile app features

---

## 🔌 BACKEND API REFERENCE

### Analytics Endpoints
```javascript
// Get dashboard overview
GET /api/matrimonial/admin/analytics/dashboard

// Get user growth (30 days)
GET /api/matrimonial/admin/analytics/users/growth?days=30

// Get match analytics
GET /api/matrimonial/admin/analytics/matches

// Get gender ratio
GET /api/matrimonial/admin/analytics/gender

// Get subscription metrics
GET /api/matrimonial/admin/analytics/subscription

// Get verification stats
GET /api/matrimonial/admin/analytics/verification

// Export analytics
GET /api/matrimonial/admin/analytics/export?format=json
```

### Referral Endpoints
```javascript
// Generate referral code
POST /api/matrimonial/referral/generate
Body: { tier: 'bronze', expiryDays: 30 }

// Validate code
GET /api/matrimonial/referral/validate/:code

// Apply code at signup
POST /api/matrimonial/referral/apply
Body: { referralCode: 'MAT...' }

// Get my referral stats
GET /api/matrimonial/referral/stats

// Claim reward
POST /api/matrimonial/referral/:referralId/claim

// Get leaderboard
GET /api/matrimonial/referral/leaderboard?limit=10

// Campaign performance
GET /api/matrimonial/referral/campaign-performance?days=30

// My referral codes
GET /api/matrimonial/referral/my-codes
```

### Communication Endpoints
```javascript
// Typing indicator
POST /api/matrimonial/communication/typing
Body: { toProfileId: 'xxx', isTyping: true }

// Read receipt
POST /api/matrimonial/communication/read-receipt
Body: { messageId: 'xxx' }

// Voice call
POST /api/matrimonial/communication/voice-call
Body: { toProfileId: 'xxx' }

// Video call
POST /api/matrimonial/communication/video-call
Body: { toProfileId: 'xxx' }
Response: { roomUrl: 'https://...' }

// Update call status
PATCH /api/matrimonial/communication/call/:callId/status
Body: { status: 'connected', duration: 600, callQuality: 'good' }

// Schedule call
POST /api/matrimonial/communication/schedule-call
Body: { toProfileId: 'xxx', scheduledTime: '2026-05-10T15:30:00Z', callType: 'video' }

// Voice note
POST /api/matrimonial/communication/voice-note
Body: { toProfileId: 'xxx', audioUrl: 'https://...', duration: 45 }

// WhatsApp link
GET /api/matrimonial/communication/whatsapp-link?phoneNumber=919876543210&message=Hi

// Get communication features
GET /api/matrimonial/communication/features
Response: { textMessaging: true, voiceCalls: true, videoCalls: true, ... }

// Call history
GET /api/matrimonial/communication/call-history?limit=20

// Call statistics
GET /api/matrimonial/communication/call-stats
```

### SEO Routes (Public)
```
GET /matrimonial/city/mumbai
GET /matrimonial/religion/hindu
GET /matrimonial/blog/horoscope-matching
GET /matrimonial/sitemap.xml
GET /matrimonial/robots.txt
```

---

## 🛠️ FRONTEND COMPONENTS TO UPDATE

### 1. Admin Dashboard Component
**Location:** `src/modules/matrimonial/AdminDashboard.js`

```javascript
import { useState, useEffect } from 'react';
import matrimonialAPI from './matrimonialAPI';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await matrimonialAPI.getAdminDashboard();
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };
    fetchAnalytics();
  }, []);

  // Display dashboard with charts for:
  // - User growth (line chart)
  // - Gender ratio (pie chart)
  // - Subscription tiers (bar chart)
  // - Verification rates (progress bar)
  // - Match analytics (funnel)
};
```

### 2. Referral System Component
**Location:** `src/modules/matrimonial/ReferralSystem.js`

```javascript
const ReferralSystem = ({ userEmail }) => {
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState(null);
  
  const generateCode = async () => {
    // Call matrimonialAPI.generateReferralCode()
    // Display code and copy button
  };
  
  const getStats = async () => {
    // Call matrimonialAPI.getReferralStats()
    // Display conversions, rewards, etc.
  };
};
```

### 3. Communication Features Component
**Location:** `src/modules/matrimonial/CommunicationPanel.js`

```javascript
const CommunicationPanel = ({ recipientProfileId }) => {
  // Implement typing indicator
  // Implement read receipts
  // Implement voice/video call UI
  // Implement schedule call modal
};
```

### 4. Chat Moderation Display
**Location:** `src/modules/matrimonial/ChatMessages.js`

```javascript
// When displaying messages, check moderation status
// Show warning for flagged messages
// Allow admin to view moderation report
```

### 5. Multilingual Support
**Location:** `src/components/LanguageSelector.js`

```javascript
const LanguageSelector = () => {
  const languages = [
    'en', 'hi', 'ta', 'te', 'kn', 'ml', 'gu', 'bn'
  ];
  
  // Store selection in localStorage
  // Call matrimonialAPI with ?lang=hi header
  // Receive translated responses
};
```

---

## 📊 DATA STRUCTURES TO HANDLE

### Analytics Response
```javascript
{
  timestamp: Date,
  userGrowth: {
    periodDays: 30,
    totalNewProfiles: 1500,
    dailyAverage: 50,
    dailyGrowth: { '2026-05-01': 45, ... },
    genderBreakdown: { male: 800, female: 700 }
  },
  matches: {
    totalInterests: 5000,
    acceptanceRate: '45%',
    interestToAcceptRatio: 0.45
  },
  subscriptions: {
    estimatedMRR: 125000,
    tierBreakdown: { free: 3000, gold: 500, premium: 200, vip: 50 }
  }
}
```

### Communication Features Response
```javascript
{
  textMessaging: true,
  unlimitedMessages: true,
  voiceCalls: true,
  videoCalls: true,
  voiceNotes: true,
  whatsAppIntegration: false,
  scheduleCall: true,
  recordCalls: false
}
```

### Call Record
```javascript
{
  id: 'uuid',
  fromProfileId: 'xxx',
  toProfileId: 'xxx',
  callType: 'video', // 'voice', 'video', 'scheduled'
  status: 'connected', // 'initiated', 'ringing', 'connected', 'ended', 'rejected'
  startTime: Date,
  endTime: Date,
  duration: 600, // seconds
  roomUrl: 'https://meet.example.com/room/uuid'
}
```

---

## 🔐 SECURITY CONSIDERATIONS

### Before Making API Calls
```javascript
// 1. Check subscription entitlement
const hasAccess = await matrimonialAPI.checkEntitlement('unlimited_chat');
if (!hasAccess) {
  showUpgradeModal();
  return;
}

// 2. Check block status
const isBlocked = await matrimonialAPI.checkBlockStatus(recipientId);
if (isBlocked) {
  showError('User has blocked you');
  return;
}

// 3. Validate communication features
const features = await matrimonialAPI.getCommunicationFeatures();
if (!features.videoCalls) {
  showFeatureLockedModal();
  return;
}
```

### Header Requirements
```javascript
// All requests must include
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'Accept-Language': 'en' // or user's language
}
```

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] Analytics calculations (MRR, conversion rate)
- [ ] Referral code generation
- [ ] Chat moderation scoring
- [ ] Horoscope compatibility calculation
- [ ] Subscription limit enforcement

### Integration Tests
- [ ] End-to-end referral flow
- [ ] Admin dashboard data display
- [ ] Communication features availability
- [ ] Entitlement checks
- [ ] Multilingual translations

### E2E Tests
- [ ] User referral signup journey
- [ ] Admin analytics navigation
- [ ] Voice/video call flow
- [ ] Chat message with moderation
- [ ] Language switching

### Manual Testing
- [ ] [ ] Test each analytics endpoint
- [ ] [ ] Create and validate referral code
- [ ] [ ] Test communication features per tier
- [ ] [ ] Verify chat moderation messages
- [ ] [ ] Test language switching
- [ ] [ ] Test payment tier upgrade flow

---

## 📱 RESPONSIVE DESIGN NOTES

### Mobile Optimization
- Analytics dashboard should be card-based
- Referral code QR code instead of link
- Communication controls (call/video) as floating buttons
- Chat moderation warnings as toasts
- Referral leaderboard as scrollable list

### Tablet Optimization
- Two-column layout for analytics
- Side panel for referral stats
- Tabbed interface for communication
- Grid layout for leaderboard

### Desktop Optimization
- Full dashboard with charts
- Sidebar for navigation
- Large video call window
- Detailed analytics tables

---

## 🔄 STATE MANAGEMENT

### Redux Actions to Create
```javascript
// Analytics
dispatch(fetchAnalyticsDashboard());
dispatch(fetchUserGrowth(days));
dispatch(fetchSubscriptionMetrics());

// Referral
dispatch(generateReferralCode(tier));
dispatch(fetchReferralStats());
dispatch(claimReferralReward(id));

// Communication
dispatch(initializeVoiceCall(recipientId));
dispatch(updateTypingIndicator(isTyping));
dispatch(updateCallStatus(callId, status));

// Moderation
dispatch(flagMessage(messageId));
dispatch(viewModerationReport(messageId));

// Multilingual
dispatch(setLanguage('hi'));
dispatch(fetchTranslations('hi'));
```

---

## 🐛 COMMON INTEGRATION ISSUES

### Issue 1: "Feature requires premium subscription"
**Solution:** Check subscription tier before enabling feature
```javascript
const hasFeature = await matrimonialAPI.checkEntitlement('feature_name');
if (!hasFeature) {
  return <UpgradePrompt />;
}
```

### Issue 2: Chat moderation errors not showing
**Solution:** Ensure moderation response is being parsed
```javascript
const response = await API.sendMessage(text);
if (response.flagged) {
  showModerationWarning(response.reason);
}
```

### Issue 3: Typing indicator delays
**Solution:** Use debouncing (300-500ms)
```javascript
const debouncedTyping = debounce((isTyping) => {
  API.updateTyping(isTyping);
}, 300);
```

### Issue 4: Language not persisting
**Solution:** Store in localStorage + user preferences
```javascript
localStorage.setItem('preferredLanguage', 'hi');
// Also save to user profile for persistence
```

### Issue 5: Analytics not updating
**Solution:** Set appropriate refresh intervals
```javascript
useEffect(() => {
  const interval = setInterval(fetchAnalytics, 60000); // Every minute
  return () => clearInterval(interval);
}, []);
```

---

## 📞 BACKEND ENDPOINTS READY

**Total Endpoints:** 24  
**Status:** ✅ All Live  
**Response Format:** JSON  
**Authentication:** JWT Bearer Token  

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All analytics endpoints tested
- [ ] Referral system fully functional
- [ ] Communication features working
- [ ] Multilingual support complete
- [ ] Admin dashboard displaying data
- [ ] Chat moderation active
- [ ] Security middleware applied
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Database migrations complete
- [ ] Environment variables set
- [ ] CDN configured for images
- [ ] Payment gateways active
- [ ] Notification system ready
- [ ] Backup strategy in place

---

## 📚 ADDITIONAL RESOURCES

### Files to Reference
1. `backend/utils/adminAnalyticsService.js` - Analytics calculations
2. `backend/utils/referralSystemService.js` - Referral logic
3. `backend/utils/communicationFeatures.js` - Communication features
4. `backend/utils/chatModerationService.js` - Moderation rules
5. `backend/utils/multilingualSupport.js` - Translation keys
6. `backend/middleware/matrimonialIntegration.js` - Security checks

### API Documentation Format
Each endpoint returns consistent format:
```javascript
{
  success: true,
  data: { /* endpoint-specific data */ },
  error: null,
  timestamp: '2026-05-07T10:00:00Z'
}
```

---

## ✅ COMPLETION CRITERIA

Frontend integration is complete when:

- [ ] All 24 new endpoints are wired to components
- [ ] Admin dashboard shows all metrics
- [ ] Referral system fully functional
- [ ] Communication features working in real-time
- [ ] Multilingual UI operational
- [ ] All tests passing (unit, integration, E2E)
- [ ] Mobile responsive on all breakpoints
- [ ] No console errors or warnings
- [ ] Performance metrics acceptable
- [ ] Security audit passed
- [ ] Ready for production deployment

---

**Status:** All backend complete, awaiting frontend integration

**Next Action:** Begin Phase 1 frontend implementation

---

*Document Generated: May 7, 2026*  
*For Questions:** Refer to inline code documentation or contact backend team
