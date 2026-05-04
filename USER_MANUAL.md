# MalabarBazaar User Manual
## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Core Marketplace Modules](#core-marketplace-modules)
  - [Food Delivery](#food-delivery)
  - [Local Market](#local-market)
  - [Ecommerce](#ecommerce)
  - [Classifieds](#classifieds)
- [Social & Communication](#social--communication)
  - [Social Media](#social-media)
  - [Messaging & Chatrooms](#messaging--chatrooms)
- [Utilities](#utilities)
  - [Personal Diary](#personal-diary)
  - [Reminder Alert](#reminder-alert)
  - [SOS](#sos)
- [Niche Services](#niche-services)
  - [Ride Sharing](#ride-sharing)
  - [Real Estate](#real-estate)
  - [Matrimonial](#matrimonial)
  - [Astrology](#astrology)
- [Support & Admin](#support--admin)
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

**Usage**: Browse/filter properties → Contact.
*realestate.js route.*

### Matrimonial
**Purpose**: Profiles/matching.

**Key Features**:
- Filters, matching algo

**Usage**: Create profile → Search/matches.

### Astrology
**Purpose**: Horoscopes/profiles.

**Usage**: AstrologyHome → Daily horoscope.

## Support & Admin
- **Support**: CreateTicket → Track tickets.
- **Admin**: AdminDashboard (analytics/users/moderation).

## FAQs
- **Login issues?** Check OTP spam; use social login (TODO_SOCIAL_LOGIN.md).
- **Payments?** Via Wallet; refunds in OrdersPage.
- **Privacy**: See PRIVACY_POLICY.html.
- **Troubleshoot**: Check backend/logs/, or support tickets.

**Feedback/Updates**: Check TODO_ALL_MODULES_PROGRESS.md. For devs: backend/server.js, src/App.js.

*Last Updated: Auto-generated by BLACKBOXAI. Generated from project structure.*

