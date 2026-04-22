import React, { useState, useRef, useEffect } from 'react';

const MultiSelectFilter = ({ label, options, selected = [], onChange, placeholder = 'Select options...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const handleToggle = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="multi-select-filter" ref={containerRef}>
      <label className="multi-select-label">{label}</label>
      <button
        type="button"
        className="multi-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="multi-select-placeholder">
          {selected.length > 0
            ? `${selected.length} selected`
            : placeholder}
        </span>
        <span className="multi-select-arrow">▼</span>
      </button>

      {selected.length > 0 && (
        <div className="multi-select-tags">
          {selected.map(tag => (
            <span key={tag} className="multi-select-tag">
              {tag}
              <button
                type="button"
                className="multi-select-tag-remove"
                onClick={() => handleToggle(tag)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="multi-select-dropdown">
          <div className="multi-select-actions">
            <button
              type="button"
              className="multi-select-action-btn"
              onClick={handleSelectAll}
            >
              {selected.length === options.length ? 'Deselect All' : 'Select All'}
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                className="multi-select-action-btn"
                onClick={handleClearAll}
              >
                Clear
              </button>
            )}
          </div>
          <div className="multi-select-options">
            {options.map(option => (
              <label key={option} className="multi-select-option">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => handleToggle(option)}
                  className="multi-select-checkbox"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilter;
