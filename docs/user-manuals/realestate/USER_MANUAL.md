# Realestate User Manual (Front-End)

> Module: `src/modules/realestate/*` (Homes, rentals, land, and commercial spaces)

## 1) What this module does
The Realestate module (HomeSphere) helps users explore properties and listings such as:
- Houses / apartments
- Rentals
- Land / plots
- Commercial spaces

Depending on your MVP scope, it may include browsing/searching, viewing property details, and initiating contact (if supported).

## 2) Entry point in the app
1. Open the app dashboard.
2. Select **Realestate / HomeSphere**.

## 3) Step-by-step user flow

### 3.1 Browse properties
1. Open the Realestate module.
2. Browse property cards/listings.
3. Click a property card to open details.

Expected result:
- Property detail page shows images, price, and key information.

### 3.2 Search / filter properties (if supported)
1. Use filter controls to narrow results, such as:
   - Location
   - Property type (house/apartment/land/commercial)
   - Price range
2. Apply filters.

### 3.3 View property details
On the property details screen, review:
- Title and description
- Images
- Price / rent details
- Basic specs (area, beds/baths, etc. if available)

### 3.4 Contact / express interest (if supported)
1. From property details, click the available action:
   - **Contact seller/owner**
   - **Send inquiry**
   - **Message**
2. Follow the prompts.

## 4) Troubleshooting (UI-level)
- No listings appear:
  - Clear filters.
  - Refresh the page.
  - Confirm network connectivity.
- Unable to contact seller:
  - Verify you are logged in.
  - Re-try after refreshing.

## 5) UI sections reference
- Property listing grid/list
- Filters/search panel
- Property detail view
- Contact/inquiry section (if supported)

