import React, { useEffect, useState, useRef } from "react";
import "../sos/SOSTrackingPage.css";

const SOSTrackingPage = ({ token, apiCall }) => {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const mapRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (!token || !apiCall) {
      setError("Invalid tracking token");
      return;
    }

    const pollLocation = async () => {
      try {
        const response = await apiCall(`/sos/tracking/${token}`, "GET");

        if (response?.data) {
          setTrackingData(response.data);
          setLocation(response.data.location);
          setStatus(response.data.status || "active");
          setError(null);

          // Update map if available
          if (mapRef.current && response.data.location?.latitude && response.data.location?.longitude) {
            updateMap(response.data.location);
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Tracking link expired or invalid");
        } else {
          setError("Unable to fetch location. Retrying...");
        }
      }
    };

    // Initial fetch
    pollLocation();

    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(pollLocation, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [token, apiCall]);

  const updateMap = (location) => {
    if (!mapRef.current) return;

    // If Google Maps is available, use it
    if (window.google && window.google.maps) {
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 16,
        center: { lat: location.latitude, lng: location.longitude },
      });

      new window.google.maps.Marker({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: "Current Location",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
    } else {
      // Fallback: show coordinates
      mapRef.current.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <p>📍 Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}</p>
          <p>Accuracy: ${location.accuracy ? location.accuracy + 'm' : 'Unknown'}</p>
          <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}" target="_blank" rel="noopener noreferrer">
            🗺️ Open in Google Maps
          </a>
        </div>
      `;
    }
  };

  if (status === "loading") {
    return (
      <div className="tracking-view loading">
        <div className="spinner"></div>
        <p>Loading tracking information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-view error">
        <h2>⚠️ Tracking Unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="tracking-view">
      <div className="tracking-header">
        <h1>📍 Live SOS Tracking</h1>
        <span className={`status-badge ${status}`}>{status.toUpperCase()}</span>
      </div>

      <div className="tracking-content">
        {location && (
          <div className="location-details">
            <div className="detail-card">
              <span className="label">Current Location</span>
              <p className="value">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </p>
            </div>

            {location.accuracy && (
              <div className="detail-card">
                <span className="label">Accuracy</span>
                <p className="value">{Math.round(location.accuracy)}m</p>
              </div>
            )}

            {location.timestamp && (
              <div className="detail-card">
                <span className="label">Last Update</span>
                <p className="value">{new Date(location.timestamp).toLocaleTimeString()}</p>
              </div>
            )}

            <div className="detail-card">
              <span className="label">Maps Link</span>
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-link"
              >
                🗺️ Open in Google Maps
              </a>
            </div>
          </div>
        )}

        <div className="map-container" ref={mapRef} id="map"></div>

        {trackingData && (
          <div className="tracking-info">
            <h3>Incident Information</h3>
            <p>
              <strong>ID:</strong> {trackingData.incidentId}
            </p>
            <p>
              <strong>Status:</strong> {trackingData.status}
            </p>
            {trackingData.reason && (
              <p>
                <strong>Reason:</strong> {trackingData.reason}
              </p>
            )}
            {trackingData.expiresAt && (
              <p>
                <strong>Link Expires:</strong> {new Date(trackingData.expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="tracking-footer">
        <p>⚠️ This tracking link is shared for emergency response purposes only.</p>
      </div>
    </div>
  );
};

export default SOSTrackingPage;
