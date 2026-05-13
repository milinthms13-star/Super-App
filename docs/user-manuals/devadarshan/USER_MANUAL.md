# Devadarshan User Manual (Front-End)

> Module: `src/modules/devadarshan/DevadarshanHub.js`  
> Product name in UI: **Devadarshan** (Kerala Devotional Service Hub)

## 1) What this module does
Devadarshan provides:
- A **temple directory** with filters + search
- **Vazhipadu / pooja booking** flow (booking + receipt generation)
- **Calendar / festival events** listing with notification toggles
- **Online donation** flow with donation receipts
- “**My Devadarshan**” history: upcoming bookings, confirmed/completed poojas, donations
- User personalization:
  - family star profile (add/remove members)
  - devotional preferences and reminder toggles
- Live darshan favorites/saved live lists (via profile preferences)
- **Admin** tools for temples/events and verification/status updates

## 2) Entry point in the app
1. Open **Devadarshan** from the main navigation/menu.

## 3) Main navigation (sections)
The module uses section buttons (order depends on whether you are admin):
- **Dashboard**
- **Temples (Directory)**
- **Vazhipadu Booking**
- **Calendar**
- **Donation**
- **My Devadarshan**
- **Profile**
- **Live Darshan**
- **Admin** (admin-only)

## 4) Dashboard
Use **Dashboard** to quickly jump to features and see top summaries:
- Daily Darshan / upcoming events count
- Nearby temples count
- Vazhipadu booking count
- Temple live-ready count
- Your booking + donation totals (My section)
- Notifications list

## 5) Directory: Temples (search + filters)
1. Open **Temples (Directory)**.
2. Use filters:
   - District
   - Deity
   - Temple type
   - Pooja filter (pooja name)
   - Festival filter
   - Distance slider
   - Popularity slider
3. Use the top search input:
   - search by temple/district/deity/festival/pooja/rules/contact text

Each temple card shows:
- name, district, deity, temple type
- timings + contact + dress code + rules
- festivals + distance + popularity
- Verified vs Pending verification badge

Temple card actions:
- **Book Vazhipadu**
- **View Details**
- **Save Favourite** / Remove Favourite
- **Map Direction** (opens map link)
  
Expected behavior:
- Choosing **Book Vazhipadu** selects the temple and opens Booking section.

## 6) Vazhipadu Booking (Pooja booking)
1. Open **Vazhipadu Booking**.
2. Fill the booking form:
   - Temple (dropdown)
   - Pooja / Vazhipadu type
   - Devotee Name
   - Family Member (optional) — selecting sets nakshatra
   - Nakshatra (optional)
   - Booking Date
   - Quantity
   - Prasadam option
   - Delivery mode:
     - Temple Pickup
     - Local Delivery (shows delivery address field)
   - Payment Method (UPI/Card/Net Banking/Wallet)
   - Payment Gateway (Razorpay / Stripe selector)
   - Notes

3. Click **Confirm Booking + Payment**.

Expected result:
- Booking is created via backend (`/api/devadarshan/bookings`)
- After payment verification, a booking becomes confirmed and a receipt is available (shown in My Devadarshan).
- Receipts are generated as downloadable text receipts in this build.

## 7) Trust & verification notes (booking)
The booking UI indicates whether the selected temple is:
- **Verified temple badge active**
- **Pending temple verification**

Admin approval behavior:
- Verified temples: payment/confirmation flow is smoother
- Pending temples: admin approval may be required

## 8) Calendar (festival events)
1. Open **Calendar**.
2. Review festival event cards:
   - event title
   - type
   - temple name
   - date + details
3. Use **Notify Me** toggle per event:
   - Notify Me Enabled / Notify Me

Expected behavior:
- Toggling notification triggers backend preference update.

## 9) Donation (online donation)
1. Open **Donation**.
2. Fill donation form:
   - Temple
   - Donation category (Annadanam / Temple Maintenance / etc.)
   - Amount
   - Purpose
   - Payment method (UPI/Card/Net Banking/Wallet)
3. Click **Donate + Generate Receipt**.

Expected behavior:
- Donation request is processed
- Donation receipt becomes available in **Donation History** inside My Devadarshan.

## 10) My Devadarshan (history + receipts + live favorites)
Open **My Devadarshan** to see:
- Upcoming bookings
  - download receipt
  - if pending payment: **Pay Now**
  - if not cancelled: **Cancel**
- Completed / confirmed poojas
  - download receipt
- Donation history
  - download receipt
- Cancelled / refunded bookings list
- **Favourites & Saved Live**
  - favourite temples list
  - saved live darshan list

## 11) Profile (personalization + reminders + family stars)
Open **Profile** to manage:
- Family Star Profile
  - add a family member
  - remove a family member
- Reminder toggles:
  - birthday (reminderBirthday)
  - monthly reminders
  - yearly reminders
- Devotional preferences (reminder categories)
- Saved Live Darshan / Live preferences (via stored settings)

## 12) Live Darshan (live list)
Open **Live Darshan** to view live-ready temples and your saved live links (exact UI depends on temple data availability).

## 13) Admin (admin-only)
Admin can manage:
- Add temples (from admin temple form)
- Verify temples (toggle verification)
- Add/publish events (admin event form)
- Update booking status for bookings under admin routes

## 14) Troubleshooting
- Directory shows fewer temples:
  - adjust filters (distance/popularity) and remove strict selection
- Booking doesn’t proceed:
  - ensure temple and pooja type are selected
  - ensure payment gateway selection is correct
- Payment verification fails:
  - the UI should show “Payment verification failed.” messaging (depends on backend)
- Receipts aren’t downloading:
  - check browser download permissions; receipts are generated as downloadable text in this UI

## 15) UI sections reference (quick)
- Dashboard: quick stats + jump cards
- Directory: filters + temple cards + save favourite + booking entry
- Vazhipadu Booking: booking + payment form
- Calendar: festival events + notify toggle
- Donation: donation form + receipt generation
- My Devadarshan: bookings/donations history + receipt download
- Profile: family star + reminder preferences
- Live Darshan: saved live links
- Admin: temple/event/verification + booking status controls
