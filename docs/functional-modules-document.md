# NilaHub Functional Modules Document

## Purpose

This document is the technical index for all routable modules in the application.

It maps:

- frontend routes
- entry files
- the functional purpose of each module
- shared routing utilities
- reachability and gating rules
- legacy aliases and redirects

Use this document for:

- onboarding
- QA planning
- route-to-feature tracing
- release review
- module ownership and audit checks

---

## System Architecture Overview

The application is a React single-page app with route registration in:

- `src/App.js`

Route normalization and alias resolution are defined in:

- `src/utils/moduleRoutes.js`

The main module discovery surface is:

- `src/modules/Dashboard.js`

Shared application state and session data are passed through:

- `src/contexts/AppContext.js`

The app also uses:

- `src/components/Layout.js`
- `src/components/Login.js`
- `src/components/LaunchPage.js`
- `src/components/AnnouncementBar.js`
- `src/components/ErrorBoundary.js`

---

## Routing Model

### Public vs authenticated experience

`src/App.js` splits the app into three layers:

1. **Launch / login flow**
   - shown when the user is not authenticated
   - includes language selection and registration-type selection

2. **Authenticated shell**
   - wrapped in `Layout`
   - renders the dashboard and all internal module routes

3. **Emergency / system overlays**
   - SOS and call overlays can appear on top of authenticated views
   - route transitions are still handled through the SPA shell

### Access control

Access is controlled in `src/App.js` using:

- authenticated route shell
- admin-only routes
- toggle-controlled module IDs
- `MODULE_ACCESS_PARENT_MAP`
- enabled module data fetched from `/app-data/public` and `/app-data/admin`

### Route utilities

Defined in `src/utils/moduleRoutes.js`:

- `normalizeModuleId(moduleId)`
- `getPathForModule(moduleId, fallbackPath)`
- `getProtectedModuleFromPathname(pathname)`
- `MODULE_PATHS`
- `ROUTABLE_MODULES`

These utilities are used by:

- `src/App.js`
- `src/modules/Dashboard.js`
- any component that needs to resolve a module ID to a path

---

## Route Reachability Rules

A module is reachable if all of the following are true:

- it is registered in `src/App.js`
- it is present in `MODULE_PATHS` when path lookup is needed
- it is surfaced in the dashboard or another navigation surface
- it is enabled by backend data when the route is toggle-controlled
- the user passes any required admin gate or subscription gate

Important references:

- `src/App.js` registers every route
- `src/modules/Dashboard.js` lists the dashboard cards
- `src/utils/moduleRoutes.js` maps route IDs to pathnames
- admin toggles in `src/modules/admin/AdminDashboard.js` influence module visibility

---

## Route Map Reference

### Core routes

- `/` → launch/auth shell or redirect
- `/dashboard`
- `/admin-dashboard`
- `/admin-dashboard/subscriptions`
- `/profile`
- `/support`
- `*` → fallback redirect to the default authenticated path

### Commerce routes

- `/ecommerce`
- `/cart`
- `/orders`
- `/returns`

### Service and communication routes

- `/messaging`
- `/classifieds`
- `/realestate`
- `/finance`
- `/freelancer`
- `/billpay`
- `/business-builder`
- `/nila-ai-hub`
- `/kids-story-video-maker`
- `/gulf-services`
- `/hotelbooking`
- `/healthcare`
- `/bustrainbooking`
- `/resumebuilder`
- `/photo-studio-ai-ar`
- `/remote-karaoke-duet`
- `/dance-duet`
- `/voice-friend`
- `/live-place-explorer`
- `/nila-beauty-ai`
- `/smart-kitchen-recipe-hub`
- `/trust-layer`
- `/businessservices`
- `/jobportal`
- `/education`
- `/tourism`
- `/skilllearning`
- `/fooddelivery`
- `/devadarshan`
- `/hyperlocal`
- `/localservices`
- `/ridesharing`
- `/maps`
- `/matrimonial`
- `/socialmedia`
- `/reminderalert`
- `/quicklinks`
- `/diary`
- `/sosalert`
- `/astrology`
- `/astrology-consultant-admin`
- `/astrology-analytics`

