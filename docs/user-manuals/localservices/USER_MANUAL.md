# LocalServices User Manual (Front-End)

> Module: `src/modules/localservices/LocalServicesMarketplace.js`  
> Product name in UI: **Local Services Marketplace** (Book trusted local event providers)

## 1) What this module does
LocalServicesMarketplace helps you:
- Browse local service categories (caterers, decorators, photographers)
- Find and contact providers using search + filters (demo)
- Send **booking requests** (advance enabled / quote-only)
- Request **quotes** from providers
- Request a **complete event package** (bundle of multiple services)
- Register as a vendor (provider portal for submitting profile/package)
- Enable a lead-selling workflow (monetization model)
- Track request history (booking/quote/package requests)
- Understand monetization + vendor operations and operational controls (informational)

## 2) Entry point in the app
1. Open **Local Services Marketplace** from main navigation/menu.

## 3) Main content areas

### 3.1 Main categories
You’ll first see category cards like:
- Caterers
- Decorators
- Photographers

Each card lists example services under that category.

## 4) Find Providers (discovery + search)
In the **Find Providers** area you can:
- Search providers using **Search**
- Filter by:
  - Category (All or specific category group)
  - Location (Trivandrum / Kollam / Kottayam / or all)
- Filter by price:
  - Price min
  - Price max

After applying filters, the module shows a provider list.

### 4.1 Provider cards
For each provider you can see:
- Name
- Location
- Start price (Start INR)
- Rating
- Portfolio count
- Response time
- Verified vs verification pending
- Availability

Actions on provider card:
- **Select** (fills the booking request form with `providerId`)
- **Request Quote** (requests AI/quote; shown as quote request status + history)
- **Call / WhatsApp** (demo placeholder button)

## 5) Booking Request (core workflow)
In **Booking Request** form:

1. Provider:
   - select providerId
2. Event type:
   - Wedding / Birthday / Housewarming / Corporate
3. Event date
4. Guests
5. Budget
6. Notes
7. Toggle:
   - **Enable advance payment option** (advance-enabled vs quote-only)

Click **Send Booking Request**.

Expected result (demo):
- A booking request id is created (LSB-xxxxxx)
- BookingStatus confirms:
  - request id
  - provider target
  - whether advance is enabled or quote-only

Request history updates with:
- booking request entries and status “Pending vendor response”

### Validation
- If provider or event date missing:
  - BookingStatus shows “Select provider and event date.”

## 6) Quote Requests
You can request a quote directly from a provider card using **Request Quote**.

Expected result:
- A quote id is generated
- QuoteStatus shows “quote requested… vendor will respond in chat”
- RequestHistory updates with status like “Quote in progress”

## 7) Complete Event Booking Package (bundle)
In **Complete Event Booking Package** form:

1. Event type (Wedding/Birthday/Housewarming/Engagement)
2. Event date
3. Budget
4. Choose included items by checking boxes:
   - Caterer
   - Decorator
   - Photographer
   - Makeup artist
   - Event anchor
   - Sound/light system
   - Stage setup
   - Vehicle rental

Click **Request Complete Package**.

Expected result:
- A complete package request id is created (LSP-xxxxxx)
- PackageStatus confirms:
  - number of services selected
  - coordinator assigned
- RequestHistory updates with the package request entry

Validation:
- If event date missing:
  - PackageStatus shows “Select event date for complete package.”

## 8) Vendor Portal (register your business)
In **Vendor Portal**:

1. Business name
2. Category
3. City
4. Package name
5. Package price
6. Portfolio count
7. Toggle:
   - Profile verification completed

Click **Submit Vendor Profile**.

Expected result (demo):
- VendorStatus confirms profile submission and that it’s queued for verification/listing.

Validation:
- If businessName or packageName missing:
  - VendorStatus shows “Enter business name and package details.”

## 9) Monetization & Vendor Growth
In **Monetization & Vendor Growth** panel, you can:
- See monetization items such as:
  - commission per booking
  - paid vendor listing / featured provider placement
  - vendor subscription plans
  - lead selling model
  - advertisement banners
  - event package bundles
- Click **Enable Lead Selling Workflow**
  - sets a lead-selling model message (informational/demo)

## 10) Request Tracking
At the bottom, **Request Tracking** shows a list of:
- request id
- request type (Booking request / Quote request / Complete package)
- target
- status

## 11) Troubleshooting
- No providers shown:
  - relax search/category/location filters
- Booking request fails:
  - ensure provider is selected (Select on provider card)
  - ensure event date is filled
- Quote request not generated:
  - confirm providerId is valid and clicked “Request Quote”
- Package request not created:
  - ensure event date is filled and at least one package item is selected

## 12) UI sections reference (quick)
- Main categories (cards)
- Find Providers (search + filters + provider cards)
- Booking Request (provider + event form)
- Vendor Portal (submit business profile)
- Complete Event Package (bundle builder)
- Monetization controls + lead selling workflow
- Request Tracking (history list)
