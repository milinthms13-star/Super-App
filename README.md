# NilaHub / MalabarBazaar

NilaHub is a large multi-domain super-app built as a React single-page application with a Node/Express backend. It includes commerce, messaging, classifieds, real estate, finance, freelancer services, bill pay, food delivery, travel, safety, astrology, education, productivity, and admin workflows.

## Stack

### Frontend
- React 18
- React Router v6
- Axios
- i18next
- Socket.IO client
- Electron support
- Capacitor support

### Backend
- Node.js 18+
- Express
- MongoDB / Mongoose
- Socket.IO
- Redis / Bull
- JWT auth
- AWS / cloud integrations

## Key entry points

### Frontend
- `src/App.js` — main route shell
- `src/modules/Dashboard.js` — authenticated dashboard
- `src/utils/moduleRoutes.js` — route/module resolution
- `src/contexts/AppContext.js` — shared app state

### Backend
- `backend/server.js`
- `backend/app.js`

## App architecture

The frontend has three major modes:

1. **Launch / login flow**
   - shown when the user is not authenticated
   - includes language selection and registration-type selection

2. **Authenticated shell**
   - wrapped in `Layout`
   - renders the dashboard and all internal module routes

3. **Emergency overlays**
   - SOS / emergency call overlays can appear on top of authenticated views

## Route model

Route registration lives in `src/App.js`.

Route-to-path resolution lives in `src/utils/moduleRoutes.js`.

The dashboard lives in `src/modules/Dashboard.js` and exposes enabled modules plus custom links.

## Public and platform routes

- `/` → launch/auth flow
- `/dashboard`
- `/admin-dashboard`
- `/admin-dashboard/subscriptions`
- `/profile`
- `/support`
- `*` → fallback redirect to the default authenticated path

## Commerce routes

- `/ecommerce`
- `/cart`
- `/orders`
- `/returns`

## Service and utility routes

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

## Route aliases and redirects

The app keeps older paths working through redirects and module alias resolution.

### Redirects in `src/App.js`
- `/kerala-gulf-jobs-migration` → `/gulf-services`
- `/localmarket` → `/hyperlocal`
- `/ridesharing/driver-map` → dedicated driver map view

### Aliases in `src/utils/moduleRoutes.js`
Examples:
- `quicklink`, `quick-links` → `quicklinks`
- `mydiary`, `personaldiary` → `diary`
- `financehub`, `loans` → `finance`
- `hyperlocaldelivery`, `deliveryhub`, `instamart` → `hyperlocal`
- `gulfjobsmigration`, `kerala-gulf-jobs-migration` → `gulfservices`
- `photostudioaiar`, `aiarstudio` → `photostudio`
- `karaoke`, `duet` → `karaokeduet`
- `voice-friend`, `ai-voice-friend` → `voicefriend`
- `smartkitchen`, `recipes` → `kitchen`
- `travelhub`, `nilatravel` → `tourism`

## Module catalog

### 1. Dashboard
- **Route:** `/dashboard`
- **Entry:** `src/modules/Dashboard.js`
- **Purpose:** user and seller landing workspace
- **Responsibilities:**
  - render enabled modules
  - show quick actions
  - show recent orders
  - show seller analytics
  - manage favorites and custom links
  - react to websocket dashboard updates

### 2. Admin Dashboard
- **Route:** `/admin-dashboard`
- **Entry:** `src/modules/admin/AdminDashboard.js`
- **Purpose:** admin control center
- **Responsibilities:**
  - manage enabled modules
  - review registrations
  - manage GlobeMart categories and subcategories
  - review product submissions
  - review returns and refunds
  - review business accounts

### 3. Admin Module Subscriptions
- **Route:** `/admin-dashboard/subscriptions`
- **Entry:** `src/modules/admin/AdminModuleSubscriptionScreen.js`
- **Purpose:** module visibility and subscription admin view

