import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConversationAnalytics.css';

const ConversationAnalytics = ({ chatId, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (chatId) {
      fetchConversationAnalytics();
    }
  }, [chatId, timeRange]);

  const fetchConversationAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/messaging/v4/analytics/${chatId}?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAnalytics(response.data.analytics || {});
    } catch (err) {
      console.error('Error fetching conversation analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getSentimentColor = (score) => {
    if (score > 0.6) return '#4caf50';
    if (score < 0.4) return '#f44336';
    return '#ff9800';
  };

  const getSentimentLabel = (score) => {
    if (score > 0.6) return 'Positive';
    if (score < 0.4) return 'Negative';
    return 'Neutral';
  };

  if (loading && !analytics) {
    return (
      <div className="conversation-analytics-modal">
        <div className="conversation-analytics-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-analytics-modal">
      <div className="conversation-analytics-container">
        <div className="analytics-header">
          <h2>📈 Conversation Insights</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="analytics-content">
          <div className="time-range-selector">
            <button 
              className={timeRange === '7d' ? 'active' : ''}
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </button>
            <button 
              className={timeRange === '30d' ? 'active' : ''}
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </button>
            <button 
              className={timeRange === 'all' ? 'active' : ''}
              onClick={() => setTimeRange('all')}
            >
              All Time
            </button>
          </div>

          <div className="metrics-overview">
            <div className="metric-box">
              <div className="metric-icon">💬</div>
              <div className="metric-value">{analytics?.totalMessages || 0}</div>
              <div className="metric-label">Total Messages</div>
            </div>

            <div className="metric-box">
              <div className="metric-icon">⏱️</div>
              <div className="metric-value">{formatTime(analytics?.avgResponseTime || 0)}</div>
              <div className="metric-label">Avg Response Time</div>
            </div>

            <div className="metric-box">
              <div className="metric-icon">📊</div>
              <div className="metric-value">{analytics?.messagesPerDay || 0}</div>
              <div className="metric-label">Messages/Day</div>
            </div>

            <div className="metric-box">
              <div className="metric-icon">🎭</div>
              <div 
                className="metric-value"
                style={{ color: getSentimentColor(analytics?.sentimentScore || 0.5) }}
              >
                {getSentimentLabel(analytics?.sentimentScore || 0.5)}
              </div>
              <div className="metric-label">Overall Sentiment</div>
            </div>
          </div>

          <div className="frequency-chart">
            <h3>Message Frequency</h3>
            <div className="frequency-graph">
              {analytics?.frequencyData?.map((point, idx) => {
                const maxCount = Math.max(...analytics.frequencyData.map(p => p.count));
                return (
                  <div key={idx} className="frequency-bar">
                    <div 
                      className="bar-fill"
                      style={{ height: `${(point.count / maxCount) * 100}%` }}
                      title={`${point.date}: ${point.count} messages`}
                    />
                    <span className="bar-date">{point.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="activity-heatmap">
            <h3>Active Hours</h3>
            <div className="heatmap-grid">
              {Array.from({ length: 7 }, (_, day) => (
                <div key={day} className="heatmap-day">
                  <span className="day-label">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]}
                  </span>
                  <div className="day-hours">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const intensity = analytics?.activityHeatmap?.[day]?.[hour] || 0;
                      return (
                        <div 
                          key={hour}
                          className="hour-cell"
                          style={{ 
                            background: `rgba(102, 126, 234, ${intensity / 100})`,
                            opacity: intensity > 0 ? 1 : 0.15
                          }}
                          title={`${hour}:00 - ${intensity} msgs`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="participant-stats">
            <h3>Participant Statistics</h3>
            <div className="participants-list">
              {analytics?.participants?.map((participant, idx) => (
                <div key={idx} className="participant-row">
                  <div className="participant-info">
                    <div className="participant-avatar">
                      {participant.name?.[0] || '?'}
                    </div>
                    <span className="participant-name">{participant.name}</span>
                  </div>
                  <div className="participant-metrics">
                    <div className="participant-stat">
                      <span className="stat-number">{participant.messagesSent}</span>
                      <span className="stat-label">Sent</span>
                    </div>
                    <div className="participant-stat">
                      <span className="stat-number">{formatTime(participant.avgResponseTime)}</span>
                      <span className="stat-label">Response</span>
                    </div>
                    <div className="participant-stat">
                      <span className="stat-number">{participant.mediaShared}</span>
                      <span className="stat-label">Media</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="word-cloud-section">
            <h3>Most Used Words</h3>
            <div className="word-cloud">
              {analytics?.topWords?.map((word, idx) => {
                const size = 1 + (word.count / analytics.topWords[0].count) * 2;
                return (
                  <span 
                    key={idx}
                    className="word-item"
                    style={{ fontSize: `${size}rem` }}
                    title={`${word.count} occurrences`}
                  >
                    {word.word}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="media-breakdown">
            <h3>Media Shared</h3>
            <div className="media-types">
              <div className="media-type">
                <div className="media-icon">🖼️</div>
                <div className="media-count">{analytics?.mediaBreakdown?.images || 0}</div>
                <div className="media-label">Images</div>
              </div>
              <div className="media-type">
                <div className="media-icon">🎥</div>
                <div className="media-count">{analytics?.mediaBreakdown?.videos || 0}</div>
                <div className="media-label">Videos</div>
              </div>
              <div className="media-type">
                <div className="media-icon">🎵</div>
                <div className="media-count">{analytics?.mediaBreakdown?.audio || 0}</div>
                <div className="media-label">Audio</div>
              </div>
              <div className="media-type">
                <div className="media-icon">📎</div>
                <div className="media-count">{analytics?.mediaBreakdown?.files || 0}</div>
                <div className="media-label">Files</div>
              </div>
            </div>
          </div>

          <div className="insights-section">
            <h3>💡 Insights</h3>
            <div className="insights-list">
              {analytics?.insights?.map((insight, idx) => (
                <div key={idx} className="insight-item">
                  <span className="insight-icon">{insight.icon}</span>
                  <span className="insight-text">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationAnalytics;
