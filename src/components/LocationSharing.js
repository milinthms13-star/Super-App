import React, { useState, useEffect } from 'react';
import locationSharingService from '../services/locationSharingService';
import FamilyAccessService from '../services/familyAccessService';
import './LocationSharing.css';

const LocationSharing = ({ recipientId, recipientName, onClose }) => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [duration, setDuration] = useState(60); // minutes
  const [periodic, setPeriodic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [cameraAccessAllowed, setCameraAccessAllowed] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    const initialize = async () => {
      const sessions = await loadActiveSessions();
      if (sessions) {
        const existingSession = sessions.find(
          (session) => session.recipient.id === recipientId && session.isSender
        );
        setCurrentSession(existingSession || null);
        setIsSharing(!!existingSession);
      }
    };

    initialize();
  }, [recipientId]);

  const loadActiveSessions = async () => {
    try {
      const sessions = await locationSharingService.getActiveSessions();
      setActiveSessions(sessions);
      return sessions;
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  };

  const handleStartSharing = async () => {
    setLoading(true);
    try {
      const durationMs = duration * 60 * 1000; // Convert minutes to milliseconds
      const session = await locationSharingService.startLocationSharing(
        recipientId,
        durationMs,
        periodic
      );

      setCurrentSession(session);
      setIsSharing(true);
      await loadActiveSessions();
    } catch (error) {
      console.error('Failed to start location sharing:', error);
      alert('Failed to start location sharing. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSharing = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      await locationSharingService.stopLocationSharing(currentSession.id);
      setCurrentSession(null);
      setIsSharing(false);
      await loadActiveSessions();
    } catch (error) {
      console.error('Failed to stop location sharing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (sessionId) => {
    try {
      const history = await locationSharingService.getLocationHistory(sessionId);
      setLocationHistory(history);
    } catch (error) {
      console.error('Failed to load location history:', error);
    }
  };

  const checkCameraAccessPermission = async () => {
    if (!recipientId) {
      setCameraError('Camera access requires a recipient.');
      return false;
    }

    setCameraLoading(true);
    setCameraError('');

    try {
      const result = await FamilyAccessService.checkCameraAccess(recipientId);
      const allowed = Boolean(
        result?.allowed ||
        result?.accessResult?.allowed ||
        result?.accessResult?.accessAllowed ||
        false
      );
      setCameraAccessAllowed(allowed);
      if (!allowed) {
        setCameraError('Camera access is not enabled via family permission.');
      }
      return allowed;
    } catch (error) {
      setCameraError(error?.message || 'Unable to verify camera access.');
      return false;
    } finally {
      setCameraLoading(false);
    }
  };

  const requestCameraAccess = async () => {
    setCameraLoading(true);
    setCameraError('');

    try {
      await locationSharingService.requestCameraPermission();
      setCameraPermissionGranted(true);
      return true;
    } catch (error) {
      console.error('Camera permission request failed:', error);
      setCameraError(
        error?.message ||
          'Unable to access the camera. Please check browser permissions and try again.'
      );
      setCameraPermissionGranted(false);
      return false;
    } finally {
      setCameraLoading(false);
    }
  };

  const handleRequestCameraAccess = async () => {
    const allowed = await checkCameraAccessPermission();
    if (!allowed) {
      return;
    }

    await requestCameraAccess();
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="location-sharing-modal">
      <div className="location-sharing-header">
        <h3>Location Sharing with {recipientName}</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="location-sharing-content">
        {!isSharing ? (
          <div className="start-sharing-section">
            <h4>Start Location Sharing</h4>

            <div className="duration-selector">
              <label>Duration:</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
                <option value={480}>8 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>

            <div className="periodic-option">
              <label>
                <input
                  type="checkbox"
                  checked={periodic}
                  onChange={(e) => setPeriodic(e.target.checked)}
                />
                Continuous sharing (updates every 5 minutes)
              </label>
            </div>

            <div className="permission-notice">
              <p>⚠️ Location sharing requires GPS permission and will continue even when the app is closed.</p>
            </div>

            <button
              className="start-sharing-button"
              onClick={handleStartSharing}
              disabled={loading}
            >
              {loading ? 'Starting...' : 'Start Sharing Location'}
            </button>
          </div>
        ) : (
          <div className="active-sharing-section">
            <div className="sharing-status">
              <div className="status-indicator active">
                <span className="pulse"></span>
                Sharing Active
              </div>
              <div className="session-info">
                <p>Ends in: {formatTimeRemaining(currentSession?.endTime)}</p>
                {currentSession?.periodic && <p>Continuous updates enabled</p>}
              </div>
            </div>

            <button
              className="stop-sharing-button"
              onClick={handleStopSharing}
              disabled={loading}
            >
              {loading ? 'Stopping...' : 'Stop Sharing'}
            </button>
          </div>
        )}

        <div className="camera-permission-section">
          <h4>📷 Camera Access</h4>
          <p className="camera-permission-description">
            Request camera permission for {recipientName}. This checks your family access setting and prompts the browser to grant camera use.
          </p>
          <div className="camera-permission-controls">
            <button
              className="camera-permission-button"
              onClick={handleRequestCameraAccess}
              disabled={cameraLoading}
              type="button"
            >
              {cameraLoading ? 'Checking...' : 'Request Camera Access'}
            </button>
            <button
              className="camera-permission-secondary"
              onClick={checkCameraAccessPermission}
              disabled={cameraLoading}
              type="button"
            >
              Check Family Camera Access
            </button>
          </div>
          <div className="camera-permission-status">
            <span>Status: </span>
            <strong>
              {cameraPermissionGranted
                ? 'Camera permission granted'
                : cameraAccessAllowed
                ? 'Family access allowed, camera permission not granted yet'
                : 'Camera access not allowed'}
            </strong>
          </div>
          {cameraError && <p className="camera-permission-error">{cameraError}</p>}
        </div>

        <div className="active-sessions-section">
          <h4>All Location Sessions</h4>
          {activeSessions.length === 0 ? (
            <p>No active location sharing sessions</p>
          ) : (
            <div className="sessions-list">
              {activeSessions.map((session) => (
                <div key={session.id} className="session-item">
                  <div className="session-details">
                    <span className="session-participants">
                      {session.isSender ? `→ ${session.recipient.name}` : `← ${session.sender.name}`}
                    </span>
                    <span className="session-status">
                      {new Date() > new Date(session.endTime) ? 'Expired' : 'Active'}
                    </span>
                    <span className="session-time">
                      {formatTimeRemaining(session.endTime)}
                    </span>
                  </div>
                  <button
                    className="view-history-button"
                    onClick={() => handleViewHistory(session.id)}
                  >
                    View History
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {locationHistory.length > 0 && (
          <div className="location-history-section">
            <h4>Location History</h4>
            <div className="history-list">
              {locationHistory.slice(0, 10).map((update, index) => (
                <div key={index} className="history-item">
                  <span className="coordinates">
                    {update.latitude.toFixed(6)}, {update.longitude.toFixed(6)}
                  </span>
                  <span className="timestamp">
                    {new Date(update.timestamp).toLocaleTimeString()}
                  </span>
                  {update.accuracy && (
                    <span className="accuracy">±{Math.round(update.accuracy)}m</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSharing;