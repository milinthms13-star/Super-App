import React, { useState } from 'react';

const BulkActions = ({ listings = [], userListings = [], onAction }) => {
  const [selectedListings, setSelectedListings] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const handleSelectListing = (listingId) => {
    setSelectedListings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedListings.size === userListings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(userListings.map(l => l.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedListings.size === 0) return;

    setShowConfirm(true);
  };

  const confirmAction = async () => {
    const count = selectedListings.size;
    let message = '';

    switch (bulkAction) {
      case 'delete':
        message = `${count} listing(s) deleted successfully.`;
        break;
      case 'pause':
        message = `${count} listing(s) paused.`;
        break;
      case 'unpause':
        message = `${count} listing(s) reactivated.`;
        break;
      case 'feature':
        message = `${count} listing(s) featured.`;
        break;
      case 'unfeature':
        message = `${count} listing(s) unfeatured.`;
        break;
      case 'relist':
        message = `${count} listing(s) relisted.`;
        break;
      default:
        message = `Action performed on ${count} listing(s).`;
    }

    setActionMessage(message);
    if (onAction) {
      onAction(bulkAction, Array.from(selectedListings));
    }

    setSelectedListings(new Set());
    setBulkAction('');
    setShowConfirm(false);

    // Auto-clear message after 3 seconds
    setTimeout(() => setActionMessage(''), 3000);
  };

  const getActionDescription = () => {
    switch (bulkAction) {
      case 'delete':
        return 'Permanently delete selected listings? This cannot be undone.';
      case 'pause':
        return 'Pause selected listings? They will be hidden from search.';
      case 'unpause':
        return 'Reactivate selected listings? They will appear in search.';
      case 'feature':
        return 'Feature selected listings? They will get priority visibility.';
      case 'unfeature':
        return 'Remove featured status from selected listings?';
      case 'relist':
        return 'Relist selected listings? Posting date will be updated.';
      default:
        return '';
    }
  };

  return (
    <div className="bulk-actions">
      {/* Action Bar */}
      <div className="bulk-action-bar">
        <div className="selection-info">
          <input
            type="checkbox"
            checked={selectedListings.size === userListings.length && userListings.length > 0}
            onChange={handleSelectAll}
            className="select-all-checkbox"
            title="Select all listings"
          />
          <span className="selection-count">
            {selectedListings.size === 0
              ? 'No listings selected'
              : `${selectedListings.size} listing(s) selected`}
          </span>
        </div>

        {selectedListings.size > 0 && (
          <div className="action-controls">
            <select
              className="bulk-action-select"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Select action...</option>
              <option value="delete">🗑️ Delete</option>
              <option value="pause">⏸️ Pause</option>
              <option value="unpause">▶️ Reactivate</option>
              <option value="feature">⭐ Make Featured</option>
              <option value="unfeature">☆ Remove Featured</option>
              <option value="relist">🔄 Relist</option>
            </select>

            <button
              className="bulk-action-btn"
              onClick={handleBulkAction}
              disabled={!bulkAction}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className="bulk-action-message success">
          ✓ {actionMessage}
        </div>
      )}

      {/* Listings Table */}
      <div className="bulk-listings-table">
        <div className="table-header">
          <div className="col-checkbox">
            <input
              type="checkbox"
              checked={selectedListings.size === userListings.length && userListings.length > 0}
              onChange={handleSelectAll}
            />
          </div>
          <div className="col-title">Listing</div>
          <div className="col-status">Status</div>
          <div className="col-stats">Views</div>
          <div className="col-stats">Chats</div>
          <div className="col-price">Price</div>
          <div className="col-date">Posted</div>
        </div>

        <div className="table-body">
          {userListings.length > 0 ? (
            userListings.map(listing => (
              <div
                key={listing.id}
                className={`table-row ${selectedListings.has(listing.id) ? 'selected' : ''}`}
              >
                <div className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedListings.has(listing.id)}
                    onChange={() => handleSelectListing(listing.id)}
                  />
                </div>
                <div className="col-title">
                  <div className="listing-title-cell">
                    <img
                      src={listing.image || '/placeholder.png'}
                      alt={listing.title}
                      className="table-thumbnail"
                    />
                    <div>
                      <p className="title">{listing.title}</p>
                      <p className="category">{listing.category}</p>
                    </div>
                  </div>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${listing.moderationStatus}`}>
                    {listing.moderationStatus === 'approved' ? '✓ Active' : listing.moderationStatus}
                  </span>
                </div>
                <div className="col-stats">{listing.views || 0}</div>
                <div className="col-stats">{listing.chats || 0}</div>
                <div className="col-price">₹ {listing.price.toLocaleString('en-IN')}</div>
                <div className="col-date">
                  {new Date(listing.posted).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <div className="table-empty">
              <p>No listings found. Start by creating a listing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="bulk-confirm-modal">
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)} />
          <div className="modal-content">
            <h3>Confirm Action</h3>
            <p>{getActionDescription()}</p>
            <p className="confirm-count">
              This will affect {selectedListings.size} listing(s).
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn confirm"
                onClick={confirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {userListings.length > 0 && (
        <div className="bulk-stats-summary">
          <div className="summary-card">
            <span className="summary-label">Total Listings</span>
            <span className="summary-value">{userListings.length}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Views</span>
            <span className="summary-value">
              {userListings.reduce((sum, l) => sum + (l.views || 0), 0).toLocaleString()}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Engagement</span>
            <span className="summary-value">
              {userListings.reduce((sum, l) => sum + (l.chats || 0) + (l.favorites || 0), 0)}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Value</span>
            <span className="summary-value">
              ₹{userListings.reduce((sum, l) => sum + l.price, 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkActions;
