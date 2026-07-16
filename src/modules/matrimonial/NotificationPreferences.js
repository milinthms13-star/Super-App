import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './NotificationPreferences.css';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/notifications/preferences`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      setPreferences(response.data.data);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (channel, field) => {
    setPreferences({
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [field]: !preferences[channel][field],
      },
    });
  };

  const handleQuietHoursToggle = () => {
    setPreferences({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        enabled: !preferences.quietHours.enabled,
      },
    });
  };

  const handleTimeChange = (field, value) => {
    setPreferences({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      await axios.put(
        `${API_BASE_URL}/matrimonial/notifications/preferences`,
        preferences,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      setMessage('Preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="notification-prefs-loading">Loading preferences...</div>;
  }

  return (
    <div className="notification-preferences">
      <h2>Notification Preferences</h2>
      <p className="subtitle">Choose how you want to be notified about matches and messages</p>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Email Notifications */}
      <div className="pref-section">
        <h3>📧 Email Notifications</h3>
        <div className="pref-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.email.enabled}
              onChange={() => handleToggle('email', 'enabled')}
            />
            <span>Enable all email notifications</span>
          </label>
        </div>

        {preferences.email.enabled && (
          <div className="pref-sub-items">
            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.email.newMatch}
                  onChange={() => handleToggle('email', 'newMatch')}
                />
                <span>New matches found</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.email.interestReceived}
                  onChange={() => handleToggle('email', 'interestReceived')}
                />
                <span>Interest received</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.email.interestAccepted}
                  onChange={() => handleToggle('email', 'interestAccepted')}
                />
                <span>Interest accepted</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.email.messageReceived}
                  onChange={() => handleToggle('email', 'messageReceived')}
                />
                <span>New messages</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.email.dailyDigest}
                  onChange={() => handleToggle('email', 'dailyDigest')}
                />
                <span>Daily match digest</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div className="pref-section">
        <h3>📱 SMS Notifications</h3>
        <div className="pref-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.sms.enabled}
              onChange={() => handleToggle('sms', 'enabled')}
            />
            <span>Enable SMS notifications</span>
          </label>
        </div>

        {preferences.sms.enabled && (
          <div className="pref-sub-items">
            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.sms.interestReceived}
                  onChange={() => handleToggle('sms', 'interestReceived')}
                />
                <span>Interest received</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.sms.interestAccepted}
                  onChange={() => handleToggle('sms', 'interestAccepted')}
                />
                <span>Interest accepted</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.sms.messageReceived}
                  onChange={() => handleToggle('sms', 'messageReceived')}
                />
                <span>New messages</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Notifications */}
      <div className="pref-section">
        <h3>💬 WhatsApp Notifications</h3>
        <div className="pref-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.whatsapp.enabled}
              onChange={() => handleToggle('whatsapp', 'enabled')}
            />
            <span>Enable WhatsApp notifications</span>
          </label>
        </div>

        {preferences.whatsapp.enabled && (
          <div className="pref-sub-items">
            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.whatsapp.newMatch}
                  onChange={() => handleToggle('whatsapp', 'newMatch')}
                />
                <span>New matches</span>
              </label>
            </div>

            <div className="pref-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.whatsapp.interestReceived}
                  onChange={() => handleToggle('whatsapp', 'interestReceived')}
                />
                <span>Interest received</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Quiet Hours */}
      <div className="pref-section">
        <h3>🌙 Quiet Hours</h3>
        <div className="pref-item">
          <label>
            <input
              type="checkbox"
              checked={preferences.quietHours.enabled}
              onChange={handleQuietHoursToggle}
            />
            <span>Enable quiet hours (no SMS or push notifications)</span>
          </label>
        </div>

        {preferences.quietHours.enabled && (
          <div className="quiet-hours-times">
            <div className="time-input">
              <label>From:</label>
              <input
                type="time"
                value={preferences.quietHours.startTime}
                onChange={(e) => handleTimeChange('startTime', e.target.value)}
              />
            </div>
            <div className="time-input">
              <label>To:</label>
              <input
                type="time"
                value={preferences.quietHours.endTime}
                onChange={(e) => handleTimeChange('endTime', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <button
        className="btn btn-primary save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
};

export default NotificationPreferences;
