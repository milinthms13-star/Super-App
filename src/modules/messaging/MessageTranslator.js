import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MessageTranslator.css';

const MessageTranslator = ({ message, onClose }) => {
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');

  const languages = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'te', name: 'Telugu' },
    { code: 'ta', name: 'Tamil' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'kn', name: 'Kannada' },
    { code: 'mr', name: 'Marathi' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'ur', name: 'Urdu' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' }
  ];

  useEffect(() => {
    if (message.content) {
      handleTranslate();
    }
  }, [targetLanguage]);

  const handleTranslate = async () => {
    if (!message.content) {
      setError('No content to translate');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/messaging/v4/translate', {
        text: message.content,
        sourceLanguage: sourceLanguage === 'auto' ? undefined : sourceLanguage,
        targetLanguage: targetLanguage
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setTranslatedText(response.data.translatedText);
        if (response.data.detectedLanguage) {
          setDetectedLanguage(response.data.detectedLanguage);
        }
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err.response?.data?.error || 'Translation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLanguageName = (code) => {
    const lang = languages.find(l => l.code === code);
    return lang?.name || code;
  };

  const handleCopyTranslation = () => {
    navigator.clipboard.writeText(translatedText);
    alert('Translation copied to clipboard!');
  };

  const handleSwapLanguages = () => {
    if (sourceLanguage !== 'auto') {
      const temp = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(temp);
    }
  };

  return (
    <div className="message-translator-modal">
      <div className="translator-container">
        <div className="translator-header">
          <h2>🌐 Translate Message</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="translator-content">
          <div className="language-selector">
            <div className="language-dropdown">
              <label>From</label>
              <select 
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                disabled={loading}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              {detectedLanguage && sourceLanguage === 'auto' && (
                <span className="detected-lang">
                  Detected: {getLanguageName(detectedLanguage)}
                </span>
              )}
            </div>

            <button 
              className="swap-btn"
              onClick={handleSwapLanguages}
              disabled={loading || sourceLanguage === 'auto'}
              title="Swap languages"
            >
              ⇄
            </button>

            <div className="language-dropdown">
              <label>To</label>
              <select 
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={loading}
              >
                {languages.filter(l => l.code !== 'auto').map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="translation-display">
            <div className="original-message">
              <div className="message-label">
                <span>Original</span>
                <button 
                  className="toggle-btn"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal ? '👁️ Hide' : '👁️ Show'}
                </button>
              </div>
              {showOriginal && (
                <div className="message-text">
                  {message.content}
                </div>
              )}
            </div>

            <div className="translated-message">
              <div className="message-label">
                <span>Translation</span>
                {translatedText && (
                  <button 
                    className="copy-btn"
                    onClick={handleCopyTranslation}
                  >
                    📋 Copy
                  </button>
                )}
              </div>
              {loading ? (
                <div className="loading-translation">
                  <div className="spinner"></div>
                  <p>Translating...</p>
                </div>
              ) : translatedText ? (
                <div className="message-text translated">
                  {translatedText}
                </div>
              ) : (
                <div className="empty-translation">
                  <p>Translation will appear here</p>
                </div>
              )}
            </div>
          </div>

          <div className="translator-actions">
            <button 
              onClick={handleTranslate}
              disabled={loading}
              className="btn-translate"
            >
              {loading ? 'Translating...' : '🔄 Translate Again'}
            </button>
          </div>

          <div className="translation-info">
            <h4>💡 Translation Tips</h4>
            <ul>
              <li>Translations are powered by advanced AI</li>
              <li>Auto-detect works for most languages</li>
              <li>Technical terms may not translate perfectly</li>
              <li>Context matters - idioms may vary</li>
            </ul>
          </div>

          <div className="auto-translate-setting">
            <label className="checkbox-label">
              <input type="checkbox" />
              Auto-translate all messages in this chat
            </label>
            <p className="setting-note">
              Messages will be automatically translated to {getLanguageName(targetLanguage)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageTranslator;
