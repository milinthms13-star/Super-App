import React, { useState } from 'react';

const SellerStore = ({ seller, listings = [], onListingClick, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [viewType, setViewType] = useState('grid'); // grid or list
  const [searchQuery, setSearchQuery] = useState('');

  // Filter listings by category and search
  const filteredListings = listings.filter(listing => {
    const matchCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    const matchSearch = searchQuery === '' || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Sort listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (selectedSort) {
      case 'newest':
        return new Date(b.posted) - new Date(a.posted);
      case 'oldest':
        return new Date(a.posted) - new Date(b.posted);
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'popular':
        return (b.views || 0) - (a.views || 0);
      default:
        return 0;
    }
  });

  // Get categories from listings
  const categories = ['all', ...new Set(listings.map(l => l.category))];

  return (
    <div className="seller-store">
      {/* Store Header */}
      <div className="store-header">
        <button className="store-close-btn" onClick={onClose}>✕</button>
        
        <div className="store-banner">
          <div className="store-banner-bg" />
          <div className="store-seller-info">
            <img
              src={seller?.avatar || '/default-avatar.png'}
              alt={seller?.name}
              className="store-seller-avatar"
            />
            <div className="store-seller-details">
              <h1 className="store-seller-name">
                {seller?.name}
                {seller?.verified && <span className="verified-badge">✓</span>}
              </h1>
              <p className="store-seller-tagline">{seller?.bio || 'Quality products at great prices'}</p>
              <div className="store-stats">
                <div className="stat">
                  <span className="stat-value">{listings.length}</span>
                  <span className="stat-label">Active Listings</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{seller?.followers || 0}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{seller?.rating || 4.8}⭐</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{seller?.responseTime || '2h'}</span>
                  <span className="stat-label">Response Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Controls */}
      <div className="store-controls">
        <div className="store-search">
          <input
            type="text"
            className="store-search-input"
            placeholder="Search in this store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="store-filters">
          <select
            className="store-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <select
            className="store-select"
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewType === 'grid' ? 'active' : ''}`}
              onClick={() => setViewType('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewType === 'list' ? 'active' : ''}`}
              onClick={() => setViewType('list')}
              title="List view"
            >
              ≡
            </button>
          </div>
        </div>
      </div>

      {/* Listings Display */}
      <div className={`store-listings store-${viewType}-view`}>
        {sortedListings.length > 0 ? (
          sortedListings.map((listing) => (
            <div
              key={listing.id}
              className={`store-listing-card ${viewType}-card`}
              onClick={() => onListingClick(listing)}
            >
              {/* Image */}
              <div className="store-listing-image">
                <img
                  src={listing.image || '/placeholder.png'}
                  alt={listing.title}
                />
                {listing.featured && (
                  <span className="featured-tag">⭐ Featured</span>
                )}
                {listing.urgent && (
                  <span className="urgent-tag">🔥 Urgent</span>
                )}
              </div>

              {/* Content */}
              <div className="store-listing-content">
                <h3 className="store-listing-title">{listing.title}</h3>
                
                <p className="store-listing-description">
                  {listing.description.substring(0, 100)}...
                </p>

                <div className="store-listing-meta">
                  <span className="store-listing-condition">
                    {listing.condition}
                  </span>
                  <span className="store-listing-location">
                    📍 {listing.location}
                  </span>
                  <span className="store-listing-date">
                    {new Date(listing.posted).toLocaleDateString()}
                  </span>
                </div>

                {/* Stats */}
                {viewType === 'list' && (
                  <div className="store-listing-stats">
                    <span>👁️ {listing.views || 0} views</span>
                    <span>💬 {listing.chats || 0} chats</span>
                    <span>❤️ {listing.favorites || 0} saves</span>
                  </div>
                )}

                {/* Price */}
                <div className="store-listing-price">
                  <strong>₹ {listing.price.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="store-empty-state">
            <span className="empty-icon">📭</span>
            <h3>No listings found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Store Footer */}
      <div className="store-footer">
        <button className="store-action-btn">
          💬 Contact {seller?.name}
        </button>
        <button className="store-action-btn secondary">
          📧 Follow Store
        </button>
      </div>
    </div>
  );
};

export default SellerStore;