### 4. GlobeMart / Ecommerce Entry
- **Route:** `/ecommerce`
- **Entry:** `src/modules/ecommerce/GlobeMartEntry.js`
- **Purpose:** ecommerce entry point
- **Responsibilities:**
  - launch the GlobeMart experience
  - surface category-based shopping content

### 5. Cart
- **Route:** `/cart`
- **Entry:** `src/modules/ecommerce/CartPage.js`
- **Purpose:** shopping cart management

### 6. Orders
- **Route:** `/orders`
- **Entry:** `src/modules/ecommerce/OrdersPage.js`
- **Purpose:** order history and tracking

### 7. Returns
- **Route:** `/returns`
- **Entry:** `src/modules/ecommerce/ReturnsPage.js`
- **Purpose:** return and refund handling

### 8. Messaging
- **Route:** `/messaging`
- **Entry:** `src/modules/messaging/Messaging`
- **Purpose:** chat and messaging workspace

### 9. Classifieds
- **Route:** `/classifieds`
- **Entry:** `src/modules/classifieds/Classifieds`
- **Purpose:** listings marketplace

### 10. Real Estate
- **Route:** `/realestate`
- **Entry:** `src/modules/realestate/RealEstate`
- **Purpose:** property discovery

### 11. Finance
- **Route:** `/finance`
- **Entry:** `src/modules/finance/FinanceHub`
- **Purpose:** financial services hub

### 12. Freelancer
- **Route:** `/freelancer`
- **Entry:** `src/modules/freelancer/FreelancerMarketplace`
- **Purpose:** services and freelance marketplace

### 13. Bill Pay
- **Route:** `/billpay`
- **Entry:** `src/modules/billpay/BillPayHub`
- **Purpose:** utility bill management

### 14. Business Builder
- **Route:** `/business-builder`
- **Entry:** `src/modules/businessbuilder/BusinessBuilder`
- **Purpose:** mini-app and business creation hub

### 15. Nila AI Hub
- **Route:** `/nila-ai-hub`
- **Entry:** `src/modules/nilaaihub/NilaAIHub`
- **Purpose:** AI assistant hub

### 16. Kids Story Video Maker
- **Route:** `/kids-story-video-maker`
- **Entry:** `src/modules/kidsstoryvideomaker/KidsStoryVideoMaker`
- **Purpose:** kids story video creation

### 17. Gulf Services
- **Route:** `/gulf-services`
- **Entry:** `src/modules/gulfservices/GulfServices`
- **Purpose:** Gulf migration and support services

### 18. Hotel Booking
- **Route:** `/hotelbooking`
- **Entry:** `src/modules/hotelbooking/HotelBooking`
- **Purpose:** stay booking module

### 19. Healthcare
- **Route:** `/healthcare`
- **Entry:** `src/modules/healthcare/Healthcare`
- **Purpose:** healthcare ecosystem

### 20. Bus/Train Booking
- **Route:** `/bustrainbooking`
- **Entry:** `src/modules/bustrainbooking/BusTrainBooking`
- **Purpose:** public transport booking

### 21. Resume Builder
- **Route:** `/resumebuilder`
- **Entry:** `src/modules/resumebuilder/ResumeBuilder`
- **Purpose:** resume creation and optimization

### 22. Photo Studio AI + AR
- **Route:** `/photo-studio-ai-ar`
- **Entry:** `src/modules/photostudio/PhotoStudioAIAR`
- **Purpose:** AI photo editing and AR creator studio

### 23. Remote Karaoke Duet
- **Route:** `/remote-karaoke-duet`
- **Entry:** `src/modules/karaokeduet/RemoteKaraokeDuet`
- **Purpose:** synchronized duet performance tool

### 24. Dance Duet
- **Route:** `/dance-duet`
- **Entry:** `src/modules/danceduet/AutoDanceDuet`
- **Purpose:** AI dance duet composer

### 25. Voice Friend
- **Route:** `/voice-friend`
- **Entry:** `src/modules/voicefriend/VoiceFriend`
- **Purpose:** emotional support voice companion

