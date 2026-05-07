import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Search.css';

/**
 * Advanced Diary Search Component
 * Supports full-text search, autocomplete, search history, and filtering
 */
const DiarySearch = ({ onSearch, onFilter, onHistorySelect }) => {
  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tags: [],
    dateRange: { from: '', to: '' },
    sentiment: [],
    minWords: '',
    maxWords: '',
  });

  // UI state
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'results'
  const [selectedResult, setSelectedResult] = useState(null);
  const debounceTimer = useRef(null);

  // Fetch search suggestions on query change
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // Fetch suggestions from API
  const fetchSuggestions = async (searchQuery) => {
    try {
      const response = await fetch(
        `/api/diary/search/suggestions?query=${encodeURIComponent(searchQuery)}&type=all`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json();
      setSuggestions(data.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  // Fetch search history on component mount
  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    try {
      const response = await fetch('/api/diary/search/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setSearchHistory(data.data || []);
    } catch (error) {
      console.error('Error fetching search history:', error);
    }
  };

  // Perform search
  const performSearch = async (searchQuery = query, page = 1) => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);
    setActiveTab('results');

    try {
      const payload = {
        query: searchQuery,
        limit: 20,
        skip: (page - 1) * 20,
        tags: filters.tags,
        dateFrom: filters.dateRange.from,
        dateTo: filters.dateRange.to,
        sentiment: filters.sentiment,
      };

      const response = await fetch('/api/diary/search/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.data);
        setCurrentPage(page);
        onSearch?.(data.data);
      } else {
        alert('Search failed: ' + data.message);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to perform search');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    performSearch(suggestion.text);
  };

  // Handle history click
  const handleHistoryClick = (historyItem) => {
    setQuery(historyItem.query);
    setShowHistory(false);
    performSearch(historyItem.query);
    onHistorySelect?.(historyItem);
  };

  // Clear search history
  const clearHistory = async () => {
    try {
      const response = await fetch('/api/diary/search/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSearchHistory([]);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Apply filters
  const applyFilters = async () => {
    try {
      setIsSearching(true);
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
        setResults(data.data);
        setActiveTab('results');
        setShowFilters(false);
        onFilter?.(data.data);
      } else {
        alert('Filtering failed: ' + data.message);
      }
    } catch (error) {
      console.error('Filtering error:', error);
      alert('Failed to apply filters');
    } finally {
      setIsSearching(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      tags: [],
      dateRange: { from: '', to: '' },
      sentiment: [],
      minWords: '',
      maxWords: '',
    });
  };

  // Render search result item
  const renderResultItem = (result) => (
    <div
      key={result._id}
      className="search-result-item"
      onClick={() => setSelectedResult(result)}
    >
      <div className="result-header">
        <h4 className="result-title">{result.title}</h4>
        <span className="result-date">
          {new Date(result.createdAt).toLocaleDateString()}
        </span>
      </div>
      <div className="result-meta">
        {result.sentiment && (
          <span className={`sentiment-badge sentiment-${result.sentiment}`}>
            {result.sentiment}
          </span>
        )}
        {result.tags && result.tags.length > 0 && (
          <div className="result-tags">
            {result.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-badge">
                {tag}
              </span>
            ))}
            {result.tags.length > 3 && (
              <span className="tag-more">+{result.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
      {result.preview && (
        <p className="result-preview">{result.preview.substring(0, 150)}...</p>
      )}
    </div>
  );

  return (
    <div className="diary-search-container">
      {/* Search Header */}
      <div className="search-header">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="Search your diary entries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
          />
          <button
            className="search-btn"
            onClick={() => performSearch()}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className={`suggestion-icon suggestion-${suggestion.type}`}>
                  {suggestion.type === 'tag' && '#'}
                  {suggestion.type === 'title' && '📝'}
                  {suggestion.type === 'keyword' && '🔍'}
                </span>
                <div className="suggestion-content">
                  <span className="suggestion-text">{suggestion.text}</span>
                  <span className="suggestion-category">{suggestion.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div className="history-dropdown">
            <div className="history-header">
              <h4>Recent Searches</h4>
              <button
                className="clear-history-btn"
                onClick={clearHistory}
              >
                Clear
              </button>
            </div>
            {searchHistory.map((item, idx) => (
              <div
                key={idx}
                className="history-item"
                onClick={() => handleHistoryClick(item)}
              >
                <span className="history-query">{item.query}</span>
                <span className="history-count">{item.count} searches</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="filter-toggle">
        <button
          className="filter-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          🔽 Advanced Filters {filters.tags.length > 0 || filters.sentiment.length > 0 ? `(${filters.tags.length + filters.sentiment.length})` : ''}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-section">
            <label>Date Range</label>
            <div className="date-range">
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, from: e.target.value },
                  })
                }
              />
              <span>to</span>
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, to: e.target.value },
                  })
                }
              />
            </div>
          </div>

          <div className="filter-section">
            <label>Sentiment</label>
            <div className="sentiment-checkboxes">
              {['positive', 'neutral', 'negative'].map((sentiment) => (
                <label key={sentiment} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.sentiment.includes(sentiment)}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        sentiment: e.target.checked
                          ? [...filters.sentiment, sentiment]
                          : filters.sentiment.filter((s) => s !== sentiment),
                      })
                    }
                  />
                  <span className={`sentiment-badge sentiment-${sentiment}`}>
                    {sentiment}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label>Word Count Range</label>
            <div className="word-count-range">
              <input
                type="number"
                placeholder="Min"
                value={filters.minWords}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minWords: e.target.value,
                  })
                }
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxWords}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxWords: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="filter-actions">
            <button
              className="apply-filters-btn"
              onClick={applyFilters}
              disabled={isSearching}
            >
              Apply Filters
            </button>
            <button className="reset-filters-btn" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {activeTab === 'results' && results && (
        <div className="search-results">
          <div className="results-header">
            <h3>
              Results {results.total > 0 && `(${results.total} found)`}
            </h3>
            <button
              className="back-to-search-btn"
              onClick={() => setActiveTab('search')}
            >
              ← Back
            </button>
          </div>

          {results.results && results.results.length > 0 ? (
            <>
              <div className="results-list">
                {results.results.map((result) => renderResultItem(result))}
              </div>

              {/* Pagination */}
              {results.total > 20 && (
                <div className="pagination">
                  <button
                    className="prev-btn"
                    onClick={() => performSearch(query, results.page - 1)}
                    disabled={results.page === 1}
                  >
                    ← Previous
                  </button>
                  <span className="page-info">
                    Page {results.page} of {Math.ceil(results.total / 20)}
                  </span>
                  <button
                    className="next-btn"
                    onClick={() => performSearch(query, results.page + 1)}
                    disabled={results.page >= Math.ceil(results.total / 20)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-results">
              <p>No entries found matching your search.</p>
              <button onClick={() => setActiveTab('search')}>Try a new search</button>
            </div>
          )}
        </div>
      )}

      {/* Selected Result Detail */}
      {selectedResult && (
        <div className="result-detail-modal">
          <div className="modal-content">
            <button
              className="close-btn"
              onClick={() => setSelectedResult(null)}
            >
              ✕
            </button>
            <h2>{selectedResult.title}</h2>
            <div className="detail-meta">
              <span className="detail-date">
                {new Date(selectedResult.createdAt).toLocaleString()}
              </span>
              {selectedResult.sentiment && (
                <span className={`sentiment-badge sentiment-${selectedResult.sentiment}`}>
                  {selectedResult.sentiment}
                </span>
              )}
            </div>
            {selectedResult.tags && selectedResult.tags.length > 0 && (
              <div className="detail-tags">
                {selectedResult.tags.map((tag) => (
                  <span key={tag} className="tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {selectedResult.preview && (
              <div className="detail-preview">
                <p>{selectedResult.preview}</p>
              </div>
            )}
            <div className="detail-actions">
              <button
                className="view-full-btn"
                onClick={() => {
                  // Navigate to full entry view
                  window.location.href = `/diary/${selectedResult._id}`;
                }}
              >
                View Full Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiarySearch;
