import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BookmarksView.css';

const BookmarksView = ({ onClose, onJumpToMessage }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);

  const categories = ['all', 'important', 'reference', 'todo', 'personal', 'work'];
  
  useEffect(() => {
    fetchBookmarks();
  }, []);

  useEffect(() => {
    filterBookmarks();
  }, [bookmarks, searchQuery, selectedCategory, selectedTags]);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/messaging/v4/bookmarks', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookmarks(response.data.bookmarks || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const filterBookmarks = () => {
    let filtered = [...bookmarks];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(b => b.category === selectedCategory);
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(b => 
        b.tags && b.tags.some(tag => selectedTags.includes(tag))
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.message?.content?.toLowerCase().includes(query) ||
        b.note?.toLowerCase().includes(query) ||
        b.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredBookmarks(filtered);
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    if (!window.confirm('Remove this bookmark?')) return;

    try {
      await axios.delete(`/api/messaging/v4/bookmarks/${bookmarkId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBookmarks();
    } catch (err) {
      setError('Failed to remove bookmark');
    }
  };

  const handleUpdateCategory = async (bookmarkId, newCategory) => {
    try {
      await axios.put(`/api/messaging/v4/bookmarks/${bookmarkId}`, {
        category: newCategory
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBookmarks();
    } catch (err) {
      setError('Failed to update category');
    }
  };

  const handleExportBookmarks = () => {
    const dataStr = JSON.stringify(filteredBookmarks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookmarks-${Date.now()}.json`;
    link.click();
  };

  const getCategoryIcon = (category) => {
    const icons = {
      important: '⭐',
      reference: '📚',
      todo: '✅',
      personal: '💭',
      work: '💼',
      all: '🔖'
    };
    return icons[category] || '🔖';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allTags = [...new Set(bookmarks.flatMap(b => b.tags || []))];

  return (
    <div className="bookmarks-view-modal">
      <div className="bookmarks-view-container">
        <div className="bookmarks-header">
          <h2>🔖 Saved Messages</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="bookmarks-content">
          <div className="bookmarks-toolbar">
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button onClick={handleExportBookmarks} className="btn-export">
              📥 Export
            </button>
          </div>

          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {getCategoryIcon(cat)} {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {allTags.length > 0 && (
            <div className="tag-filters">
              <span className="filter-label">Tags:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div className="bookmarks-stats">
            <span className="stat">
              {filteredBookmarks.length} of {bookmarks.length} bookmarks
            </span>
          </div>

          <div className="bookmarks-list">
            {loading ? (
              <div className="loading-state">Loading bookmarks...</div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔖</div>
                <p>No bookmarks found</p>
                <p className="sub-text">
                  {searchQuery || selectedCategory !== 'all' || selectedTags.length > 0
                    ? 'Try adjusting your filters'
                    : 'Long-press any message to bookmark it'}
                </p>
              </div>
            ) : (
              filteredBookmarks.map((bookmark) => (
                <div key={bookmark._id} className="bookmark-item">
                  <div className="bookmark-category">
                    {getCategoryIcon(bookmark.category)}
                  </div>
                  <div className="bookmark-content">
                    <div className="bookmark-header">
                      <span className="sender-name">
                        {bookmark.message?.senderId?.name || 'Unknown'}
                      </span>
                      <span className="bookmark-date">
                        {formatDate(bookmark.createdAt)}
                      </span>
                    </div>
                    <div className="message-text">
                      {bookmark.message?.content || '[Media message]'}
                    </div>
                    {bookmark.note && (
                      <div className="bookmark-note">
                        📝 {bookmark.note}
                      </div>
                    )}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                      <div className="bookmark-tags">
                        {bookmark.tags.map((tag, idx) => (
                          <span key={idx} className="tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bookmark-actions">
                    <select
                      value={bookmark.category}
                      onChange={(e) => handleUpdateCategory(bookmark._id, e.target.value)}
                      className="category-select"
                      title="Change category"
                    >
                      {categories.filter(c => c !== 'all').map(cat => (
                        <option key={cat} value={cat}>
                          {getCategoryIcon(cat)} {cat}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={() => {
                        if (onJumpToMessage) {
                          onJumpToMessage(bookmark.message._id);
                        }
                        onClose();
                      }}
                      className="btn-jump"
                      title="Jump to message"
                    >
                      🔍
                    </button>
                    <button 
                      onClick={() => handleRemoveBookmark(bookmark._id)}
                      className="btn-remove"
                      title="Remove bookmark"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookmarksView;
