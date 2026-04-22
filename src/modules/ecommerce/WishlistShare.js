import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../utils/api';
import '../../styles/Ecommerce.css';

const WishlistShare = () => {
  const { currentUser } = useApp();
  const [shares, setShares] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    wishlistItems: [],
    sharedWith: [],
    message: '',
    isPublic: false,
    expiresAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    fetchShares();
  }, [currentUser]);

  const fetchShares = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/wishlist-share/user/list`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setShares(response.data.data || []);
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  const handleCreateShare = async () => {
    if (formData.wishlistItems.length === 0) {
      alert('Please add items to share');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/wishlist-share/create`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      setShares([response.data.data, ...shares]);
      setShareLink(response.data.data.shareId);
      setFormData({
        wishlistItems: [],
        sharedWith: [],
        message: '',
        isPublic: false,
        expiresAt: '',
      });
      alert('Wishlist shared successfully!');
    } catch (error) {
      alert('Error creating share: ' + error.message);
    } finally {
      setLoading(false);
      setShowForm(false);
    }
  };

  const handleDeleteShare = async (shareId) => {
    if (window.confirm('Delete this share?')) {
      try {
        await axios.delete(`${API_BASE_URL}/wishlist-share/${shareId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        });
        setShares(shares.filter((s) => s.shareId !== shareId));
      } catch (error) {
        alert('Error deleting share: ' + error.message);
      }
    }
  };

  return (
    <div className="ecommerce-feature">
      <h2>📋 Wishlist Sharing</h2>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Create New Share
        </button>
      ) : (
        <div className="feature-form">
          <h3>Share Your Wishlist</h3>

          <div className="form-group">
            <label>Add Items to Share:</label>
            <input type="text" placeholder="Enter product names (comma separated)" />
          </div>

          <div className="form-group">
            <label>Share With (emails):</label>
            <input
              type="text"
              placeholder="Enter emails (comma separated)"
              value={formData.sharedWith.map((s) => s.email).join(', ')}
              onChange={(e) => {
                const emails = e.target.value.split(',').map((email) => ({
                  email: email.trim(),
                  name: '',
                }));
                setFormData({ ...formData, sharedWith: emails });
              }}
            />
          </div>

          <div className="form-group">
            <label>Message:</label>
            <textarea
              placeholder="Add a personal message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              Make Public
            </label>
          </div>

          <div className="form-group">
            <label>Expires At:</label>
            <input
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreateShare} disabled={loading}>
              {loading ? 'Creating...' : 'Share Wishlist'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>

          {shareLink && (
            <div className="success-message">
              <p>Share Link: {window.location.origin}/wishlist/{shareLink}</p>
            </div>
          )}
        </div>
      )}

      <div className="feature-list">
        <h3>Your Shares ({shares.length})</h3>
        {shares.length === 0 ? (
          <p>No shares yet</p>
        ) : (
          <div className="share-items">
            {shares.map((share) => (
              <div key={share.shareId} className="share-card">
                <div className="share-header">
                  <h4>Shared with {share.sharedWith.length} people</h4>
                  <span className={`share-status ${share.isPublic ? 'public' : 'private'}`}>
                    {share.isPublic ? '🌍 Public' : '🔒 Private'}
                  </span>
                </div>
                <p>Items: {share.wishlistItems.length}</p>
                {share.message && <p className="share-message">"{share.message}"</p>}
                <div className="share-actions">
                  <button className="btn btn-sm btn-primary">Copy Link</button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteShare(share.shareId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistShare;
