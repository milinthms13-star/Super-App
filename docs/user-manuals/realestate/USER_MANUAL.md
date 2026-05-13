# Realestate (HomeSphere) User Manual (Front-End)

> Module: `src/modules/realestate/*` (Homes, rentals, land, and commercial spaces)

## 1) What this module does
The **Realestate** module (HomeSphere) helps users explore and manage property listings such as:
- Houses / apartments
- Rentals
- Land / plots
- Commercial spaces

Depending on your MVP scope, it may include browsing/searching, filtering, viewing property details, and initiating contact or interest.

## 2) Entry point in the app
1. Open the app dashboard.
2. Select **Realestate / HomeSphere**.

## 3) Main screen layout (what you see)
### 3.1 Property listing area
- A grid/list of property cards with key info (e.g., title, price, location).

### 3.2 Filters/search panel (if supported)
- Location
- Property type (house/apartment/land/commercial)
- Price range
- Optional filters (beds/baths, area, availability, etc., if your UI provides them)

## 4) Step-by-step user flows

### 4.1 Browse properties
1. Open **Realestate / HomeSphere**.
2. Browse the property cards/listings.
3. Click a property card to open details.

Expected result:
- The property detail page shows images and key information such as price and listing specs.

### 4.2 Search / filter properties (if supported)
1. Use the filter controls to narrow results:
   - Location
   - Property type
   - Price range
2. Click **Apply / Search** (or wait for auto-refresh, if your UI updates automatically).

Expected result:
- The listing results refresh based on your selected filters.

### 4.3 View property details
On the property details screen, review:
- Title and description
- Images
- Price / rent details
- Key specs (area, beds/baths, etc., if provided)

### 4.4 Contact / express interest (if supported)
1. From the property details page, click the available action:
   - **Contact seller/owner**
   - **Send inquiry**
   - **Message**
2. Follow the prompts (e.g., fill contact form or message box).
3. Submit.

Expected result:
- Your inquiry/message is sent (or saved as a draft / request) according to your backend behavior.

## 5) Troubleshooting (UI-level)
- No listings appear:
  - Clear filters and try again.
  - Refresh the page.
  - Confirm network connectivity.
- Search/filters don’t return results:
  - Widen the price range or switch location/type filters to broader values.
- Unable to contact seller:
  - Verify you are logged in.
  - Retry after refreshing.
- Contact action button missing:
  - The selected listing may not support contact actions (depends on your MVP/backend rules).

## 6) UI sections reference
- Property listing grid/list
- Filters/search panel
- Property detail view (images + pricing + specs)
- Contact/inquiry action section (if supported)
