import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../contexts/AppContext';
import { API_BASE_URL, buildApiUrl } from '../../utils/api';
import { getStoredAuthToken } from '../../utils/auth';
import '../../styles/Ecommerce.css';

const EMPTY_FORM_STATE = {
  wishlistItems: [],
  sharedWith: [],
  message: '',
  isPublic: false,
  expiresAt: '',
};

const createAuthConfig = () => ({
  headers: { Authorization: `Bearer ${getStoredAuthToken()}` },
});

const normalizeFavoriteProducts = (favorites = []) => {
  const uniqueItems = new Map();

  (favorites || []).forEach((item) => {
    const productId = String(item?.productId || item?.id || '').trim();
    if (!productId || uniqueItems.has(productId)) {
      return;
    }

    uniqueItems.set(productId, {
      productId,
      productName: item?.name || 'Saved product',
      price: Number(item?.price || 0),
      image: item?.image || '',
      category: item?.category || '',
    });
  });

  return Array.from(uniqueItems.values());
};

const buildShareLink = (shareId = '') => buildApiUrl(`/wishlistshare/${shareId}`);

const WishlistShare = () => {
  const { currentUser, favorites } = useApp();
  const [shares, setShares] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const favoriteItems = useMemo(() => normalizeFavoriteProducts(favorites), [favorites]);

  useEffect(() => {
    if (currentUser?.email) {
      fetchShares();
    }
  }, [currentUser?.email]);

  const fetchShares = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/wishlistshare/user/list`,
        createAuthConfig()
      );
      setShares(response.data.data || []);
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  const toggleWishlistItem = (favoriteItem) => {
    setFormData((currentForm) => {
      const isSelected = currentForm.wishlistItems.some(
        (item) => item.productId === favoriteItem.productId
      );

      return {
        ...currentForm,
        wishlistItems: isSelected
          ? currentForm.wishlistItems.filter((item) => item.productId !== favoriteItem.productId)
          : [...currentForm.wishlistItems, favoriteItem],
      };
    });
  };

  const handleCreateShare = async () => {
    if (formData.wishlistItems.length === 0) {
      window.alert('Please add items to share');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/wishlistshare/create`,
        {
          ...formData,
          sharedWith: formData.sharedWith.filter((entry) => entry.email),
          expiresAt: formData.expiresAt || null,
        },
        createAuthConfig()
      );

      setShares((currentShares) => [response.data.data, ...currentShares]);
      setShareLink(buildShareLink(response.data.data.shareId));
      setFormData(EMPTY_FORM_STATE);
      window.alert('Wishlist shared successfully!');
    } catch (error) {
      window.alert('Error creating share: ' + error.message);
    } finally {
      setLoading(false);
      setShowForm(false);
    }
  };

  const handleDeleteShare = async (shareId) => {
    if (window.confirm('Delete this share?')) {
      try {
        await axios.delete(
          `${API_BASE_URL}/wishlistshare/${shareId}`,
          createAuthConfig()
        );
        setShares((currentShares) => currentShares.filter((share) => share.shareId !== shareId));
      } catch (error) {
        window.alert('Error deleting share: ' + error.message);
      }
    }
  };

  const handleCopyLink = async (shareId) => {
    try {
      await navigator.clipboard.writeText(buildShareLink(shareId));
      window.alert('Share link copied!');
    } catch (error) {
      window.alert('Unable to copy the share link right now.');
    }
  };

  if (!currentUser?.email) {
    return (
      <div className="ecommerce-feature">
        <h2>Wishlist Sharing</h2>
        <p>Please sign in to share saved products.</p>
      </div>
    );
  }

  return (
    <div className="ecommerce-feature">
      <h2>Wishlist Sharing</h2>

      {!showForm ? (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Create New Share
        </button>
      ) : (
        <div className="feature-form">
          <h3>Share Your Wishlist</h3>

          <div className="form-group">
            <label>Select Favorites to Share:</label>
            {favoriteItems.length === 0 ? (
              <p className="text-muted">Save some GlobeMart favorites first, then you can share them here.</p>
            ) : (
              <div className="share-items">
                {favoriteItems.map((item) => {
                  const isSelected = formData.wishlistItems.some(
                    (wishlistItem) => wishlistItem.productId === item.productId
                  );

                  return (
                    <label key={item.productId} className="share-card">
                      <div className="share-header">
                        <h4>{item.productName}</h4>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleWishlistItem(item)}
                        />
                      </div>
                      <p>{item.category || 'General'}</p>
                      <p>INR {item.price}</p>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="wishlist-share-emails">Share With (emails):</label>
            <input
              id="wishlist-share-emails"
              type="text"
              placeholder="Enter emails (comma separated)"
              value={formData.sharedWith.map((entry) => entry.email).join(', ')}
              onChange={(event) => {
                const emails = event.target.value
                  .split(',')
                  .map((email) => email.trim())
                  .filter(Boolean)
                  .map((email) => ({
                    email,
                    name: '',
                  }));

                setFormData({ ...formData, sharedWith: emails });
              }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="wishlist-share-message">Message:</label>
            <textarea
              id="wishlist-share-message"
              placeholder="Add a personal message..."
              value={formData.message}
              onChange={(event) => setFormData({ ...formData, message: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(event) => setFormData({ ...formData, isPublic: event.target.checked })}
              />
              Make Public
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="wishlist-share-expiry">Expires At:</label>
            <input
              id="wishlist-share-expiry"
              type="date"
              value={formData.expiresAt}
              onChange={(event) => setFormData({ ...formData, expiresAt: event.target.value })}
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

        </div>
      )}

      {shareLink && (
        <div className="success-message">
          <p>Share Link: {shareLink}</p>
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
                    {share.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <p>Items: {share.wishlistItems.length}</p>
                {share.message && <p className="share-message">"{share.message}"</p>}
                <div className="share-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleCopyLink(share.shareId)}
                  >
                    Copy Link
                  </button>
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
