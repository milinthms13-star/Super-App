/**
 * AI Recommendations Panel Component
 * Displays personalized AI-generated recommendations and insights
 * Phase 7 - AI-Powered Recommendations
 */

import React, { useState, useEffect } from 'react';
import './Phase7Components.css';
import { getRecommendations, getFocusAreas, getWellnessActions, getMotivationBoosts } from '../../services/diaryService';

const RecommendationsPanel = ({ onClose, onError }) => {
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

      const response = await getRecommendations(daysBack);

      if (response.success) {
        setRecommendations(response.data || {
          focusAreas: [],
          wellnessActions: [],
          writingEnhancements: [],
          moodInsights: [],
          consistencyTips: [],
          motivationBoosts: []
        });
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (err) {
      const message = err.message || 'Failed to load recommendations';
      setError(message);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const renderFocusAreas = () => {
    if (!recommendations.focusAreas || recommendations.focusAreas.length === 0) {
      return <div className="empty-state">✅ No focus areas identified. Keep up the great work!</div>;
    }

    return recommendations.focusAreas.map((area, idx) => (
      <div key={idx} className={`recommendation-item priority-${area.priority || 'medium'}`}>
        <div className="recommendation-header">
          <h4>{area.title}</h4>
          <span className={`priority-badge priority-${area.priority || 'medium'}`}>
            {area.priority || 'medium'}
          </span>
        </div>
        <p className="description">{area.description}</p>
        {area.actions && area.actions.length > 0 && (
          <div className="actions-list">
            {area.actions.map((action, actionIdx) => (
              <div key={actionIdx} className="action-item">
                ✓ {action}
              </div>
            ))}
          </div>
        )}
        {area.category && (
          <span className="category-badge">{area.category}</span>
        )}
      </div>
    ));
  };

  const renderWellnessActions = () => {
    if (!recommendations.wellnessActions || recommendations.wellnessActions.length === 0) {
      return <div className="empty-state">💪 Your wellness metrics look good!</div>;
    }

    return recommendations.wellnessActions.map((action, idx) => (
      <div key={idx} className="wellness-action">
        <div className="action-title">
          <span className="action-icon">💪</span>
          {action.title}
        </div>
        <div className="action-details">
          <p>{action.description}</p>
          {action.timeframe && (
            <div className="timeframe">⏱️ Timeframe: {action.timeframe}</div>
          )}
          {action.impact !== undefined && (
            <div className="impact">
              📈 Impact: {action.impact}%
            </div>
          )}
        </div>
      </div>
    ));
  };

  const renderMotivationBoosts = () => {
    if (!recommendations.motivationBoosts || recommendations.motivationBoosts.length === 0) {
      return <div className="empty-state">🎉 Keep writing to unlock motivation boosts!</div>;
    }

    return recommendations.motivationBoosts.map((boost, idx) => (
      <div key={idx} className="motivation-card">
        <div className="motivation-emoji">{boost.emoji || '🎉'}</div>
        <div className="motivation-content">
          <div className="motivation-type">{boost.type || 'encouragement'}</div>
          <div className="motivation-message">{boost.message}</div>
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="recommendations-panel loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-panel">
      <div className="panel-header">
        <h2>✨ AI Recommendations</h2>
        <div className="header-actions">
          <div className="days-filter">
            <label>Analysis Period:</label>
            <select value={daysBack} onChange={(e) => setDaysBack(parseInt(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
            </select>
          </div>
          <button onClick={fetchRecommendations} className="refresh-btn" disabled={loading}>
            🔄 Refresh
          </button>
          {onClose && (
            <button onClick={onClose} className="close-btn" title="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={fetchRecommendations} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      <div className="recommendations-tabs">
        {[
          { key: 'focusAreas', label: '🎯 Focus Areas', count: recommendations.focusAreas?.length || 0 },
          { key: 'wellnessActions', label: '💪 Wellness', count: recommendations.wellnessActions?.length || 0 },
          { key: 'motivationBoosts', label: '🎉 Motivation', count: recommendations.motivationBoosts?.length || 0 }
        ].map(tab => (
          <button
            key={tab.key}
            className={`tab ${expandedSection === tab.key ? 'active' : ''}`}
            onClick={() => setExpandedSection(tab.key)}
          >
            {tab.label}
            {tab.count > 0 && <span className="count-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="recommendations-content">
        {expandedSection === 'focusAreas' && renderFocusAreas()}
        {expandedSection === 'wellnessActions' && renderWellnessActions()}
        {expandedSection === 'motivationBoosts' && renderMotivationBoosts()}
      </div>

      {recommendations.severity && (
        <div className={`severity-indicator severity-${recommendations.severity}`}>
          <span className="severity-label">Priority Level:</span>
          <span className="severity-value">{recommendations.severity}</span>
        </div>
      )}

      <div className="panel-footer">
        <p className="update-time">
          Last updated: {recommendations.timestamp 
            ? new Date(recommendations.timestamp).toLocaleString() 
            : new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default RecommendationsPanel;