### 26. Live Place Explorer
- **Route:** `/live-place-explorer`
- **Entry:** `src/modules/liveplaceexplorer/LivePlaceExplorer`
- **Purpose:** live travel and place discovery

### 27. Nila Beauty AI
- **Route:** `/nila-beauty-ai`
- **Entry:** `src/modules/beautyai/NilaBeautyAI`
- **Purpose:** beauty planning and recommendation

### 28. Smart Kitchen Recipe Hub
- **Route:** `/smart-kitchen-recipe-hub`
- **Entry:** `src/modules/kitchen/SmartKitchenRecipeHub`
- **Purpose:** recipes and kitchen utility hub

### 29. Trust Layer
- **Route:** `/trust-layer`
- **Entry:** `src/modules/trustlayer/TrustLayer`
- **Purpose:** trust and verification core

### 31. Business Services
- **Route:** `/businessservices`
- **Entry:** `src/modules/businessservices/BusinessServices`
- **Purpose:** business operations services hub

### 32. Job Portal
- **Route:** `/jobportal`
- **Entry:** `src/modules/jobportal/JobPortal`
- **Purpose:** job discovery and recruitment

### 33. Education
- **Route:** `/education`
- **Entry:** `src/modules/education/Education`
- **Purpose:** education ecosystem

### 34. Tourism
- **Route:** `/tourism`
- **Entry:** `src/modules/tourism/TourismMarketplace`
- **Purpose:** tourism marketplace

### 35. Skill Learning
- **Route:** `/skilllearning`
- **Entry:** `src/modules/skilllearning/SkillLearningHub`
- **Purpose:** skill development and learning hub

### 36. Food Delivery
- **Route:** `/fooddelivery`
- **Entry:** `src/modules/fooddelivery/FoodDelivery`
- **Purpose:** restaurant discovery and delivery

### 37. Devadarshan
- **Route:** `/devadarshan`
- **Entry:** `src/modules/devadarshan/DevadarshanHub`
- **Purpose:** temple booking and devotional services

### 38. Hyperlocal
- **Route:** `/hyperlocal`
- **Entry:** `src/modules/hyperlocal/HyperlocalDeliveryHub`
- **Purpose:** hyperlocal delivery services

### 39. Local Services
- **Route:** `/localservices`
- **Entry:** `src/modules/localservices/LocalServicesMarketplace`
- **Purpose:** local service booking marketplace

### 40. Ride Sharing
- **Route:** `/ridesharing`
- **Entry:** `src/modules/ridesharing/RideSharing`
- **Purpose:** ride booking and transport

### 41. Maps
- **Route:** `/maps`
- **Entry:** `src/modules/maps/DriverMap`
- **Purpose:** location and driver map view

### 42. Matrimonial
- **Route:** `/matrimonial`
- **Entry:** `src/modules/matrimonial/Matrimonial`
- **Purpose:** partner discovery

### 43. Social Media
- **Route:** `/socialmedia`
- **Entry:** `src/modules/socialmedia/SocialMedia`
- **Purpose:** social networking area

### 44. Reminder Alert
- **Route:** `/reminderalert`
- **Entry:** `src/modules/reminderalert/ReminderAlert`
- **Purpose:** task reminder and alert system

### 45. Quick Links
- **Route:** `/quicklinks`
- **Entry:** `src/modules/quicklinks/QuickLinks`
- **Purpose:** shortcut and bookmark manager

### 46. Diary
- **Route:** `/diary`
- **Entry:** `src/modules/personaldiary` via `Diary` export
- **Purpose:** personal journal and memory module

### 47. SOS Alert
- **Route:** `/sosalert`
- **Entry:** `src/modules/sos/SOSAlert`
- **Purpose:** emergency response center

### 48. Astrology Home
- **Route:** `/astrology`
- **Entry:** `src/modules/astrology/AstrologyHome`
- **Purpose:** main astrology experience

### 49. Astrology Consultant Admin
- **Route:** `/astrology-consultant-admin`
- **Entry:** `src/modules/astrology/ConsultantAdminPanel`
- **Purpose:** consultant management

