import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProductSearch.css';

const ProductSearch = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch suggestions on input change
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get('/api/products/suggestions', {
          params: { q: query, limit: 8 }
        });
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearch = (searchTerm = query) => {
    if (searchTerm.trim().length >= 2) {
      onSearch(searchTerm);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div className="product-search">
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search products, categories..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowSuggestions(true)}
        />
        <button
          className="search-button"
          onClick={() => handleSearch()}
          disabled={query.length < 2}
        >
          <span className="search-icon">🔍</span>
        </button>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="suggestion-icon">🔍</span>
                <span className="suggestion-text">{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions && query.length >= 2 && suggestions.length === 0 && !loading && (
          <div className="suggestions-dropdown">
            <div className="suggestion-item disabled">
              No suggestions found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSearch;
