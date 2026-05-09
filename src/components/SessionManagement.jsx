/**
 * SessionManagement.jsx
 * User session and device trust management component
 * Features: MFA settings, device trust management, suspicious activity alerts
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SessionManagement.css';

const SessionManagement = ({ userId }) => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('authenticator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessions, setSessions] = useState([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  useEffect(() => {
    fetchSessionData();
  }, [userId]);

  const fetchSessionData = async () => {
    try {
      const response = await axios.get('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setSessions(response.data.data.sessions || []);
      
      // Filter suspicious sessions
      const suspicious = response.data.data.sessions.filter(
        s => s.riskLevel === 'high' || s.riskLevel === 'critical'
      );
      setSuspiciousActivities(suspicious);
    } catch (err) {
      setError('Failed to load session data');
    }
  };

  const handleEnableMFA = async () => {
    setLoading(true);
    setError('');

    try {
      // Generate MFA secret
      const response = await axios.post('/api/auth/mfa/setup', {
        method: mfaMethod
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setShowMFASetup(true);
      // In production, display QR code for authenticator
      if (process.env.NODE_ENV === 'development') {
        console.log('MFA Secret:', response.data.data.secret);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/mfa/verify', {
        code: verificationCode
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setMfaEnabled(true);
      setShowMFASetup(false);
      setVerificationCode('');
      setSuccess('MFA enabled successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!window.confirm('Are you sure you want to disable MFA?')) return;

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/auth/mfa/disable', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setMfaEnabled(false);
      setSuccess('MFA disabled');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuspiciousSession = async (sessionId) => {
    setLoading(true);
    setError('');

    try {
      await axios.post(`/api/auth/sessions/${sessionId}/verify`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });

      setSuccess('Device verified successfully');
      fetchSessionData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to verify device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="session-management-container">
      <div className="session-management-header">
        <h2>Security Settings</h2>
        <p>Manage your session security and authentication methods</p>
      </div>

      {error && <div className="session-error-message">{error}</div>}
      {success && <div className="session-success-message">{success}</div>}

      {/* MFA Section */}
      <div className="session-section">
        <div className="session-section-header">
          <h3>Two-Factor Authentication (2FA)</h3>
          <span className={`session-status ${mfaEnabled ? 'enabled' : 'disabled'}`}>
            {mfaEnabled ? '✓ Enabled' : '○ Disabled'}
          </span>
        </div>

        {!mfaEnabled && !showMFASetup && (
          <div className="session-info-box">
            <p>Two-factor authentication adds an extra layer of security to your account. In addition to your password, you'll need to enter a code from your phone.</p>
            <button
              onClick={handleEnableMFA}
              disabled={loading}
              className="session-action-btn primary"
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {showMFASetup && (
          <div className="session-mfa-setup">
            <h4>Set Up Two-Factor Authentication</h4>
            <div className="session-form-group">
              <label>Choose verification method:</label>
              <div className="session-radio-options">
                <label className="session-radio">
                  <input
                    type="radio"
                    value="authenticator"
                    checked={mfaMethod === 'authenticator'}
                    onChange={(e) => setMfaMethod(e.target.value)}
                  />
                  <span>Authenticator App (Google Authenticator, Authy)</span>
                </label>
                <label className="session-radio">
                  <input
                    type="radio"
                    value="sms"
                    checked={mfaMethod === 'sms'}
                    onChange={(e) => setMfaMethod(e.target.value)}
                  />
                  <span>SMS to your phone</span>
                </label>
                <label className="session-radio">
                  <input
                    type="radio"
                    value="email"
                    checked={mfaMethod === 'email'}
                    onChange={(e) => setMfaMethod(e.target.value)}
                  />
                  <span>Email verification</span>
                </label>
              </div>
            </div>

            <form onSubmit={handleVerifyMFA} className="session-verification-form">
              <div className="session-form-group">
                <label htmlFor="verification-code">Enter 6-digit code:</label>
                <input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength="6"
                  inputMode="numeric"
                  disabled={loading}
                />
              </div>
              <div className="session-form-actions">
                <button
                  type="button"
                  onClick={() => setShowMFASetup(false)}
                  className="session-action-btn secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="session-action-btn primary"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </form>
          </div>
        )}

        {mfaEnabled && (
          <div className="session-mfa-enabled">
            <div className="session-enabled-info">
              <p>✓ Your account is protected with two-factor authentication</p>
              <p className="session-method">Method: {mfaMethod.charAt(0).toUpperCase() + mfaMethod.slice(1)}</p>
            </div>
            <button
              onClick={handleDisableMFA}
              disabled={loading}
              className="session-action-btn danger"
            >
              {loading ? 'Processing...' : 'Disable 2FA'}
            </button>
          </div>
        )}
      </div>

      {/* Suspicious Activities Section */}
      {suspiciousActivities.length > 0 && (
        <div className="session-section suspicious">
          <h3>⚠️ Suspicious Activity Detected</h3>
          <p>We detected login attempts from unusual locations or devices:</p>

          <div className="session-suspicious-list">
            {suspiciousActivities.map((activity, idx) => (
              <div key={idx} className="session-suspicious-item">
                <div className="session-suspicious-header">
                  <span className="session-suspicious-badge">SUSPICIOUS</span>
                  <span className="session-suspicious-location">{activity.location}</span>
                </div>
                <p className="session-suspicious-detail">
                  Login: {new Date(activity.loginTime).toLocaleString()}
                </p>
                <button
                  onClick={() => handleVerifySuspiciousSession(activity.sessionId)}
                  className="session-verify-btn"
                >
                  This is me ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sessions Section */}
      <div className="session-section">
        <h3>Active Sessions</h3>
        <p className="session-section-desc">Manage your active sessions and devices</p>

        <div className="session-list">
          {sessions.length === 0 ? (
            <p className="session-empty">No active sessions</p>
          ) : (
            sessions.map((session, idx) => (
              <div key={idx} className="session-item">
                <div className="session-item-header">
                  <span className="session-device-icon">
                    {session.deviceType === 'mobile' ? '📱' : '💻'}
                  </span>
                  <div className="session-item-info">
                    <p className="session-device-name">{session.deviceName}</p>
                    <p className="session-device-location">{session.location}</p>
                  </div>
                  {session.isCurrentDevice && (
                    <span className="session-current-badge">This Device</span>
                  )}
                </div>
                <div className="session-item-meta">
                  <span>Login: {new Date(session.loginTime).toLocaleDateString()}</span>
                  <span>Last active: {new Date(session.lastActivityTime).toLocaleTimeString()}</span>
                  {session.isTrustedDevice && <span className="session-trusted">✓ Trusted</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="session-recommendations">
        <h3>Security Recommendations</h3>
        <ul>
          <li>✓ Enable two-factor authentication for enhanced security</li>
          <li>✓ Review your active sessions regularly</li>
          <li>✓ Logout from devices you don't recognize</li>
          <li>✓ Change your password every 3 months</li>
          <li>✓ Don't use the same password on multiple websites</li>
        </ul>
      </div>
    </div>
  );
};

export default SessionManagement;
