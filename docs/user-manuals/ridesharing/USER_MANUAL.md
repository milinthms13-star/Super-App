# Ride-Sharing (FRS) User Manual (Front-End)

> Module: `src/modules/ridesharing/RideSharing.js`

## 1) What this module does
The Ride-Sharing module is a single workspace for **Riders**, **Drivers/Captains**, and **Admins** (mode switch inside the UI). It provides:
- Ride booking: pickup → drop → ride type → payment choice → confirm booking
- Fare estimation breakdown
- Driver matching preview
- Live trip timeline (status flow)
- SOS + trip sharing (UI actions)
- Ratings/feedback after completing a trip
- Trip history
- Driver console: online/offline, earnings/metrics, ride request accept/reject
- Admin view: platform analytics, driver verification list, disputes/feedback queue

## 2) Entry point in the app
1. Navigate to the Ride-Sharing screen (where `RideSharing` is routed in your app).
2. Use the **role chips** to switch between **Rider**, **Driver / Captain**, and **Admin** (chips are disabled if not allowed for the current user role).

## 3) Roles and permissions (as represented by UI)
The module derives the “base mode” from the logged-in user:
- **Admin**: `user.registrationType === "admin"` or `user.role === "admin"`
- **Driver / Captain**: `user.registrationType === "driver" || user.role === "driver" || user.role === "captain"`
- **Rider**: default fallback

### Rider capabilities
- Book rides
- View live tracking once a trip is active
- Share trip / trigger SOS (UI actions)
- Rate driver after trip completion
- View trip history

### Driver / Captain capabilities
- Go online/offline
- See earnings and request alerts
- Accept or reject incoming ride requests
- View trip history

### Admin capabilities
- View platform analytics
- See driver verification list
- See a disputes/feedback list and use “Resolve” UI action

## 4) Rider: Step-by-step user flow

### 4.1 Book a ride (pickup → drop → ride type → payment → confirm)
1. Open the **Ride booking** panel.
2. (Required) Enter **Pickup location**.
   - Example placeholder: `Infopark Phase 1`
3. (Required) Enter **Drop location**.
   - Example placeholder: `Marine Drive`
4. Select a **Ride type** from the catalog.
   - Bikes / Autos / Cars are shown as option cards.
5. Choose **Payment** method.
   - Options: `UPI`, `Card`, `Wallet`, `Cash`
6. Review the **Fare estimate** summary.
   - The module shows: estimated distance, base fare, ride fare, service fee, total.
7. Click **Confirm booking**.

Result:
- The UI calls `rideSharingService.bookRide(...)`.
- `statusMessage` updates to “Booking ride...” then shows success such as:
  - `Auto booked. Waiting for driver assignment.`
- An **active trip** is created and the Live tracking section becomes available.

Common blocking condition:
- If pickup/drop/ride type are missing, the UI sets:
  - `Add pickup, drop, and ride type before confirming the booking.`

### 4.2 View driver matching preview
After confirming booking (while the trip is active):
- In the booking area, you’ll see a **Matching preview** card with:
  - selected ride type
  - “search nearby drivers in your zone”
  - primary match ETA

### 4.3 Live tracking & trip status timeline
Once the trip is active:
1. Go to the **Live tracking** panel.
2. Read the active trip cards:
   - Route label (pickup → dropoff)
   - Driver profile (name, vehicle, rating, verification)
   - Trip summary (status, ETA, payment method, invoice amount)
3. Observe the timeline:
   - `Ride requested`
   - `Driver accepted`
   - `Driver arriving`
   - `Trip started`
   - `Trip completed`

> In this MVP UI, “live” advancement is simulated with the action below.

### 4.4 Simulate next status (MVP action)
1. Click **Simulate next status** inside the active trip section.
2. The UI calls `rideSharingService.completeRide(...)` on the active trip id (MVP behavior).

Result:
- `statusMessage` becomes `Trip completed.`
- Rating becomes unlocked for the completed trip.

### 4.5 Share trip and SOS
With an active trip, use the inline actions:
- **Share trip**
  - Updates the UI message:
    - `Trip details shared with trusted contacts.`
  - Adds a notification:
    - `Trip sharing sent with live route and driver details.`
- **SOS**
  - Updates the UI message:
    - `SOS alert triggered for emergency support.`
  - Adds a notification:
    - `SOS alert escalated to emergency workflow.`

