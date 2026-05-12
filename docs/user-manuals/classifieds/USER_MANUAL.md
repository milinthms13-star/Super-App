# Classifieds User Manual (Front-End)

> Module: `src/modules/classifieds/Classifieds.js`

## 1) What this module does
Classifieds is a local Kerala marketplace flow with:
- mobile-first listing discovery
- category-led browsing
- district/pincode/nearby filtering
- listing posting with quality checks
- trust/safety controls
- buyer-seller chat
- seller performance dashboard
- monetization options
- admin moderation tools

## 2) Mobile-first discovery flow
1. Open Classifieds on mobile.
2. Use sticky top search bar.
3. Tap category chips for fast narrowing.
4. Tap `Filters` to open bottom-sheet filters.
5. Apply district, pincode, nearby, and sort options.

Expected result:
- Users can see relevant cards quickly without scrolling through long forms first.

## 3) Category coverage
Supported high-priority categories:
- Jobs
- Vehicles
- Properties
- Electronics
- Home Appliances
- Services
- Rentals
- Pets
- Used Items
- Business for Sale

## 4) Location-based flow
1. Use `District` filter.
2. Add `Pincode` search.
3. Enable `Only near me`.
4. Click `Use my location` to auto-apply near-me filters.
5. Open `Nearby listings` panel for district-local ads.

## 5) Posting quality checks
While creating/editing listing:
- title suggestions shown per category
- price guidance shown per category
- at least one image is required for new listing
- pincode validation is required (6 digits)
- duplicate warning appears for same title+location
- completeness score shown (target 80%+)
- preview available before publish

## 6) Trust and safety
- Verified seller badge is visible in cards/details.
- Phone + email verification indicator shown for verified sellers.
- Scam warning banner shown in discovery area.
- Report listing and reason workflow available.
- Blocked users list with unblock option is available.
- Risky categories auto-route to admin approval queue.

## 7) Chat improvements
Chat includes:
- seller online/last seen status
- quick replies (for example, “Is this available?”)
- offer-price quick action
- share-location quick action
- block/report controls from listing detail section

## 8) Seller dashboard
Seller dashboard now shows:
- total listings
- active listings
- expired listings
- pending approval count
- views count
- wishlist saves
- chat inquiries
- conversion rate
- expiring listings with paid relist button

## 9) Monetization features
Module supports:
- featured listings
- top placement
- urgent sale badge
- paid relisting
- business seller plans
- local ad banner positioning

## 10) Wishlist and saved searches
Users can:
- save listings
- save search filters
- load/delete saved searches
- see saved-search alerts for new matches
- use price alert action from listing detail

## 11) Admin moderation panel
Admin panel includes:
- pending approval counters
- risky-category pending queue
- reported listings queue
- spam keyword detection queue
- banned users list (with unban action)
- category management input
- listing expiry control window
- approve/reject/flag/delete actions

## 12) Troubleshooting
- If listing submit fails:
  - check title/description/location
  - check valid price
  - check pincode (6 digits)
  - upload at least one image
- If listing remains unpublished:
  - check if category is risky (requires admin approval)
- If nearby results are empty:
  - verify district/pincode filters and disable `Only near me` to broaden results