### Legacy routes / redirects

- `/kerala-gulf-jobs-migration` → redirects to `/gulf-services`
- `/localmarket` → redirects to `/hyperlocal`
- `/ridesharing/driver-map` → dedicated map route
- `?module=` query parameter can deep-link into a route after login

---

## Shared Module Path Aliases

Defined in `src/utils/moduleRoutes.js`.

### Examples

- `quicklink`, `quick-links` → `quicklinks`
- `personaldiary`, `mydiary` → `diary`
- `financehub`, `loans` → `finance`
- `hyperlocaldelivery`, `deliveryhub`, `instamart` → `hyperlocal`
- `gulfjobsmigration`, `kerala-gulf-jobs-migration` → `gulfservices`
- `photostudioaiar`, `aiarstudio` → `photostudio`
- `karaoke`, `duet` → `karaokeduet`
- `ai-voice-friend`, `voice-friend` → `voicefriend`
- `smartkitchen`, `recipes` → `kitchen`
- `travelhub`, `nilatravel` → `tourism`

These aliases keep older links and alternate naming schemes working.

---

## Functional Module Catalog

## 1) Dashboard
- **Route:** `/dashboard`
- **Entry file:** `src/modules/Dashboard.js`
- **Purpose:** user and seller landing workspace
- **Primary responsibilities:**
  - render enabled modules
  - show quick actions
  - show recent orders
  - show seller analytics when applicable
  - manage favorites and custom links
  - react to websocket dashboard updates
- **Notable dependencies:**
  - `src/websocket/dashboardWebSocketClient`
  - `src/contexts/AppContext`
  - `src/utils/moduleRoutes`
  - `src/utils/ecommerceHelpers`

## 2) Admin Dashboard
- **Route:** `/admin-dashboard`
- **Entry file:** `src/modules/admin/AdminDashboard.js`
- **Purpose:** admin control center
- **Primary responsibilities:**
  - manage enabled modules
  - review registrations
  - create GlobeMart categories and subcategories
  - review product submissions
  - review returns and refunds
  - review business accounts
- **Backend references:**
  - `backend/routes/adminDashboardRoutes.js`
  - `backend/routes/adminRoutes.js`

## 3) Admin Module Subscriptions
- **Route:** `/admin-dashboard/subscriptions`
- **Entry file:** `src/modules/admin/AdminModuleSubscriptionScreen.js`
- **Purpose:** subscription and module visibility admin view
- **Primary responsibilities:**
  - manage module subscription state
  - support visibility administration

## 4) Ecommerce / GlobeMart Entry
- **Route:** `/ecommerce`
- **Entry file:** `src/modules/ecommerce/GlobeMartEntry.js`
- **Purpose:** ecommerce entry point
- **Primary responsibilities:**
  - launch the GlobeMart experience
  - surface category-based shopping content
- **Backend references:**
  - `backend/routes/ecommercePhase7Routes.js`
  - `backend/routes/products.js`
  - `backend/routes/cartRoutes.js`
  - `backend/routes/orders.js`

## 5) Cart
- **Route:** `/cart`
- **Entry file:** `src/modules/ecommerce/CartPage.js`
- **Purpose:** shopping cart management
- **Primary responsibilities:**
  - display cart items
  - support review before checkout
- **Backend references:**
  - `backend/routes/cartRoutes.js`
  - `backend/routes/checkoutRoutes.js`

## 6) Orders
- **Route:** `/orders`
- **Entry file:** `src/modules/ecommerce/OrdersPage.js`
- **Purpose:** order history and tracking
- **Primary responsibilities:**
  - list customer orders
  - show status and fulfillment data
- **Backend references:**
  - `backend/routes/orders.js`
  - `backend/routes/orderManagementRoutes.js`
  - `backend/routes/orderNotificationRoutes.js`

