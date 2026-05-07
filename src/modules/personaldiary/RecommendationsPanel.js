/**
 * AI Recommendations Panel Component
 * Displays personalized AI-generated recommendations and insights
 * Phase 7 - AI-Powered Recommendations
 */

import React, { useState, useEffect } from 'react';
import './Phase7Components.css';

const RecommendationsPanel = ({ token, apiUrl = 'http://localhost:5000', onError }) => {
  const [recommendations, setRecommendations] = useState({
    focusAreas: [],
    wellnessActions: [],
    writingEnhancements: [],
    moodInsights: [],
    consistencyTips: [],
    motivationBoosts: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState('focusAreas');
  const [daysBack, setDaysBack] = useState(90);

  useEffect(() => {
    fetchRecommendations();
  }, [daysBack]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${apiUrl}/api/diary/phase7/recommendations?daysBack=${daysBack}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const message = err.message || 'Failed to load recommendations';
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const renderFocusAreas = () => {
    if (recommendations.focusAreas.length === 0) {
      return <div className="empty-state">No focus areas identified. Keep writing!</div>;
    }

    return recommendations.focusAreas.map((area, idx) => (
      <div key={idx} className={`recommendation-item priority-${area.priority}`}>
        <div className="recommendation-header">
          <h4>{area.title}</h4>
          <span className="priority-badge">{area.priority}</span>
        </div>
        <p className="description">{area.description}</p>
        <div className="action-button">{area.action}</div>
      </div>
    ));
  };

  const renderWellnessActions = () => {
    return recommendations.wellnessActions.map((action, idx) => (
      <div key={idx} className="wellness-action">
        <div className="action-title">{action.title}</div>
        <div className="action-details">
          <p>{action.description}</p>
          <div className="timeframe">⏱️ {action.timeframe}</div>
          <div className="impact">📈 {action.estimatedImpact}</div>
          <div className="difficulty">📊 {action.difficulty}</div>
        </div>
      </div>
    ));
  };

  const renderMotivationBoosts = () => {
    return recommendations.motivationBoosts.map((boost, idx) => (
      <div key={idx} className="motivation-card">
        <div className="motivation-title">{boost.title}</div>
        <div className="motivation-message">{boost.message}</div>
        <div className="celebration">{boost.celebration}</div>
      </div>
    ));
  };

  if (loading) {
    return <div className="loading-spinner">Loading recommendations...</div>;
  }

  return (
    <div className="recommendations-panel">
      <div className="panel-header">
        <h2>✨ AI Recommendations</h2>
        <div className="days-filter">
          <select value={daysBack} onChange={(e) => setDaysBack(parseInt(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>
          <button onClick={fetchRecommendations} className="refresh-btn">🔄 Refresh</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="recommendations-tabs">
        {[
          { key: 'focusAreas', label: '🎯 Focus Areas', count: recommendations.focusAreas.length },
          { key: 'wellnessActions', label: '💪 Wellness', count: recommendations.wellnessActions.length },
          { key: 'motivationBoosts', label: '🎉 Motivation', count: recommendations.motivationBoosts.length }
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab ${expandedSection === tab.key ? 'active' : ''}`}
            onClick={() => setExpandedSection(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span className="count">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="recommendations-content">
        {expandedSection === 'focusAreas' && renderFocusAreas()}
        {expandedSection === 'wellnessActions' && renderWellnessActions()}
        {expandedSection === 'motivationBoosts' && renderMotivationBoosts()}
      </div>

      <div className="panel-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default RecommendationsPanel;
