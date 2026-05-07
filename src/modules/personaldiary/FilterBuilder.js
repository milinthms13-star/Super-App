import React, { useState, useEffect } from 'react';
import './FilterBuilder.css';

/**
 * Advanced Filter Builder Component
 * Allows users to create, manage, and apply complex filters
 */
const DiaryFilterBuilder = ({ onApplyFilter, onSaveFilter, onLoadFilter }) => {
  // Filter state
  const [filterName, setFilterName] = useState('');
  const [filters, setFilters] = useState({
    tags: [],
    tagMatchType: 'any', // any, all, none
    dateRange: { from: '', to: '' },
    sentiment: [],
    minWords: '',
    maxWords: '',
    status: '', // draft, published, archived
    minVersions: '',
  });

  // UI state
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterSuggestions, setFilterSuggestions] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadFilters, setShowLoadFilters] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Fetch saved filters and suggestions on mount
  useEffect(() => {
    fetchSavedFilters();
    fetchFilterSuggestions();
  }, []);

  const fetchSavedFilters = async () => {
    try {
      const response = await fetch('/api/diary/filters/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setSavedFilters(data.data || []);
    } catch (error) {
      console.error('Error fetching saved filters:', error);
    }
  };

  const fetchFilterSuggestions = async () => {
    try {
      const response = await fetch('/api/diary/filters/suggestions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setFilterSuggestions(data.data || {});
    } catch (error) {
      console.error('Error fetching filter suggestions:', error);
    }
  };

  // Update filters
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateDateRange = (type, value) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: value,
      },
    }));
  };

  // Tag management
  const toggleTag = (tag) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const toggleSentiment = (sentiment) => {
    setFilters((prev) => ({
      ...prev,
      sentiment: prev.sentiment.includes(sentiment)
        ? prev.sentiment.filter((s) => s !== sentiment)
        : [...prev.sentiment, sentiment],
    }));
  };

  // Apply filter
  const applyFilter = async () => {
    setIsApplying(true);
    try {
      const payload = {
        ...filters,
        limit: 100,
        skip: 0,
      };

      const response = await fetch('/api/diary/filter/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        onApplyFilter?.(data.data);
        alert(`Filter applied! Found ${data.data.total} entries.`);
      } else {
        alert('Failed to apply filter: ' + data.message);
      }
    } catch (error) {
      console.error('Error applying filter:', error);
      alert('Failed to apply filter');
    } finally {
      setIsApplying(false);
    }
  };

  // Save filter
  const saveFilter = async () => {
    if (!filterName.trim()) {
      alert('Please enter a filter name');
      return;
    }

    try {
      const response = await fetch('/api/diary/filters/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: filterName,
          config: filters,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFilterName('');
        setShowSaveDialog(false);
        fetchSavedFilters();
        onSaveFilter?.(data.data);
        alert('Filter saved successfully!');
      } else {
        alert('Failed to save filter: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving filter:', error);
      alert('Failed to save filter');
    }
  };

  // Load filter
  const loadFilter = async (filterId) => {
    try {
      const response = await fetch(`/api/diary/filters/${filterId}/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        onLoadFilter?.(data.data);
        setShowLoadFilters(false);
        alert(`Loaded saved filter!`);
      } else {
        alert('Failed to load filter: ' + data.message);
      }
    } catch (error) {
      console.error('Error loading filter:', error);
      alert('Failed to load filter');
    }
  };

  // Delete filter
  const deleteFilter = async (filterId) => {
    if (!window.confirm('Are you sure you want to delete this filter?')) {
      return;
    }

    try {
      const response = await fetch(`/api/diary/filters/${filterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchSavedFilters();
        alert('Filter deleted');
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      alert('Failed to delete filter');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      tags: [],
      tagMatchType: 'any',
      dateRange: { from: '', to: '' },
      sentiment: [],
      minWords: '',
      maxWords: '',
      status: '',
      minVersions: '',
    });
  };

  // Render filter summary
  const renderFilterSummary = () => {
    const parts = [];

    if (filters.tags.length > 0) {
      parts.push(`Tags (${filters.tagMatchType}): ${filters.tags.join(', ')}`);
    }

    if (filters.sentiment.length > 0) {
      parts.push(`Sentiment: ${filters.sentiment.join(', ')}`);
    }

    if (filters.dateRange.from || filters.dateRange.to) {
      parts.push(
        `Dates: ${filters.dateRange.from || 'any'} to ${filters.dateRange.to || 'now'}`
      );
    }

    if (filters.minWords || filters.maxWords) {
      parts.push(
        `Words: ${filters.minWords || '0'} - ${filters.maxWords || '∞'}`
      );
    }

    if (filters.status) {
      parts.push(`Status: ${filters.status}`);
    }

    if (filters.minVersions) {
      parts.push(`Min Versions: ${filters.minVersions}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
  };

  return (
    <div className="filter-builder-container">
      {/* Header */}
      <div className="filter-builder-header">
        <h2>📊 Advanced Filter Builder</h2>
        <div className="header-actions">
          <button
            className="load-filters-btn"
            onClick={() => setShowLoadFilters(!showLoadFilters)}
          >
            📂 Load Saved ({savedFilters.length})
          </button>
          <button
            className="reset-filters-btn-header"
            onClick={resetFilters}
          >
            🔄 Reset All
          </button>
        </div>
      </div>

      {/* Filter Summary */}
      <div className="filter-summary">
        <p>{renderFilterSummary()}</p>
      </div>

      {/* Saved Filters Dropdown */}
      {showLoadFilters && savedFilters.length > 0 && (
        <div className="saved-filters-panel">
          <h3>Saved Filters</h3>
          <div className="saved-filters-list">
            {savedFilters.map((filter) => (
              <div key={filter._id} className="saved-filter-item">
                <div className="filter-info">
                  <h4>{filter.name}</h4>
                  <p className="filter-usage">Used {filter.useCount || 0} times</p>
                </div>
                <div className="filter-actions">
                  <button
                    className="load-btn"
                    onClick={() => loadFilter(filter._id)}
                  >
                    Load
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteFilter(filter._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Builders */}
      <div className="filter-builders">
        {/* Date Range Filter */}
        <section className="filter-section">
          <h3>📅 Date Range</h3>
          <div className="date-inputs">
            <label>
              From:
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => updateDateRange('from', e.target.value)}
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => updateDateRange('to', e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Tags Filter */}
        <section className="filter-section">
          <h3>🏷️ Tags</h3>
          <div className="tag-match-type">
            <label>
              <input
                type="radio"
                name="tagMatch"
                value="any"
                checked={filters.tagMatchType === 'any'}
                onChange={(e) => updateFilter('tagMatchType', e.target.value)}
              />
              Any of these tags (OR)
            </label>
            <label>
              <input
                type="radio"
                name="tagMatch"
                value="all"
                checked={filters.tagMatchType === 'all'}
                onChange={(e) => updateFilter('tagMatchType', e.target.value)}
              />
              All of these tags (AND)
            </label>
            <label>
              <input
                type="radio"
                name="tagMatch"
                value="none"
                checked={filters.tagMatchType === 'none'}
                onChange={(e) => updateFilter('tagMatchType', e.target.value)}
              />
              None of these tags
            </label>
          </div>

          {/* Suggested Tags */}
          {filterSuggestions?.topTags && filterSuggestions.topTags.length > 0 && (
            <div className="suggested-tags">
              <p className="suggestion-label">Popular tags:</p>
              <div className="tags-grid">
                {filterSuggestions.topTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    className={`tag-suggestion ${
                      filters.tags.includes(tag) ? 'selected' : ''
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Tags */}
          {filters.tags.length > 0 && (
            <div className="selected-tags">
              <p className="selection-label">Selected tags:</p>
              <div className="tags-display">
                {filters.tags.map((tag) => (
                  <span key={tag} className="selected-tag">
                    {tag}
                    <button
                      className="remove-tag"
                      onClick={() => toggleTag(tag)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Sentiment Filter */}
        <section className="filter-section">
          <h3>😊 Sentiment</h3>
          <div className="sentiment-options">
            {['positive', 'neutral', 'negative'].map((sentiment) => (
              <label key={sentiment} className="sentiment-option">
                <input
                  type="checkbox"
                  checked={filters.sentiment.includes(sentiment)}
                  onChange={(e) =>
                    e.target.checked ? toggleSentiment(sentiment) : toggleSentiment(sentiment)
                  }
                />
                <span className={`sentiment-badge sentiment-${sentiment}`}>
                  {sentiment}
                </span>
                {filterSuggestions?.sentiments?.[sentiment] && (
                  <span className="count">
                    ({filterSuggestions.sentiments[sentiment]})
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Word Count Filter */}
        <section className="filter-section">
          <h3>📝 Word Count</h3>
          <div className="word-count-inputs">
            <label>
              Minimum words:
              <input
                type="number"
                min="0"
                placeholder="0"
                value={filters.minWords}
                onChange={(e) => updateFilter('minWords', e.target.value)}
              />
            </label>
            <label>
              Maximum words:
              <input
                type="number"
                min="0"
                placeholder="No limit"
                value={filters.maxWords}
                onChange={(e) => updateFilter('maxWords', e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* Status Filter */}
        <section className="filter-section">
          <h3>📌 Status</h3>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="status-select"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft Only</option>
            <option value="published">Published Only</option>
            <option value="archived">Archived Only</option>
          </select>
        </section>

        {/* Versions Filter */}
        <section className="filter-section">
          <h3>🔄 Minimum Versions</h3>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={filters.minVersions}
            onChange={(e) => updateFilter('minVersions', e.target.value)}
          />
          <p className="help-text">Show only entries with at least this many versions</p>
        </section>
      </div>

      {/* Actions */}
      <div className="filter-actions-section">
        <button
          className="apply-filter-btn"
          onClick={applyFilter}
          disabled={isApplying}
        >
          {isApplying ? '⏳ Applying...' : '✓ Apply Filter'}
        </button>
        <button
          className="save-filter-btn"
          onClick={() => setShowSaveDialog(true)}
        >
          💾 Save Filter
        </button>
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="save-dialog-overlay">
          <div className="save-dialog">
            <h3>Save Filter</h3>
            <input
              type="text"
              placeholder="Enter filter name (e.g., 'Happy Summer Entries')"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="filter-name-input"
            />
            <div className="dialog-actions">
              <button
                className="save-confirm-btn"
                onClick={saveFilter}
              >
                Save
              </button>
              <button
                className="save-cancel-btn"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryFilterBuilder;
