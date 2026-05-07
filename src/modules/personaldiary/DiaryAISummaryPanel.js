import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/DiaryAISummary.css';

/**
 * DiaryAISummaryPanel - Displays AI-generated summary of diary entries
 * Features: Week/Month summary, key themes, mood analysis, highlights, action items
 */
const DiaryAISummaryPanel = ({ userId, dateRange = 30, onClose }) => {
  const [summary, setSummary] = useState(null);
  const [actionItems, setActionItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [copyFeedback, setCopyFeedback] = useState('');

  const fetchSummary = useCallback(
    async (period) => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');

        // Fetch summary
        const summaryRes = await fetch(
          `/api/diary/ai/summary?period=${period}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!summaryRes.ok) throw new Error('Failed to fetch summary');
        const summaryData = await summaryRes.json();

        // Fetch action items
        const itemsRes = await fetch(
          `/api/diary/ai/action-items?daysBack=${
            period === 'week' ? 7 : period === 'month' ? 30 : 7
          }`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!itemsRes.ok) throw new Error('Failed to fetch action items');
        const itemsData = await itemsRes.json();

        setSummary(summaryData.data || summaryData);
        setActionItems(
          itemsData.data?.actionItems ||
            (itemsData.actionItems ? itemsData : [])
        );
      } catch (err) {
        setError(err.message || 'Failed to load summary');
        console.error('Error fetching summary:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchSummary(selectedPeriod);
  }, [selectedPeriod, fetchSummary]);

  const handleDownloadMarkdown = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/diary/ai/summary/markdown?period=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) throw new Error('Failed to download markdown');
      const data = await res.json();

      // Create and download file
      const element = document.createElement('a');
      const file = new Blob([data.data.markdown], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = data.data.filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      setError('Failed to download markdown');
    }
  };

  const handleCopySummary = () => {
    if (summary?.summary) {
      navigator.clipboard.writeText(summary.summary);
      setCopyFeedback('Copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  if (loading) {
    return (
      <div className="diary-ai-summary-container">
        <div className="diary-ai-loading">
          <div className="spinner"></div>
          <p>Generating AI summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diary-ai-summary-container">
        <div className="diary-ai-error">
          <p>❌ {error}</p>
          <button
            className="diary-ai-retry-btn"
            onClick={() => fetchSummary(selectedPeriod)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="diary-ai-summary-container">
      {/* Header */}
      <div className="diary-ai-summary-header">
        <h2>📝 AI Summary</h2>
        <div className="diary-ai-period-selector">
          <button
            className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('week')}
          >
            Week
          </button>
          <button
            className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('month')}
          >
            Month
          </button>
        </div>
      </div>

      {/* Main Summary */}
      <div className="diary-ai-main-summary">
        <div className="summary-text-box">
          <p className="summary-text">{summary?.summary}</p>
        </div>
        <div className="summary-actions">
          <button className="action-btn copy-btn" onClick={handleCopySummary}>
            📋 Copy
          </button>
          <button
            className="action-btn download-btn"
            onClick={handleDownloadMarkdown}
          >
            📥 Download MD
          </button>
          <button className="action-btn refresh-btn" onClick={() => fetchSummary(selectedPeriod)}>
            🔄 Refresh
          </button>
        </div>
        {copyFeedback && <div className="copy-feedback">{copyFeedback}</div>}
      </div>

      {/* Entry Count & Stats */}
      <div className="diary-ai-stats">
        <div className="stat-card">
          <div className="stat-label">Entries</div>
          <div className="stat-value">{summary?.entryCount || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mood</div>
          <div className="stat-value">{summary?.moodSummary}</div>
        </div>
      </div>

      {/* Key Themes */}
      {summary?.keyThemes && summary.keyThemes.length > 0 && (
        <div className="diary-ai-section">
          <h3>🎯 Key Themes</h3>
          <div className="theme-tags">
            {summary.keyThemes.map((theme, idx) => (
              <span key={idx} className="theme-tag">
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {summary?.highlights && summary.highlights.length > 0 && (
        <div className="diary-ai-section">
          <h3>⭐ Highlights</h3>
          <div className="highlights-list">
            {summary.highlights.map((highlight, idx) => (
              <div key={idx} className="highlight-item">
                <div className="highlight-icon">
                  {highlight.type === 'detailed' && '📖'}
                  {highlight.type === 'positive' && '✨'}
                  {highlight.type === 'multi-topic' && '🏷️'}
                </div>
                <div className="highlight-content">
                  <h4>{highlight.title}</h4>
                  <p>
                    {new Date(highlight.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems && actionItems.length > 0 && (
        <div className="diary-ai-section">
          <h3>✓ Action Items</h3>
          <div className="action-items-list">
            {actionItems.map((item, idx) => (
              <div key={idx} className="action-item">
                <input
                  type="checkbox"
                  className="action-checkbox"
                  id={`action-${idx}`}
                />
                <label htmlFor={`action-${idx}`} className="action-text">
                  {item.item}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Time */}
      <div className="diary-ai-footer">
        <p className="generated-time">
          Generated: {new Date(summary?.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default DiaryAISummaryPanel;
