# HotelBooking User Manual (Front-End)

> Module: `src/modules/hotelbooking/HotelBooking.js`  
> Product name in UI: **NilaStay — Kerala Hotel & Homestay Booking**

## 1) What this module does
HotelBooking helps you:
- Find hotels/homestays/resorts in Kerala using filters (location, dates, guests, budget)
- Browse property cards with rating, amenities, and verified badge
- Request booking and contact properties via WhatsApp / call (demo actions)
- View your **My Bookings**
- Become a **Partner** (list your property, featured listing, business benefits)
- Access **Admin Panel** (manage verification/commissions/bookings) in this build

## 2) Entry point in the app
1. Open **HotelBooking / NilaStay** from main navigation/menu.

## 3) Internal navigation (tabs)
Inside the module you’ll see tabs:
- 🔍 **Find Hotels**
- 📋 **My Bookings**
- 🏨 **Partner Hotels**
- ⚙️ **Admin Panel**

## 4) Find Hotels (search + filters)
### 4.1 Set filters
On the **Find Hotels** screen, fill:
- 📍 **Location** (Kerala locations dropdown)
- 📅 **Dates**
  - Check-in
  - Check-out
- 👥 **Guests** (1 to 20)
- 💰 **Budget (₹/night)** slider (up to 20,000)
- 🏠 **Property Type** checkboxes (Hotel, Homestay, Resort, Lodge, Villa, etc.)
- ✨ **Amenities** checkboxes (WiFi, AC, Parking, Pool, Restaurant, Spa, Pet Friendly, etc.)
- Sorting:
  - Sort by **Rating**
  - **Price: Low to High**
  - **Price: High to Low**

### 4.2 View results
Results are displayed as property cards showing:
- Name
- Verified status (✓ Verified)
- Rating + review count
- Location, type, price per night
- Short description
- Up to 4 amenities as tags
- Images (first image shown)

## 5) Request booking / contact
From each hotel card you can trigger demo actions:
- **Request Booking**  
- **WhatsApp** (opens chat with the property WhatsApp number)
- **Call** (initiates phone call to the property phone number)

Expected behavior (demo):
- The UI shows an alert that booking/contact would be handled via booking form + WhatsApp/call in a full implementation.

## 6) My Bookings
In **My Bookings** you can see booking history cards such as:
- Property name
- Status (e.g., Confirmed)
- Dates, guests, and total amount
- Actions:
  - **View Details**
  - **Contact Hotel**

## 7) Partner With Us
In **Partner Hotels** you can see partner options:
1. **Hotel Registration**
   - Free basic listing
   - Direct customer contact
   - Commission: 10% per booking
   - WhatsApp booking integration
2. **Featured Listing**
   - Premium visibility
   - ₹299/month
   - Analytics dashboard
3. **Business Benefits**
   - Reach Kerala tourists
   - No booking fees (for hotels)
   - Verified reviews system

These are informational/demo CTAs in this build.

## 8) Admin Panel
In **Admin Panel** (admin build) you can view:
- Dashboard stats (Total Hotels, Active Bookings, monthly revenue, commission earned)
- Hotel verification queue (example “Pending approvals: X hotels”)
- Commission management (current rate example: 10%)
- Booking management (today’s bookings)

## 9) Troubleshooting
- No properties found:
  - loosen filters (remove amenities/types, increase budget, change location)
- Booking/contact buttons:
  - actions are demo alerts in this build; confirm WhatsApp/call integrations exist in production.
- My Bookings empty:
  - bookings may not be created in this demo; use Request Booking actions.

## 10) UI sections reference (quick)
- Find Hotels: filters + property cards + Request Booking / WhatsApp / Call
- My Bookings: booking history cards + actions
- Partner Hotels: registration + featured + benefits info
- Admin Panel: stats + verification queue + commission/booking management
