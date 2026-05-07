import React, { useState, useEffect } from 'react';
import {
  getAISummary,
  getMoodInsights,
  getWellnessRecommendations,
  extractActionItems
} from '../services/diaryService';
import './AIInsights.css';

/**
 * AI Insights Component
 * Displays AI-generated summaries, mood analysis, wellness recommendations, and action items
 */
const AIInsights = ({ entryId = null, period = 'month' }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [moodInsights, setMoodInsights] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [actionItems, setActionItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  // Fetch AI summary
  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
    }
  }, [activeTab, entryId, period]);

  // Fetch mood insights
  useEffect(() => {
    if (activeTab === 'mood') {
      fetchMoodInsights();
    }
  }, [activeTab]);

  // Fetch wellness recommendations
  useEffect(() => {
    if (activeTab === 'wellness') {
      fetchWellnessRecommendations();
    }
  }, [activeTab]);

  // Fetch action items if entry ID provided
  useEffect(() => {
    if (activeTab === 'actions' && entryId) {
      fetchActionItems();
    }
  }, [activeTab, entryId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAISummary({ period, entryId });
      setSummary(data.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch summary');
      console.error('Error fetching summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoodInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMoodInsights({ daysBack: 30 });
      setMoodInsights(data.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch mood insights');
      console.error('Error fetching mood insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWellnessRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWellnessRecommendations({ daysBack: 30 });
      setRecommendations(data.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch recommendations');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await extractActionItems(entryId);
      setActionItems(data.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch action items');
      console.error('Error fetching action items:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="ai-insights-container">
      <div className="ai-insights-header">
        <h2>🤖 AI Insights</h2>
        <p className="ai-insights-subtitle">Powered by OpenAI</p>
      </div>

      {/* Tab Navigation */}
      <div className="ai-tabs">
        <button
          className={`ai-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📝 Summary
        </button>
        <button
          className={`ai-tab ${activeTab === 'mood' ? 'active' : ''}`}
          onClick={() => setActiveTab('mood')}
        >
          😊 Mood
        </button>
        <button
          className={`ai-tab ${activeTab === 'wellness' ? 'active' : ''}`}
          onClick={() => setActiveTab('wellness')}
        >
          💪 Wellness
        </button>
        {entryId && (
          <button
            className={`ai-tab ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            ✓ Actions
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="ai-loading">
          <div className="ai-spinner"></div>
          <p>Analyzing your diary entries...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="ai-error">
          <p>⚠️ {error}</p>
          <p className="ai-error-hint">Make sure AI features are enabled in your settings.</p>
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && summary && !loading && (
        <div className="ai-content ai-summary-content">
          {summary.summary ? (
            <>
              <div className="ai-summary-box">
                <h3>📊 Summary</h3>
                <p className="ai-summary-text">{summary.summary}</p>
              </div>
              {summary.digest && (
                <div className="ai-digest">
                  <h4>Weekly Highlights</h4>
                  {summary.digest.weeklyHighlight && (
                    <div className="ai-digest-item">
                      <strong>✨ Highlight:</strong>
                      <p>{summary.digest.weeklyHighlight}</p>
                    </div>
                  )}
                  {summary.digest.keyThemes && summary.digest.keyThemes.length > 0 && (
                    <div className="ai-digest-item">
                      <strong>🎯 Key Themes:</strong>
                      <div className="ai-tags">
                        {summary.digest.keyThemes.map((theme, idx) => (
                          <span key={idx} className="ai-tag">{theme}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {summary.digest.moodTrend && (
                    <div className="ai-digest-item">
                      <strong>📈 Mood Trend:</strong>
                      <p className={`ai-trend ai-trend-${summary.digest.moodTrend}`}>
                        {summary.digest.moodTrend.charAt(0).toUpperCase() + summary.digest.moodTrend.slice(1)}
                      </p>
                    </div>
                  )}
                  {summary.digest.suggestedReflection && (
                    <div className="ai-digest-item ai-reflection">
                      <strong>💭 Reflection:</strong>
                      <p className="ai-italic">{summary.digest.suggestedReflection}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="ai-no-data">Not enough entries for summary yet.</p>
          )}
        </div>
      )}

      {/* Mood Insights Tab */}
      {activeTab === 'mood' && moodInsights && !loading && (
        <div className="ai-content ai-mood-content">
          <div className="ai-mood-header">
            <h3>Emotional Patterns (Last 30 Days)</h3>
          </div>

          {moodInsights.dominantMood && (
            <div className="ai-mood-card">
              <h4>🎭 Dominant Emotion</h4>
              <div className="ai-mood-badge" data-mood={moodInsights.dominantMood}>
                {moodInsights.dominantMood.charAt(0).toUpperCase() + moodInsights.dominantMood.slice(1)}
              </div>
            </div>
          )}

          {moodInsights.sentimentScore !== undefined && (
            <div className="ai-mood-card">
              <h4>📊 Sentiment Score</h4>
              <div className="ai-sentiment-meter">
                <div
                  className="ai-sentiment-bar"
                  style={{
                    width: `${((moodInsights.sentimentScore + 1) / 2) * 100}%`,
                    backgroundColor:
                      moodInsights.sentimentScore > 0.3
                        ? '#4CAF50'
                        : moodInsights.sentimentScore < -0.3
                        ? '#F44336'
                        : '#FF9800'
                  }}
                ></div>
              </div>
              <p className="ai-sentiment-label">
                {moodInsights.sentimentScore > 0 ? 'Positive' : moodInsights.sentimentScore < 0 ? 'Negative' : 'Neutral'}
              </p>
            </div>
          )}

          {moodInsights.emotionalThemes && moodInsights.emotionalThemes.length > 0 && (
            <div className="ai-mood-card">
              <h4>🎯 Emotional Themes</h4>
              <div className="ai-tags">
                {moodInsights.emotionalThemes.map((theme, idx) => (
                  <span key={idx} className="ai-tag ai-theme-tag">{theme}</span>
                ))}
              </div>
            </div>
          )}

          {moodInsights.stressPatterns && (
            <div className="ai-mood-card ai-warning">
              <h4>⚠️ Stress Patterns</h4>
              <p>{moodInsights.stressPatterns}</p>
            </div>
          )}

          {moodInsights.improvementAreas && moodInsights.improvementAreas.length > 0 && (
            <div className="ai-mood-card">
              <h4>📈 Areas to Focus On</h4>
              <ul className="ai-list">
                {moodInsights.improvementAreas.map((area, idx) => (
                  <li key={idx}>{area}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Wellness Recommendations Tab */}
      {activeTab === 'wellness' && recommendations && !loading && (
        <div className="ai-content ai-wellness-content">
          <div className="ai-wellness-header">
            <h3>💪 Personalized Wellness Recommendations</h3>
          </div>

          {recommendations.recommendations && recommendations.recommendations.length > 0 ? (
            <div className="ai-recommendations-list">
              {recommendations.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className={`ai-recommendation-card ai-priority-${rec.priority}`}
                  onClick={() => toggleExpanded(`rec-${idx}`)}
                >
                  <div className="ai-rec-header">
                    <h4>{rec.title}</h4>
                    <span className={`ai-priority-badge ai-priority-${rec.priority}`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  {expandedItems[`rec-${idx}`] && (
                    <p className="ai-rec-description">{rec.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="ai-no-data">No recommendations available yet.</p>
          )}

          {recommendations.generalTip && (
            <div className="ai-general-tip">
              <h4>💡 General Tip</h4>
              <p>{recommendations.generalTip}</p>
            </div>
          )}
        </div>
      )}

      {/* Action Items Tab */}
      {activeTab === 'actions' && actionItems && !loading && (
        <div className="ai-content ai-actions-content">
          <div className="ai-actions-header">
            <h3>✓ Action Items</h3>
          </div>

          {actionItems.actionItems && actionItems.actionItems.length > 0 ? (
            <div className="ai-actions-list">
              {actionItems.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`ai-action-card ai-action-${item.priority}`}
                >
                  <div className="ai-action-checkbox">
                    <input type="checkbox" id={`action-${idx}`} />
                  </div>
                  <div className="ai-action-content">
                    <label htmlFor={`action-${idx}`} className="ai-action-title">
                      {item.item}
                    </label>
                    {item.deadline && (
                      <p className="ai-action-deadline">📅 {item.deadline}</p>
                    )}
                  </div>
                  <span className={`ai-action-priority ai-priority-${item.priority}`}>
                    {item.priority.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="ai-no-data">No action items found in this entry.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;
