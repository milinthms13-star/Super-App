/**
 * UserPreferences.jsx
 * User preferences for notifications, privacy, display, and shopping
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserPreferences.css';

const UserPreferences = ({ userId }) => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/user/preferences', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPreferences(response.data.data);
    } catch (err) {
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (category, field) => {
    try {
      const newValue = !preferences[category][field];
      const updateData = {
        [category]: { ...preferences[category], [field]: newValue }
      };

      await axios.put('/api/user/preferences', updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setPreferences({
        ...preferences,
        [category]: { ...preferences[category], [field]: newValue }
      });

      setSuccess('Preferences updated');
    } catch (err) {
      setError('Failed to update preferences');
    }
  };

  const handleSelectChange = async (category, field, value) => {
    try {
      const updateData = {
        [category]: { ...preferences[category], [field]: value }
      };

      await axios.put('/api/user/preferences', updateData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setPreferences({
        ...preferences,
        [category]: { ...preferences[category], [field]: value }
      });

      setSuccess('Preferences updated');
    } catch (err) {
      setError('Failed to update preferences');
    }
  };

  if (loading) return <div className="loading">Loading preferences...</div>;
  if (!preferences) return <div className="error">Failed to load preferences</div>;

  return (
    <div className="user-preferences">
      <h2>Settings & Preferences</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button
          className={`tab ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          🔒 Privacy
        </button>
        <button
          className={`tab ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          🎨 Display
        </button>
        <button
          className={`tab ${activeTab === 'shopping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shopping')}
        >
          🛍️ Shopping
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          🔐 Security
        </button>
      </div>

      <div className="tab-content">
        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="preference-section">
            <h3>Notification Preferences</h3>

            <div className="preference-group">
              <h4>Notification Types</h4>
              {preferences.notifications && Object.entries(preferences.notifications).map(([type, enabled]) => (
                <label key={type} className="preference-item">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {
                      handleToggle('notifications', type);
                    }}
                  />
                  <span>{type.replace(/_/g, ' ').toUpperCase()}</span>
                </label>
              ))}
            </div>

            <div className="preference-group">
              <h4>Notification Channels</h4>
              {preferences.notificationChannels && Object.entries(preferences.notificationChannels).map(([channel, enabled]) => (
                <label key={channel} className="preference-item">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => {
                      handleToggle('notificationChannels', channel);
                    }}
                  />
                  <span>{channel.toUpperCase()}</span>
                </label>
              ))}
            </div>

            <div className="preference-group">
              <h4>Email Frequency</h4>
              <select
                value={preferences.emailFrequency}
                onChange={(e) => handleSelectChange('', 'emailFrequency', e.target.value)}
              >
                <option value="never">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="preference-section">
            <h3>Privacy Settings</h3>

            <div className="preference-group">
              <label className="preference-item">
                <span>Profile Visibility:</span>
                <select
                  value={preferences.privacy?.profileVisibility || 'private'}
                  onChange={(e) => handleSelectChange('privacy', 'profileVisibility', e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="friends_only">Friends Only</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.privacy?.showReviews || false}
                  onChange={() => handleToggle('privacy', 'showReviews')}
                />
                <span>Show my reviews</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.privacy?.showOrders || false}
                  onChange={() => handleToggle('privacy', 'showOrders')}
                />
                <span>Show my order history</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.privacy?.allowMessagesFromStrangers || false}
                  onChange={() => handleToggle('privacy', 'allowMessagesFromStrangers')}
                />
                <span>Allow messages from strangers</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.privacy?.allowDataSharing || false}
                  onChange={() => handleToggle('privacy', 'allowDataSharing')}
                />
                <span>Allow data sharing with partners</span>
              </label>
            </div>
          </div>
        )}

        {/* Display Tab */}
        {activeTab === 'display' && (
          <div className="preference-section">
            <h3>Display Settings</h3>

            <div className="preference-group">
              <label className="preference-item">
                <span>Language:</span>
                <select
                  value={preferences.display?.language || 'en'}
                  onChange={(e) => handleSelectChange('display', 'language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </label>

              <label className="preference-item">
                <span>Theme:</span>
                <select
                  value={preferences.display?.theme || 'auto'}
                  onChange={(e) => handleSelectChange('display', 'theme', e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.display?.compactMode || false}
                  onChange={() => handleToggle('display', 'compactMode')}
                />
                <span>Compact mode</span>
              </label>
            </div>
          </div>
        )}

        {/* Shopping Tab */}
        {activeTab === 'shopping' && (
          <div className="preference-section">
            <h3>Shopping Preferences</h3>

            <div className="preference-group">
              <label className="preference-item">
                <span>Currency:</span>
                <select
                  value={preferences.shopping?.currency || 'INR'}
                  onChange={(e) => handleSelectChange('shopping', 'currency', e.target.value)}
                >
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                </select>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.shopping?.autoApplyCoupons || false}
                  onChange={() => handleToggle('shopping', 'autoApplyCoupons')}
                />
                <span>Auto-apply coupons</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.shopping?.trackPrice || false}
                  onChange={() => handleToggle('shopping', 'trackPrice')}
                />
                <span>Price drop notifications</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.shopping?.wishlistNotifications || false}
                  onChange={() => handleToggle('shopping', 'wishlistNotifications')}
                />
                <span>Wishlist notifications</span>
              </label>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="preference-section">
            <h3>Security Settings</h3>

            <div className="preference-group">
              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.security?.twoFactorEnabled || false}
                  onChange={() => handleToggle('security', 'twoFactorEnabled')}
                />
                <span>Two-factor authentication</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.security?.loginAlerts || false}
                  onChange={() => handleToggle('security', 'loginAlerts')}
                />
                <span>Login alerts</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.security?.suspiciousActivityAlerts || false}
                  onChange={() => handleToggle('security', 'suspiciousActivityAlerts')}
                />
                <span>Suspicious activity alerts</span>
              </label>

              <label className="preference-item">
                <input
                  type="checkbox"
                  checked={preferences.security?.deviceTrustRequired || false}
                  onChange={() => handleToggle('security', 'deviceTrustRequired')}
                />
                <span>Require device trust</span>
              </label>

              <label className="preference-item">
                <span>Session Timeout (seconds):</span>
                <input
                  type="number"
                  value={preferences.security?.sessionTimeout || 1800}
                  onChange={(e) => handleSelectChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  min="300"
                  max="86400"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPreferences;
