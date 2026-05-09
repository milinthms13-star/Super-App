# 🗺️ RIDESHARING PHASE 4: QUICK START GUIDE
## Maps Integration & Route Optimization

---

## 🚀 QUICK SETUP (5 minutes)

### 1️⃣ Environment Configuration
```bash
# Add to .env or environment variables:
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
REACT_APP_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
REACT_APP_API_URL=http://localhost:5000
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Build & Start
```bash
# Build frontend
npm run build

# Start backend (in another terminal)
npm start
```

### 4️⃣ Database Setup (MongoDB)
```javascript
// Run in MongoDB shell:
db.drivers.createIndex({"currentLocation": "2dsphere"})
db.riders.createIndex({"currentLocation": "2dsphere"})
```

---

## 📍 USING THE MAP COMPONENT

### Basic Implementation
```jsx
import LiveMap from './modules/ridesharing/components/tracking/LiveMap';

function RideTracker() {
  return (
    <LiveMap
      pickupLocation={{ lat: 40.7128, lng: -74.0060 }}
      dropoffLocation={{ lat: 40.7580, lng: -73.9855 }}
      rideId="ride_abc123"
      isDriver={false}
    />
  );
}
```

### With Route Visualization
```jsx
import LiveMap from './modules/ridesharing/components/tracking/LiveMap';
import RouteVisualization from './modules/ridesharing/components/tracking/RouteVisualization';
import TrafficLayer from './modules/ridesharing/components/tracking/TrafficLayer';

function FullRideExperience() {
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);

  return (
    <div>
      <LiveMap rideId="ride123" />
      {route && <RouteVisualization route={route} eta={eta} />}
      <TrafficLayer center={{ lat: 40.7128, lng: -74.0060 }} />
    </div>
  );
}
```

---

## 🔌 API ENDPOINTS QUICK REFERENCE

### Calculate Route
```bash
POST /api/ridesharing/phase4/calculate-route
Content-Type: application/json
Authorization: Bearer {token}

{
  "pickup": {"lat": 40.7128, "lng": -74.0060},
  "dropoff": {"lat": 40.7580, "lng": -73.9855},
  "mode": "driving"
}

# Response
{
  "success": true,
  "data": {
    "distance": "2.5 km",
    "durationInTraffic": "12 min",
    "primaryRoute": {
      "polyline": "encoded_polyline_string",
      "steps": [...]
    },
    "trafficCondition": "light",
    "alternativeRoutes": [...]
  }
}
```

### Calculate ETA
```bash
POST /api/ridesharing/phase4/calculate-eta
{
  "currentLocation": {"lat": 40.7128, "lng": -74.0060},
  "destination": {"lat": 40.7580, "lng": -73.9855}
}

# Response
{
  "success": true,
  "data": {
    "eta": "12 min",
    "etaDate": "2026-05-09T14:35:00Z",
    "remainingTime": 720,
    "trafficCondition": "moderate",
    "confidence": 0.92
  }
}
```

### Update Driver Location
```bash
POST /api/ridesharing/phase4/location/driver-update
{
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy": 10,
    "speed": 25,
    "heading": 45
  },
  "additionalData": {
    "status": "active",
    "rideId": "ride123"
  }
}
```

### Get Nearby Drivers
```bash
POST /api/ridesharing/phase4/nearby-drivers
{
  "center": {"lat": 40.7128, "lng": -74.0060},
  "radiusMeters": 5000
}

# Response
{
  "success": true,
  "data": [
    {
      "driverId": "driver123",
      "location": {"lat": 40.7140, "lng": -74.0050},
      "distance": 1200,
      "rating": 4.8,
      "vehicleType": "premium"
    }
  ]
}
```

### Live Ride Tracking
```bash
GET /api/ridesharing/phase4/ride-tracking/ride123

# Response
{
  "success": true,
  "data": {
    "driverLocation": {"lat": 40.7140, "lng": -74.0050},
    "riderLocation": {"lat": 40.7128, "lng": -74.0060},
    "pickupLocation": {"lat": 40.7128, "lng": -74.0060},
    "dropoffLocation": {"lat": 40.7580, "lng": -73.9855},
    "distances": {
      "toPickup": 200,
      "toDropoff": 2400
    },
    "eta": "12 min"
  }
}
```

### Get Traffic Data
```bash
POST /api/ridesharing/phase4/traffic-data
{
  "center": {"lat": 40.7128, "lng": -74.0060},
  "radius": 2
}

# Response
{
  "success": true,
  "data": {
    "trafficConditions": [
      {"direction": "north", "condition": "light"},
      {"direction": "south", "condition": "moderate"},
      {"direction": "east", "condition": "heavy"},
      {"direction": "west", "condition": "light"}
    ]
  }
}
```

---

## 🎯 COMMON USE CASES

### Use Case 1: Rider Requesting a Ride
```jsx
// 1. Calculate route from current location to destination
const route = await axios.post('/api/ridesharing/phase4/calculate-route', {
  pickup: currentLocation,
  dropoff: selectedDestination
});

// 2. Get nearby drivers
const drivers = await axios.post('/api/ridesharing/phase4/nearby-drivers', {
  center: currentLocation,
  radiusMeters: 5000
});

// 3. Show map with nearby drivers and route
<LiveMap
  pickupLocation={currentLocation}
  dropoffLocation={selectedDestination}
  isDriver={false}
