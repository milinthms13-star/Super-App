# Devadarshan User Manual (Front-End)

> Module: `src/modules/devadarshan/DevadarshanHub.js`

## 1) What this module does
Devadarshan is a Kerala-focused devotional service hub for:
- Temple discovery and trust verification
- Vazhipadu/pooja booking with payment-ready flow
- Donation with receipts and history
- Festival/event tracking with notify-me reminders
- My Devadarshan booking history and receipt downloads
- Family star profile and devotional reminders
- Admin-side temple, event, and approval operations

## 2) Entry point
1. Login.
2. Open **Devadarshan** from app navigation.
3. The module opens on **Dashboard** with quick actions.

## 3) Main navigation sections
- Dashboard
- Temples (Directory + filters)
- Vazhipadu (Booking)
- Calendar (Festival/events)
- Donation
- My Devadarshan
- Profile
- Live Darshan
- Admin

On mobile, a bottom navigation bar is shown for quick movement.

## 4) Step-by-step user flows

### 4.1 Temple directory and filters
1. Open **Temples**.
2. Use search and filters:
   - District
   - Deity
   - Temple type
   - Pooja availability
   - Festival
   - Distance
   - Popularity
3. Open any temple card to view:
   - Timings
   - Contact and official contact
   - Festival list
   - Dress code and rules
   - Map direction
   - Verified badge

Expected result:
- You get a trust-aware temple list with actionable booking and map access.

### 4.2 Vazhipadu / pooja booking + payment
1. Open **Vazhipadu**.
2. Select temple and pooja type (e.g., Archana, Ganapathy Homam, Neyvilakku, Pushpanjali).
3. Enter devotee details (name, date, nakshatra/family member optional).
4. Select prasadam option and pickup/delivery mode.
5. Select payment method and submit.

Expected result:
- Booking is created with:
  - Booking ID
  - Transaction reference
  - Receipt number
  - Admin approval status
  - Payment status

### 4.3 Donation with receipt
1. Open **Donation**.
2. Select temple and donation category:
   - Annadanam
   - Temple maintenance
   - Festival fund
   - Special seva donation
3. Enter amount and payment method.
4. Submit donation.

Expected result:
- Donation transaction is saved with receipt number and appears in donation history.

### 4.4 Festival calendar and reminders
1. Open **Calendar**.
2. Browse temple events (Ulsavam, Ekadashi, Pradosham, Shivaratri, Navaratri, etc.).
3. Click **Notify Me** for events you want reminders for.

Expected result:
- Reminder preference is saved for selected events.

### 4.5 My Devadarshan
1. Open **My Devadarshan**.
2. Review:
   - Upcoming bookings
   - Completed/confirmed poojas
   - Cancelled records
   - Donation history
3. Download receipt from booking/donation items.

Expected result:
- A complete devotional transaction history with receipt access.

### 4.6 Personalization (family profile + reminders)
1. Open **Profile**.
2. Add family members and nakshatras.
3. Set primary nakshatra and preferred pooja.
4. Enable/disable:
   - Birthday pooja reminders
   - Monthly reminders
   - Yearly vazhipadu reminders

Expected result:
- Faster booking setup and recurring devotional engagement preferences.

### 4.7 Live darshan and videos
1. Open **Live Darshan**.
2. Open available temple live links.
3. Save preferred live streams.

Expected result:
- Quick access to live/recorded devotional streams with saved list support.

### 4.8 Admin temple management
1. Open **Admin**.
2. Add/update temple details (contact, timings, dress code, base pooja).
3. Add festival/event updates.
4. Approve/complete/cancel booking requests.
5. Toggle temple verification status and review donation totals.

Expected result:
- Admin can maintain directory trust, event freshness, and booking workflows.

## 5) Trust and verification elements
- Verified temple badge
- Official contact visibility
- Booking receipt number
- Payment confirmation fields
- Admin approval status per booking

## 6) Troubleshooting (UI-level)
- Temple list appears empty:
  - Reset filters to `All`
  - Clear search text
- Booking not submitting:
  - Ensure temple, devotee name, and booking date are filled
- Delivery address missing:
  - Required only when delivery mode is `Local Delivery`
- Receipt not downloading:
  - Retry from My Devadarshan list
  - Check browser download permissions

## 7) UI section reference
- Dashboard quick cards
- Sticky directory filter bar
- Temple cards with verified badges
- Vazhipadu booking form
- Donation form + donation history
- Calendar cards + notify me actions
- My Devadarshan history and receipts
- Profile reminder controls
- Live darshan cards
- Admin management panels
