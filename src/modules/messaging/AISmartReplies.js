import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import './AISmartReplies.css';

const AISmartReplies = ({ chatId, messageId, onSelectReply }) => {
  const { apiCall } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    if (messageId) {
      loadSuggestions();
    }
  }, [messageId]);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall('post', `/messaging/ai/replies/generate`, {
        chatId,
        messageId,
      });

      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
    } catch (err) {
      console.error('Failed to load AI suggestions:', err);
      setError('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = async (suggestion) => {
    setSelectedSuggestion(suggestion.id);
    onSelectReply(suggestion.text);

    // Rate the suggestion (optional background task)
    try {
      await apiCall('post', `/messaging/ai/replies/${suggestion.replyId}/rate`, {
        suggestionId: suggestion.id,
        rating: 5, // Default positive rating
      });
    } catch (err) {
      console.error('Failed to rate suggestion:', err);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#28a745'; // Green
    if (confidence >= 0.6) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="ai-suggestions-loading">
        <div className="loading-spinner"></div>
        <p>Generating smart replies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-suggestions-error">
        <p>{error}</p>
        <button onClick={loadSuggestions} className="btn-retry">
          Try Again
        </button>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="ai-smart-replies">
      <div className="suggestions-header">
        <span className="ai-icon">🤖</span>
        <span className="header-text">Smart Replies</span>
        <button
          className="btn-refresh"
          onClick={loadSuggestions}
          title="Generate new suggestions"
        >
          🔄
        </button>
      </div>

      <div className="suggestions-list">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`suggestion-item ${
              selectedSuggestion === suggestion.id ? 'selected' : ''
            }`}
            onClick={() => handleSelectSuggestion(suggestion)}
          >
            <div className="suggestion-content">
              <p className="suggestion-text">{suggestion.text}</p>
              <div className="suggestion-meta">
                <span
                  className="confidence-indicator"
                  style={{ backgroundColor: getConfidenceColor(suggestion.confidence) }}
                  title={`Confidence: ${getConfidenceLabel(suggestion.confidence)}`}
                >
                  {getConfidenceLabel(suggestion.confidence)}
                </span>
                <span className="tone-badge">{suggestion.tone}</span>
              </div>
            </div>
            <button className="btn-use-suggestion">
              Use
            </button>
          </div>
        ))}
      </div>

      <div className="suggestions-footer">
        <p className="disclaimer">
          AI-generated suggestions • Rate them to improve future responses
        </p>
      </div>
    </div>
  );
};

export default AISmartReplies;