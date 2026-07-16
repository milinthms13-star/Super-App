import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './SavedSearches.css';

const SavedSearches = ({ onSearchApply }) => {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingSearch, setEditingSearch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    filters: {},
    notifyOnNewMatches: true,
    notificationFrequency: 'daily',
  });

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/matrimonial/saved-searches`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      setSavedSearches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingSearch) {
        await axios.put(
          `${API_BASE_URL}/matrimonial/saved-searches/${editingSearch._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/matrimonial/saved-searches`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken')}`,
            },
          }
        );
      }

      setShowSaveModal(false);
      setEditingSearch(null);
      setFormData({
        name: '',
        description: '',
        filters: {},
        notifyOnNewMatches: true,
        notificationFrequency: 'daily',
      });
      fetchSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
      alert('Failed to save search');
    }
  };

  const handleUseSearch = async (search) => {
    try {
      await axios.post(
        `${API_BASE_URL}/matrimonial/saved-searches/${search._id}/use`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      onSearchApply?.(search.filters, search.sortBy);
    } catch (error) {
      console.error('Failed to use search:', error);
    }
  };

  const handleDelete = async (searchId) => {
    if (!confirm('Delete this saved search?')) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/matrimonial/saved-searches/${searchId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      fetchSavedSearches();
    } catch (error) {
      console.error('Failed to delete search:', error);
      alert('Failed to delete search');
    }
  };

  const handleEdit = (search) => {
    setEditingSearch(search);
    setFormData({
      name: search.name,
      description: search.description || '',
      filters: search.filters,
      notifyOnNewMatches: search.notifyOnNewMatches,
      notificationFrequency: search.notificationFrequency,
    });
    setShowSaveModal(true);
  };

  const getFilterSummary = (filters) => {
    const parts = [];
    if (filters.ageMin && filters.ageMax) {
      parts.push(`${filters.ageMin}-${filters.ageMax} yrs`);
    }
    if (filters.religion && filters.religion !== 'Any') {
      parts.push(filters.religion);
    }
    if (filters.location && filters.location !== 'Any') {
      parts.push(filters.location);
    }
    if (filters.education && filters.education !== 'Any') {
      parts.push(filters.education);
    }
    return parts.join(' • ') || 'All filters';
  };

  if (loading) {
    return <div className="saved-searches-loading">Loading saved searches...</div>;
  }

  return (
    <div className="saved-searches">
      <div className="saved-searches-header">
        <h3>Saved Searches</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowSaveModal(true)}
        >
          + New Search
        </button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="saved-searches-empty">
          <p>No saved searches yet</p>
          <p className="hint">Save your favorite search filters for quick access</p>
        </div>
      ) : (
        <div className="saved-searches-list">
          {savedSearches.map((search) => (
            <div key={search._id} className="saved-search-item">
              <div className="search-item-main">
                <h4>{search.name}</h4>
                {search.description && (
                  <p className="search-description">{search.description}</p>
                )}
                <div className="search-filters">
                  {getFilterSummary(search.filters)}
                </div>
                <div className="search-meta">
                  <span>Used {search.useCount || 0} times</span>
                  {search.newMatchesSinceLastCheck > 0 && (
                    <span className="new-matches-badge">
                      {search.newMatchesSinceLastCheck} new matches!
                    </span>
                  )}
                  {search.notifyOnNewMatches && (
                    <span className="notify-badge">
                      🔔 {search.notificationFrequency} alerts
                    </span>
                  )}
                </div>
              </div>

              <div className="search-item-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleUseSearch(search)}
                >
                  Use
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleEdit(search)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(search._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save/Edit Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSearch ? 'Edit' : 'Save'} Search</h3>
            
            <div className="form-group">
              <label>Search Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mumbai Professionals"
                maxLength={50}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                maxLength={200}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.notifyOnNewMatches}
                  onChange={(e) => setFormData({
                    ...formData,
                    notifyOnNewMatches: e.target.checked,
                  })}
                />
                Notify me when new matches are found
              </label>
            </div>

            {formData.notifyOnNewMatches && (
              <div className="form-group">
                <label>Notification Frequency</label>
                <select
                  value={formData.notificationFrequency}
                  onChange={(e) => setFormData({
                    ...formData,
                    notificationFrequency: e.target.value,
                  })}
                >
                  <option value="instant">Instant</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowSaveModal(false);
                  setEditingSearch(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!formData.name.trim()}
              >
                {editingSearch ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedSearches;
