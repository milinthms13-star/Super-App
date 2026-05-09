/**
 * DriverMarker.js
 * Animated driver marker component for map
 */

import React, { useEffect, useState } from 'react';
import './DriverMarker.css';

const DriverMarker = ({ 
  driverId, 
  location, 
  rating = 4.5, 
  vehicleType = 'auto',
  isMoving = false,
  onMarkerClick = null 
}) => {
  const [rotation, setRotation] = useState(0);
  const [distance, setDistance] = useState(null);

  // Animate marker based on movement
  useEffect(() => {
    if (isMoving) {
      const interval = setInterval(() => {
        setRotation(prev => (prev + 2) % 360);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isMoving]);

  if (!location) {
    return null;
  }

  const handleClick = () => {
    if (onMarkerClick) {
      onMarkerClick({ driverId, location, rating, vehicleType });
    }
  };

  return (
    <div 
      className="driver-marker-wrapper"
      onClick={handleClick}
    >
      {/* Outer pulse ring */}
      {isMoving && <div className="marker-pulse" />}

      {/* Main marker */}
      <div 
        className="driver-marker" 
        style={{
          transform: isMoving ? `rotate(${rotation}deg)` : 'rotate(0deg)',
        }}
      >
        <div className="marker-pin">
          <div className="marker-icon">
            {vehicleType === 'auto' && '🚕'}
            {vehicleType === 'bike' && '🏍️'}
            {vehicleType === 'premium' && '🚙'}
          </div>
        </div>
      </div>

      {/* Info tooltip */}
      <div className="marker-tooltip">
        <div className="tooltip-header">
          <span className="tooltip-rating">⭐ {rating.toFixed(1)}</span>
          <span className="tooltip-vehicle">{vehicleType.toUpperCase()}</span>
        </div>
        <div className="tooltip-id">Driver #{driverId.substring(0, 8)}</div>
      </div>

      {/* Active indicator */}
      {isMoving && <div className="marker-active-badge">Active</div>}
    </div>
  );
};

export default DriverMarker;
