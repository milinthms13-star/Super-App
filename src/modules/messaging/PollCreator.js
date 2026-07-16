import React, { useState } from 'react';
import axios from 'axios';
import './PollCreator.css';

const PollCreator = ({ chatId, onClose, onPollCreated }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [expiresIn, setExpiresIn] = useState('never');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expirationOptions = [
    { value: 'never', label: 'Never' },
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' }
  ];

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();

    const validOptions = options.filter(opt => opt.trim());
    
    if (!question.trim()) {
      setError('Please enter a poll question');
      return;
    }

    if (validOptions.length < 2) {
      setError('Please provide at least 2 options');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const expiresAt = expiresIn !== 'never' 
        ? new Date(Date.now() + getExpirationMs(expiresIn)).toISOString()
        : null;

      const response = await axios.post('/api/messaging/polls', {
        chatId,
        question,
        options: validOptions,
        allowMultiple,
        anonymous,
        expiresAt
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        if (onPollCreated) onPollCreated(response.data.poll);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const getExpirationMs = (value) => {
    const map = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    };
    return map[value] || 0;
  };

  return (
    <div className="poll-creator-modal">
      <div className="poll-creator-container">
        <div className="poll-header">
          <h2>📊 Create Poll</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleCreatePoll} className="poll-form">
          <div className="form-section">
            <label>Poll Question *</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              maxLength="200"
              required
            />
            <span className="char-count">{question.length}/200</span>
          </div>

          <div className="form-section">
            <label>Options *</label>
            <div className="options-list">
              {options.map((option, index) => (
                <div key={index} className="option-input-group">
                  <span className="option-number">{index + 1}</span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength="100"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="btn-remove-option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="btn-add-option"
              >
                + Add Option
              </button>
            )}
          </div>

          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
              />
              Allow multiple answers
            </label>
            <p className="help-text">
              Users can select more than one option
            </p>
          </div>

          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Anonymous voting
            </label>
            <p className="help-text">
              Hide who voted for which option
            </p>
          </div>

          <div className="form-section">
            <label>Poll Duration</label>
            <select 
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              {expirationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="poll-preview">
            <h3>Preview</h3>
            <div className="preview-poll">
              <div className="preview-question">{question || 'Your question here'}</div>
              <div className="preview-options">
                {options.filter(o => o.trim()).map((option, idx) => (
                  <div key={idx} className="preview-option">
                    <input 
                      type={allowMultiple ? 'checkbox' : 'radio'} 
                      disabled 
                    />
                    <span>{option}</span>
                  </div>
                ))}
              </div>
              <div className="preview-info">
                {anonymous && '🔒 Anonymous'} • {allowMultiple ? 'Multiple choice' : 'Single choice'}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-create-poll"
            >
              {loading ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PollCreator;
