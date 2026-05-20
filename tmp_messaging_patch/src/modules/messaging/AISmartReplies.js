import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import './AISmartReplies.css';

const FALLBACK_REPLIES = [
  { id: 'fallback-1', text: 'Okay, I will check and update you.' },
  { id: 'fallback-2', text: 'Can you please share more details?' },
  { id: 'fallback-3', text: 'Sure, let us discuss this.' },
];

const getSuggestionText = (suggestion) => {
  if (typeof suggestion === 'string') return suggestion;
  return suggestion?.text || suggestion?.reply || suggestion?.message || '';
};

const AISmartReplies = ({ chatId, messageId, onSelectReply, language = 'en', disabled = false }) => {
  const { apiCall } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState('');

  const normalizedSuggestions = useMemo(
    () =>
      (suggestions || [])
        .map((suggestion, index) => ({
          id: suggestion?.id || `suggestion-${index}`,
          text: getSuggestionText(suggestion),
          tone: suggestion?.tone || '',
          replyId: suggestion?.replyId,
        }))
        .filter((suggestion) => suggestion.text.trim()),
    [suggestions]
  );

  useEffect(() => {
    let isMounted = true;

    if (!chatId || !messageId || disabled) {
      setSuggestions([]);
      return () => {};
    }

    const loadSuggestions = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await apiCall('/messaging/ai/replies/generate', 'POST', {
          chatId,
          messageId,
          language,
        });

        const nextSuggestions = (response?.suggestions || []).map((suggestion, index) => ({
          id: suggestion?.id || `ai-${index}`,
          text: getSuggestionText(suggestion),
          tone: suggestion?.tone || '',
          replyId: response?.replyId || suggestion?.replyId,
        }));

        if (isMounted) {
          setSuggestions(nextSuggestions.length ? nextSuggestions : FALLBACK_REPLIES);
        }
      } catch (loadError) {
        console.error('Failed to load AI suggestions:', loadError);
        if (isMounted) {
          setError('Smart replies are using quick suggestions now.');
          setSuggestions(FALLBACK_REPLIES);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [apiCall, chatId, messageId, language, disabled]);

  const handleSelectSuggestion = async (suggestion) => {
    if (!suggestion.text.trim()) return;

    setSelectedSuggestion(suggestion.id);
    onSelectReply(suggestion.text);

    if (!suggestion.replyId) return;

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
    return <div className="ai-smart-replies ai-smart-replies-status">Generating smart replies...</div>;
  }

  if (normalizedSuggestions.length === 0) return null;

  return (
    <div className="ai-smart-replies-wrap">
      {error && <span className="ai-smart-replies-hint">{error}</span>}

      <div className="ai-smart-replies" role="list" aria-label="AI smart reply suggestions">
        {normalizedSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            className={`suggestion-chip ${selectedSuggestion === suggestion.id ? 'selected' : ''}`}
            onClick={() => handleSelectSuggestion(suggestion)}
            title={suggestion.tone ? `Tone: ${suggestion.tone}` : 'Use this smart reply'}
          >
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AISmartReplies;
