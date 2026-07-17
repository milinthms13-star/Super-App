# Professional Classified Ads Module - Upgrade Specification

## Executive Summary

This document outlines the upgrade plan for the Super-App classified ads module to create a professional, monetization-ready platform with integrated messaging and subscription-based contact access.

## Current State Analysis

### Existing Features
1. **Database Model (ClassifiedAd.js)**
   - Comprehensive schema with 40+ fields
   - Embedded messaging (ClassifiedMessageSchema)
   - Reviews and ratings system
   - Reports and moderation
   - Media gallery support
   - Subscription tier fields (currently unused)
   - Geospatial search capabilities
   - Spam detection and analytics

2. **Frontend Components (src/modules/classifieds/)**
   - Main Classifieds.js component (~2800 lines)
   - 20+ sub-components (ChatBox, SellerStore, ReviewCard, etc.)
   - Advanced filtering and search
   - Role-based views (Buyer/Seller/Admin)
   - Seller dashboard with stats
   - Bulk operations and import
   - Auto-relist and scheduled posting

3. **Backend Infrastructure**
   - Routes in appData.js for CRUD operations
   - classifiedStore.js utility for business logic
   - WebSocket support for real-time updates
   - Rate limiting and spam detection
   - Moderation workflows

4. **Integration Points**
   - Messaging module (backend/routes/messaging.js) - Full-featured chat system
   - Subscription system (backend/routes/subscriptions.js) - Delivery subscriptions
   - Module subscription (backend/routes/subscriptionRoutes.js) - Generic module plans
   - Payment gateway (matrimonial-subscription.js) - Razorpay integration pattern

### Current Limitations
1. **No monetization** - All features are free
2. **Contact info always visible** - No access control
3. **Embedded messaging** - Not integrated with main messaging app
4. **Unused subscription fields** - `subscriptionTier`, `subscriptionExpiryDate` not enforced
5. **No payment flow** - Missing classified-specific subscription system

---

## Upgrade Requirements

### Business Goals
1. **Freemium Model**: Free ad posting + in-app messaging, paid subscription for contact details
2. **User Engagement**: Encourage messaging over direct phone/email contact
3. **Revenue Generation**: Subscription tiers for viewing contact information
4. **Professional Experience**: Clean UI, clear value proposition, smooth payment flow

### Functional Requirements

#### 1. Subscription System
**Tiers:**
- **Free** (Default)
  - Post unlimited ads
  - Use in-app messaging (free)
  - View ads
  - Cannot see phone/email/WhatsApp of ad posters
  
- **Basic** (₹99/month)
  - All Free features
  - Unlock 10 contact details per month
  - Priority ad placement (moderate boost)
  
- **Pro** (₹299/month)
  - All Basic features
  - Unlimited contact detail access
  - Featured ad badge
  - Advanced analytics
  - No ads on listings
  
- **Business** (₹999/month)
  - All Pro features
  - Verified seller badge
  - Dedicated storefront
  - Bulk import/export
  - API access (future)

#### 2. Contact Information Access Control
- **Free users see**: "Subscribe to view contact details" button
- **Subscribed users see**: Phone, email, WhatsApp buttons
- **Ad owners**: Always see their own contact info
- **Track unlocks**: Record which user unlocked which ad's contact

#### 3. Integrated Messaging
- **Connect to existing messaging module** (backend/routes/messaging.js)
- **Create chat from ad**: "Contact via Message" button
- **Link messages to ads**: Show ad preview in chat
- **Real-time notifications**: WebSocket for instant messaging
- **Message tracking**: Count conversations per ad

#### 4. Payment Integration
- **Razorpay Primary**: Follow matrimonial-subscription.js pattern
- **UPI Support**: Alternative payment method
- **Payment verification**: Signature validation
- **Invoice generation**: Auto-generate on successful payment
- **Payment history**: View all transactions
- **Refund support**: Admin-initiated refunds

#### 5. User Experience Enhancements
- **Subscription modal**: Beautiful pricing comparison
- **Upgrade prompts**: Strategic CTAs at contact view attempts
- **Subscription dashboard**: Manage plan, view usage, payment history
- **Trial period**: Optional 7-day trial for first-time users
- **Tier badges**: Visual indicators throughout UI

---

## Technical Architecture

### Database Schema

#### New Model: ClassifiedSubscription
```javascript
{
  userId: ObjectId (ref: User),
  userEmail: String (indexed),
  tier: Enum ['free', 'basic', 'pro', 'business'],
  billingCycle: Enum ['monthly', 'yearly'],
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  autoRenew: Boolean,
  
  // Payment tracking
  paymentStatus: Enum ['pending', 'completed', 'failed', 'refunded'],
  paymentMethod: String,
  transactionId: String,
  amount: Number,
  currency: String,
  
  // Usage tracking
  contactUnlocksUsed: Number,
  contactUnlocksLimit: Number,
  unlockedAds: [{ adId, unlockedAt }],
  
  // Payment history
  paymentHistory: [{
    gateway: String,
    orderId: String,
    paymentId: String,
    status: String,
    amount: Number,
    createdAt: Date,
    verifiedAt: Date,
    invoiceNumber: String
  }],
  
  // Cancellation
  cancelledAt: Date,
  cancellationReason: String,
  
  timestamps: true
}
```