## 7) Returns
- **Route:** `/returns`
- **Entry file:** `src/modules/ecommerce/ReturnsPage.js`
- **Purpose:** return and refund handling
- **Primary responsibilities:**
  - review return requests
  - support refund workflows
- **Backend references:**
  - `backend/routes/disputeResolutionRoutes.js`
  - `backend/routes/refunds.js` if introduced in future phases
  - order management and return-related controllers

## 8) Messaging
- **Route:** `/messaging`
- **Entry file:** `src/modules/messaging/Messaging`
- **Purpose:** chat and messaging workspace
- **Primary responsibilities:**
  - handle conversations
  - support seller/customer communication
  - integrate emergency call routing from the app shell
- **Backend references:**
  - `backend/routes/messaging.js`
  - `backend/routes/messageThreadRoutes.js`
  - `backend/routes/messageSearchRoutes.js`
  - `backend/routes/readReceiptRoutes.js`
  - `backend/routes/messageReactionsRoutes.js`

## 9) Classifieds
- **Route:** `/classifieds`
- **Entry file:** `src/modules/classifieds/Classifieds`
- **Purpose:** listings marketplace
- **Primary responsibilities:**
  - publish and browse classified ads
  - support buy/sell discovery
- **Backend references:**
  - `backend/routes/classifieds.test.js`
  - classifieds route groupings in backend phase files

## 10) Real Estate
- **Route:** `/realestate`
- **Entry file:** `src/modules/realestate/RealEstate`
- **Purpose:** property discovery
- **Primary responsibilities:**
  - browse homes, rentals, and land
  - support property search and discovery
- **Backend references:**
  - `backend/routes/realestate.js`
  - `backend/routes/realestate_fixed.js`

## 11) Finance
- **Route:** `/finance`
- **Entry file:** `src/modules/finance/FinanceHub`
- **Purpose:** financial services hub
- **Primary responsibilities:**
  - loan guidance
  - EMI planning
  - institution marketplace
  - financial support connectivity
- **Backend references:**
  - `backend/routes/finance.js`
  - `backend/routes/finance.routes.integration.test.js`
  - `backend/routes/payments.js`
  - `backend/routes/paymentmethods.js`

## 12) Freelancer
- **Route:** `/freelancer`
- **Entry file:** `src/modules/freelancer/FreelancerMarketplace`
- **Purpose:** services and freelance marketplace
- **Primary responsibilities:**
  - connect clients with freelancers
  - support local service requests and professional listings
- **Backend references:**
  - `backend/routes/freelancer.js`
  - `backend/routes/freelancer.routes.integration.test.js`
  - `backend/routes/freelancer.shared.test.js`

## 13) Bill Pay
- **Route:** `/billpay`
- **Entry file:** `src/modules/billpay/BillPayHub`
- **Purpose:** utility bill management
- **Primary responsibilities:**
  - bill fetch and pay
  - payment reminders
  - saved billers
  - receipt vault
- **Backend references:**
  - `backend/routes/billpay.js`
  - `backend/routes/billpay.routes.integration.test.js`
  - `backend/routes/paymentWebhookRoutes.js`
  - `backend/routes/advancedPaymentRoutes.js`

## 14) Business Builder
- **Route:** `/business-builder`
- **Entry file:** `src/modules/businessbuilder/BusinessBuilder`
- **Purpose:** mini-app and business creation hub
- **Primary responsibilities:**
  - build business mini apps
  - manage business profiles
  - issue branded invoices
- **Backend references:**
  - `backend/routes/businessBuilderRoutes.js`

## 15) Nila AI Hub
- **Route:** `/nila-ai-hub`
- **Entry file:** `src/modules/nilaaihub/NilaAIHub`
- **Purpose:** AI assistant hub
- **Primary responsibilities:**
  - personal assistant support
  - service discovery
  - workflow guidance
- **Backend references:**
  - `backend/routes/aichatRoutes.js`
  - `backend/routes/aimlRoutes.js`

