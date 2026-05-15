# MalabarBazaar User Manual
## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Core Marketplace Modules](#core-marketplace-modules)
  - [Food Delivery](#food-delivery)
  - [Local Market](#local-market)
  - [Ecommerce](#ecommerce)
  - [Classifieds](#classifieds)
  - [Wallet/Payments](#walletpayments)
- [Social & Communication](#social--communication)
  - [Social Media](#social-media)
  - [Messaging & Chatrooms](#messaging--chatrooms)
- [Utilities](#utilities)
  - [Personal Diary](#personal-diary)
  - [Reminder Alert](#reminder-alert)
  - [SOS](#sos)
  - [Health Module](#health-module)
- [Niche Services](#niche-services)
  - [Ride Sharing](#ride-sharing)
  - [Real Estate](#real-estate)
  - [Matrimonial](#matrimonial)
  - [Astrology](#astrology)
- [Support & Admin](#support--admin)
  - [Support/Help](#supporthelp)
  - [User Management](#user-management)
  - [Admin Dashboard](#admin-dashboard)
- [Strategic Investor Modules](#strategic-investor-modules)
  - [AI Business Operating System](#ai-business-operating-system)
  - [Kerala + Gulf Jobs Migration](#kerala--gulf-jobs-migration)
  - [Women Safety + Family Protection](#women-safety--family-protection)
  - [Devotional Ecosystem](#devotional-ecosystem)
  - [Hyperlocal AI Commerce](#hyperlocal-ai-commerce)
  - [Nila AI Studio](#nila-ai-studio)
  - [Trust Layer](#trust-layer)
- [FAQs](#faqs)

## Introduction
MalabarBazaar is a comprehensive mobile/web app for local services, marketplace, social networking, and personal utilities. Built with React Native (Capacitor for cross-platform), it supports Android/iOS/web. Key themes: Local economy (Kerala/Malabar focus), community, safety (SOS/Reminders).

**Platforms**: Android app, Web (PWA), Electron desktop.
**Login**: Phone/OTP or social (see TODO_SOCIAL_LOGIN.md for setup).

## Getting Started
1. Download/install app or open [web version](http://localhost:3000).
2. Register/Login via phone number (OTP sent).
3. Set profile/location for personalized feeds.
4. Access dashboard via bottom/top nav; modules listed in QuickLinks.

**Permissions**: Location (maps/rides), Camera/Gallery (posts/ads), Notifications (reminders/chats).

## Core Marketplace Modules

### Food Delivery
**Purpose**: Order from local restaurants; drivers deliver.

**Key Features**:
- Browse menus/restaurants (nearby filter)
- Cart, payments, order tracking
- Restaurant dashboard (sellers: manage orders/menu)

**Usage**:
1. Tap FoodDelivery → Search/browse restaurants.
2. Add MenuItem to cart → Checkout (wallet/cash).
3. Track live via maps; rate/review.
*Backend: FoodOrder model, fooddelivery.js route, foodOrderQueue.js.*

**Advanced**: Restaurant owners use RestaurantDashboard.js.

### Local Market
**Purpose**: Buy/sell fresh/local produce/goods.

**Key Features**:
- Vendor listings, orders
- Nearby markets filter

**Usage**:
1. Tap LocalMarket → Browse products.
2. Order/pay; pickup/delivery.
*See LOCALMARKET_IMPLEMENTATION.md & LOCALMARKET_QUICKSTART.md for vendor setup.*

### Ecommerce
**Purpose**: Full online store, cart, subscriptions.

**Key Features**:
- Products, cart, orders, wallet, gift cards
- Seller analytics, referrals, wishlist
- Bulk orders, returns

**Usage**:
1. Browse categories → Add to CartPage.
2. Checkout (Wallet.js), track OrdersPage.
3. Sellers: SellerAnalytics.js dashboard.
*Models: Product, Order, Wallet.*

### Classifieds
**Purpose**: Post/buy used goods/services.

**Key Features**:
- Multi-images, categories, chat, auto-relist
- Wishlist, seller follow, spam detection
- Bulk actions/import

**Usage**:
1. Tap Classifieds → Post ad (images/desc).
2. Browse/filter → Chat/Contact seller.
3. Manage via SellerStore.js.
*Docs: CLASSIFIEDS_QUICKSTART.md, CLASSIFIEDS_ENHANCEMENTS.md.*

### Wallet/Payments
**Purpose**: Secure wallet-based payments and payment-related account actions.

**Key Features**:
- Wallet balance and transaction history
- Payment flow used across modules (e.g., Ecommerce checkout, FoodDelivery checkout)
- Refunds and payment status tracking (where supported by module flows)

**Usage**:
1. Open the relevant module (e.g., Ecommerce or Food Delivery).
2. Choose Wallet as the payment method at checkout.
3. Confirm payment; check transaction/order status in that module’s page.
4. For payment issues/refunds, use Support/Help.

*Tip*: Keep an eye on OTP/login notifications so purchases don’t fail due to authentication issues.

## Social & Communication

### Social Media
**Purpose**: Share posts, stories, polls.

**Key Features**:
- ForYouFeed, CreatePost, Notifications
- CreatorAnalytics, Polls

**Usage**:
1. Tap SocialMedia → PostCard or CreatePost.
2. Like/comment/share; follow users.

### Messaging & Chatrooms
**Purpose**: Private/group chats, voice/video calls, AI replies.

**Key Features**:
- ChatWindow, GroupCreation, FileUpload
- Read receipts, mentions, scheduled messages
- Chatrooms (public/private)

**Usage**:
1. ContactsList → Start ChatWindow.
2. GroupCreation → Invite → Message.
3. Voice: CallWindow.
*Docs: CHATROOM_FACILITY_GUIDE.md, CHATROOM_TECHNICAL_IMPLEMENTATION.md.*

## Utilities

### Personal Diary
**Purpose**: Private journal with mood tracking/calendar.

**Key Features**:
- DiaryEditor, MoodChart, DiaryCalendar
- Voice entry (health/diaryService.js)

**Usage**:
1. Diary.js → New entry → Save/search.
2. View TodaysSummary/MoodChart.

### Reminder Alert
**Purpose**: Set timed reminders with voice calls/text.

**Key Features**:
- ReminderForm, CountdownTimer
- Trusted contacts, voice calls
- Categories/filters

**Usage**:
1. ReminderAlert → Add reminder → Set time/contacts.
2. Get voice call/push when due.
*Docs: VOICE_CALL_REMINDERS_GUIDE.md, etc. Models: Reminder, TrustedReminderContact.*

### SOS
**Purpose**: Emergency alerts to contacts/police.

**Key Features**:
- SOSAlert, incident response/history

**Usage**:
1. Shake/tap SOSAlert → Auto-share location/contacts.

### Health Module
**Purpose**: Health-related utilities and user health experience.

**Key Features**:
- Health workflows integrated into the app’s utility area
- Supports user needs that may include diary/voice/health-related behaviors

**Usage**:
1. Open Health Module from Utilities/dashboard.
2. Follow the module flow to create/view health-related content.
3. Use connected features (e.g., diary/voice entry) where enabled.

*Note*: If you’re looking for detailed implementation specifics, check the module’s production/gap docs in `docs/`.

## Niche Services

### Ride Sharing
**Purpose**: Book rides/drivers.

**Key Features**:
- Live DriverMap tracking
- Ride requests

**Usage**:
1. RideSharing → Request ride → Track.
*Backend: RideRequest, Driver models.*

### Real Estate
**Purpose**: Property listings/search.

**Usage**:
1. Browse/filter properties → Contact.
*realestate.js route.*

### Matrimonial
**Purpose**: Profiles/matching.

**Key Features**:
- Filters, matching algo

**Usage**:
1. Create profile → Search/matches.

### Astrology
**Purpose**: Horoscopes/profiles.

**Usage**:
1. AstrologyHome → Daily horoscope.

## Support & Admin

### Support/Help
**Purpose**: Help center and issue reporting.

**Key Features**:
- CreateTicket → Track tickets
- Support workflow for user issues

**Usage**:
1. Open Support/Help.
2. CreateTicket with description/screenshots if required.
3. Track ticket status until resolution.

### User Management
**Purpose**: Administrative and platform-level user account operations.

**Key Features**:
- Account visibility and administrative management workflows
- Supports Admin Dashboard moderation/admin actions

**Usage**:
- Admin Dashboard → User Management:
  - Search users
  - Review account actions
  - Apply moderation/admin changes (where configured)

### Admin Dashboard
**Purpose**: Admin analytics and moderation console.

**Key Features**:
- AdminDashboard (analytics/users/moderation)
- Operational monitoring for platform health

**Usage**:
1. Open Admin Dashboard.
2. Use analytics panels for platform overview.
3. Use moderation panels to review/report actions.

## Strategic Investor Modules

### AI Business Operating System
**Purpose**: Business AI infrastructure for local shops and SMEs.

**Highlights**:
- AI invoice + GST billing
- CRM, inventory, staff attendance
- WhatsApp marketing and AI sales analytics
- SaaS-style recurring monetization

### Kerala + Gulf Jobs Migration
**Purpose**: End-to-end migration journey for Kerala to GCC candidates.

**Highlights**:
- Document verification and visa tracking
- Interview AI practice
- Employer verification and onboarding support

### Women Safety + Family Protection
**Purpose**: Safety ecosystem for women, children, and elderly users.

**Highlights**:
- SOS live tracking and trusted circle escalation
- Emergency recording
- Child and elderly protection alerts

### Devotional Ecosystem
**Purpose**: Daily devotional utility and temple engagement.

**Highlights**:
- Virtual queue and vazhipadu booking
- Festival alerts and donation flows
- Pilgrimage planning and devotional streaming

### Hyperlocal AI Commerce
**Purpose**: AI acceleration layer for local commerce conversion.

**Highlights**:
- AI recommendations and seller co-pilot
- Voice shopping and WhatsApp ordering
- Local offer optimization

### Nila AI Studio
**Purpose**: Unified generative creator platform.

**Highlights**:
- Story-to-cartoon videos
- AI reels, dubbing, avatars, and business promo maker
- Creator and business monetization pathways

### Trust Layer
**Purpose**: Cross-platform trust, safety, and moderation architecture.

**Highlights**:
- Verified users and sellers
- Trust score + fraud detection
- AI moderation and community reporting

## FAQs
- **Login issues?** Check OTP spam; use social login (TODO_SOCIAL_LOGIN.md).
- **Payments?** Via Wallet; refunds in OrdersPage.
- **Privacy**: See PRIVACY_POLICY.html.
- **Troubleshoot**: Check backend/logs/, or support tickets.

**Feedback/Updates**: Check TODO_ALL_MODULES_PROGRESS.md. For devs: backend/server.js, src/App.js.

*Last Updated: Auto-generated by BLACKBOXAI. Generated from project structure.*
