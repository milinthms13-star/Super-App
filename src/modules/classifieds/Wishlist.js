import React, { useState } from 'react';

const Wishlist = ({ isInWishlist = false, listingId, onWishlistChange }) => {
  const [inWishlist, setInWishlist] = useState(isInWishlist);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [savedCollections, setSavedCollections] = useState([
    { id: 1, name: 'Gaming Laptops', count: 5, selected: false },
    { id: 2, name: 'Budget Electronics', count: 3, selected: false },
    { id: 3, name: 'Wishlist', count: 12, selected: isInWishlist },
  ]);

  const handleWishlistToggle = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newState = !inWishlist;
      setInWishlist(newState);

      if (onWishlistChange) {
        onWishlistChange(newState);
      }

      setShowMenu(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionToggle = (collectionId) => {
    setSavedCollections(collections =>
      collections.map(col =>
        col.id === collectionId
          ? { ...col, selected: !col.selected }
          : col
      )
    );
  };

  return (
    <div className="wishlist-container">
      {/* Main Wishlist Button */}
      <div className="wishlist-trigger">
        <button
          className={`wishlist-btn ${inWishlist ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
          onClick={handleWishlistToggle}
          disabled={isLoading}
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isLoading ? '...' : inWishlist ? '♥ Saved' : '♡ Save'}
        </button>

        {/* Collections Dropdown Trigger */}
        <button
          className="collections-trigger"
          onClick={() => setShowMenu(!showMenu)}
          title="Organize in collections"
        >
          ⋯
        </button>
      </div>

      {/* Collections Menu */}
      {showMenu && (
        <div className="collections-menu">
          <div className="menu-header">
            <h4>Save to Collection</h4>
          </div>

          <div className="collections-list">
            {savedCollections.map(collection => (
              <label key={collection.id} className="collection-item">
                <input
                  type="checkbox"
                  checked={collection.selected}
                  onChange={() => handleCollectionToggle(collection.id)}
                  className="collection-checkbox"
                />
                <span className="collection-name">{collection.name}</span>
                <span className="collection-count">({collection.count})</span>
              </label>
            ))}
          </div>

          <div className="menu-divider"></div>

          <button className="menu-action">
            + Create New Collection
          </button>

          <div className="menu-divider"></div>

          <button className="menu-action danger">
            🗑️ Remove from All
          </button>
        </div>
      )}

      {/* Wishlist Info Tooltip */}
      {inWishlist && (
        <div className="wishlist-info">
          <span className="info-icon">💡</span>
          <span className="info-text">
            You'll get price alerts when this item drops
          </span>
        </div>
      )}
    </div>
  );
};

export default Wishlist;