/>
```

### Use Case 2: Driver Accepting Ride
```jsx
// 1. Watch driver's current position
navigator.geolocation.watchPosition((position) => {
  axios.post('/api/ridesharing/phase4/location/driver-update', {
    location: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading
    }
  });
});

// 2. Get ride tracking
setInterval(() => {
  axios.get(`/api/ridesharing/phase4/ride-tracking/${rideId}`)
    .then(res => updateMapWithTracking(res.data));
}, 3000);
```

### Use Case 3: Real-time ETA Updates
```jsx
// Update ETA every 30 seconds as driver moves
setInterval(() => {
  axios.post('/api/ridesharing/phase4/calculate-eta', {
    currentLocation: driverLocation,
    destination: dropoffLocation
  }).then(res => setETA(res.data.data.eta));
}, 30000);
```

---

## 🗺️ COMPONENT PROPS REFERENCE

### LiveMap Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pickupLocation` | Object | null | Pickup coordinates {lat, lng} |
| `dropoffLocation` | Object | null | Dropoff coordinates {lat, lng} |
| `rideId` | String | null | Active ride ID for tracking |
| `isDriver` | Boolean | false | Show driver or rider view |

### DriverMarker Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `driverId` | String | Required | Unique driver identifier |
| `location` | Object | Required | Driver position {lat, lng} |
| `rating` | Number | 4.5 | Driver rating (0-5) |
| `vehicleType` | String | 'auto' | 'auto', 'bike', 'premium' |
| `isMoving` | Boolean | false | Show animation if moving |
| `onMarkerClick` | Function | null | Callback when marker clicked |

### RouteVisualization Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `route` | Object | Required | Route data with steps |
| `eta` | Object | null | ETA information |

### TrafficLayer Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `center` | Object | NYC center | Map center for traffic query |
| `radius` | Number | 2 | Search radius in km |
| `autoRefresh` | Boolean | true | Auto-update traffic |
| `refreshInterval` | Number | 30000 | Refresh interval in ms |

---

## 🐛 TROUBLESHOOTING

### Issue: Map not displaying
**Solution**: 
- Check GOOGLE_MAPS_API_KEY is set correctly
- Verify Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for CORS errors

### Issue: Location not updating
**Solution**:
- Enable location permission in browser
- Ensure navigator.geolocation is available
- Check Redis connection (for location caching)
- Verify backend is receiving location updates

### Issue: Routes not calculated
**Solution**:
- Verify Directions API is enabled in Google Cloud
- Check pickup/dropoff coordinates are valid
- Ensure authentication token is valid
- Check API quota hasn't been exceeded

### Issue: ETA showing old value
**Solution**:
- Increase polling frequency
- Check server logs for errors
- Verify location is updating consistently
- Ensure traffic data API is responding

---

## 📊 PERFORMANCE TIPS

1. **Optimize Polling**: Adjust intervals based on use case
   - 5s for finding nearby drivers
   - 3s for active ride tracking
   - 30s for general traffic updates

2. **Reduce Map Updates**: Only redraw when position changes significantly
   - Ignore updates within 50-100 meters
   - Batch multiple position updates

3. **Cache Routes**: Store calculated routes to avoid recalculation
   - Cache for 5 minutes if pickup/dropoff unchanged
   - Invalidate on user manual refresh

4. **Handle Offline**: Gracefully degrade when API unavailable
   - Show last known position
   - Display cached route
   - Queue location updates for sending later

---

## 🔐 SECURITY NOTES

✅ All endpoints require JWT authentication  
✅ Location data expires after 5 minutes  
✅ Driver location history limited to 100 entries  
✅ API keys restricted to specific domains  
✅ Rate limiting on location updates (10/second)  

---

## 📱 RESPONSIVE DESIGN

All components are mobile-first responsive:
- **Desktop** (1024px+): Full map height 600px, side panels
- **Tablet** (768px-1023px): Adjusted height 400px, stacked layout
- **Mobile** (< 768px): Compact height 350px, bottom sheets

---

## 🔗 RELATED DOCUMENTATION

- Phase 3 (Wallet & Payments): [RIDESHARING_PHASE3_IMPLEMENTATION_COMPLETE.md](./RIDESHARING_PHASE3_IMPLEMENTATION_COMPLETE.md)
- Phase 1-2 Documentation: [RIDESHARING_COMPREHENSIVE_ROADMAP.md](./RIDESHARING_COMPREHENSIVE_ROADMAP.md)
- API Documentation: [RIDESHARING_PHASE4_IMPLEMENTATION_COMPLETE.md](./RIDESHARING_PHASE4_IMPLEMENTATION_COMPLETE.md)

---

## 💡 BEST PRACTICES

1. **Always handle location errors gracefully**
   ```jsx
   navigator.geolocation.watchPosition(
     successCallback,
     (error) => console.error('Location error:', error),
     { timeout: 10000, maximumAge: 5000 }
   );
   ```

2. **Implement debouncing for location updates**
   ```js
   const debouncedLocationUpdate = debounce(
     (location) => updateLocation(location),
     1000
   );
   ```

3. **Clean up intervals on component unmount**
   ```jsx
   useEffect(() => {
     const interval = setInterval(fetchData, 5000);
     return () => clearInterval(interval);
   }, []);
   ```

4. **Validate coordinates before API calls**
   ```js
   const isValidCoord = (lat, lng) => 
     lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
   ```

---

**Last Updated**: May 9, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
