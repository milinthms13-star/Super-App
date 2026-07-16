import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FilterManager.css';

const FilterManager = ({ onClose }) => {
  const [filters, setFilters] = useState([]);
  const [activeTab, setActiveTab] = useState('filters'); // 'filters' or 'new'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New filter form
  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('keyword');
  const [keywords, setKeywords] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [contentTypes, setContentTypes] = useState([]);
  const [action, setAction] = useState('mark_spam');
  const [enabled, setEnabled] = useState(true);

  const filterTypes = [
    { value: 'keyword', label: 'Keyword Filter', icon: '🔤' },
    { value: 'sender', label: 'Sender Filter', icon: '👤' },
    { value: 'content_type', label: 'Content Type', icon: '📎' },
    { value: 'link', label: 'Link Filter', icon: '🔗' },
    { value: 'spam', label: 'Spam Detection', icon: '🚫' }
  ];

  const actionTypes = [
    { value: 'mark_spam', label: 'Mark as Spam', icon: '🚫' },
    { value: 'delete', label: 'Auto Delete', icon: '🗑️' },
    { value: 'archive', label: 'Auto Archive', icon: '📦' },
    { value: 'mute', label: 'Mute Notifications', icon: '🔕' },
    { value: 'flag', label: 'Flag for Review', icon: '🚩' }
  ];

  const contentTypeOptions = ['image', 'video', 'audio', 'file', 'link', 'location'];

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/messaging/v5/filters', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFilters(response.data.filters || []);
    } catch (err) {
      console.error('Error fetching filters:', err);
      setError('Failed to load filters');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFilter = async (e) => {
    e.preventDefault();

    if (!filterName.trim()) {
      setError('Filter name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const filterConfig = {
        name: filterName,
        type: filterType,
        enabled,
        action
      };

      if (filterType === 'keyword') {
        filterConfig.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
      } else if (filterType === 'sender') {
        filterConfig.senderPattern = senderFilter;
      } else if (filterType === 'content_type') {
        filterConfig.contentTypes = contentTypes;
      }

      const response = await axios.post('/api/messaging/v5/filters', filterConfig, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        resetForm();
        setActiveTab('filters');
        fetchFilters();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create filter');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFilterName('');
    setFilterType('keyword');
    setKeywords('');
    setSenderFilter('');
    setContentTypes([]);
    setAction('mark_spam');
    setEnabled(true);
  };

  const handleToggleFilter = async (filterId, currentEnabled) => {
    setLoading(true);
    try {
      await axios.put(`/api/messaging/v5/filters/${filterId}`, {
        enabled: !currentEnabled
      }, {
        headers: { Authorization: `Bearer ${localStorage.getToken('token')}` }
      });
      fetchFilters();
    } catch (err) {
      setError('Failed to toggle filter');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilter = async (filterId) => {
    if (!window.confirm('Delete this filter?')) return;

    setLoading(true);
    try {
      await axios.delete(`/api/messaging/v5/filters/${filterId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchFilters();
    } catch (err) {
      setError('Failed to delete filter');
    } finally {
      setLoading(false);
    }
  };

  const handleExportFilters = () => {
    const dataStr = JSON.stringify(filters, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `message-filters-${Date.now()}.json`;
    link.click();
  };

  const handleImportFilters = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedFilters = JSON.parse(event.target.result);
        // Import logic here
        alert(`Importing ${importedFilters.length} filters...`);
      } catch (err) {
        setError('Invalid filter file');
      }
    };
    reader.readAsText(file);
  };

  const getFilterIcon = (type) => {
    const filter = filterTypes.find(f => f.value === type);
    return filter?.icon || '🔧';
  };

  const getActionIcon = (actionType) => {
    const act = actionTypes.find(a => a.value === actionType);
    return act?.icon || '⚙️';
  };

  const toggleContentType = (type) => {
    setContentTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="filter-manager-modal">
      <div className="filter-manager-container">
        <div className="filter-header">
          <h2>🔧 Message Filters</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="filter-tabs">
          <button 
            className={`tab ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            My Filters ({filters.length})
          </button>
          <button 
            className={`tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            Create New
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'filters' ? (
          <div className="filters-content">
            <div className="filters-toolbar">
              <button onClick={handleExportFilters} className="btn-export">
                📥 Export Filters
              </button>
              <label className="btn-import">
                📤 Import Filters
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleImportFilters}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="filters-list">
              {loading && filters.length === 0 ? (
                <div className="loading-state">Loading filters...</div>
              ) : filters.length === 0 ? (
                <div className="empty-state">
                  <p>🔧 No filters configured</p>
                  <p className="sub-text">Create your first filter to manage unwanted messages</p>
                </div>
              ) : (
                filters.map((filter) => (
                  <div key={filter._id} className={`filter-item ${!filter.enabled ? 'disabled' : ''}`}>
                    <div className="filter-icon">
                      {getFilterIcon(filter.type)}
                    </div>
                    <div className="filter-details">
                      <h3>{filter.name}</h3>
                      <div className="filter-info">
                        <span className="filter-type">{filter.type}</span>
                        <span className="filter-action">
                          {getActionIcon(filter.action)} {filter.action.replace('_', ' ')}
                        </span>
                      </div>
                      {filter.keywords && (
                        <div className="filter-keywords">
                          Keywords: {filter.keywords.join(', ')}
                        </div>
                      )}
                      <div className="filter-stats">
                        Matched: {filter.matchCount || 0} messages
                      </div>
                    </div>
                    <div className="filter-actions">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={filter.enabled}
                          onChange={() => handleToggleFilter(filter._id, filter.enabled)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <button 
                        onClick={() => handleDeleteFilter(filter._id)}
                        className="btn-delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateFilter} className="filter-form">
            <div className="form-group">
              <label>Filter Name *</label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., Block Spam Links"
                maxLength="100"
                required
              />
            </div>

            <div className="form-group">
              <label>Filter Type *</label>
              <div className="filter-type-grid">
                {filterTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    className={`type-option ${filterType === type.value ? 'active' : ''}`}
                    onClick={() => setFilterType(type.value)}
                  >
                    <span className="type-icon">{type.icon}</span>
                    <span className="type-label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {filterType === 'keyword' && (
              <div className="form-group">
                <label>Keywords (comma-separated) *</label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="spam, promotion, discount, win prize"
                  rows="3"
                  required
                />
                <span className="help-text">Messages containing these words will be filtered</span>
              </div>
            )}

            {filterType === 'sender' && (
              <div className="form-group">
                <label>Sender Pattern *</label>
                <input
                  type="text"
                  value={senderFilter}
                  onChange={(e) => setSenderFilter(e.target.value)}
                  placeholder="e.g., @spam.com or specific user ID"
                  required
                />
                <span className="help-text">Block messages from specific senders or domains</span>
              </div>
            )}

            {filterType === 'content_type' && (
              <div className="form-group">
                <label>Content Types to Filter *</label>
                <div className="content-type-grid">
                  {contentTypeOptions.map(type => (
                    <label key={type} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={contentTypes.includes(type)}
                        onChange={() => toggleContentType(type)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Action *</label>
              <div className="action-type-grid">
                {actionTypes.map(act => (
                  <button
                    key={act.value}
                    type="button"
                    className={`action-option ${action === act.value ? 'active' : ''}`}
                    onClick={() => setAction(act.value)}
                  >
                    <span className="action-icon">{act.icon}</span>
                    <span className="action-label">{act.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Enable this filter immediately
              </label>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setActiveTab('filters')}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="btn-create"
              >
                {loading ? 'Creating...' : 'Create Filter'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FilterManager;