## 16) Kids Story Video Maker
- **Route:** `/kids-story-video-maker`
- **Entry file:** `src/modules/kidsstoryvideomaker/KidsStoryVideoMaker`
- **Purpose:** story video creation for kids content
- **Primary responsibilities:**
  - create kid-friendly stories
  - sequence scenes and narration flow
  - support family-friendly sharing
  - provide story health and render analytics
- **Backend references:**
  - `backend/routes/kidsStoryGeneratorRoutes.js`
  - `backend/routes/kidsVideoGeneratorHF.js`

## 17) Gulf Services
- **Route:** `/gulf-services`
- **Entry file:** `src/modules/gulfservices/GulfServices`
- **Purpose:** Gulf migration and support services
- **Primary responsibilities:**
  - visa enquiry and tracking
  - verified Gulf jobs and recruiter-backed applications
  - document attestation workflows with payment intent support
  - emergency escalation workflow with case ID generation
  - recruiter onboarding and admin verification queue
  - fraud reporting and case lifecycle tracking
  - travel, medical, returnee, and NRI request intake
  - user workflow dashboard and analytics
- **Backend references:**
  - `backend/routes/gulfservices.js`
  - `backend/routes/driverKYCRoutes.js`
  - `backend/routes/advancedSecurityRoutes.js`
  - `backend/routes/fraudDetectionRoutes.js`

## 18) Hotel Booking
- **Route:** `/hotelbooking`
- **Entry file:** `src/modules/hotelbooking/HotelBooking`
- **Purpose:** stay booking module
- **Primary responsibilities:**
  - book verified hotels and homestays
  - support local contact workflows
- **Backend references:**
  - `backend/routes/hotelbooking.js`

## 19) Healthcare
- **Route:** `/healthcare`
- **Entry file:** `src/modules/healthcare/Healthcare`
- **Purpose:** healthcare ecosystem
- **Primary responsibilities:**
  - doctor consultations
  - lab bookings
  - pharmacy delivery
  - health records
  - emergency services
- **Backend references:**
  - `backend/routes/health.js`
  - healthcare-related controllers and notification routes

## 20) Bus/Train Booking
- **Route:** `/bustrainbooking`
- **Entry file:** `src/modules/bustrainbooking/BusTrainBooking`
- **Purpose:** public transport booking
- **Primary responsibilities:**
  - bus booking
  - train booking
  - PNR tracking
  - assisted booking
  - fare comparison
- **Backend references:**
  - `backend/routes/bustrainbooking` if added in future phases
  - nearby transport and booking phase routes

## 21) Resume Builder
- **Route:** `/resumebuilder`
- **Entry file:** `src/modules/resumebuilder/ResumeBuilder`
- **Purpose:** resume creation and optimization
- **Primary responsibilities:**
  - ATS-friendly resumes
  - job-specific tailoring
  - cover letters
  - interview prep support
- **Backend references:**
  - `backend/routes/resumebuilder.js`

## 22) Photo Studio AI + AR
- **Route:** `/photo-studio-ai-ar`
- **Entry file:** `src/modules/photostudio/PhotoStudioAIAR`
- **Purpose:** AI photo editing and AR creator studio
- **Primary responsibilities:**
  - filters
  - templates
  - background tools
  - caption generation
  - creator monetization support
- **Backend references:**
  - `backend/routes/photoStudio.js`

## 23) Remote Karaoke Duet
- **Route:** `/remote-karaoke-duet`
- **Entry file:** `src/modules/karaokeduet/RemoteKaraokeDuet`
- **Purpose:** remote duet performance tool
- **Primary responsibilities:**
  - live synchronized duet sessions
  - local recording
  - final mixed export
  - session health metrics
- **Backend references:**
  - `backend/routes/karaokeDuet.js`

## 24) Dance Duet
- **Route:** `/dance-duet`
- **Entry file:** `src/modules/danceduet/AutoDanceDuet`
- **Purpose:** AI dance duet composer
- **Primary responsibilities:**
  - merge two dance videos
  - shared-stage styling
  - background removal
  - MP4 export
- **Backend references:**
  - `backend/routes/danceDuet.js`

