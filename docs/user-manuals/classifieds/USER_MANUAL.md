# Classifieds User Manual (Front-End)

> Module: `src/modules/classifieds/Classifieds.js`  
> Marketplace type: Local Kerala classifieds + chat + moderation

## 1) What this module does
Classifieds is a local marketplace that lets users:
- Browse listings by **search + category + location filters**
- Save listings to **favorites/wishlist**
- Save **searches** with alerts (saved search)
- Create, edit, and publish listings with **quality checks**
- Chat with sellers (with quick replies + offer/share actions)
- Follow sellers and open seller store
- Request reviews (buyers can add reviews)
- Use moderation tools (admins): approve/reject, return to review, spam/risky-category queues, ban/unban

## 2) Role-based behavior (Buyer / Seller / Admin)
The UI changes based on `currentUser` role:

- **Admin**: can see everything and moderate listings.
- **Seller**: can manage **their own** listings and view seller analytics.
- **Buyer**: can browse visible listings, favorite them, and chat.

> The module computes the active role using `registrationType/role` in app context.

## 3) Marketplace discovery (browse listings)
### 3.1 Search
- Use the main **search text** input to filter by listing text (title/description/category/location/seller/tags).

### 3.2 Category filter
- Select one or more categories to narrow results.

### 3.3 Location filters (Kerala-first)
Use these controls to narrow results:
- **District** filter
- **Pincode** filter
- **Near me only** toggle (uses your profile district/pincode)
- “Nearby listings” style discovery sections (when available)

### 3.4 Condition + price + sort
You can further narrow results using:
- **Condition** filter
- **Price range** filter (predefined ranges)
- **Sort**:
  - featured / urgent-style ordering
  - latest
  - price low/high
  - popular (views/chats/favorites-based)

Expected result:
- The module shows paginated cards (9 per page) from filtered + role-visible listings.

## 4) Listing cards: key actions
On a listing card/details view, you typically have:
- Save to favorites/wishlist
- Open chat with the seller
- View seller identity and trust signals (verified seller, etc.)
- If admin moderation is enabled for risky categories: moderation status indicators

## 5) Saved searches (alerts)
If you browse as a buyer/seller:
- You can **save the current filters** as a saved search.
- Saved searches can trigger alerts for new matches.
- You can load/delete saved searches from the saved search area.

## 6) Creating a listing (Seller flow)
1. Open the listing creation form.
2. Fill required fields:
   - **Title**
   - **Description**
   - **Price**
   - **Category**
   - **Location**
   - **District**
   - **Pincode** (must be **6 digits**)
3. Upload images:
   - If creating a new listing, you must upload **at least one image**.
4. Use quality helpers shown in the UI:
   - Title suggestions by category
   - Price hints by category
   - Duplicate warning (based on same title + location)
   - Completeness score (recommended threshold)

Publish rules (as enforced by the module):
- Missing title/description/location → publish blocked
- Price <= 0 → publish blocked
- Pincode must match `/^\d{6}$/` → publish blocked
- No images on new listing → publish blocked
- If completeness score is below threshold → publish blocked

Expected result:
- Listings go live as `approved` unless the chosen category is “risky” (then they require admin approval and go to `pending`).

## 7) Editing & relisting
- Sellers can edit their own listings.
- For expired listings, there’s a **relist** action:
  - “Paid relist” flow updates posted/expiry and sets `moderationStatus` to approved in this build.

## 8) Chat with sellers (Buyer/Seller)
Chat supports:
- Online/last seen style seller status (UI signal)
- Quick chat replies:
  - “Is this available?”
  - “Can you share exact location?”
  - “Can you share more photos?”
- One-click actions:
  - Offer-price suggestion (auto-calculates ~90% of price)
  - Share location pin text into chat
- Block/report actions from the listing detail/chat context

## 9) Seller store and seller stats
Sellers can open a seller store view:
- Seller avatar/name and trust/verification indicators
- Seller rating + review count signals
- Stats include totals such as:
  - total listings
  - active listings
  - expired listings
  - pending approvals
  - views/chats/favorites
  - conversion/engagement-style metrics
  - expiring soon items

## 10) Reviews (Buyer flow)
If reviews are supported in the UI:
1. Select the listing / seller context.
2. Write a review and choose rating.
3. Submit review.

Expected result:
- Review is submitted and shown in seller/listing review sections.

## 11) Bulk actions (Seller/Admin)
If bulk selection is enabled:
- Select listings
- Choose bulk action:
  - delete
  - approve
  - reject
- Execute action.
> The module runs multiple operations in parallel and clears selection after completion.

## 12) Admin moderation tools
Admins can moderate:
- **GlobeMart-like moderation** is not used here; this moderation is classifieds-focused:
  - Approve / Return to Review / Reject
  - Risky-category queue
  - Report queue
  - Spam keyword detection queue
  - Banned users list (unban action)
- Admin moderation uses remark text and per-listing moderation status.

## 13) Troubleshooting
### 13.1 Listing won’t publish
Check:
- Title/description/location filled
- Price > 0
- Pincode is exactly **6 digits**
- Uploaded at least one image
- Completeness score threshold
- If category is risky: it will go to admin approval queue

### 13.2 Nearby results empty
- Ensure your district/pincode are set correctly
- Disable “near me only” to broaden results

### 13.3 Chat issues
- Ensure you’re in the correct listing context
- Try sending a quick reply template

## 14) UI sections reference (quick)
- Filters area: search, category, district, pincode, near me, condition, price, sort
- Listing grid + pagination
- Listing detail/chat modal/panel (depending on implementation)
- Saved searches list (load/delete)
- Listing form (seller create/edit)
- Seller store panel
- Admin moderation queues + banned users list
