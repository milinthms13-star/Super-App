import React, { useState, useEffect, useCallback } from 'react';
import './AnalyticsDashboard.css';

const DEFAULT_WORD_DISTRIBUTION = {
  veryShort: 0,
  short: 0,
  medium: 0,
  long: 0,
  veryLong: 0,
};

const pickNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
};

const deriveWellnessLevel = (score = 0) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score > 0) return 'Low';
  return 'Neutral';
};

const calculateEntriesPerDayAverage = (entryCount, entriesPerDay) => {
  if (typeof entriesPerDay === 'number' && Number.isFinite(entriesPerDay)) {
    return entriesPerDay;
  }

  if (!entriesPerDay || typeof entriesPerDay !== 'object') {
    return 0;
  }

  const activeDays = Object.keys(entriesPerDay).length;
  return activeDays > 0 ? entryCount / activeDays : 0;
};

const normalizeDashboardPayload = (raw = {}) => {
  const writing = raw.writing || {};
  const mood = raw.mood || {};
  const wellness = raw.wellness || {};
  const entryCount = pickNumber(writing.entryCount, writing.totalEntries);
  const totalWords = pickNumber(writing.totalWords);
  const avgWords = pickNumber(writing.avgWords, writing.avgWordsPerEntry);
  const entriesPerDayAverage = calculateEntriesPerDayAverage(
    entryCount,
    writing.entriesPerDayAverage ?? writing.entriesPerDay
  );
  const score = pickNumber(wellness.score, wellness.overallScore);

  return {
    ...raw,
    writing: {
      ...writing,
      entryCount,
      totalWords,
      avgWords,
      entriesPerDayAverage,
    },
    mood: {
      ...mood,
      moodCounts: mood.moodCounts || mood.moodDistribution || {},
    },
    wellness: {
      ...wellness,
      score,
      level: wellness.level || deriveWellnessLevel(score),
    },
  };
};

const normalizeInsightsPayload = (raw) => {
  if (Array.isArray(raw)) {
    return {
      insights: raw,
      analytics: {},
      period: null,
      message: null,
    };
  }

  if (raw && typeof raw === 'object') {
    return {
      insights: Array.isArray(raw.insights) ? raw.insights : [],
      analytics: raw.analytics || {},
      period: raw.period || null,
      message: raw.message || null,
    };
  }

  return {
    insights: [],
    analytics: {},
    period: null,
    message: null,
  };
};

const normalizeWordCountPayload = (raw = {}) => ({
  totalWords: pickNumber(raw.totalWords),
  avgWords: pickNumber(raw.avgWords),
  minWords: pickNumber(raw.minWords),
  maxWords: pickNumber(raw.maxWords),
  median: pickNumber(raw.median),
  wordDistribution: {
    ...DEFAULT_WORD_DISTRIBUTION,
    ...(raw.wordDistribution || {}),
  },
});

/**
 * Analytics Dashboard Component for Diary Module
 * Displays comprehensive statistics and insights about diary entries
 * 
 * Features:
 * - Statistics overview cards (entries, words, streak)
 * - Sentiment trend chart
 * - Mood distribution chart
 * - Tag frequency chart
 * - Writing heatmap
 * - Word count trends
 * - Wellness score gauge
 * - Monthly summary selector
 * - Date range filtering
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.token - JWT authentication token
 * @param {string} props.apiUrl - API base URL (default: http://localhost:5000)
 * @param {function} props.onError - Error callback
 * @param {function} props.onLoading - Loading state callback
 * @returns {JSX.Element} Analytics Dashboard
 */
