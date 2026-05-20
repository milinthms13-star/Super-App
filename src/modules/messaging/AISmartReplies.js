import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import './AISmartReplies.css';

const FALLBACK_REPLIES = {
  en: [
    { id: 'fallback-en-1', text: 'Okay, I will check and update you.' },
    { id: 'fallback-en-2', text: 'Can you please share more details?' },
    { id: 'fallback-en-3', text: 'Sure, let us discuss this.' },
  ],
  ml: [
    { id: 'fallback-ml-1', text: 'Shari, njan check cheythittu update cheyyam.' },
    { id: 'fallback-ml-2', text: 'Kurachu koodi details share cheyyamo?' },
    { id: 'fallback-ml-3', text: 'Athe, namukku discuss cheyyam.' },
  ],
  hi: [
    { id: 'fallback-hi-1', text: 'Thik hai, main check karke batata hu.' },
    { id: 'fallback-hi-2', text: 'Thoda aur details share kar sakte ho?' },
    { id: 'fallback-hi-3', text: 'Haan, is par baat karte hain.' },
  ],
};

const getFallbackReplies = (language = 'en') => {
  const normalizedLanguage = String(language || 'en').toLowerCase();
  return FALLBACK_REPLIES[normalizedLanguage] || FALLBACK_REPLIES.en;
};

const getSuggestionText = (suggestion) => {
  if (typeof suggestion === 'string') {
    return suggestion;
  }
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
          replyId: suggestion?.replyId || null,
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

        const generated = (response?.suggestions || []).map((suggestion, index) => ({
          id: suggestion?.id || `ai-${index}`,
          text: getSuggestionText(suggestion),
          tone: suggestion?.tone || '',
          replyId: response?.replyId || suggestion?.replyId || null,
        }));

        if (isMounted) {
          setSuggestions(generated.length > 0 ? generated : getFallbackReplies(language));
          if (response?.fallback) {
            setError('Smart replies are using quick suggestions now.');
          }
        }
      } catch (loadError) {
        console.error('Failed to load AI suggestions:', loadError);
        if (isMounted) {
          setError('Smart replies are using quick suggestions now.');
          setSuggestions(getFallbackReplies(language));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [apiCall, chatId, messageId, language, disabled]);

  const handleSelectSuggestion = async (suggestion) => {
    if (!suggestion?.text?.trim()) {
      return;
    }

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

  if (normalizedSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="ai-smart-replies-wrap">
      {error ? <span className="ai-smart-replies-hint">{error}</span> : null}
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
