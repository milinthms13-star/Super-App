import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import './AISmartReplies.css';

const AISmartReplies = ({ chatId, messageId, onSelectReply }) => {
  const { apiCall } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState('');

  useEffect(() => {
    if (!chatId || !messageId) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiCall('/messaging/ai/replies/generate', 'POST', {
          chatId,
          messageId,
        });

        setSuggestions(
          (response?.suggestions || []).map((suggestion) => ({
            ...suggestion,
            replyId: response?.replyId,
          }))
        );
      } catch (loadError) {
        console.error('Failed to load AI suggestions:', loadError);
        setError('Failed to generate smart replies.');
      } finally {
        setLoading(false);
      }
    };

    loadSuggestions();
  }, [apiCall, chatId, messageId]);

  const handleSelectSuggestion = async (suggestion) => {
    setSelectedSuggestion(suggestion.id);
    onSelectReply(suggestion.text);

    if (!suggestion.replyId) {
      return;
    }

    try {
      await apiCall(`/messaging/ai/replies/${suggestion.replyId}/rate`, 'POST', {
        suggestionId: suggestion.id,
        rating: 5,
      });
    } catch (ratingError) {
      console.error('Failed to rate suggestion:', ratingError);
    }
  };

  if (loading) {
    return (
      <div className="ai-smart-replies ai-smart-replies-status">
        Generating smart replies...
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-smart-replies ai-smart-replies-status error">
        {error}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="ai-smart-replies" role="list" aria-label="AI smart reply suggestions">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          className={`suggestion-chip ${selectedSuggestion === suggestion.id ? 'selected' : ''}`}
          onClick={() => handleSelectSuggestion(suggestion)}
        >
          <span>{suggestion.text}</span>
        </button>
      ))}
    </div>
  );
};

export default AISmartReplies;