#### Updates to ClassifiedAd Model
```javascript
// Add these fields:
contactVisibility: {
  type: String,
  enum: ['public', 'subscribers-only', 'hidden'],
  default: 'subscribers-only'
},
contactPhone: String,
contactEmail: String,
contactWhatsApp: String,
linkedChatIds: [String], // Track related message threads
```

### API Endpoints

#### Subscription Management
```
POST   /api/classifieds/subscription/create
GET    /api/classifieds/subscription/current
POST   /api/classifieds/subscription/check-access
POST   /api/classifieds/subscription/unlock-contact/:adId
GET    /api/classifieds/subscription/usage
PATCH  /api/classifieds/subscription/cancel
```

#### Payment Processing
```
POST   /api/classifieds/subscription/payments/razorpay/create
POST   /api/classifieds/subscription/payments/razorpay/verify
POST   /api/classifieds/subscription/payments/upi/create
GET    /api/classifieds/subscription/payments/upi/status
GET    /api/classifieds/subscription/payments/history
GET    /api/classifieds/subscription/payments/:paymentId/invoice
```

#### Messaging Integration
```
POST   /api/classifieds/messages/start-chat/:adId
GET    /api/classifieds/messages/conversations
POST   /api/classifieds/messages/send
```

### Frontend Components

#### New Components to Build
1. **SubscriptionPlansModal.js** - Pricing comparison and selection
2. **SubscriptionDashboard.js** - Manage active subscription
3. **ContactUnlockPrompt.js** - Upgrade CTA when viewing contact
4. **PaymentFlow.js** - Razorpay/UPI payment UI
5. **UsageIndicator.js** - Show remaining unlocks for Basic tier
6. **SubscriptionBadge.js** - Display user's tier badge

#### Components to Update
1. **Classifieds.js** - Add subscription context, integrate new components
2. **ChatBox.js** - Replace embedded chat with messaging module integration
3. **SellerStore.js** - Show seller's subscription tier badge

### Integration Points

#### 1. Messaging Module Integration
- Use existing Chat/Message models from messaging.js
- Create chat rooms with ad context: `{ type: 'classified-inquiry', adId, adTitle }`
- Link chat to ad: Store chatId in ClassifiedAd.linkedChatIds
- WebSocket events: Subscribe to classified-specific events

#### 2. User Model Updates
```javascript
// Add to User model:
classifiedSubscriptionTier: String,
classifiedSubscriptionExpiry: Date,
classifiedContactUnlocksRemaining: Number
```

### Business Logic

#### Subscription Validation
```javascript
// Function: canAccessContact(userId, adId)
1. Check if user is ad owner -> Allow
2. Check if ad contactVisibility is 'public' -> Allow
3. Fetch user's active subscription
4. If tier === 'free' -> Deny
5. If tier === 'basic' && unlocks remaining > 0 -> Allow + Decrement
6. If tier === 'basic' && unlocks remaining === 0 -> Deny
7. If tier === 'pro' || 'business' -> Allow
```

#### Payment Verification Flow
```javascript
1. User selects subscription tier
2. Create subscription record (status: pending)
3. Generate Razorpay order
4. User completes payment
5. Verify signature
6. Fetch payment details from Razorpay
7. Update subscription (status: completed, isActive: true)
8. Generate invoice
9. Send confirmation email
10. Update User model with subscription info
```

---

## Implementation Phases

### Phase 1: Backend Foundation (Tasks #2-6)
- Create ClassifiedSubscription model
- Build subscription routes with authentication
- Implement contact access validation logic
- Add payment processing (Razorpay + UPI)
- Update classifiedStore.js with subscription checks

### Phase 2: Frontend Subscription UI (Tasks #7-8)
- Build subscription plans modal
- Create payment flow components
- Update ad detail view with conditional contact display
- Add upgrade prompts and CTAs

### Phase 3: Messaging Integration (Task #9)
- Connect to existing messaging module
- Create chat-from-ad functionality
- Link conversations to ads
- WebSocket real-time updates

### Phase 4: User Dashboard (Tasks #10-12)
- Improve ad posting flow
- Build subscription dashboard
- Add tier badges and indicators
- Usage tracking UI

### Phase 5: Cleanup & Testing (Tasks #13-15)
- Remove obsolete code
- Update routing and navigation
- Comprehensive error handling
- Integration testing

