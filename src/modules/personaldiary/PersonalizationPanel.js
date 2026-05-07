/**
 * Personalization Panel Component
 * Manages user preferences, themes, writing modes, and notifications
 * Phase 7 - Advanced Personalization
 */

import React, { useState, useEffect } from 'react';
import './Phase7Components.css';

const PersonalizationPanel = ({ token, apiUrl = 'http://localhost:5000', onError, onSuccess }) => {
  const [preferences, setPreferences] = useState(null);
  const [themeConfig, setThemeConfig] = useState(null);
  const [writingModes, setWritingModes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [expandedSection, setExpandedSection] = useState('theme');
  const [localPreferences, setLocalPreferences] = useState({});

  useEffect(() => {
    fetchPersonalizationData();
  }, []);

  const fetchPersonalizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prefsRes, themeRes, modeRes] = await Promise.all([
        fetch(`${apiUrl}/api/diary/phase7/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/diary/phase7/theme`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/diary/phase7/writing-mode`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!prefsRes.ok || !themeRes.ok || !modeRes.ok) {
        throw new Error('Failed to fetch personalization data');
      }

      const prefsData = await prefsRes.json();
      const themeData = await themeRes.json();
      const modeData = await modeRes.json();

      setPreferences(prefsData.data);
      setThemeConfig(themeData.data);
      setWritingModes(modeData.data);
      setLocalPreferences(prefsData.data);
    } catch (err) {
      const message = err.message || 'Failed to load preferences';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (section, key, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setUnsavedChanges(true);
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${apiUrl}/api/diary/phase7/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localPreferences)
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      setPreferences(localPreferences);
      setUnsavedChanges(false);
      onSuccess?.('Preferences saved successfully');
    } catch (err) {
      onError?.(err);
    } finally {
      setSaving(false);
    }
  };

  const renderThemeSection = () => (
    <div className="preference-section theme-section">
      <h3>🎨 Theme Settings</h3>

      <div className="preference-group">
        <label>Theme Mode</label>
        <div className="theme-modes">
          {['light', 'dark', 'auto'].map(mode => (
            <button
              key={mode}
              className={`mode-btn ${localPreferences.theme?.mode === mode ? 'active' : ''}`}
              onClick={() => handlePreferenceChange('theme', 'mode', mode)}
            >
              {mode === 'light' && '☀️ Light'}
              {mode === 'dark' && '🌙 Dark'}
              {mode === 'auto' && '⚙️ Auto'}
            </button>
          ))}
        </div>
      </div>

      <div className="preference-group">
        <label>Primary Color</label>
        <div className="color-picker">
          <input
            type="color"
            value={localPreferences.theme?.primaryColor || '#6366f1'}
            onChange={(e) => handlePreferenceChange('theme', 'primaryColor', e.target.value)}
          />
          <span className="color-value">{localPreferences.theme?.primaryColor || '#6366f1'}</span>
        </div>
      </div>

      <div className="preference-group">
        <label>Font Size</label>
        <select
          value={localPreferences.theme?.fontSize || 'medium'}
          onChange={(e) => handlePreferenceChange('theme', 'fontSize', e.target.value)}
        >
          <option value="small">Small (14px)</option>
          <option value="medium">Medium (16px)</option>
          <option value="large">Large (18px)</option>
        </select>
      </div>

      <div className="preference-group">
        <label>Line Height</label>
        <select
          value={localPreferences.theme?.lineHeight || '1.6'}
          onChange={(e) => handlePreferenceChange('theme', 'lineHeight', e.target.value)}
        >
          <option value="1.4">Compact (1.4)</option>
          <option value="1.6">Normal (1.6)</option>
          <option value="1.8">Spacious (1.8)</option>
          <option value="2">Very Spacious (2.0)</option>
        </select>
      </div>
    </div>
  );

  const renderWritingSection = () => (
    <div className="preference-section writing-section">
      <h3>✍️ Writing Preferences</h3>

      <div className="preference-group">
        <label>Default Writing Mode</label>
        <div className="writing-modes">
          {['full', 'minimal', 'focused', 'typewriter'].map(mode => (
            <button
              key={mode}
              className={`mode-btn ${localPreferences.writing?.defaultMode === mode ? 'active' : ''}`}
              onClick={() => handlePreferenceChange('writing', 'defaultMode', mode)}
            >
              {mode === 'full' && '📋 Full'}
              {mode === 'minimal' && '💫 Minimal'}
              {mode === 'focused' && '🎯 Focused'}
              {mode === 'typewriter' && '⌨️ Typewriter'}
            </button>
          ))}
        </div>
      </div>

      <div className="preference-group">
        <label>Auto-save Interval (seconds)</label>
        <input
          type="number"
          min="5"
          max="300"
          value={localPreferences.writing?.autoSaveInterval || 30}
          onChange={(e) => handlePreferenceChange('writing', 'autoSaveInterval', parseInt(e.target.value))}
        />
      </div>

      <div className="preference-group">
        <label>Daily Word Goal</label>
        <input
          type="number"
          min="50"
          max="10000"
          value={localPreferences.writing?.wordGoal || 500}
          onChange={(e) => handlePreferenceChange('writing', 'wordGoal', parseInt(e.target.value))}
        />
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.writing?.spellCheck || false}
            onChange={(e) => handlePreferenceChange('writing', 'spellCheck', e.target.checked)}
          />
          Enable Spell Check
        </label>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.writing?.grammarCheck || false}
            onChange={(e) => handlePreferenceChange('writing', 'grammarCheck', e.target.checked)}
          />
          Enable Grammar Check
        </label>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.writing?.suggestTags || false}
            onChange={(e) => handlePreferenceChange('writing', 'suggestTags', e.target.checked)}
          />
          Suggest Tags
        </label>
      </div>
    </div>
  );

  const renderNotificationSection = () => (
    <div className="preference-section notification-section">
      <h3>🔔 Notification Preferences</h3>

      <div className="preference-group">
        <label>Reminder Frequency</label>
        <select
          value={localPreferences.notifications?.reminderFrequency || 'daily'}
          onChange={(e) => handlePreferenceChange('notifications', 'reminderFrequency', e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom</option>
          <option value="never">Never</option>
        </select>
      </div>

      <div className="preference-group">
        <label>Reminder Time</label>
        <input
          type="time"
          value={localPreferences.notifications?.reminderTime || '09:00'}
          onChange={(e) => handlePreferenceChange('notifications', 'reminderTime', e.target.value)}
        />
      </div>

      <div className="preference-group">
        <label>Analytics Digest</label>
        <select
          value={localPreferences.notifications?.analyticsDigest || 'weekly'}
          onChange={(e) => handlePreferenceChange('notifications', 'analyticsDigest', e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="never">Never</option>
        </select>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.notifications?.streakNotifications || false}
            onChange={(e) => handlePreferenceChange('notifications', 'streakNotifications', e.target.checked)}
          />
          Notify on Streak Milestones
        </label>
      </div>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="preference-section privacy-section">
      <h3>🔐 Privacy & Security</h3>

      <div className="preference-group">
        <label>Profile Visibility</label>
        <select
          value={localPreferences.privacy?.profileVisibility || 'private'}
          onChange={(e) => handlePreferenceChange('privacy', 'profileVisibility', e.target.value)}
        >
          <option value="private">Private (Only me)</option>
          <option value="contacts">Contacts Only</option>
          <option value="public">Public</option>
        </select>
      </div>

      <div className="preference-group">
        <label>Data Retention</label>
        <select
          value={localPreferences.privacy?.dataRetention || '1year'}
          onChange={(e) => handlePreferenceChange('privacy', 'dataRetention', e.target.value)}
        >
          <option value="forever">Forever</option>
          <option value="1year">1 Year</option>
          <option value="6months">6 Months</option>
          <option value="3months">3 Months</option>
        </select>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.privacy?.encryptEntries || false}
            onChange={(e) => handlePreferenceChange('privacy', 'encryptEntries', e.target.checked)}
          />
          Encrypt Entries (End-to-End)
        </label>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.privacy?.backupEnabled || false}
            onChange={(e) => handlePreferenceChange('privacy', 'backupEnabled', e.target.checked)}
          />
          Enable Automatic Backups
        </label>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.privacy?.allowSharing || false}
            onChange={(e) => handlePreferenceChange('privacy', 'allowSharing', e.target.checked)}
          />
          Allow Sharing
        </label>
      </div>

      <div className="preference-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={localPreferences.privacy?.allowCollaboration || false}
            onChange={(e) => handlePreferenceChange('privacy', 'allowCollaboration', e.target.checked)}
          />
          Allow Collaboration
        </label>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="personalization-panel loading">
        <div className="spinner"></div>
        <p>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="personalization-panel">
      <div className="personalization-header">
        <h2>⚙️ Personalization Settings</h2>
        <p>Customize your diary experience</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="personalization-sections">
        <div className="sections-nav">
          {['theme', 'writing', 'notification', 'privacy'].map(section => (
            <button
              key={section}
              className={`nav-btn ${expandedSection === section ? 'active' : ''}`}
              onClick={() => setExpandedSection(section)}
            >
              {section === 'theme' && '🎨 Theme'}
              {section === 'writing' && '✍️ Writing'}
              {section === 'notification' && '🔔 Notifications'}
              {section === 'privacy' && '🔐 Privacy'}
            </button>
          ))}
        </div>

        <div className="sections-content">
          {expandedSection === 'theme' && renderThemeSection()}
          {expandedSection === 'writing' && renderWritingSection()}
          {expandedSection === 'notification' && renderNotificationSection()}
          {expandedSection === 'privacy' && renderPrivacySection()}
        </div>
      </div>

      <div className="personalization-footer">
        {unsavedChanges && <span className="unsaved-indicator">⚠️ Unsaved changes</span>}
        <button
          onClick={handleSavePreferences}
          disabled={!unsavedChanges || saving}
          className="save-btn"
        >
          {saving ? '💾 Saving...' : '💾 Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default PersonalizationPanel;
