import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/VersionTags.css';

/**
 * VersionTags - Manage tags for diary entry versions
 * Supports predefined tags and custom tagging
 */
const VersionTags = ({
  entryId,
  versionId,
  versionNumber,
  onClose = null,
  readOnly = false
}) => {
  const [tags, setTags] = useState([]);
  const [predefinedTags, setPredefinedTags] = useState({});
  const [selectedTag, setSelectedTag] = useState('final');
  const [customDescription, setCustomDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch tags and predefined options on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get predefined tags
        const tagsResponse = await fetch(`/api/diary/tags/predefined`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!tagsResponse.ok) throw new Error('Failed to fetch tags');
        const tagsData = await tagsResponse.json();
        setPredefinedTags(tagsData.tags || {});

        // Get version tags
        const versionTagsResponse = await fetch(
          `/api/diary/${entryId}/versions/${versionId}/tags`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (!versionTagsResponse.ok) throw new Error('Failed to fetch version tags');
        const versionTagsData = await versionTagsResponse.json();
        setTags(versionTagsData.tags || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entryId, versionId]);

  const handleAddTag = async () => {
    if (!selectedTag) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/diary/${entryId}/versions/${versionId}/tags`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            name: selectedTag,
            description: customDescription,
            reason: customDescription
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add tag');
      }

      const data = await response.json();
      setTags([...tags, data.tag]);
      setCustomDescription('');
      setShowAddForm(false);
      setSelectedTag('final');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!window.confirm('Remove this tag?')) return;

    try {
      const response = await fetch(
        `/api/diary/${entryId}/tags/${tagId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to remove tag');

      setTags(tags.filter(t => t._id !== tagId));
    } catch (err) {
      setError(err.message);
    }
  };

  const getTagIcon = (tagName) => {
    const icons = {
      'final': '✓',
      'review-ready': '👀',
      'archive': '📦',
      'important': '⭐',
      'draft': '📝',
      'shared': '🔗',
      'bookmarked': '🔖',
      'custom': '✨'
    };
    return icons[tagName] || '🏷️';
  };

  const tagConfig = predefinedTags[selectedTag] || {};

  return (
    <div className="version-tags-container">
      {/* Header */}
      <div className="tags-header">
        <h3>🏷️ Tags for v{versionNumber}</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>✕</button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="tags-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Current tags */}
      <div className="current-tags">
        {tags.length === 0 ? (
          <p className="no-tags">No tags yet</p>
        ) : (
          <div className="tags-grid">
            {tags.map(tag => (
              <div
                key={tag._id}
                className="tag-badge"
                style={{ borderColor: tag.color }}
              >
                <span className="tag-icon">{getTagIcon(tag.name)}</span>
                <span className="tag-name">{tag.name}</span>
                {!readOnly && (
                  <button
                    className="tag-remove"
                    onClick={() => handleRemoveTag(tag._id)}
                    title="Remove tag"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add tag form */}
      {!readOnly && (
        <div className="add-tag-form">
          {!showAddForm ? (
            <button
              className="btn-add-tag"
              onClick={() => setShowAddForm(true)}
              disabled={loading}
            >
              + Add Tag
            </button>
          ) : (
            <div className="tag-form-content">
              <div className="form-group">
                <label>Select Tag:</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  disabled={loading}
                >
                  {Object.entries(predefinedTags).map(([key, config]) => (
                    <option key={key} value={key}>
                      {getTagIcon(key)} {key.charAt(0).toUpperCase() + key.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {tagConfig.description && (
                <p className="tag-description">
                  {tagConfig.description}
                </p>
              )}

              <div className="form-group">
                <label>Add Reason (optional):</label>
                <input
                  type="text"
                  className="reason-input"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Why are you adding this tag?"
                  maxLength={200}
                  disabled={loading}
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-confirm"
                  onClick={handleAddTag}
                  disabled={!selectedTag || loading}
                >
                  {loading ? '⏳ Adding...' : '✓ Add Tag'}
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddForm(false);
                    setCustomDescription('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tag info */}
      <div className="tag-info-box">
        <h4>💡 About Tags</h4>
        <ul>
          <li><strong>Final:</strong> Mark as final version ready for archival</li>
          <li><strong>Review Ready:</strong> Version is ready for review or sharing</li>
          <li><strong>Important:</strong> Mark important milestones or moments</li>
          <li><strong>Bookmarked:</strong> Quick access to frequently viewed versions</li>
          <li><strong>Archived:</strong> Old versions kept for reference</li>
        </ul>
      </div>
    </div>
  );
};

export default VersionTags;
