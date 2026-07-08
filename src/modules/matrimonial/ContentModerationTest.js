import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ContentModerationTest.css';

const ContentModerationTest = ({ isAdmin = false }) => {
  const [text, setText] = useState('');
  const [context, setContext] = useState('general');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [flaggedContent, setFlaggedContent] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
      fetchStats();
      fetchFlaggedContent();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/matrimonial/moderation/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch moderation settings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/matrimonial/moderation/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch moderation stats:', error);
    }
  };

  const fetchFlaggedContent = async () => {
    try {
      const response = await axios.get('/api/matrimonial/moderation/flagged-content');
      setFlaggedContent(response.data.items);
    } catch (error) {
      console.error('Failed to fetch flagged content:', error);
    }
  };

  const handleTestModeration = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/matrimonial/moderation/test', {
        text,
        context
      });
      setResult(response.data);
    } catch (error) {
      console.error('Moderation test failed:', error);
      setResult({ error: 'Test failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      await axios.patch('/api/matrimonial/moderation/settings', newSettings);
      await fetchSettings();
      alert('Settings updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings');
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'block':
        return '#dc3545';
      case 'flag':
        return '#ffc107';
      case 'allow':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return '#dc3545';
    if (score >= 0.6) return '#ffc107';
    return '#28a745';
  };

  const renderTestInterface = () => (
    <div className="moderation-test-section">
      <h3>Test Content Moderation</h3>
      
      <div className="test-form">
        <div className="form-group">
          <label>Context</label>
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="general">General</option>
            <option value="profile">Profile</option>
            <option value="message">Message</option>
            <option value="bio">Bio</option>
          </select>
        </div>

        <div className="form-group">
          <label>Text to Moderate</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to test..."
            rows="6"
          />
        </div>

        <button 
          onClick={handleTestModeration}
          disabled={loading || !text}
          className="btn-primary"
        >
          {loading ? 'Testing...' : 'Test Moderation'}
        </button>
      </div>

      {result && (
        <div className="moderation-result">
          <h4>Moderation Result</h4>
          
          {result.error ? (
            <div className="error-message">{result.error}</div>
          ) : (
            <>
              <div className="result-summary">
                <div className="result-item">
                  <span>Status:</span>
                  <strong className={result.clean ? 'status-clean' : 'status-flagged'}>
                    {result.clean ? 'Clean' : 'Flagged'}
                  </strong>
                </div>
                
                <div className="result-item">
                  <span>Score:</span>
                  <strong style={{ color: getScoreColor(result.score) }}>
                    {(result.score * 100).toFixed(1)}%
                  </strong>
                </div>
                
                <div className="result-item">
                  <span>Action:</span>
                  <strong 
                    className={`action-badge action-${result.action}`}
                    style={{ backgroundColor: getActionColor(result.action) }}
                  >
                    {result.action.toUpperCase()}
                  </strong>
                </div>
              </div>

              {result.flags && result.flags.length > 0 && (
                <div className="result-flags">
                  <h5>Flags:</h5>
                  <div className="flags-list">
                    {result.flags.map((flag, index) => (
                      <span key={index} className="flag-badge">{flag}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.details && (
                <div className="result-details">
                  <h5>Detailed Analysis:</h5>
                  <div className="details-grid">
                    {Object.entries(result.details).map(([key, value]) => (
                      <div key={key} className="detail-item">
                        <strong>{key}:</strong>
                        <span>
                          Score: {((value.score || 0) * 100).toFixed(1)}%
                          {value.flags && value.flags.length > 0 && (
                            <span className="sub-flags">
                              {' '}({value.flags.join(', ')})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderSettings = () => {
    if (!isAdmin || !settings) return null;

    return (
      <div className="moderation-settings-section">
        <h3>Moderation Settings</h3>
        
        <div className="settings-grid">
          <div className="setting-item">
            <label>Auto-Block Threshold</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.autoBlockThreshold}
              onChange={(e) => handleUpdateSettings({ 
                autoBlockThreshold: parseFloat(e.target.value) 
              })}
            />
            <span>{(settings.autoBlockThreshold * 100).toFixed(0)}%</span>
            <p className="setting-description">
              Content above this score will be automatically blocked
            </p>
          </div>

          <div className="setting-item">
            <label>Flag Threshold</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.flagThreshold}
              onChange={(e) => handleUpdateSettings({ 
                flagThreshold: parseFloat(e.target.value) 
              })}
            />
            <span>{(settings.flagThreshold * 100).toFixed(0)}%</span>
            <p className="setting-description">
              Content above this score will be flagged for review
            </p>
          </div>

          <div className="setting-item">
            <label>Moderation Enabled</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.moderationEnabled}
                onChange={(e) => handleUpdateSettings({ 
                  moderationEnabled: e.target.checked 
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <p className="setting-description">
              Enable or disable automatic content moderation
            </p>
          </div>
        </div>

        <div className="api-status">
          <h4>API Status</h4>
          <div className="status-item">
            <span>Perspective API:</span>
            <span className={settings.perspectiveApiEnabled ? 'status-enabled' : 'status-disabled'}>
              {settings.perspectiveApiEnabled ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
          <div className="status-item">
            <span>OpenAI API:</span>
            <span className={settings.openaiApiEnabled ? 'status-enabled' : 'status-disabled'}>
              {settings.openaiApiEnabled ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    if (!isAdmin || !stats) return null;

    return (
      <div className="moderation-stats-section">
        <h3>Moderation Statistics</h3>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalChecks || 0}</div>
            <div className="stat-label">Total Checks</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.blocked || 0}</div>
            <div className="stat-label">Blocked</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.flagged || 0}</div>
            <div className="stat-label">Flagged</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.allowed || 0}</div>
            <div className="stat-label">Allowed</div>
          </div>
        </div>

        {stats.topFlags && stats.topFlags.length > 0 && (
          <div className="top-flags">
            <h4>Most Common Flags</h4>
            <div className="flags-chart">
              {stats.topFlags.map((flag, index) => (
                <div key={index} className="flag-chart-item">
                  <span className="flag-name">{flag.name}</span>
                  <div className="flag-bar">
                    <div 
                      className="flag-bar-fill"
                      style={{ width: `${(flag.count / stats.totalChecks) * 100}%` }}
                    />
                  </div>
                  <span className="flag-count">{flag.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="content-moderation-test">
      <div className="moderation-header">
        <h2>🛡️ Content Moderation</h2>
        <p>Test and manage automated content filtering</p>
      </div>

      {renderTestInterface()}
      {renderSettings()}
      {renderStats()}
    </div>
  );
};

export default ContentModerationTest;
