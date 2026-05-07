import React, { useState, useEffect, useRef } from 'react';
import './TravelMode.css';

/**
 * Travel Mode Component
 * Auto-SOS on inactivity timer with 5-minute location updates
 * Perfect for commutes, solo travel, late night situations
 */
const TravelMode = ({ isActive, onToggle, onEmergency, getUserLocation }) => {
  // State management
  const [travelState, setTravelState] = useState('idle'); // idle, running, paused, triggered
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes default
  const [selectedDuration, setSelectedDuration] = useState(5); // minutes
  const [enableAutoUpdate, setEnableAutoUpdate] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(300); // 5 minutes
  const [lastUpdate, setLastUpdate] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Refs for cleanup
  const timerIntervalRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // Duration presets
  const DURATION_PRESETS = [
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ];

  /**
   * Start travel mode countdown
   */
  const startTravelMode = async () => {
    try {
      // Get current location first
      const currentLocation = await getUserLocation();
      if (currentLocation) {
        setLocation(currentLocation);
        setLastUpdate(new Date());
      }

      // Set up countdown timer
      const durationSeconds = selectedDuration * 60;
      setTimeRemaining(durationSeconds);
      setTravelState('running');

      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - trigger SOS
            triggerEmergencyAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set up periodic location updates
      if (enableAutoUpdate) {
        locationIntervalRef.current = setInterval(async () => {
          try {
            const newLocation = await getUserLocation();
            if (newLocation) {
              setLocation(newLocation);
              setLastUpdate(new Date());
            }
          } catch (error) {
            console.error('Location update error:', error);
            setLocationError('Failed to update location');
          }
        }, updateInterval * 1000);
      }

      onToggle?.(true);
    } catch (error) {
      console.error('Failed to start travel mode:', error);
      setLocationError('Failed to get location');
      setTravelState('idle');
    }
  };

  /**
   * Pause travel mode
   */
  const pauseTravelMode = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    setTravelState('paused');
  };

  /**
   * Resume travel mode
   */
  const resumeTravelMode = () => {
    if (timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            triggerEmergencyAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setTravelState('running');
  };

  /**
   * Cancel travel mode
   */
  const cancelTravelMode = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setTravelState('idle');
    setTimeRemaining(selectedDuration * 60);
    setLocation(null);
    setLastUpdate(null);
    onToggle?.(false);
  };

  /**
   * Trigger emergency SOS alert
   */
  const triggerEmergencyAlert = async () => {
    setTravelState('triggered');
    
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);

    // Get final location
    try {
      const finalLocation = await getUserLocation();
      await onEmergency?.({
        reason: 'Travel Mode - Inactivity Timeout',
        latitude: finalLocation?.latitude || location?.latitude,
        longitude: finalLocation?.longitude || location?.longitude,
        channels: ['SMS', 'Call'],
        metadata: {
          trigger: 'travel_mode',
          inactivityDuration: selectedDuration,
          lastUpdate,
        },
      });
    } catch (error) {
      console.error('Emergency trigger error:', error);
    }
  };

  /**
   * Reset timer (user activity)
   */
  const resetTimer = async () => {
    if (travelState === 'running') {
      const durationSeconds = selectedDuration * 60;
      setTimeRemaining(durationSeconds);

      // Update location on reset
      try {
        const newLocation = await getUserLocation();
        if (newLocation) {
          setLocation(newLocation);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    }
  };

  /**
   * Format time display (MM:SS)
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, []);

  // Progress percentage
  const progressPercentage = (timeRemaining / (selectedDuration * 60)) * 100;

  return (
    <div className={`travel-mode travel-state-${travelState}`}>
      <div className="travel-mode-header">
        <span className="material-icons">flight_takeoff</span>
        <h3>Travel Mode</h3>
        <span className="mode-badge">{travelState.toUpperCase()}</span>
      </div>

      {/* Main Timer Display */}
      <div className="travel-timer-display">
        <div className="time-circle">
          <svg className="progress-ring" width="120" height="120">
            <circle
              className="progress-ring-circle"
              stroke="white"
              fill="transparent"
              r="54"
              cx="60"
              cy="60"
              strokeDasharray={`${(progressPercentage / 100) * 340} 340`}
              strokeDashoffset="0"
            />
          </svg>
          <div className="time-text">
            <span className="time-value">{formatTime(timeRemaining)}</span>
            <span className="time-label">remaining</span>
          </div>
        </div>
      </div>

      {/* Location Info */}
      {location && (
        <div className="location-info">
          <span className="material-icons">location_on</span>
          <div className="location-details">
            <p className="location-coord">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
            <p className="location-time">
              Last update: {lastUpdate?.toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {locationError && (
        <div className="error-banner">
          <span className="material-icons">error_outline</span>
          <span>{locationError}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="travel-controls">
        {travelState === 'idle' && (
          <button
            className="btn-start-travel"
            onClick={startTravelMode}
          >
            <span className="material-icons">play_arrow</span>
            Start Travel Mode
          </button>
        )}

        {travelState === 'running' && (
          <>
            <button
              className="btn-pause-travel"
              onClick={pauseTravelMode}
            >
              <span className="material-icons">pause</span>
              Pause
            </button>
            <button
              className="btn-reset-timer"
              onClick={resetTimer}
            >
              <span className="material-icons">refresh</span>
              I'm Safe
            </button>
            <button
              className="btn-cancel-travel"
              onClick={cancelTravelMode}
            >
              <span className="material-icons">close</span>
              Cancel
            </button>
          </>
        )}

        {travelState === 'paused' && (
          <>
            <button
              className="btn-resume-travel"
              onClick={resumeTravelMode}
            >
              <span className="material-icons">play_arrow</span>
              Resume
            </button>
            <button
              className="btn-cancel-travel"
              onClick={cancelTravelMode}
            >
              <span className="material-icons">close</span>
              Cancel
            </button>
          </>
        )}

        {travelState === 'triggered' && (
          <div className="triggered-status">
            <span className="material-icons spinning">hourglass_bottom</span>
            <span>SOS Alert Sent</span>
          </div>
        )}
      </div>

      {/* Duration Settings */}
      {(travelState === 'idle' || showSettings) && (
        <div className="duration-settings">
          <h4>Timeout Duration</h4>
          <div className="preset-buttons">
            {DURATION_PRESETS.map(preset => (
              <button
                key={preset.value}
                className={`preset-btn ${selectedDuration === preset.value ? 'active' : ''}`}
                onClick={() => setSelectedDuration(preset.value)}
                disabled={travelState !== 'idle'}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Auto-Update Toggle */}
          <div className="auto-update-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enableAutoUpdate}
                onChange={(e) => setEnableAutoUpdate(e.target.checked)}
                disabled={travelState !== 'idle'}
              />
              <span>Auto-update location every {Math.floor(updateInterval / 60)} min</span>
            </label>
          </div>

          {showSettings && (
            <button
              className="btn-close-settings"
              onClick={() => setShowSettings(false)}
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Settings Toggle */}
      {travelState !== 'idle' && !showSettings && (
        <button
          className="btn-settings-toggle"
          onClick={() => setShowSettings(true)}
        >
          <span className="material-icons">settings</span>
        </button>
      )}

      {/* Help Text */}
      <small className="travel-mode-info">
        📌 Automatically sends SOS alert if you don't confirm safety within the timeout period
      </small>
    </div>
  );
};

export default TravelMode;
