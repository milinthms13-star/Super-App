# Bus & Train Booking Hub User Manual (Front-End)

> Module: `src/modules/bustrainbooking/BusTrainBooking.js`  
> Product name in UI: **NilaTravel — Bus & Train Booking Hub**

## 1) What this module does
This hub helps you:
- Search and book **buses or trains** (demo redirects to official portals)
- Check **PNR status**
- Check **live train status** by train number (demo alert)
- Get **travel support** via WhatsApp + guides

## 2) Entry point in the app
1. Open **Bus & Train Booking Hub** from main navigation/menu.

## 3) Main navigation (inside the module)
You’ll see an internal tab bar with:
- 🔍 **Search & Book**
- 🎫 **PNR Status**
- 📍 **Live Status**
- 🛟 **Travel Support**

## 4) Search & Book (core flow)
### 4.1 Choose booking type
1. Go to **Search & Book**.
2. Choose:
   - 🚌 **Bus**
   - 🚂 **Train**

The origin/destination selector changes depending on the booking type.

### 4.2 Fill search form
On the Search & Book screen:

Common fields:
- **From** (dropdown)
- **To** (dropdown)

For all types:
- **Travel Date** (date picker with min = today)
- **Passengers** (1 to 6)

If booking type is **Train**:
- **Class Preference** (All Classes / 1A / 2A / 3A / SL / CC)

### 4.3 Run search
1. Click **🔍 Search Buses** or **🔍 Search Trains**.
2. You’ll see results below.

## 5) Booking actions from results
### 5.1 Bus results actions
For each bus card, you can:
- **Book Now**
- **Official Booking** (recommended official portal redirect)

Expected behavior (demo):
- The UI shows an alert and conceptually redirects to:
  - KSRTC Swift for government buses
  - other official portals for private buses

### 5.2 Train results actions
For each train card:
- You see available classes (with fare and seats).
- Click **Book {class}** (e.g., “Book 3A”)

You also have general actions:
- **Book on IRCTC**
- **WhatsApp Support**

Expected behavior (demo):
- The UI shows an alert (in the real app, it would redirect to IRCTC).

## 6) PNR Status
1. Open **PNR Status** tab.
2. Enter **PNR number**:
   - expects a **10-digit PNR**
3. Click **Check PNR Status**.

Expected behavior:
- If PNR is empty, the UI alerts “Please enter a valid PNR number”.
- Otherwise it shows a demo message for checking the PNR via official IRCTC systems.

## 7) Live Train Status
1. Open **Live Status** tab.
2. Enter **Train number** (e.g., 12623).
3. Click **Check Live Status**.

Expected behavior (demo):
- If train number is empty, the UI alerts.
- Otherwise it shows an alert stating that the real app would fetch live location/delay info.

UI feature cards you should expect:
- 📍 Current Location
- ⏰ Delay Information
- 🚉 Next Station
- 📊 Running Status

## 8) Travel Support & Assistance
1. Open **Travel Support** tab.
2. Use:
   - 🎫 **Booking Assistance** → **WhatsApp Support**
   - 🔄 **Cancellation & Refund** → “Cancellation Guide” button (currently demo)
   - 👥 **Senior Citizen Help** → “Senior Support” button (currently demo)
   - 📞 **Emergency Contact** → “Call Support” button (currently demo)

Also review the “Important Travel Information” notes:
- Train bookings: use official IRCTC portal
- Bus bookings: KSRTC Swift for government, private operators for additional services
- Cancellation/refund: check operator policies
- Carry valid ID proof

## 9) Troubleshooting
- Search shows no results:
  - try changing From/To values (filters are basic string matches in demo)
- PNR check blocked:
  - enter a 10-digit PNR
- Train status blocked:
  - enter a train number like “12623”
- Support buttons:
  - WhatsApp Support opens a demo alert; other buttons are informational in this build.

## 10) UI sections reference (quick)
- Search & Book:
  - bus/train toggle
  - from/to selectors
  - travel date, passengers
  - bus cards + “Book Now” / “Official Booking”
  - train cards + class options + “Book on IRCTC” / “WhatsApp Support”
- PNR Status:
  - PNR input + check action
- Live Status:
  - train number input + check action
- Travel Support:
  - WhatsApp assistance + guides
