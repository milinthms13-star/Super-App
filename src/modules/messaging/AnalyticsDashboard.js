import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('7d'); // '24h', '7d', '30d', '90d', 'all'
  const [activeMetric, setActiveMetric] = useState('overview');

  const timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/messaging/v4/analytics?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAnalytics(response.data.analytics || {});
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`/api/messaging/v4/analytics/export?format=${format}&timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `messaging-analytics-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export analytics');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading && !analytics) {
    return (
      <div className="analytics-dashboard-modal">
        <div className="analytics-dashboard-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard-modal">
      <div className="analytics-dashboard-container">
        <div className="analytics-header">
          <h2>📊 Messaging Analytics</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="analytics-content">
          <div className="analytics-toolbar">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-select"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>

            <div className="export-buttons">
              <button onClick={() => handleExport('csv')} className="btn-export">
                📥 CSV
              </button>
              <button onClick={() => handleExport('pdf')} className="btn-export">
                📥 PDF
              </button>
            </div>
          </div>

          <div className="metrics-tabs">
            <button 
              className={`metric-tab ${activeMetric === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveMetric('overview')}
            >
              Overview
            </button>
            <button 
              className={`metric-tab ${activeMetric === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveMetric('activity')}
            >
              Activity
            </button>
            <button 
              className={`metric-tab ${activeMetric === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveMetric('contacts')}
            >
              Contacts
            </button>
            <button 
              className={`metric-tab ${activeMetric === 'media' ? 'active' : ''}`}
              onClick={() => setActiveMetric('media')}
            >
              Media
            </button>
          </div>

          {activeMetric === 'overview' && (
            <div className="overview-section">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">💬</div>
                  <div className="stat-details">
                    <span className="stat-value">{formatNumber(analytics?.totalMessages || 0)}</span>
                    <span className="stat-label">Total Messages</span>
                  </div>
                  <div className="stat-trend positive">
                    ↑ {analytics?.messageGrowth || 0}%
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📤</div>
                  <div className="stat-details">
                    <span className="stat-value">{formatNumber(analytics?.messagesSent || 0)}</span>
                    <span className="stat-label">Messages Sent</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">📥</div>
                  <div className="stat-details">
                    <span className="stat-value">{formatNumber(analytics?.messagesReceived || 0)}</span>
                    <span className="stat-label">Messages Received</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-details">
                    <span className="stat-value">{analytics?.activeChats || 0}</span>
                    <span className="stat-label">Active Chats</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">⏱️</div>
                  <div className="stat-details">
                    <span className="stat-value">{formatTime(analytics?.avgResponseTime || 0)}</span>
                    <span className="stat-label">Avg Response Time</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-details">
                    <span className="stat-value">{analytics?.readRate || 0}%</span>
                    <span className="stat-label">Read Rate</span>
                  </div>
                </div>
              </div>

              <div className="chart-section">
                <h3>Message Activity</h3>
                <div className="activity-chart">
                  {analytics?.dailyActivity?.map((day, idx) => (
                    <div key={idx} className="chart-bar">
                      <div 
                        className="bar-fill"
                        style={{ height: `${(day.count / Math.max(...analytics.dailyActivity.map(d => d.count))) * 100}%` }}
                      ></div>
                      <span className="bar-label">{day.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMetric === 'activity' && (
            <div className="activity-section">
              <h3>Peak Activity Times</h3>
              <div className="heatmap">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIdx) => (
                  <div key={day} className="heatmap-row">
                    <span className="heatmap-label">{day}</span>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const intensity = analytics?.heatmap?.[dayIdx]?.[hour] || 0;
                      return (
                        <div 
                          key={hour}
                          className="heatmap-cell"
                          style={{ 
                            background: `rgba(79, 172, 254, ${intensity / 100})`,
                            opacity: intensity > 0 ? 1 : 0.2
                          }}
                          title={`${day} ${hour}:00 - ${intensity} messages`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="heatmap-hours">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span key={i} className="hour-label">{i}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeMetric === 'contacts' && (
            <div className="contacts-section">
              <h3>Top Contacts</h3>
              <div className="top-contacts-list">
                {analytics?.topContacts?.slice(0, 10).map((contact, idx) => (
                  <div key={contact.id} className="contact-stat">
                    <span className="contact-rank">#{idx + 1}</span>
                    <div className="contact-avatar">{contact.name?.[0] || '?'}</div>
                    <div className="contact-info">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-count">{contact.messageCount} messages</span>
                    </div>
                    <div className="contact-bar">
                      <div 
                        className="contact-bar-fill"
                        style={{ width: `${(contact.messageCount / analytics.topContacts[0].messageCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMetric === 'media' && (
            <div className="media-section">
              <h3>Media Sharing</h3>
              <div className="media-stats-grid">
                <div className="media-stat-card">
                  <div className="media-icon">🖼️</div>
                  <div className="media-count">{formatNumber(analytics?.mediaStats?.images || 0)}</div>
                  <div className="media-label">Images</div>
                </div>
                <div className="media-stat-card">
                  <div className="media-icon">🎥</div>
                  <div className="media-count">{formatNumber(analytics?.mediaStats?.videos || 0)}</div>
                  <div className="media-label">Videos</div>
                </div>
                <div className="media-stat-card">
                  <div className="media-icon">🎵</div>
                  <div className="media-count">{formatNumber(analytics?.mediaStats?.audio || 0)}</div>
                  <div className="media-label">Audio</div>
                </div>
                <div className="media-stat-card">
                  <div className="media-icon">📎</div>
                  <div className="media-count">{formatNumber(analytics?.mediaStats?.files || 0)}</div>
                  <div className="media-label">Files</div>
                </div>
              </div>

              <div className="storage-info">
                <h4>Storage Usage</h4>
                <div className="storage-bar">
                  <div 
                    className="storage-used"
                    style={{ width: `${(analytics?.storageUsed / analytics?.storageLimit) * 100}%` }}
                  />
                </div>
                <div className="storage-label">
                  {formatNumber(analytics?.storageUsed || 0)} MB / {formatNumber(analytics?.storageLimit || 0)} MB
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
