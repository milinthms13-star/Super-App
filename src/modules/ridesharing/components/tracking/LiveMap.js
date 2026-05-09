/**
 * LiveMap.js
 * Real-time map display with drivers, routes, and traffic
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './LiveMap.css';

const LiveMap = ({ 
  pickupLocation = null, 
  dropoffLocation = null,
  rideId = null,
  isDriver = false 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylineRef = useRef(null);
  
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [route, setRoute] = useState(null);
  const [eta, setEta] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showTraffic, setShowTraffic] = useState(true);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('accessToken');

  // Initialize map
  useEffect(() => {
    if (typeof google === 'undefined') {
      setError('Google Maps API not loaded');
      return;
    }

    const mapElement = mapRef.current;
    if (!mapElement) return;

    const defaultCenter = pickupLocation || { lat: 40.7128, lng: -74.0060 }; // Default to NYC

    const mapInstance = new google.maps.Map(mapElement, {
      zoom: 14,
      center: defaultCenter,
      mapTypeControl: true,
      trafficLayer: new google.maps.TrafficLayer(),
      styles: getMapStyles(),
    });

    mapInstanceRef.current = mapInstance;
    setMap(mapInstance);
    setLoading(false);

    // Add controls
    addMapControls(mapInstance);

    // Start location tracking if driver
    if (isDriver) {
      startLocationTracking(mapInstance);
    }
  }, []);

  // Calculate route when locations are provided
  useEffect(() => {
    if (map && pickupLocation && dropoffLocation) {
      calculateRoute();
    }
  }, [map, pickupLocation, dropoffLocation]);

  // Get nearby drivers periodically
  useEffect(() => {
    if (map && pickupLocation && !isDriver) {
      const interval = setInterval(() => {
        fetchNearbyDrivers();
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [map, pickupLocation]);

  // Get live ride tracking
  useEffect(() => {
    if (rideId && map) {
      const interval = setInterval(() => {
        fetchRideTracking();
      }, 3000); // Update every 3 seconds

      return () => clearInterval(interval);
    }
  }, [rideId, map]);

  // Calculate optimal route
  const calculateRoute = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase4/calculate-route`,
        {
          pickup: pickupLocation,
          dropoff: dropoffLocation,
          mode: 'driving',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const routeData = response.data.data;
      setRoute(routeData);

      // Draw route polyline
      if (mapInstanceRef.current) {
        drawRoute(routeData.primaryRoute.polyline);

        // Fit map bounds
        fitBounds([pickupLocation, dropoffLocation]);
      }

      // Calculate ETA
      calculateETA();

      // Get traffic data
      fetchTrafficData();
    } catch (err) {
      setError('Failed to calculate route');
      console.error('Error calculating route:', err);
    }
  };

  // Calculate ETA
  const calculateETA = async () => {
    try {
      const currentLocation = driverLocation || pickupLocation;
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase4/calculate-eta`,
        {
          currentLocation,
          destination: dropoffLocation,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEta(response.data.data);
    } catch (err) {
      console.error('Error calculating ETA:', err);
    }
  };

  // Fetch nearby drivers
  const fetchNearbyDrivers = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase4/nearby-drivers`,
        {
          center: pickupLocation,
          radiusMeters: 5000,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const drivers = response.data.data.drivers || [];
      setNearbyDrivers(drivers);

      // Update driver markers on map
      if (mapInstanceRef.current) {
        updateDriverMarkers(drivers);
      }
    } catch (err) {
      console.error('Error fetching nearby drivers:', err);
    }
  };

  // Fetch live ride tracking
  const fetchRideTracking = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/ridesharing/phase4/ride-tracking/${rideId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const trackingData = response.data.data;
      setDriverLocation(trackingData.driverLocation);
      setRiderLocation(trackingData.riderLocation);

      // Update markers
      if (mapInstanceRef.current) {
        updateLiveMarkers(trackingData);
      }
    } catch (err) {
      console.error('Error fetching ride tracking:', err);
    }
  };

  // Fetch traffic data
  const fetchTrafficData = async () => {
    try {
      const center = pickupLocation || { lat: 40.7128, lng: -74.0060 };
      const response = await axios.post(
        `${API_BASE}/api/ridesharing/phase4/traffic-data`,
        {
          center,
          radius: 2,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTrafficData(response.data.data);
    } catch (err) {
      console.error('Error fetching traffic data:', err);
    }
  };

  // Start location tracking for driver
  const startLocationTracking = (mapInstance) => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        };

        setDriverLocation(location);

        // Update location on server
        try {
          await axios.post(
            `${API_BASE}/api/ridesharing/phase4/location/driver-update`,
            {
              location,
              additionalData: {
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
              },
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error('Error updating driver location:', err);
        }

        // Update map
        if (mapInstance) {
          mapInstance.panTo(location);
          updateDriverMarker(location);
        }
      },
      (error) => {
        setError(`Location tracking error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  };

  // Draw route polyline
  const drawRoute = (polylineString) => {
    if (!mapInstanceRef.current || polylineRef.current) {
      return;
    }

    const polyline = new google.maps.Polyline({
      path: google.maps.geometry.encoding.decodePath(polylineString),
      geodesic: true,
      strokeColor: '#667eea',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstanceRef.current,
    });

    polylineRef.current = polyline;
  };

  // Update driver markers
  const updateDriverMarkers = (drivers) => {
    // Clear existing driver markers
    Object.values(markersRef.current).forEach(marker => {
      if (marker.type === 'driver') {
        marker.instance.setMap(null);
      }
    });

    // Add new driver markers
    drivers.forEach(driver => {
      const marker = new google.maps.Marker({
        position: driver.location,
        map: mapInstanceRef.current,
        title: `Driver - Rating: ${driver.rating}`,
        icon: {
          path: 'M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z',
          scale: 1.2,
          fillColor: '#764ba2',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedDriver(driver);
      });

      markersRef.current[`driver-${driver.driverId}`] = {
        instance: marker,
        type: 'driver',
      };
    });
  };

  // Update live markers during ride
  const updateLiveMarkers = (trackingData) => {
    if (!mapInstanceRef.current) return;

    // Update driver marker
    if (trackingData.driverLocation) {
      const driverMarker = markersRef.current['driver'];
      if (driverMarker) {
        driverMarker.instance.setPosition(trackingData.driverLocation);
      } else {
        const marker = new google.maps.Marker({
          position: trackingData.driverLocation,
          map: mapInstanceRef.current,
          title: 'Driver',
          icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        });
        markersRef.current['driver'] = { instance: marker, type: 'live' };
      }
    }

    // Update rider marker
    if (trackingData.riderLocation) {
      const riderMarker = markersRef.current['rider'];
      if (riderMarker) {
        riderMarker.instance.setPosition(trackingData.riderLocation);
      } else {
        const marker = new google.maps.Marker({
          position: trackingData.riderLocation,
          map: mapInstanceRef.current,
          title: 'Rider',
          icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        });
        markersRef.current['rider'] = { instance: marker, type: 'live' };
      }
    }
  };

  // Update driver marker
  const updateDriverMarker = (location) => {
    const driverMarker = markersRef.current['driver-self'];
    if (driverMarker) {
      driverMarker.instance.setPosition(location);
    } else {
      const marker = new google.maps.Marker({
        position: location,
        map: mapInstanceRef.current,
        title: 'Your Location',
        animation: google.maps.Animation.DROP,
      });
      markersRef.current['driver-self'] = { instance: marker, type: 'self' };
    }
  };

  // Fit map bounds
  const fitBounds = (locations) => {
    if (!mapInstanceRef.current || !locations.length) return;

    const bounds = new google.maps.LatLngBounds();
    locations.forEach(location => {
      bounds.extend(location);
    });

    mapInstanceRef.current.fitBounds(bounds, 100);
  };

  // Add map controls
  const addMapControls = (mapInstance) => {
    // Traffic control
    const trafficButton = document.createElement('button');
    trafficButton.className = 'map-control-button';
    trafficButton.innerHTML = '🚗 Traffic';
    trafficButton.addEventListener('click', () => {
      setShowTraffic(!showTraffic);
    });

    mapInstance.controls[google.maps.ControlPosition.TOP_RIGHT].push(trafficButton);

    // Zoom controls
    mapInstance.setOptions({
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_CENTER,
      },
    });
  };

  if (loading) {
    return <div className="live-map-container"><div className="loading">Loading map...</div></div>;
  }

  return (
    <div className="live-map-container">
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="map-wrapper">
        <div ref={mapRef} className="live-map" />

        {/* ETA Card */}
        {eta && (
          <div className="eta-card">
            <div className="eta-time">{eta.eta}</div>
            <div className="eta-details">
              <p>{eta.distanceText}</p>
              <p className="traffic-status" data-condition={eta.trafficCondition}>
                {eta.trafficCondition.toUpperCase()}
              </p>
            </div>
          </div>
        )}

        {/* Nearby Drivers List */}
        {nearbyDrivers.length > 0 && !rideId && (
          <div className="drivers-list">
            <h3>Available Drivers ({nearbyDrivers.length})</h3>
            {nearbyDrivers.slice(0, 5).map(driver => (
              <div
                key={driver.driverId}
                className="driver-card"
                onClick={() => setSelectedDriver(driver)}
              >
                <div className="driver-info">
                  <p className="driver-rating">⭐ {driver.rating.toFixed(1)}</p>
                  <p className="driver-distance">{(driver.distance / 1000).toFixed(1)} km away</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Driver Info */}
        {selectedDriver && (
          <div className="driver-detail">
            <button className="close-btn" onClick={() => setSelectedDriver(null)}>✕</button>
            <p className="detail-title">Driver Details</p>
            <p>Rating: ⭐ {selectedDriver.rating.toFixed(1)}</p>
            <p>Distance: {(selectedDriver.distance / 1000).toFixed(1)} km</p>
            <p>Vehicle: {selectedDriver.vehicleType}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Map styling
const getMapStyles = () => [
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#f0f0f0' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#667eea' }, { lightness: 40 }],
  },
];

export default LiveMap;