## 25) Voice Friend
- **Route:** `/voice-friend`
- **Entry file:** `src/modules/voicefriend/VoiceFriend`
- **Purpose:** emotional support voice companion
- **Primary responsibilities:**
  - voice chat companion
  - emotion-aware responses
  - motivational and safety-oriented guidance
- **Backend references:**
  - voice / AI chat support routes when integrated

## 26) Live Place Explorer
- **Route:** `/live-place-explorer`
- **Entry file:** `src/modules/liveplaceexplorer/LivePlaceExplorer`
- **Purpose:** live travel and place discovery
- **Primary responsibilities:**
  - place search
  - 360° street imagery
  - weather
  - nearby photos
  - AI travel guidance
- **Backend references:**
  - `backend/routes/livePlaceExplorer.js`

## 27) Nila Beauty AI
- **Route:** `/nila-beauty-ai`
- **Entry file:** `src/modules/beautyai/NilaBeautyAI`
- **Purpose:** beauty planning and recommendation
- **Primary responsibilities:**
  - selfie analysis
  - skincare routines
  - safety guardrails
  - lifestyle recommendations
- **Backend references:**
  - `backend/routes/beautyAI.js`
  - `backend/routes/beautyAI.routes.integration.test.js`

## 28) Smart Kitchen Recipe Hub
- **Route:** `/smart-kitchen-recipe-hub`
- **Entry file:** `src/modules/kitchen/SmartKitchenRecipeHub`
- **Purpose:** recipe and kitchen utility hub
- **Primary responsibilities:**
  - recipe generation from ingredients
  - step cooking mode
  - grocery list creation
  - recipe sharing
  - kitchen analytics and 360 insight dashboard
- **Backend references:**
  - `backend/routes/kitchen.js`

## 29) Trust Layer
- **Route:** `/trust-layer`
- **Entry file:** `src/modules/trustlayer/TrustLayer`
- **Purpose:** trust and verification core
- **Primary responsibilities:**
  - trust scores
  - fraud detection
  - community reporting
  - moderation safeguards
- **Backend references:**
  - `backend/routes/fraudDetectionRoutes.js`
  - `backend/routes/advancedSecurityRoutes.js`
  - `backend/routes/abuseReportingRoutes.js`

## 31) Business Services
- **Route:** `/businessservices`
- **Entry file:** `src/modules/businessservices/BusinessServices`
- **Purpose:** business operations services hub
- **Primary responsibilities:**
  - GST filing
  - company registration
  - legal consultation
  - digital marketing
  - startup package support
- **Backend references:**
  - `backend/routes/businessServices.js`
  - `backend/routes/businessServices.notifications.test.js`

## 32) Job Portal
- **Route:** `/jobportal`
- **Entry file:** `src/modules/jobportal/JobPortal`
- **Purpose:** job discovery and recruitment
- **Primary responsibilities:**
  - local and Gulf jobs
  - IT and gig opportunities
  - verified recruiters
  - smart apply
  - resume scoring
  - employer dashboard
  - alerts
- **Backend references:**
  - `backend/routes/jobportal.js`
  - `backend/routes/jobportal.routes.integration.test.js`

## 33) Education
- **Route:** `/education`
- **Entry file:** `src/modules/education/Education`
- **Purpose:** education ecosystem
- **Primary responsibilities:**
  - tuition
  - skill courses
  - student community
  - study abroad guidance
  - scholarship discovery
- **Backend references:**
  - education routes and course discovery phase files

## 34) Tourism
- **Route:** `/tourism`
- **Entry file:** `src/modules/tourism/TourismMarketplace`
- **Purpose:** tourism marketplace
- **Primary responsibilities:**
  - curated Kerala packages
  - custom trips
  - local experiences
- **Backend references:**
  - `backend/routes/tourism.js` if introduced in future route consolidation

## 35) Skill Learning
- **Route:** `/skilllearning`
- **Entry file:** `src/modules/skilllearning/SkillLearningHub`
- **Purpose:** skill development and learning hub
- **Primary responsibilities:**
  - courses
  - mock tests
  - certification wallet
  - AI career guidance