### 50. Astrology Analytics
- **Route:** `/astrology-analytics`
- **Entry:** `src/modules/astrology/AnalyticsDashboard`
- **Purpose:** astrology analytics dashboard

### 51. Support
- **Route:** `/support`
- **Entry:** `src/modules/support/Support`
- **Purpose:** user support module

### 52. Profile
- **Route:** `/profile`
- **Entry:** `src/components/UserProfile`
- **Purpose:** authenticated user profile page

## Access control

Module access is controlled by:
- authentication state
- admin status
- enabled module list from backend data
- parent module access mapping

### Parent access mapping
- `cart` → `ecommerce`
- `orders` → `ecommerce`
- `returns` → `ecommerce`

### Toggle-controlled modules
Examples:
- ecommerce
- messaging
- classifieds
- realestate
- socialmedia
- matrimonial
- localservices
- hyperlocal
- tourism
- hotelbooking
- bustrainbooking
- ridesharing
- gulfservices
- businessbuilder
- businessservices
- freelancer
- resumebuilder
- photostudio
- karaokeduet
- danceduet
- voicefriend
- liveplaceexplorer
- beautyai
- kitchen
- trustlayer
- jobportal
- skilllearning
- education
- nilaaihub
- kidsstoryvideomaker
- finance
- billpay
- fooddelivery
- healthcare
- reminderalert
- sosalert
- devadarshan
- astrology
- quicklinks
- diary

## Dashboard behavior

`src/modules/Dashboard.js` is the main authenticated landing experience.

It provides:
- module cards
- category filters
- favorites
- custom links
- quick actions
- recent orders
- seller-only views
- real-time dashboard analytics via websocket updates

## Platform-level backend endpoints

Frequently used app-level backend flows include:

- `GET /auth/me`
- `PATCH /auth/me`
- `POST /auth/logout`
- `POST /auth/refresh-token`
- `GET /app-data/public`
- `GET /app-data/admin`
- `POST /app-data/registration-applications`
- `PATCH /app-data/enabled-modules/:moduleId`
- `PATCH /app-data/registration-applications/:applicationId/review`
- `POST /app-data/globemart-categories`
- `POST /app-data/globemart-categories/:categoryId/subcategories`

## Module documentation map

This repository now includes both broad platform documentation and module-specific documentation. Use the following references when working on a feature area:

### All non-astro modules
- `docs/non-astro-user-manual.md` — user-facing guide for the full app outside astrology
- `docs/functional-modules-document.md` — route map, aliases, redirects, reachability rules, and module catalog
- `docs/missed-user-features.md` — scan of incomplete or stubbed user-facing features

### Astrology module
- `docs/astrology-user-manual.md` — end-user guide
- `docs/astrology-technical-reference.md` — API, service, and implementation contract
- `docs/astrology-architecture-diagram.md` — architecture overview and data flow
- `docs/astrology-scorecard.md` — quality gaps and improvement priorities

### Freelancer module
- `docs/freelancer/FREELANCER_360_CANVA_BRIEF.md` — role-based UX, journeys, and screen set
- `docs/missed-user-features.md` — identifies stubbed freelancer flows that still need implementation

### Gulf Services module
- `docs/gulfservices/GULFSERVICES_360_CANVA_BRIEF.md` — role-aware journeys, trust rules, analytics, and screen requirements

### Hotel Booking module
- `docs/missed-user-features.md` — notes that the current implementation still relies on sample/static hotel data and should be wired to the backend

## Notes for maintainers

Update this README whenever:
- a route is added, removed, or renamed
- a module entry file changes
- a module alias is added or retired
- a redirect changes
- the backend route ownership for a module changes

## Suggested verification checklist

- confirm `src/App.js` registers the route
- confirm `src/utils/moduleRoutes.js` resolves the module path
- confirm the dashboard exposes the module if it should be user-visible
- confirm admin toggles do not hide intended modules
- confirm the backend route exists for modules that need API support
- confirm legacy redirects still resolve correctly
- confirm the module can be reached from the authenticated shell
