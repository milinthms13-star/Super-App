import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DisappearingMessageSettings.css';

const DisappearingMessageSettings = ({ chatId, onClose }) => {
  const [enabled, setEnabled] = useState(false);
  const [expirationTime, setExpirationTime] = useState('24h');
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, expiring: 0 });

  const expirationOptions = [
    { value: '1h', label: '1 Hour', seconds: 3600 },
    { value: '24h', label: '24 Hours', seconds: 86400 },
    { value: '7d', label: '7 Days', seconds: 604800 },
    { value: '30d', label: '30 Days', seconds: 2592000 },
    { value: 'custom', label: 'Custom', seconds: null }
  ];

  const [customDays, setCustomDays] = useState(1);

  useEffect(() => {
    fetchSettings();
  }, [chatId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/messaging/v5/disappearing/${chatId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const settings = response.data.settings || {};
      setEnabled(settings.enabled || false);
      setExpirationTime(settings.expirationTime || '24h');
      setStats(response.data.stats || { total: 0, expiring: 0 });
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const seconds = expirationTime === 'custom' 
        ? customDays * 86400 
        : expirationOptions.find(opt => opt.value === expirationTime)?.seconds;

      await axios.post(`/api/messaging/v5/disappearing/${chatId}`, {
        enabled,
        expirationSeconds: seconds,
        applyToExisting
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('Settings saved successfully!');
      if (applyToExisting) {
        alert(`Applied to ${stats.total} existing messages`);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const getExpirationLabel = () => {
    const option = expirationOptions.find(opt => opt.value === expirationTime);
    if (expirationTime === 'custom') {
      return `${customDays} day${customDays > 1 ? 's' : ''}`;
    }
    return option?.label || '24 Hours';
  };

  return (
    <div className="disappearing-settings-modal">
      <div className="disappearing-settings-container">
        <div className="settings-header">
          <h2>⏱️ Disappearing Messages</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="settings-content">
          <div className="info-banner">
            <p>
              🔒 Disappearing messages automatically delete after the set time period.
              Both you and the recipient won't be able to see them once they expire.
            </p>
          </div>

          <div className="setting-section">
            <label className="toggle-setting">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                Enable Disappearing Messages
              </span>
            </label>
          </div>

          {enabled && (
            <>
              <div className="setting-section">
                <h3>Auto-Delete After</h3>
                <div className="time-options">
                  {expirationOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`time-option ${expirationTime === option.value ? 'active' : ''}`}
                      onClick={() => setExpirationTime(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {expirationTime === 'custom' && (
                  <div className="custom-time">
                    <label>Days:</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}

                <p className="time-preview">
                  New messages will disappear after <strong>{getExpirationLabel()}</strong>
                </p>
              </div>

              <div className="setting-section">
                <label className="checkbox-setting">
                  <input
                    type="checkbox"
                    checked={applyToExisting}
                    onChange={(e) => setApplyToExisting(e.target.checked)}
                  />
                  Apply to existing messages
                </label>
                <p className="setting-note">
                  {applyToExisting 
                    ? `This will set expiration on all ${stats.total} messages in this chat`
                    : 'Only new messages will have expiration'}
                </p>
              </div>

              <div className="stats-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total Messages</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.expiring}</span>
                    <span className="stat-label">Currently Expiring</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="warning-section">
            <h4>⚠️ Important Notes</h4>
            <ul>
              <li>Deleted messages cannot be recovered</li>
              <li>Recipients may screenshot messages before they expire</li>
              <li>Media files will also be deleted permanently</li>
              <li>Timer starts when message is sent, not when it's read</li>
            </ul>
          </div>

          <div className="action-buttons">
            <button 
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className="btn-save"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisappearingMessageSettings;