- **Backend references:**
  - learning and assessment phase routes when present

## 36) Food Delivery
- **Route:** `/fooddelivery`
- **Entry file:** `src/modules/fooddelivery/FoodDelivery`
- **Purpose:** restaurant discovery and delivery
- **Primary responsibilities:**
  - browse food options
  - ordering and delivery workflows
- **Backend references:**
  - `backend/routes/fooddelivery.js`
  - `backend/routes/fooddelivery.test.js`
  - `backend/routes/foodDeliveryAuthRoutes.js`
  - `backend/routes/foodDeliveryCartOrderRoutes.js`
  - `backend/routes/foodDeliveryRestaurantMenuRoutes.js`
  - `backend/routes/foodDeliveryPhase4Routes.js`
  - `backend/routes/foodDeliveryPhase5Routes.js`

## 37) Devadarshan
- **Route:** `/devadarshan`
- **Entry file:** `src/modules/devadarshan/DevadarshanHub`
- **Purpose:** temple booking and devotional services
- **Primary responsibilities:**
  - vazhipadu booking
  - event booking
  - hall booking
  - donation receipts
  - Kerala-specific devotional workflows
- **Backend references:**
  - `backend/routes/devadarshan.js`

## 38) Hyperlocal
- **Route:** `/hyperlocal`
- **Entry file:** `src/modules/hyperlocal/HyperlocalDeliveryHub`
- **Purpose:** hyperlocal delivery services
- **Primary responsibilities:**
  - grocery delivery
  - pharmacy delivery
  - food delivery
  - parcel pickup/drop
  - live tracking
- **Backend references:**
  - `backend/routes/hyperlocal.js`
  - `backend/routes/deliveryRoutes.js`

## 39) Local Services
- **Route:** `/localservices`
- **Entry file:** `src/modules/localservices/LocalServicesMarketplace`
- **Purpose:** local service booking marketplace
- **Primary responsibilities:**
  - caterers
  - decorators
  - photographers
  - event service packages
- **Backend references:**
  - `backend/routes/localservices.js`
  - `backend/routes/localmarket.js`

## 40) Ride Sharing
- **Route:** `/ridesharing`
- **Entry file:** `src/modules/ridesharing/RideSharing`
- **Purpose:** ride booking and transport
- **Primary responsibilities:**
  - ride booking
  - shared transport options
- **Backend references:**
  - `backend/routes/ridesharing.js`
  - `backend/routes/rideSharingAuthRoutes.js`
  - `backend/routes/rideSharingPhase*.js`
  - `backend/routes/ridesharing/driver-map` via `maps` reuse

## 41) Maps
- **Route:** `/maps`
- **Entry file:** `src/modules/maps/DriverMap`
- **Purpose:** location and driver map view
- **Primary responsibilities:**
  - map-based driver and location workflows
  - reused for ridesharing driver map route
- **Backend references:**
  - mapping and geo-location support routes when present

## 42) Matrimonial
- **Route:** `/matrimonial`
- **Entry file:** `src/modules/matrimonial/Matrimonial`
- **Purpose:** partner discovery
- **Primary responsibilities:**
  - verified profiles
  - profile updates
  - matchmaking flows
- **Backend references:**
  - `backend/routes/matrimonial.js`
  - `backend/routes/matrimonial.test.js`
  - `backend/routes/matrimonial-horoscope.js`
  - `backend/routes/matrimonial-kyc.js`
  - `backend/routes/matrimonial-subscription.js`
  - `backend/routes/matrimonial-referral.js`
  - `backend/routes/matrimonial-seo.js`
  - `backend/routes/matrimonial-communication.js`
  - `backend/routes/matrimonial-admin-analytics.js`

## 43) Social Media
- **Route:** `/socialmedia`
- **Entry file:** `src/modules/socialmedia/SocialMedia`
- **Purpose:** social networking area
- **Primary responsibilities:**
  - connect
  - share
  - community interaction
