import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import rideSharingService from '../../services/rideSharingService';
import '../../styles/DriverMap.css'; // Will create next

// Leaflet CDN - no API key needed
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const DriverMap = () => {
  const { currentUser } = useApp();
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [position, setPosition] = useState({ lat: 10.0, lng: 76.3 }); // Kochi default
  const [watchId, setWatchId] = useState(null);
  const [ride, setRide] = useState({ pickup: { lat: null, lng: null }, dropoff: { lat: null, lng: null } });
  const [routePolyline, setRoutePolyline] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState('Ready for navigation');

  // Mock coords for demo (replace with real geocoding)
  const getMockCoords = useCallback((address) => {
    const mockLocs = {
      'Infopark': { lat: 10.010, lng: 76.410 },
      'Lulu Mall': { lat: 10.025, lng: 76.308 },
      'Marine Drive': { lat: 9.972, lng: 76.281 },
      'Airport': { lat: 10.152, lng: 76.266 },
    };
    return mockLocs[address] || { lat: 10.0 + Math.random() * 0.1, lng: 76.3 + Math.random() * 0.1 };
  }, []);

  const initMap = useCallback(() => {
    if (!window.L || mapRef.current) return;

    const newMap = window.L.map(mapRef.current).setView([position.lat, position.lng], 15);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(newMap);

    // Driver marker (green, pulses)
    const driverIcon = window.L.divIcon({
      className: 'driver-marker',
      html: '<div>🚗</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    window.L.marker([position.lat, position.lng], { icon: driverIcon }).addTo(newMap);

    setMap(newMap);
  }, [position]);

  const updateDriverLocation = useCallback(async (lat, lng) => {
    if (!map) return;

    // Update marker
    map.eachLayer(layer => {
      if (layer instanceof window.L.Marker && layer.options.icon.options.className === 'driver-marker') {
        layer.setLatLng([lat, lng]);
      }
    });

    // Pan to driver
    map.panTo([lat, lng]);

    // Send to backend
    try {
      await rideSharingService.updateLocation(lat, lng);
      setStatus(`Live tracking: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (err) {
      setStatus('Tracking active (backend sync failed)');
    }
  }, [map]);

  const startTracking = useCallback(() => {
    if (watchId) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPosition({ lat, lng });
        updateDriverLocation(lat, lng);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setStatus('GPS error - using mock location');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    setWatchId(id);
    setIsTracking(true);
    setStatus('Live GPS tracking started');
  }, [watchId, updateDriverLocation]);

  const stopTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
      setStatus('Tracking stopped');
    }
  }, [watchId]);

  const drawRoute = useCallback(() => {
    if (!map || !ride.pickup.lat || !ride.dropoff.lat) return;

    // Simple straight line polyline (use Directions API for real routes)
    const polyline = window.L.polyline([
      [ride.pickup.lat, ride.pickup.lng],
      [position.lat, position.lng],
      [ride.dropoff.lat, ride.dropoff.lng]
    ], { color: 'blue', weight: 5, opacity: 0.8 }).addTo(map);

    setRoutePolyline(polyline);
    map.fitBounds(polyline.getBounds());
    setStatus('Route drawn: Pickup → Current → Dropoff');
  }, [map, ride, position]);

  useEffect(() => {
    // Load Leaflet if not loaded
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = LEAFLET_JS_URL;
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
      stopTracking();
    };
  }, [initMap, stopTracking]);

  useEffect(() => {
    if (map && routePolyline) {
      map.removeLayer(routePolyline);
    }
  }, [position, map, routePolyline]); // Redraw on position change

  // Demo: Load ride from URL params or mock
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pickup = urlParams.get('pickup') || 'Infopark';
    const dropoff = urlParams.get('dropoff') || 'Lulu Mall';

    setRide({
      pickup: getMockCoords(pickup),
      dropoff: getMockCoords(dropoff)
    });
  }, [getMockCoords]);

  if (!currentUser || currentUser.role !== 'driver') {
    return <div className="driver-map-error">Driver access only</div>;
  }

  return (
    <div className="driver-map-container">
      <header className="driver-map-header">
        <h1>Driver Navigation</h1>
        <div className="driver-status">{status}</div>
        {currentUser?.name && <div>Welcome, {currentUser.name}</div>}
      </header>

      <div ref={mapRef} className="driver-map" />

      <div className="driver-controls">
        <button 
          className={`control-btn ${isTracking ? 'active' : ''}`} 
          onClick={isTracking ? stopTracking : startTracking}
        >
          {isTracking ? 'Stop Tracking' : 'Start GPS'}
        </button>
        <button className="control-btn" onClick={drawRoute}>Show Route</button>
        <button 
          className="control-btn arrival" 
          onClick={() => setStatus('Arrived at pickup - waiting for passenger')}
        >
          Pickup Arrived
        </button>
        <button 
          className="control-btn complete" 
          onClick={() => setStatus('Trip completed - ready for next ride')}
        >
          Trip Done
        </button>
      </div>

      <div className="ride-info">
        <div>Pickup: {ride.pickup.lat?.toFixed(4)}, {ride.pickup.lng?.toFixed(4)}</div>
        <div>Dropoff: {ride.dropoff.lat?.toFixed(4)}, {ride.dropoff.lng?.toFixed(4)}</div>
        <div>Distance: ~{Math.round((ride.dropoff.lat - ride.pickup.lat) * 111)} km</div>
      </div>
    </div>
  );
};

export default DriverMap;