const AnalyticsDashboard = ({ 
  token, 
  apiUrl = 'http://localhost:5000',
  onError = () => {},
  onLoading = () => {}
}) => {
  // State
  const [dashboardData, setDashboardData] = useState(null);
  const [sentimentTrend, setSentimentTrend] = useState(null);
  const [tagAnalytics, setTagAnalytics] = useState(null);
  const [wordCountAnalytics, setWordCountAnalytics] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [daysBack, setDaysBack] = useState(90);
  const [groupBy, setGroupBy] = useState('week');
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      onLoading(true);

      const response = await fetch(
        `${apiUrl}/api/diary/analytics/dashboard?daysBack=${daysBack}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(normalizeDashboardPayload(data.data));
    } catch (err) {
      setError(err.message);
      onError(err.message);
    } finally {
      setLoading(false);
      onLoading(false);
    }
  }, [token, apiUrl, daysBack, onError, onLoading]);

  // Fetch sentiment trend
  const fetchSentimentTrend = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/diary/analytics/sentiment-trend?groupBy=${groupBy}&daysBack=${daysBack}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch sentiment trend');
      const data = await response.json();
      setSentimentTrend(data.data);
    } catch (err) {
      console.error('Error fetching sentiment trend:', err);
    }
  }, [token, apiUrl, daysBack, groupBy]);

  // Fetch tag analytics
  const fetchTagAnalytics = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/diary/analytics/tags?limit=10&daysBack=${daysBack}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch tag analytics');
      const data = await response.json();
      setTagAnalytics(data.data);
    } catch (err) {
      console.error('Error fetching tag analytics:', err);
    }
  }, [token, apiUrl, daysBack]);

  // Fetch word count analytics
  const fetchWordCountAnalytics = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/diary/analytics/word-count?daysBack=${daysBack}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch word count analytics');
      const data = await response.json();
      setWordCountAnalytics(normalizeWordCountPayload(data.data));
    } catch (err) {
      console.error('Error fetching word count analytics:', err);
    }
  }, [token, apiUrl, daysBack]);

  // Fetch heatmap data
  const fetchHeatmapData = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/diary/analytics/heatmap?monthsBack=6`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch heatmap data');
      const data = await response.json();
      setHeatmapData(data.data);
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
    }
  }, [token, apiUrl]);

  // Fetch insights
  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/diary/analytics/insights?daysBack=${daysBack}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch insights');
      const data = await response.json();
      setInsights(normalizeInsightsPayload(data.data));
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  }, [token, apiUrl, daysBack]);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
    fetchSentimentTrend();
    fetchTagAnalytics();
    fetchWordCountAnalytics();
    fetchHeatmapData();
    fetchInsights();
  }, [daysBack, groupBy]);

  // Render error state
  if (error && !dashboardData) {
    return (
      <main className="analytics-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchDashboard} className="retry-button">
          Retry
        </button>
      </main>
    );
  }

  // Render loading state
  if (loading && !dashboardData) {
    return (
      <main className="analytics-loading">
        <div className="spinner"></div>
        <p>Loading your analytics...</p>
      </main>
    );
  }

  return (
    <main className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <h1>Analytics Dashboard</h1>
        <p>Insights into your diary writing patterns and emotional trends</p>
      </div>

      {/* Filters */}
      <div className="analytics-filters">
        <div className="filter-group">
          <label htmlFor="days-filter">Time Period:</label>
          <select 
            id="days-filter"
            value={daysBack} 
            onChange={(e) => setDaysBack(parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="groupby-filter">Group Sentiment By:</label>
          <select 
            id="groupby-filter"
            value={groupBy} 
            onChange={(e) => setGroupBy(e.target.value)}
            className="filter-select"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        <button 
          onClick={() => {
            fetchDashboard();
            fetchSentimentTrend();
            fetchTagAnalytics();
            fetchWordCountAnalytics();
            fetchHeatmapData();
            fetchInsights();
          }}
          className="refresh-button"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {dashboardData && (
        <div className="analytics-section">
          <h2>📈 Quick Stats</h2>
          <div className="stats-grid">
            {/* Total Entries Card */}
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <div className="stat-value">
                  {dashboardData.writing?.entryCount || 0}
                </div>
                <div className="stat-label">Total Entries</div>
                <div className="stat-detail">
                  {dashboardData.writing?.entriesPerDayAverage?.toFixed(1) || 0} per day
                </div>
              </div>
            </div>

            {/* Total Words Card */}
            <div className="stat-card">
              <div className="stat-icon">✍️</div>
              <div className="stat-content">
                <div className="stat-value">
                  {dashboardData.writing?.totalWords || 0}
                </div>
                <div className="stat-label">Total Words</div>
                <div className="stat-detail">
                  {dashboardData.writing?.avgWords?.toFixed(0) || 0} avg per entry
                </div>
              </div>
            </div>

            {/* Current Streak Card */}
            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-value">
                  {dashboardData.streak?.currentStreak || 0}
                </div>
                <div className="stat-label">Day Streak</div>
                <div className="stat-detail">
                  Best: {dashboardData.streak?.longestStreak || 0} days
                </div>
              </div>
            </div>

            {/* Wellness Score Card */}
            <div className="stat-card">
              <div className="stat-icon">💚</div>
              <div className="stat-content">
                <div className="stat-value">
                  {dashboardData.wellness?.score?.toFixed(0) || 0}%
                </div>
                <div className="stat-label">Wellness Score</div>
                <div className="stat-detail">
                  {dashboardData.wellness?.level || 'Neutral'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Section */}
      {insights && insights.insights && insights.insights.length > 0 && (
        <div className="analytics-section">
          <h2>💡 Key Insights</h2>
          <div className="insights-grid">
            {insights.insights.map((insight, index) => (
              <div 
                key={index} 
                className={`insight-card insight-${insight.severity}`}
              >
                <div className="insight-icon">
                  {insight.severity === 'positive' && '✨'}
                  {insight.severity === 'suggestion' && '💭'}
                  {insight.severity === 'info' && 'ℹ️'}
                </div>
                <p>{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood Distribution */}
      {dashboardData?.mood && (
        <div className="analytics-section">
          <h2>😊 Mood Distribution</h2>
          <div className="mood-grid">
            {dashboardData.mood.moodCounts && Object.entries(dashboardData.mood.moodCounts).map(([mood, count]) => (
              <div key={mood} className="mood-item">
                <div className="mood-label">{mood}</div>
                <div className="mood-bar">
                  <div 
                    className={`mood-fill mood-${mood.toLowerCase()}`}
                    style={{
                      width: `${Math.min(count * 10, 100)}%`
                    }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Trend */}
      {sentimentTrend && sentimentTrend.length > 0 && (
        <div className="analytics-section">
          <h2>📊 Sentiment Trend ({groupBy})</h2>
          <div className="sentiment-chart">
            {sentimentTrend.slice(-12).map((period, index) => (
              <div key={index} className="sentiment-period">
                <div className="period-label">{period.period}</div>
                <div className="sentiment-bars">
                  <div 
                    className="sentiment-bar positive"
                    style={{ height: `${period.positive}%` }}
                    title={`Positive: ${period.positive}%`}
                  ></div>
                  <div 
                    className="sentiment-bar neutral"
                    style={{ height: `${period.neutral}%` }}
                    title={`Neutral: ${period.neutral}%`}
                  ></div>
                  <div 
                    className="sentiment-bar negative"
                    style={{ height: `${period.negative}%` }}
                    title={`Negative: ${period.negative}%`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag Frequency */}
      {tagAnalytics && tagAnalytics.tagFrequency && tagAnalytics.tagFrequency.length > 0 && (
        <div className="analytics-section">
          <h2>🏷️ Top Tags</h2>
          <div className="tags-grid">
            {tagAnalytics.tagFrequency.map((tagItem, index) => (
              <div key={index} className="tag-item">
                <div className="tag-name">#{tagItem.tag}</div>
                <div className="tag-frequency">{tagItem.frequency} uses</div>
                <div className="tag-bar">
                  <div 
                    className="tag-fill"
                    style={{
                      width: `${(tagItem.frequency / tagAnalytics.tagFrequency[0].frequency) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word Count Distribution */}
      {wordCountAnalytics && (
        <div className="analytics-section">
          <h2>📏 Writing Length Distribution</h2>
          <div className="word-distribution">
            <div className="distribution-item">
              <div className="dist-label">Very Short (&lt;100)</div>
              <div className="dist-bar">
                <div className="dist-fill" style={{ width: `${(wordCountAnalytics.wordDistribution.veryShort / (Object.values(wordCountAnalytics.wordDistribution).reduce((a,b) => a+b, 1) || 1)) * 100}%` }}>
                  {wordCountAnalytics.wordDistribution.veryShort}
                </div>
              </div>
            </div>
            <div className="distribution-item">
              <div className="dist-label">Short (100-300)</div>
              <div className="dist-bar">
                <div className="dist-fill" style={{ width: `${(wordCountAnalytics.wordDistribution.short / (Object.values(wordCountAnalytics.wordDistribution).reduce((a,b) => a+b, 1) || 1)) * 100}%` }}>
                  {wordCountAnalytics.wordDistribution.short}
                </div>
              </div>
            </div>
            <div className="distribution-item">
              <div className="dist-label">Medium (300-600)</div>
              <div className="dist-bar">
                <div className="dist-fill" style={{ width: `${(wordCountAnalytics.wordDistribution.medium / (Object.values(wordCountAnalytics.wordDistribution).reduce((a,b) => a+b, 1) || 1)) * 100}%` }}>
                  {wordCountAnalytics.wordDistribution.medium}
                </div>
              </div>
            </div>
            <div className="distribution-item">
              <div className="dist-label">Long (600-1000)</div>
              <div className="dist-bar">
                <div className="dist-fill" style={{ width: `${(wordCountAnalytics.wordDistribution.long / (Object.values(wordCountAnalytics.wordDistribution).reduce((a,b) => a+b, 1) || 1)) * 100}%` }}>
                  {wordCountAnalytics.wordDistribution.long}
                </div>
              </div>
            </div>
            <div className="distribution-item">
              <div className="dist-label">Very Long (1000+)</div>
              <div className="dist-bar">
                <div className="dist-fill" style={{ width: `${(wordCountAnalytics.wordDistribution.veryLong / (Object.values(wordCountAnalytics.wordDistribution).reduce((a,b) => a+b, 1) || 1)) * 100}%` }}>
                  {wordCountAnalytics.wordDistribution.veryLong}
                </div>
              </div>
            </div>
          </div>
          <div className="word-stats">
            <div className="stat">Total: <strong>{wordCountAnalytics.totalWords.toLocaleString()}</strong> words</div>
            <div className="stat">Average: <strong>{wordCountAnalytics.avgWords.toFixed(0)}</strong> words/entry</div>
            <div className="stat">Median: <strong>{wordCountAnalytics.median}</strong> words</div>
          </div>
        </div>
      )}

      {/* Writing Heatmap */}
      {heatmapData && Object.keys(heatmapData).length > 0 && (
        <div className="analytics-section">
          <h2>📅 Writing Activity Heatmap (6 months)</h2>
          <div className="heatmap-container">
            <div className="heatmap-grid">
              {Object.entries(heatmapData)
                .sort((a, b) => new Date(a[0]) - new Date(b[0]))
                .map(([date, count]) => {
                  const activityCount = Number.isFinite(Number(count)) ? Number(count) : 0;

                  return (
                    <div
                      key={date}
                      className="heatmap-cell"
                      style={{
                        backgroundColor: getHeatmapColor(activityCount),
                        opacity: Math.min(activityCount / 3, 1)
                      }}
                      title={`${date}: ${activityCount} entry(ies)`}
                    ></div>
                  );
                })}
            </div>
          </div>
          <div className="heatmap-legend">
            <span>Less active</span>
            <div className="legend-gradient"></div>
            <span>More active</span>
          </div>
        </div>
      )}

      {/* Data Summary */}
      {dashboardData && (
        <div className="analytics-footer">
          <p>📊 Analytics for the last {daysBack} days</p>
          <p className="text-muted">Last updated: {new Date().toLocaleString()}</p>
        </div>
      )}
    </main>
  );
};

/**
 * Helper function to get heatmap color based on activity level
 */
function getHeatmapColor(count) {
  if (count === 0) return '#ebedf0';
  if (count === 1) return '#c6e48b';
  if (count === 2) return '#7bc96f';
  if (count === 3) return '#239a3b';
  return '#196127';
}

export default AnalyticsDashboard;