- **Backend references:**
  - `backend/routes/groupRoutes.js`
  - `backend/routes/reactionRoutes.js`
  - `backend/routes/richMediaRoutes.js`
  - `backend/routes/notificationRoutes.js`

## 44) Reminder Alert
- **Route:** `/reminderalert`
- **Entry file:** `src/modules/reminderalert/ReminderAlert`
- **Purpose:** task reminder and alert system
- **Primary responsibilities:**
  - todo list planning
  - alarms
  - SMS reminders
  - call alerts
- **Backend references:**
  - `backend/routes/reminders.js`
  - `backend/routes/reminders.test.js`
  - `backend/routes/alerts.js`

## 45) Quick Links
- **Route:** `/quicklinks`
- **Entry file:** `src/modules/quicklinks/QuickLinks`
- **Purpose:** shortcut and bookmark manager
- **Primary responsibilities:**
  - save favorite links
  - manage personal shortcuts
  - support custom links in the dashboard
- **Backend references:**
  - stored client-side via `CUSTOM_LINKS_STORAGE_KEY`

## 46) Diary
- **Route:** `/diary`
- **Entry file:** `src/modules/personaldiary` via `Diary` export
- **Purpose:** personal journal and memory module
- **Primary responsibilities:**
  - notes
  - entries
  - private journaling
- **Backend references:**
  - `backend/routes/diary.js`
  - `backend/routes/diary-phase7.js`
  - `backend/routes/diary.api.test.js`
  - `backend/routes/diary.integration.test.js`
  - `backend/routes/diary.search.test.js`
  - `backend/routes/diary.helpers.test.js`
  - `backend/routes/diary.analytics.test.js`

## 47) SOS Alert
- **Route:** `/sosalert`
- **Entry file:** `src/modules/sos/SOSAlert`
- **Purpose:** emergency response center
- **Primary responsibilities:**
  - SOS alerting
  - live location sharing
  - escalation to trusted contacts
- **Backend references:**
  - `backend/routes/sos.js`
  - `backend/routes/sosController.js`
  - `backend/routes/sosController.Priority2.js`
  - `backend/routes/sosController.FamilyAutoAccessIntegration.js`

## 48) Astrology Home
- **Route:** `/astrology`
- **Entry file:** `src/modules/astrology/AstrologyHome`
- **Purpose:** main astrology experience
- **Primary responsibilities:**
  - horoscope browsing
  - astrology guidance
  - consumer astrology workflows
- **Backend references:**
  - `backend/routes/astrology.js`
  - `backend/routes/astrology.test.js`
  - `backend/routes/astrology.routes.integration.test.js`

## 49) Astrology Consultant Admin
- **Route:** `/astrology-consultant-admin`
- **Entry file:** `src/modules/astrology/ConsultantAdminPanel`
- **Purpose:** consultant management
- **Primary responsibilities:**
  - consultant admin workflows
  - service management support
- **Backend references:**
  - astrology admin and scheduling route groups

## 50) Astrology Analytics
- **Route:** `/astrology-analytics`
- **Entry file:** `src/modules/astrology/AnalyticsDashboard`
- **Purpose:** astrology analytics dashboard
- **Primary responsibilities:**
  - platform analytics for astrology flows
  - reporting and insights
- **Backend references:**
  - astrology reporting and analytics route groups

## 51) Support
- **Route:** `/support`
- **Entry file:** `src/modules/support/Support`
- **Purpose:** user support module
- **Primary responsibilities:**
  - help and support access
  - issue navigation
  - user assistance flows

  - `backend/routes/ratingReviewRoutes.js`

## 53) Profile
- **Route:** `/profile`
- **Entry file:** `src/components/UserProfile`
- **Purpose:** authenticated user profile page
- **Primary responsibilities:**
  - show and update profile details
  - persist user changes through `/auth/me`
- **Backend references:**
  - `backend/routes/auth.js`

---

## Platform-Level Non-Module Routes

These routes are not product modules, but they are part of the app shell and should be documented for completeness.

