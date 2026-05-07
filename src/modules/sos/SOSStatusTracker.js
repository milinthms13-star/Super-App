import React, { useState, useEffect, useCallback } from 'react';
import './SOSStatusTracker.css';

/**
 * SOSStatusTracker Component (Priority 3)
 * Displays real-time SOS incident status for caller
 * Shows status progression, responder info, and waiting time
 */
const SOSStatusTracker = ({ incidentId, userEmail, userName }) => {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [waitTime, setWaitTime] = useState(0);
  const [socket, setSocket] = useState(null);

  // Status progression with colors and icons
  const statuses = ['initial', 'acknowledged', 'en-route', 'arrived', 'resolved', 'escalated'];
  const statusConfig = {
    initial: { label: 'Alert Sent', icon: '📢', color: '#FF6B6B', completed: true },
    acknowledged: { label: 'Acknowledged', icon: '👍', color: '#4ECDC4', completed: false },
    'en-route': { label: 'En-Route', icon: '🚗', color: '#45B7D1', completed: false },
    arrived: { label: 'Arrived', icon: '📍', color: '#96CEB4', completed: false },
    resolved: { label: 'Resolved', icon: '✅', color: '#6BCB77', completed: false },
    escalated: { label: 'Escalated', icon: '⚠️', color: '#FF9500', completed: false },
  };

  // Fetch incident status
  const fetchIncidentStatus = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(`/api/sos/incident/${incidentId}/status`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });

      if (response.ok) {
        const data = await response.json();
        setIncident(data.data);
        setError(null);
      } else if (response.status === 404) {
        setError('Incident not found');
      } else {
        setError('Failed to fetch incident status');
      }
    } catch (err) {
      console.error('Error fetching incident status:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  // Update wait time
  useEffect(() => {
    const interval = setInterval(() => {
      if (incident?.incidentCreatedAt) {
        const elapsed = Math.floor((Date.now() - new Date(incident.incidentCreatedAt).getTime()) / 1000);
        setWaitTime(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [incident]);

  // Initialize WebSocket connection
  useEffect(() => {
    fetchIncidentStatus();

    // Try to connect to WebSocket for real-time updates
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const ws = new WebSocket(`ws://${window.location.host}`, {
        token,
      });

      ws.onopen = () => {
        console.log('WebSocket connected');
        setSocket(ws);

        // Subscribe to incident updates
        ws.send(JSON.stringify({
          type: 'sos:incident:join',
          data: { incidentId },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'sos:status:updated') {
            // Real-time status update received
            fetchIncidentStatus();
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setSocket(null);
      };

      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'sos:incident:leave',
            data: { incidentId },
          }));
          ws.close();
        }
      };
    } catch (err) {
      console.error('WebSocket setup error:', err);
    }
  }, [incidentId, fetchIncidentStatus]);

  // Format time display
  const formatWaitTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get progress percentage
  const getProgressPercentage = () => {
    if (!incident?.currentStatus) return 0;
    const currentIndex = statuses.indexOf(incident.currentStatus);
    return Math.round(((currentIndex + 1) / statuses.length) * 100);
  };

  // Check if status is completed
  const isStatusCompleted = (status) => {
    if (!incident?.currentStatus) return status === 'initial';
    return statuses.indexOf(status) <= statuses.indexOf(incident.currentStatus);
  };

  if (loading) {
    return (
      <div className="sos-status-tracker">
        <div className="tracker-loading">
          <div className="spinner" />
          <p>Loading incident status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sos-status-tracker">
        <div className="tracker-error">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return null;
  }

  const currentStatus = incident.currentStatus || 'initial';
  const latestUpdate = incident.latestUpdate;

  return (
    <div className="sos-status-tracker">
      {/* Header */}
      <div className="tracker-header">
        <h2>🚨 Emergency Status</h2>
        <div className="header-badge" style={{ backgroundColor: statusConfig[currentStatus]?.color }}>
          {statusConfig[currentStatus]?.icon} {statusConfig[currentStatus]?.label}
        </div>
      </div>

      {/* Wait Time */}
      <div className="wait-time">
        <span className="label">Waiting since:</span>
        <span className="time">{formatWaitTime(waitTime)}</span>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${getProgressPercentage()}%` }} />
        </div>
        <span className="progress-text">{getProgressPercentage()}% Complete</span>
      </div>

      {/* Status Timeline */}
      <div className="status-timeline">
        {statuses.map((status, index) => (
          <div
            key={status}
            className={`status-item ${isStatusCompleted(status) ? 'completed' : ''} ${
              status === currentStatus ? 'active' : ''
            }`}
          >
            <div className="status-dot" style={{ backgroundColor: statusConfig[status]?.color }}>
              {isStatusCompleted(status) ? '✓' : statusConfig[status]?.icon}
            </div>
            <div className="status-label">{statusConfig[status]?.label}</div>
            {index < statuses.length - 1 && (
              <div className={`status-line ${isStatusCompleted(statuses[index + 1]) ? 'completed' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Latest Update Info */}
      {latestUpdate && (
        <div className="latest-update">
          <h4>Latest Update</h4>
          <div className="update-content">
            <p>
              <strong>Status:</strong> {statusConfig[latestUpdate.status]?.label}
            </p>
            <p>
              <strong>Responder:</strong> {latestUpdate.responderName || 'Unknown'}
            </p>
            <p>
              <strong>Time:</strong> {new Date(latestUpdate.timestamp).toLocaleTimeString()}
            </p>
            {latestUpdate.notes && (
              <p>
                <strong>Notes:</strong> {latestUpdate.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Caller Info */}
      <div className="caller-info">
        <h4>Your Information</h4>
        <div className="info-content">
          <p>
            <strong>Name:</strong> {incident.caller?.name}
          </p>
          <p>
            <strong>Email:</strong> {incident.caller?.email}
          </p>
          <p>
            <strong>Phone:</strong> {incident.caller?.phone}
          </p>
        </div>
      </div>

      {/* Location Info */}
      <div className="location-info">
        <h4>Incident Location</h4>
        <p>
          📍 Latitude: {incident.location?.latitude?.toFixed(5)}
        </p>
        <p>
          📍 Longitude: {incident.location?.longitude?.toFixed(5)}
        </p>
        {incident.location?.mapsUrl && (
          <a href={incident.location.mapsUrl} target="_blank" rel="noopener noreferrer" className="maps-link">
            View on Maps 🗺️
          </a>
        )}
      </div>

      {/* Reason */}
      <div className="reason-info">
        <h4>Emergency Reason</h4>
        <p>{incident.reason}</p>
      </div>

      {/* Statistics */}
      <div className="statistics">
        <div className="stat">
          <span className="stat-label">Total Updates</span>
          <span className="stat-value">{incident.statistics?.totalStatusUpdates || 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Response Time</span>
          <span className="stat-value">{formatWaitTime(incident.statistics?.waitingTime || 0)}</span>
        </div>
      </div>

      {/* WebSocket Status Indicator */}
      <div className="ws-indicator" style={{ backgroundColor: socket ? '#6BCB77' : '#FF9500' }}>
        {socket ? '🟢 Real-time' : '🟡 Polling'}
      </div>
    </div>
  );
};

export default SOSStatusTracker;