### 4.6 Rate driver + submit feedback (after completion)
1. Open the **Ratings and feedback** panel.
2. Select:
   - **Rider rates driver** (1–5)
   - **Driver rates rider** (1–5)
3. Enter optional text in **Feedback**.
4. Click:
   - **Submit feedback** (if a completed trip is eligible)

If rating is locked, the button text becomes:
- `Complete trip to unlock feedback`

Edge message if you try to submit too early:
- `Complete your current trip before adding ratings and feedback.`

After submission:
- `pendingRatingTripId` resets
- rating values return to defaults (5/5, empty feedback)

### 4.7 View trip history & invoices
1. Open the **Trip history and payments** panel.
2. View each record card:
   - route
   - status
   - payment method
   - fare amount

> The list includes the active trip (when applicable) plus completed trip history.

## 5) Driver / Captain: Step-by-step user flow

### 5.1 Toggle online/offline
1. Switch role to **Driver / Captain**.
2. In the **Captain console** panel:
3. Click **Go online** or **Go offline**.

Result:
- UI toggles `driverOnline` state.
- A `statusMessage` shows e.g.:
  - `Driver mode is now online.`

### 5.2 See earnings dashboard
In the **Earnings dashboard** panel:
- View:
  - Gross earnings
  - Online time
  - Open ride alerts
  - Kilometers today

### 5.3 Handle ride requests (Accept / Reject)
1. Open the **Ride requests** panel.
2. For each pending request:
   - read rider name
   - pickup → dropoff
   - ride type | ETA | payment method
   - estimated fare
3. Click **Accept** to accept the request.
4. Click **Reject** to reject the request.

Result & UI behavior:
- Accept removes request from the pending list and updates messages:
  - `Ride request <id> accepted...`
- Reject removes request and updates messages:
  - `Ride request <id> rejected...`
  - plus an additional notification if rider name is present.

### 5.4 View trip history
Open the **Trip history** panel to view completed rides and rider rating summaries.

## 6) Admin: Step-by-step user flow

### 6.1 View platform analytics
1. Switch role to **Admin**.
2. Open **Platform analytics** panel.
3. Review metrics:
- Ride completion
- Average wait
- Driver earnings
- Customer retention

### 6.2 Governance desk
In the **Governance desk** panel, review:
- Active drivers
- Disputes open
- Documents verified
- Tracked payments (revenue)

### 6.3 Driver verification list
1. Open **Driver verification** panel.
2. Review driver cards (name, vehicle, languages, verification status, rating).

### 6.4 Disputes and feedback (resolve UI)
1. Open **Disputes and feedback** panel.
2. Click **Resolve** on a dispute item.

## 7) FAQ / Troubleshooting (UI-level)

### 7.1 “Add pickup, drop, and ride type before confirming the booking.”
Cause:
- One or more required fields are empty.
Fix:
- Enter pickup + drop.
- Ensure a ride type is selected.

### 7.2 Booking fails with an API error message
Cause:
- Backend validation/auth errors from `rideSharingService.bookRide`.
Fix:
- Confirm the user is logged in.
- Retry with valid pickup/drop values.

### 7.3 Rating button is disabled / says “Complete trip...”
Cause:
- `pendingRatingTripId` is not set because trip completion hasn’t occurred.
Fix:
- Use the trip status action until the UI reports trip completion.

### 7.4 Driver online/offline does not “affect” requests
Note:
- This is a UI-driven MVP flow; request data is seeded/simulated.
Fix:
- For real behavior, ensure backend + sockets/location updates are enabled.

## 8) UI sections reference (quick navigation)
- **Ride booking**: pickup/drop/ride type/payment + fare estimate + confirm
- **Live tracking**: active trip route/driver/status/timeline + actions (share/SOS/simulate next status)
- **Ratings and feedback**: mutual rating + feedback textarea + submit
- **Trip history and payments**: record list (route/status/payment/fare)
- **Captain console** (driver): availability + trips + earnings + acceptance rate + online/offline + navigation button
- **Earnings dashboard** (driver): earnings + online time + open alerts + kilometers
- **Ride requests** (driver): accept/reject queue
- **Platform analytics** / **Governance desk** / **Driver verification** / **Disputes & feedback** (admin)


