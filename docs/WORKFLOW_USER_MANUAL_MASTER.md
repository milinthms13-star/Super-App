# WORKFLOW USER MANUAL — MalabarBazaar (End-to-End)

> This document is the **single workflow-level user manual** across modules. It focuses on **what users do**, in the order they typically do it, and maps those actions to the relevant module(s).

---

## 1) Before you begin (common across all modules)

### 1.1 Supported actions
- Phone/OTP authentication (and role selection: user / entrepreneur / admin)
- Profile setup + preferences persistence
- Module navigation (dashboard + categorized modules)
- Language toggle (where supported)

### 1.2 Permissions you may be prompted for
- Location (used by maps, ride tracking, nearby discovery)
- Camera/Gallery (used by profiles, classified posts, some module uploads)
- Notifications (used by reminders, chat alerts, etc.)

---

## 2) Sign in (OTP) and choose your role

### 2.1 Typical flow
1. Open the app / web.
2. Select **Login**.
3. Enter your phone/email.
4. Enter the OTP you receive.
5. You land in your **dashboard** for your role.

### 2.2 What changes by role
- **User**: access to consumer modules (marketplace, orders, chat, utilities)
- **Entrepreneur**: seller/creator flows for business categories (module-dependent)
- **Admin**: admin dashboards and moderation/reporting (module-dependent)

---

## 3) Set up your profile (recommended)

### 3.1 Why profile matters
- Enables personalization (feeds, recommendations)
- Powers matrimonial/astrology personalization
- Stores language and other preferences

### 3.2 Common profile inputs
- Basic identity (name/avatar/phone)
- Location
- Preferences (language, module onboarding flags)

---

## 4) Core marketplace workflows (buy, sell, and transact)

## 4.1 Food delivery: browse → cart → pay → track → rate
1. Go to **Food Delivery**.
2. Browse restaurants and menus (often using nearby filters).
3. Add items to cart.
4. Checkout (wallet/cash flows depending on configuration).
5. Track order using live status (and maps where available).
6. After delivery: rate/review.

### Outputs you see
- Order status timeline
- Payment confirmation
- Receipt/transaction reference (if enabled in the module)

---

## 4.2 Local Market: discover vendor goods → order → pickup/delivery
1. Go to **Local Market**.
2. Browse items/produce.
3. Add to cart / initiate order.
4. Pay and choose pickup/delivery (if available).

### Outputs you see
- Vendor listing details
- Order history and current orders

---

## 4.3 Ecommerce: browse product catalog → cart → checkout → manage orders
1. Go to **Ecommerce**.
2. Browse categories.
3. Add items to cart.
4. Checkout (wallet and order creation).
5. View orders and payment history.

### Outputs you see
- Cart, orders, refunds (if supported)
- Seller-related analytics pages (for seller/entrepreneur roles)

---

## 4.4 Classifieds: post → manage listing → chat → shortlist
1. Go to **Classifieds**.
2. Create a new post:
   - choose category
   - upload images
   - write description
3. Publish and optionally re-list / manage status.
4. For buyers: browse and contact the seller.

### Outputs you see
- Your listings management
- Chat/contact actions
- Wishlist/follow and moderation cues (if enabled)

---

## 4.5 Wallet & receipts (used by multiple payment workflows)
1. Complete payment in the relevant module.
2. Open **Payment History** / **Receipts** (module-dependent).
3. Download receipt PDF or share summary (module-dependent).

---

## 5) Social & communication workflows

## 5.1 Messaging: start chat → send files → manage rooms
1. Go to **Messaging**.
2. Select a contact / create a chat.
3. Send messages and optional attachments.
4. Use room controls for group/public rooms.

### Outputs you see
- Conversation history
- Read receipts / mentions (if enabled)

---

## 5.2 Social media: view feed → create post → engage
1. Open **Social Media**.
2. View For-You / home feed.
3. Create a post if supported.
4. Like/comment/share.

---

## 6) Utility workflows (diary, reminders, safety)

## 6.1 Personal Diary: add entry → view summaries
1. Open **Personal Diary / MyDiary**.
2. Create a diary entry.
3. Save and optionally search.
4. View mood charts or calendar summaries (module-dependent).

---

## 6.2 Reminder Alert: create reminder → set schedule → receive alerts
1. Open **Reminder Alert**.
2. Add a reminder.
3. Choose time/date.
4. Choose channels if available (push/SMS/WhatsApp).
5. Add trusted contacts (if enabled).

### Outputs you see
- Reminder list and upcoming schedules
- Delivery status (where tracked)

---

## 6.3 SOS: trigger emergency sharing
1. Open **SOS**.
2. Trigger SOS alert (via button/shake support where available).
3. Alert shares location and emergency contacts (module-dependent).

### Outputs you see
- SOS incident history
- Notification confirmation (if enabled)

---

## 7) Niche services workflows

## 7.1 Ride sharing: request ride → track driver
1. Open **Ride Sharing**.
2. Request a ride (pickup and destination supported by module UI).
3. Track driver live.
4. After completion: rate and view history (if enabled).

---

## 7.2 Real estate: search listings → contact/schedule
1. Open **Real Estate**.
2. Browse/filter properties.
3. Contact seller/agent.

---

## 7.3 Matrimonial: create profile → search matches
1. Open **Matrimonial**.
2. Complete profile and preferences.
3. Browse matches.
4. Use messaging/contact flows if supported.

---

## 7.4 Astrology: daily reading → profile → compatibility → reminders
1. Open **Astrology**.
2. Pick sign (Rashi).
3. View **Daily Horoscope**.
4. Create/save astrology profile.
5. Explore sections:
   - Compatibility
   - Panchangam + festivals
   - Remedies
   - Consultants
   - AI assistant Q&A

---

## 8) Admin / Support workflows (internal-facing)

### 8.1 Support ticket flow (as a user)
1. Open **Support**.
2. Create a ticket with issue details.
3. Track ticket status.

### 8.2 Admin moderation and reporting
- Admin reviews and approves entrepreneur/registration workflows
- Admin monitors analytics and module performance

---

## 9) Troubleshooting quick guide

### Login/OTP issues
- Ensure correct phone/email
- Wait before retrying OTP
- Check spam folder for email OTP (if email-based)

### Payment issues
- Retry if failed
- Open Dispute Center (where available)
- Use Support shortcut from the module

### Chat/messaging not loading
- Check network connectivity
- Log out/in if session token expired

---

## 10) Documentation pointers (where to find deeper details)
- **User manuals (per module)**: `docs/user-manuals/**/USER_MANUAL.md`
- **Module features (coverage)**: `docs/*_FEATURES*.md`
- **Technical docs (architecture)**: `docs/*_MODULE_DOCUMENTATION.md`