### Launch and login flow
- `/`
- handled in `src/App.js`
- renders `LaunchPage` or `Login` based on authentication and registration flow

### Authentication and session behavior
- `GET /auth/me`
- `PATCH /auth/me`
- `POST /auth/logout`
- `POST /auth/refresh-token`

### Platform data flows
- `GET /app-data/public`
- `GET /app-data/admin`
- `POST /app-data/registration-applications`
- `PATCH /app-data/enabled-modules/:moduleId`
- `PATCH /app-data/registration-applications/:applicationId/review`
- `POST /app-data/globemart-categories`
- `POST /app-data/globemart-categories/:categoryId/subcategories`

### Emergency and socket events
- socket connection uses `BACKEND_BASE_URL`
- listens for:
  - `sos:incoming`
  - `call:incoming`

---

## Dashboard Module Visibility Rules

The dashboard only shows modules that are:

- in the enabled module list
- recognized by the dashboard catalog
- compatible with seller restrictions when the user is a seller

Important dashboard logic lives in:

- `src/modules/Dashboard.js`

The dashboard uses:

- module categories
- favorite module storage
- custom links storage
- seller/public layouts
- live analytics updates

---

## Important Shared Utilities

### `src/utils/moduleRoutes.js`
Responsible for:

- resolving aliases
- mapping module IDs to routes
- normalizing path requests
- determining protected modules from current pathname

### `src/utils/auth.js`
Responsible for:

- persisting access tokens
- clearing access tokens
- reading access tokens

### `src/utils/customLinks.js`
Responsible for:

- validating dashboard shortcut links
- normalizing stored custom links

---

## Notes on Module Exposure

Some modules are visible in the app shell but depend on backend data or account type.

### Admin-only
- `/admin-dashboard`
- `/admin-dashboard/subscriptions`

### Toggle-controlled / feature-controlled
Modules in `TOGGLE_CONTROLLED_MODULE_IDS` are subject to enabled-module state.

Examples:

- `ecommerce`
- `messaging`
- `classifieds`
- `realestate`
- `socialmedia`
- `matrimonial`
- `localservices`
- `hyperlocal`
- `tourism`
- `hotelbooking`
- `bustrainbooking`
- `ridesharing`
- `gulfservices`
- `businessbuilder`
- `businessservices`
- `freelancer`
- `resumebuilder`
- `photostudio`
- `karaokeduet`
- `danceduet`
- `voicefriend`
- `liveplaceexplorer`
- `beautyai`
- `kitchen`
- `trustlayer`
- `jobportal`
- `skilllearning`
- `education`
- `nilaaihub`
- `kidsstoryvideomaker`
- `finance`
- `billpay`
- `fooddelivery`
- `healthcare`
- `reminderalert`
- `sosalert`
- `devadarshan`
- `astrology`
- `quicklinks`
- `diary`

### Parent-module access mapping
Some routes inherit visibility from a parent module:

- `cart` → `ecommerce`
- `orders` → `ecommerce`
- `returns` → `ecommerce`

This is enforced by:

- `MODULE_ACCESS_PARENT_MAP` in `src/App.js`

---

## Module Catalog Summary

The repository contains a multi-domain super-app with modules spanning:

- commerce
- admin operations
- messaging
- local services
- travel and mobility
- finance and bill pay
- creator tools
- safety and emergency support
- astrology
- education and skill building
- health and wellbeing
- productivity and personal organization
- social and community features

---

## Maintenance Rules

Update this document whenever:

- a route is added, removed, or renamed
- a module entry file changes
- a module alias is added or retired
- an admin gate or feature toggle changes
- a module becomes reachable through a new redirect or deep link
- the backend route ownership for a module changes

---

## Verification Checklist

When making future changes, verify:

- `src/App.js` contains the route
- `src/utils/moduleRoutes.js` resolves the path correctly
- the dashboard exposes the module if it should be user-visible
- admin toggles do not hide intended modules
- the backend route exists for modules that need API support
- legacy redirects still resolve to the intended path
- the module can be reached from the authenticated shell
