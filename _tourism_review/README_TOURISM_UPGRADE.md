# Tourism Module Upgrade Patch

## Files to replace
- `src/modules/tourism/components/PackageCard.js`
- `src/modules/tourism/components/BookingSheet.js`

## New files to add
- `src/modules/tourism/components/TourismQuickActions.js`
- `src/modules/tourism/tourismUpgradeUtils.js`
- `src/modules/tourism/TourismUpgrade.css`

## Add CSS import
In `TourismMarketplace.js`, below existing CSS import:

```js
import "./TourismUpgrade.css";
```

## Add quick actions import
In `TourismMarketplace.js`:

```js
import TourismQuickActions from "./components/TourismQuickActions";
import { validateTourismBooking } from "./tourismUpgradeUtils";
```

## Replace booking validation
Replace local `validateBookingForm(bookingForm)` usage with:

```js
const validationErrors = validateTourismBooking(bookingForm);
```

## Add quick action handler inside component

```js
const handleTourismQuickAction = (action) => {
  if (action.filters?.openCustomRequest) {
    setActiveTab("custom");
    return;
  }

  if (action.filters?.category) setSelectedCategory(action.filters.category);
  if (action.filters?.destination) setSelectedDestination(action.filters.destination);
  if (action.filters?.travelerType) setSelectedTravelerType(action.filters.travelerType);
  if (action.filters?.maxDays) setMaxDays(action.filters.maxDays);
  setActiveTab("marketplace");
};
```

## Place quick actions in JSX
Place above `FilterPanel` or above package grid:

```jsx
<TourismQuickActions onApplyQuickAction={handleTourismQuickAction} />
```

## Service additions
Copy methods from `src/services/tourismService.additions.js` into the `tourismService` object.

## Backend additions
Copy the snippets from `backend/routes/tourism.route-snippet.js` into `backend/routes/tourism.js`.

## Production notes
- Replace mock payment intent with Razorpay order creation.
- Add real vendor KYC document upload and admin verification.
- Add weather/permit alerts for destinations like Munnar, Sabarimala, Wayanad and forest/ecotourism areas.
