# NilaHub Investor Pitch Deck (Code-First Draft)

Prepared from repository evidence (not TODO notes) on **May 15, 2026**.

## Slide 1 - Title
**NilaHub**  
India-focused multi-vertical super app platform

- Founder-led build with full-stack ownership
- Stage: Product-built, pre-scale
- Positioning: One app architecture for many local-life workflows

---

## Slide 2 - Problem
Local digital life is still fragmented across disconnected apps.

- Users switch between separate apps for classifieds, property, services, delivery, and communication
- Buyer journeys and seller journeys are usually not unified in one product context
- Small businesses need digital demand, but struggle with tooling complexity
- Trust, verification, and moderation patterns are inconsistent across categories

---

## Slide 3 - Product Thesis
Build one shared platform, then layer vertical modules on top.

- Single app shell with reusable infrastructure across verticals
- Multi-role design for buyers, sellers, service providers, and admins
- Shared capabilities: identity, messaging, payments, analytics, reporting
- Modular expansion model instead of one-off standalone apps

---

## Slide 4 - Codebase Scale (Proof)
Current implementation footprint in this repository:

- **36 frontend modules** under `src/modules/`
- **214 backend route files** under `backend/routes/`
- **265 backend model files** under `backend/models/`
- **56 backend controllers**, **207 backend service files**, **19 middleware files**
- **147 test/spec files** across backend, frontend, and Cypress patterns

---

## Slide 5 - Module Breadth (Frontend)
Live code already spans 30+ product verticals:

- Core commerce and marketplaces: `ecommerce`, `localmarket`, `classifieds`, `hyperlocal`
- Supply and services: `businessservices`, `localservices`, `freelancer`, `gulfservices`
- High-intent categories: `realestate`, `jobportal`, `matrimonial`, `healthcare`, `education`
- Engagement and utility: `messaging`, `socialmedia`, `support`, `reporting`, `reminderalert`, `sos`
- Additional verticals: `fooddelivery`, `ridesharing`, `tourism`, `hotelbooking`, `finance`, `billpay`, `astrology`, and more

---

## Slide 6 - Buyer + Seller Readiness
Code structure supports two-sided marketplace behavior across modules.

- Marketplace routes include search, discovery, orders, carts, wishlist, reviews, recommendations
- Seller/partner operations include analytics, order management, settlements, vendor management
- Real estate and classifieds exist as dedicated vertical modules (`realestate`, `classifieds`)
- Product direction: keep strengthening explicit buyer-intent vs seller-intent flows in TradePost and HomeSphere

---

## Slide 7 - Platform and Distribution
NilaHub is built for web, desktop, and mobile packaging.

- Web app build pipeline (`react-scripts` build)
- Desktop distribution via Electron (`electron.js`, `electron-builder` targets for Win/Mac/Linux)
- Mobile packaging via Capacitor (`capacitor.config.json`, Android/iOS scripts in `package.json`)
- Backend deployment config exists (`render.yaml`, health-check based deployment)

---

## Slide 8 - Monetization Infrastructure
Revenue primitives are already represented in backend routes.

- Payments and checkout routes (`payments`, `paymentWebhookRoutes`, `checkoutRoutes`)
- Subscription paths (`subscriptionRoutes`, `subscriptions`)
- Loyalty and rewards (`loyaltyPointsRoutes`, `loyaltyRewardsRoutes`)
- Commerce and fulfillment signals (`orders`, `settlements`, `deliveryRoutes`)
- Upsell/visibility levers (`flashsales`, `recommendationsRoutes`, `selleranalytics`)

---

## Slide 9 - Trust, Security, and Reliability
Core controls are present across auth, fraud, and moderation surfaces.

- Authentication variants (`auth`, `socialAuthRoutes`, `otpAuthRoutes`, `biometricAuthRoutes`)
- Security layers (`advancedSecurityRoutes`, `encryptionRoutes`, `messageEncryptionRoutes`)
- Abuse and risk tooling (`abuseReportingRoutes`, `fraudDetectionRoutes`, `disputeResolutionRoutes`)
- Operational hardening (`sessionManagementRoutes`, `backupRestoreRoutes`, health endpoint config)

---

## Slide 10 - Engagement Flywheel
Retention loops are built into messaging and notification infrastructure.

- Rich messaging feature set: reactions, scheduling, translation, templates, thread management
- Multi-channel notification stack (`multiChannelNotificationRoutes`, `notificationRoutes`)
- Social and collaboration hooks (`socialmedia`, `groupRoutes`, `realtimeCollaborationRoutes`)
- Personalization and analytics routes to improve relevance and repeat usage

---

## Slide 11 - GTM Strategy (Execution-Focused)
Go-to-market should follow where code depth is strongest.

- Phase 1: TradePost (`classifieds`) + HomeSphere (`realestate`) as primary acquisition wedges
- Phase 2: Cross-sell into high-frequency modules (`fooddelivery`, `localservices`, `finance`, `billpay`)
- Phase 3: Retain via messaging, reminders, subscriptions, and loyalty
- Phase 4: Expand B2B supply tools via `businessbuilder`, `businessservices`, seller analytics

---

## Slide 12 - Next 2 Quarters (Investor-Trackable)
Convert product breadth into measurable traction.

- Q1: Harden buyer/seller conversion funnels in TradePost and HomeSphere
- Q1: Expand instrumentation for activation, conversion, and retention KPIs
- Q2: Launch focused city/segment pilots with supply-side onboarding playbooks
- Q2: Tighten monetization loops (paid visibility, subscriptions, transaction rails)

---

## Slide 13 - Funding Ask
Raise to accelerate scale on top of an already-built platform.

- Product hardening and automated QA expansion
- Focused GTM for supply onboarding and demand activation
- Analytics and experimentation layer for conversion optimization
- Key hires for growth operations and partnerships

---

## Slide 14 - Closing
NilaHub is not an idea deck; it is a deep implementation platform.

- 36 frontend modules and extensive backend service surface already built
- Cross-platform distribution stack already wired (web + desktop + mobile)
- Multiple monetization and retention primitives already in code
- Capital is for speed-to-scale, not for initial product construction

---

## Appendix A - Evidence Anchors
- Frontend module map: `src/modules/*`
- Backend API surface: `backend/routes/*`
- Data layer depth: `backend/models/*`
- Service layer depth: `backend/services/*`
- Platform scripts: `package.json`, `backend/package.json`
- Desktop runtime: `electron.js`
- Mobile packaging: `capacitor.config.json`
- Deployment config: `render.yaml`
