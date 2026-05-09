/**
 * DeviceManager.jsx
 * Device management component showing active sessions and allowing logout
 */

import React, { useState, useEffect } from 'axios';
import './DeviceManager.css';

const DeviceManager = ({ userId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');

  useEffect(() => {
    fetchSessions();
    // Get current session from localStorage or token
    const token = localStorage.getItem('accessToken');
    if (token) {
      setCurrentSessionId(token); // In production, decode JWT to get sessionId
    }
  }, [userId]);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/sessions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch sessions');

      const data = await response.json();
      setSessions(data.data.sessions || []);
    } catch (err) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (sessionId) => {
    if (!window.confirm('Are you sure you want to logout from this device?')) return;

    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to logout');

      setSessions(sessions.filter(s => s.sessionId !== sessionId));
    } catch (err) {
      setError('Failed to logout from device');
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('This will logout from all devices. Continue?')) return;

    try {
      const response = await fetch('/api/auth/sessions/all', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to logout from all devices');

      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) {
      setError('Failed to logout from all devices');
    }
  };

  const handleTrustDevice = async (sessionId) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}/trust`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to trust device');

      fetchSessions();
    } catch (err) {
      setError('Failed to trust device');
    }
  };

  if (loading) {
    return <div className="device-manager-loading">Loading devices...</div>;
  }

  return (
    <div className="device-manager-container">
      <div className="device-manager-header">
        <h2>Active Devices</h2>
        <p className="device-manager-description">
          Manage your devices and sessions. Logout from any device if you don't recognize it.
        </p>
        {error && <div className="device-error-message">{error}</div>}
      </div>

      <div className="device-list">
        {sessions.length === 0 ? (
          <div className="device-empty">
            <p>No active sessions found</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`device-card ${session.isCurrentDevice ? 'current' : ''} ${
                session.riskLevel === 'high' || session.riskLevel === 'critical' ? 'suspicious' : ''
              }`}
            >
              <div className="device-card-header">
                <div className="device-icon">
                  {session.deviceType === 'mobile' ? '📱' : '💻'}
                </div>
                <div className="device-info-main">
                  <h3>{session.deviceName}</h3>
                  <p className="device-location">{session.location}</p>
                </div>
                {session.isCurrentDevice && <span className="device-current-badge">This Device</span>}
              </div>

              <div className="device-details">
                <div className="device-detail">
                  <span className="device-label">Last Active</span>
                  <span className="device-value">
                    {new Date(session.lastActivityTime).toLocaleDateString()} 
                    {' at '}
                    {new Date(session.lastActivityTime).toLocaleTimeString()}
                  </span>
                </div>

                <div className="device-detail">
                  <span className="device-label">Logged In</span>
                  <span className="device-value">
                    {new Date(session.loginTime).toLocaleDateString()}
                  </span>
                </div>

                {session.riskLevel && (
                  <div className="device-detail">
                    <span className="device-label">Security Level</span>
                    <span className={`device-risk-badge risk-${session.riskLevel}`}>
                      {session.riskLevel.charAt(0).toUpperCase() + session.riskLevel.slice(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="device-card-actions">
                {!session.isTrustedDevice && !session.isCurrentDevice && (
                  <button
                    onClick={() => handleTrustDevice(session.sessionId)}
                    className="device-action-btn trust"
                    title="Mark this device as trusted"
                  >
                    ✓ Trust Device
                  </button>
                )}

                {session.isTrustedDevice && (
                  <span className="device-trusted-badge">✓ Trusted Device</span>
                )}

                {!session.isCurrentDevice && (
                  <button
                    onClick={() => handleLogoutDevice(session.sessionId)}
                    className="device-action-btn logout"
                    title="Logout from this device"
                  >
                    🚪 Logout
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="device-manager-footer">
        <button onClick={handleLogoutAll} className="device-logout-all-btn">
          🚪 Logout from All Devices
        </button>
      </div>

      <div className="device-security-tips">
        <h3>Security Tips</h3>
        <ul>
          <li>Regularly check your active devices</li>
          <li>Logout from devices you don't recognize</li>
          <li>Mark your trusted devices for faster login</li>
          <li>If you see suspicious activity, change your password immediately</li>
        </ul>
      </div>
    </div>
  );
};

export default DeviceManager;
