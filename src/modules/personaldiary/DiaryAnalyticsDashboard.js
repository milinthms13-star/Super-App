import React, { useState, useEffect, useCallback } from 'react';
import diaryService from '../../services/diaryService';
import notificationService from '../../services/notificationService';
import './DiaryAnalytics.css';

/**
 * Diary Analytics Dashboard Component
 * Displays writing statistics, mood trends, wellness score, and streaks
 */
const DiaryAnalyticsDashboard = ({ userId, dateRange = 30 }) => {
  const [writingStats, setWritingStats] = useState(null);
  const [moodTrends, setMoodTrends] = useState(null);
  const [wellnessScore, setWellnessScore] = useState(null);
  const [streakInfo, setStreakInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('stats'); // stats, trends, wellness, streaks

  /**
   * Fetch all analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [statsRes, trendsRes, wellnessRes, streakRes] = await Promise.all([
        fetch('/api/diary/analytics/writing-stats?daysBack=' + dateRange, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/diary/analytics/mood-trends?daysBack=' + dateRange, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/diary/analytics/wellness-score?daysBack=' + dateRange, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/diary/streaks', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (!statsRes.ok || !trendsRes.ok || !wellnessRes.ok || !streakRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const statsData = await statsRes.json();
      const trendsData = await trendsRes.json();
      const wellnessData = await wellnessRes.json();
      const streakData = await streakRes.json();

      if (statsData.success) setWritingStats(statsData.data);
      if (trendsData.success) setMoodTrends(trendsData.data);
      if (wellnessData.success) setWellnessScore(wellnessData.data);
      if (streakData.success) setStreakInfo(streakData.data);

      notificationService.showNotification('Analytics loaded successfully', 'success');
    } catch (err) {
      setError(err.message);
      notificationService.showNotification('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="diary-analytics-container">
        <div className="diary-analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diary-analytics-container">
        <div className="diary-analytics-error">
          <p>{error}</p>
          <button onClick={fetchAnalytics}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="diary-analytics-container">
      {/* Tab Navigation */}
      <div className="diary-analytics-tabs">
        <button
          className={`diary-analytics-tab ${selectedTab === 'stats' ? 'active' : ''}`}
          onClick={() => setSelectedTab('stats')}
        >
          📊 Writing Stats
        </button>
        <button
          className={`diary-analytics-tab ${selectedTab === 'trends' ? 'active' : ''}`}
          onClick={() => setSelectedTab('trends')}
        >
          📈 Mood Trends
        </button>
        <button
          className={`diary-analytics-tab ${selectedTab === 'wellness' ? 'active' : ''}`}
          onClick={() => setSelectedTab('wellness')}
        >
          💚 Wellness Score
        </button>
        <button
          className={`diary-analytics-tab ${selectedTab === 'streaks' ? 'active' : ''}`}
          onClick={() => setSelectedTab('streaks')}
        >
          🔥 Streaks
        </button>
      </div>

      {/* Writing Stats Tab */}
      {selectedTab === 'stats' && writingStats && (
        <div className="diary-analytics-panel">
          <h3>Writing Statistics</h3>
          <div className="diary-stats-grid">
            <div className="diary-stat-card">
              <div className="diary-stat-value">{writingStats.totalEntries}</div>
              <div className="diary-stat-label">Total Entries</div>
            </div>
            <div className="diary-stat-card">
              <div className="diary-stat-value">{writingStats.totalWords.toLocaleString()}</div>
              <div className="diary-stat-label">Total Words</div>
            </div>
            <div className="diary-stat-card">
              <div className="diary-stat-value">{writingStats.avgWordsPerEntry.toFixed(0)}</div>
              <div className="diary-stat-label">Avg Words/Entry</div>
            </div>
            <div className="diary-stat-card">
              <div className="diary-stat-value">{writingStats.longestEntry}</div>
              <div className="diary-stat-label">Longest Entry</div>
            </div>
          </div>

          {/* Monthly Breakdown */}
          {Object.keys(writingStats.entriesPerMonth || {}).length > 0 && (
            <div className="diary-stats-monthly">
              <h4>Monthly Breakdown</h4>
              <table className="diary-stats-table">
                <tbody>
                  {Object.entries(writingStats.entriesPerMonth).map(([month, count]) => (
                    <tr key={month}>
                      <td className="diary-stats-month">{month}</td>
                      <td className="diary-stats-count">{count} entries</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mood Trends Tab */}
      {selectedTab === 'trends' && moodTrends && (
        <div className="diary-analytics-panel">
          <h3>Mood Trends</h3>

          {/* Mood Distribution */}
          {Object.keys(moodTrends.distribution || {}).length > 0 && (
            <div className="diary-mood-distribution">
              <h4>Mood Distribution</h4>
              <div className="diary-mood-bars">
                {Object.entries(moodTrends.distribution).map(([mood, count]) => (
                  <div key={mood} className="diary-mood-bar-container">
                    <div className="diary-mood-bar-label">{mood}</div>
                    <div className="diary-mood-bar">
                      <div
                        className={`diary-mood-bar-fill mood-${mood}`}
                        style={{
                          width: `${((count / Object.values(moodTrends.distribution).reduce((a, b) => a + b, 0)) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="diary-mood-bar-count">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mood Variability */}
          <div className="diary-mood-variability">
            <h4>Emotional Consistency</h4>
            <div className="diary-variability-indicator">
              <div className="diary-variability-gauge">
                <div
                  className="diary-variability-fill"
                  style={{
                    width: `${Math.min(100, (moodTrends.moodVariability || 0) * 2)}%`
                  }}
                ></div>
              </div>
              <p className="diary-variability-text">
                {moodTrends.moodVariability < 30
                  ? '😌 Very stable emotions'
                  : moodTrends.moodVariability < 60
                  ? '😊 Moderately variable'
                  : '🎭 Highly variable emotions'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wellness Score Tab */}
      {selectedTab === 'wellness' && wellnessScore && (
        <div className="diary-analytics-panel">
          <h3>Wellness Score</h3>

          {/* Overall Score */}
          <div className="diary-wellness-score-container">
            <div className="diary-wellness-circle">
              <div className="diary-wellness-value">{wellnessScore.score}</div>
              <div className="diary-wellness-label">Out of 100</div>
            </div>

            {/* Score Breakdown */}
            <div className="diary-wellness-breakdown">
              <div className="diary-wellness-component">
                <div className="diary-wellness-name">Writing Frequency</div>
                <div className="diary-wellness-bar">
                  <div
                    className="diary-wellness-fill"
                    style={{ width: `${wellnessScore.writingFrequency}%` }}
                  ></div>
                </div>
                <span className="diary-wellness-percent">{wellnessScore.writingFrequency}%</span>
              </div>

              <div className="diary-wellness-component">
                <div className="diary-wellness-name">Content Length</div>
                <div className="diary-wellness-bar">
                  <div
                    className="diary-wellness-fill"
                    style={{ width: `${wellnessScore.contentLength}%` }}
                  ></div>
                </div>
                <span className="diary-wellness-percent">{wellnessScore.contentLength}%</span>
              </div>

              <div className="diary-wellness-component">
                <div className="diary-wellness-name">Emotional Stability</div>
                <div className="diary-wellness-bar">
                  <div
                    className="diary-wellness-fill"
                    style={{ width: `${wellnessScore.emotionalStability}%` }}
                  ></div>
                </div>
                <span className="diary-wellness-percent">{wellnessScore.emotionalStability}%</span>
              </div>

              <div className="diary-wellness-component">
                <div className="diary-wellness-name">Consistency</div>
                <div className="diary-wellness-bar">
                  <div
                    className="diary-wellness-fill"
                    style={{ width: `${wellnessScore.consistency}%` }}
                  ></div>
                </div>
                <span className="diary-wellness-percent">{wellnessScore.consistency}%</span>
              </div>
            </div>
          </div>

          {/* Wellness Insights */}
          <div className="diary-wellness-insights">
            <p className="diary-wellness-insight-text">
              {wellnessScore.score >= 80
                ? '🌟 Excellent wellness! Keep maintaining this healthy writing habit.'
                : wellnessScore.score >= 60
                ? '😊 Good wellness. Try writing more consistently to improve further.'
                : wellnessScore.score >= 40
                ? '📚 Moderate wellness. Increase writing frequency and entry length.'
                : '💪 Getting started. Write more regularly to build this habit.'}
            </p>
          </div>
        </div>
      )}

      {/* Streaks Tab */}
      {selectedTab === 'streaks' && streakInfo && (
        <div className="diary-analytics-panel">
          <h3>Writing Streaks</h3>

          <div className="diary-streaks-container">
            <div className="diary-streak-card current-streak">
              <div className="diary-streak-flame">🔥</div>
              <div className="diary-streak-value">{streakInfo.currentStreak}</div>
              <div className="diary-streak-label">Current Streak</div>
              {streakInfo.currentStreak > 0 && (
                <div className="diary-streak-subtitle">days</div>
              )}
            </div>

            <div className="diary-streak-card longest-streak">
              <div className="diary-streak-flame">👑</div>
              <div className="diary-streak-value">{streakInfo.longestStreak}</div>
              <div className="diary-streak-label">Longest Streak</div>
              {streakInfo.longestStreak > 0 && (
                <div className="diary-streak-subtitle">days</div>
              )}
            </div>

            <div className="diary-streak-card total-days">
              <div className="diary-streak-flame">📅</div>
              <div className="diary-streak-value">{streakInfo.totalDaysWritten}</div>
              <div className="diary-streak-label">Days Written</div>
            </div>
          </div>

          {/* Milestones */}
          {streakInfo.milestonesReached && streakInfo.milestonesReached.length > 0 && (
            <div className="diary-milestones">
              <h4>🏆 Milestones Reached</h4>
              <div className="diary-milestones-list">
                {streakInfo.milestonesReached.map((milestone) => (
                  <div key={milestone} className="diary-milestone">
                    {milestone} day streak
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Entry */}
          {streakInfo.lastEntryDate && (
            <div className="diary-last-entry">
              <p>
                Last entry: {new Date(streakInfo.lastEntryDate).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <button className="diary-analytics-refresh" onClick={fetchAnalytics}>
        ↻ Refresh Data
      </button>
    </div>
  );
};

export default DiaryAnalyticsDashboard;
