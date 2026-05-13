# Maps User Manual (Front-End)

> Module: `src/modules/maps/DriverMap.js`  
> Product name in UI: **Driver Navigation**

## 1) What this module does
DriverMap provides a driver navigation + live tracking UI:
- Shows an interactive map (Leaflet + OpenStreetMap tiles)
- Tracks driver GPS live (Start GPS / Stop Tracking)
- Draws a simple route line (straight polyline demo)
- Displays ride info:
  - pickup coordinates
  - dropoff coordinates
  - estimated distance
- Allows driver status updates:
  - Pickup Arrived
  - Trip Done

**Access control:** If the current user is not a driver (`currentUser.role !== 'driver'`), the module shows **“Driver access only”**.

## 2) Entry point in the app
1. Open **Maps → Driver Navigation** (this module).

## 3) Map loading behavior
- The module loads Leaflet assets dynamically (CDN).
- If the map is unavailable, the UI won’t render the tracking UI (only the access error is shown when role is not driver).

## 4) Pickup & dropoff coordinates (demo)
Pickup/dropoff are loaded from URL query parameters:
- `pickup` (default: `Infopark`)
- `dropoff` (default: `Lulu Mall`)

These are mapped to demo coordinates using internal mock locations. (In a production build, these would come from real geocoding.)

## 5) Driver tracking controls
Use the buttons under the map:

### 5.1 Start GPS
1. Click **Start GPS**.
2. The module starts browser geolocation watch:
   - updates driver position
   - updates driver marker on the map
   - pans the map to follow the driver
   - sends position to backend via `rideSharingService.updateLocation(lat, lng)`

Status text updates to reflect live tracking or GPS errors:
- “Live GPS tracking started”
- If GPS fails: “GPS error - using mock location”
- If backend sync fails: “Tracking active (backend sync failed)”

### 5.2 Stop Tracking
- Click **Stop Tracking** to clear geolocation watch and stop live updates.

## 6) Route drawing
- Click **Show Route** to draw a route line that includes:
  - pickup → current driver position → dropoff

Expected behavior (demo):
- A blue polyline is drawn and the map zooms to fit the polyline bounds.

## 7) Ride status actions
Use these buttons to update driver trip state (UI status changes; backend integration depends on app wiring):
- **Pickup Arrived**
  - sets status to: “Arrived at pickup - waiting for passenger”
- **Trip Done**
  - sets status to: “Trip completed - ready for next ride”

## 8) Ride info panel
Below the map, the UI shows:
- Pickup lat/lng (formatted to 4 decimals)
- Dropoff lat/lng (formatted to 4 decimals)
- Approx distance estimate:
  - computed from latitude delta and an approximate km conversion

## 9) Troubleshooting
- You see “Driver access only”:
  - ensure the logged-in user has `role = driver`
- GPS tracking doesn’t move the marker:
  - grant location permissions to the browser
  - check device GPS availability
- Route doesn’t look correct:
  - this build draws a demo straight-line polyline; real routing requires a directions service