---

## Security Considerations

1. **Contact Info Protection**: Server-side validation, never expose in API unless authorized
2. **Payment Security**: Razorpay signature verification, webhook validation
3. **Rate Limiting**: Prevent abuse of unlock attempts, payment creation
4. **XSS Prevention**: Sanitize all user inputs in ads
5. **CSRF Protection**: Token validation on payment endpoints
6. **Authorization**: Middleware to check subscription status on every contact access

---

## Monetization Projections

### Pricing Strategy
- **Basic**: ₹99/month (~$1.20) - Entry tier for occasional users
- **Pro**: ₹299/month (~$3.60) - Power users, frequent contacts
- **Business**: ₹999/month (~$12) - Professional sellers, businesses

### Expected Conversion Rates
- **Free → Basic**: 5-8% (low barrier, trial effect)
- **Free → Pro**: 2-3% (direct jump for committed users)
- **Basic → Pro**: 15-20% (hit unlock limit quickly)

### Revenue Calculation (Conservative)
- 10,000 monthly active users
- 5% conversion to Basic = 500 × ₹99 = ₹49,500
- 2% conversion to Pro = 200 × ₹299 = ₹59,800
- 0.5% conversion to Business = 50 × ₹999 = ₹49,950
- **Monthly Revenue**: ₹1,59,250 (~$1,900)
- **Yearly Projection**: ₹19,11,000 (~$23,000)

---

## Success Metrics

### User Engagement
- Messaging usage rate (target: 60% of ad views)
- Average messages per conversation
- Time to first response

### Monetization
- Subscription conversion rate (target: 7-10%)
- Average revenue per user (ARPU)
- Monthly recurring revenue (MRR) growth
- Churn rate (target: <15% monthly)

### Ad Quality
- Ads per user
- Average ad lifetime
- Contact unlock rate
- Spam/report rate (target: <2%)

---

## Risk Mitigation

### Technical Risks
- **Payment Gateway Downtime**: Fallback to UPI, manual verification option
- **Database Migration**: Use Mongoose migrations, backup before schema changes
- **WebSocket Issues**: Graceful degradation to polling

### Business Risks
- **Low Conversion**: A/B test pricing, offer promotions, trial periods
- **User Resistance**: Clear communication of free messaging value
- **Contact Sharing Workarounds**: Monitor for phone numbers in messages, moderate

### Compliance
- **Data Privacy**: GDPR-compliant contact info storage
- **Payment Compliance**: PCI-DSS through Razorpay
- **Refund Policy**: Clear terms, 7-day money-back guarantee

---

## Future Enhancements (Post-MVP)

1. **AI-Powered Matching**: Suggest relevant ads to users
2. **Verified Sellers**: Identity verification program
3. **Escrow Service**: Secure payment holding for transactions
4. **SMS Notifications**: Alert users of new messages
5. **Mobile Apps**: Native iOS/Android with push notifications
6. **Advanced Analytics**: Seller dashboard with insights
7. **API Access**: Business tier feature for integrations
8. **Multi-City Support**: Location-based ad serving
9. **Saved Searches**: Email alerts for matching ads
10. **Video Ads**: Support video uploads in media gallery

---

## Conclusion

This upgrade transforms the classified module from a basic listing platform into a professional, revenue-generating marketplace. The freemium model with integrated messaging provides value at every tier while creating clear upgrade incentives. The phased implementation approach ensures stability while delivering features incrementally.

**Estimated Development Time**: 4-6 weeks
**Estimated Cost**: ₹2-3 lakhs (if outsourced) or 200-300 hours internal development
**Break-even Point**: ~150-200 paying subscribers (achievable in 2-3 months with 10K MAU)

---

## Appendix: File Structure

### New Files to Create
```
backend/
  models/
    ClassifiedSubscription.js
  routes/
    classified-subscription.js
  services/
    classifiedSubscriptionService.js
  utils/
    classifiedPaymentHelper.js

src/
  modules/
    classifieds/
      components/
        SubscriptionPlansModal.js
        SubscriptionDashboard.js
        ContactUnlockPrompt.js
        PaymentFlow.js
        UsageIndicator.js
        SubscriptionBadge.js
        MessageIntegration.js
```

### Files to Modify
```
backend/
  models/
    ClassifiedAd.js (add contact fields)
    User.js (add subscription fields)
  utils/
    classifiedStore.js (add subscription logic)
  routes/
    appData.js (update ad endpoints)

src/
  modules/
    classifieds/
      Classifieds.js (integrate subscription)
      ChatBox.js (replace with messaging integration)
```

### Files to Remove (After Migration)
```
- Embedded messaging logic in Classifieds.js
- Duplicate utilities after consolidation
- Old test files for replaced components
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-17  
**Author**: Kiro AI  
**Status**: Ready for Implementation
