import React, { useState, useEffect } from 'react';

const SellerFollow = ({ seller, isFollowing = false, onFollowChange }) => {
  const [followState, setFollowState] = useState(isFollowing);
  const [followerCount, setFollowerCount] = useState(seller?.followers || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newState = !followState;
      setFollowState(newState);
      
      if (newState) {
        setFollowerCount(prev => prev + 1);
      } else {
        setFollowerCount(prev => Math.max(0, prev - 1));
      }

      if (onFollowChange) {
        onFollowChange(newState);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="seller-follow">
      {/* Seller Card Header */}
      <div className="seller-follow-header">
        <div className="seller-info">
          <img
            src={seller?.avatar || '/default-avatar.png'}
            alt={seller?.name}
            className="seller-avatar-large"
          />
          <div className="seller-details">
            <h3 className="seller-name">
              {seller?.name}
              {seller?.verified && <span className="verified-badge">✓</span>}
            </h3>
            <div className="seller-stats">
              <span className="stat">
                <span className="stat-icon">⭐</span>
                {seller?.rating || 4.8} ({seller?.reviewCount || 0} reviews)
              </span>
              <span className="stat">
                <span className="stat-icon">📦</span>
                {seller?.listingCount || 24} listings
              </span>
            </div>
          </div>
        </div>

        {/* Follow Button */}
        <button
          className={`follow-btn ${followState ? 'following' : ''} ${isLoading ? 'loading' : ''}`}
          onClick={handleFollowToggle}
          disabled={isLoading}
          title={followState ? 'Click to unfollow' : 'Click to follow'}
        >
          {isLoading ? '...' : followState ? '✓ Following' : '+ Follow'}
        </button>
      </div>

      {/* Seller Info */}
      <div className="seller-info-section">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Followers</span>
            <span className="info-value">{followerCount.toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Response Time</span>
            <span className="info-value">{seller?.responseTime || '~2 hrs'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Member Since</span>
            <span className="info-value">{seller?.memberSince || 'Jan 2024'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Positive Feedback</span>
            <span className="info-value">{seller?.positivePercentage || '98'}%</span>
          </div>
        </div>
      </div>

      {/* Action Menu */}
      <div className="seller-actions">
        <button className="action-btn">
          💬 Message Seller
        </button>
        <div className="more-options">
          <button
            className="more-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            ⋮ More
          </button>
          {showDropdown && (
            <div className="dropdown-menu">
              <button className="dropdown-item">👁️ View Store</button>
              <button className="dropdown-item">📋 View All Listings</button>
              <button className="dropdown-item">⭐ View Reviews</button>
              <button className="dropdown-item danger">🚩 Report Seller</button>
            </div>
          )}
        </div>
      </div>

      {/* Seller Bio */}
      {seller?.bio && (
        <div className="seller-bio">
          <p>{seller.bio}</p>
        </div>
      )}

      {/* Verification Badges */}
      {seller?.verificationBadges && (
        <div className="verification-badges">
          {seller.verificationBadges.includes('email') && (
            <span className="badge email-verified">📧 Email Verified</span>
          )}
          {seller.verificationBadges.includes('phone') && (
            <span className="badge phone-verified">☎️ Phone Verified</span>
          )}
          {seller.verificationBadges.includes('identity') && (
            <span className="badge identity-verified">🆔 Identity Verified</span>
          )}
          {seller.verificationBadges.includes('payment') && (
            <span className="badge payment-verified">💳 Payment Method Added</span>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {followState && seller?.recentActivity && (
        <div className="recent-activity">
          <h4>Recent Activity</h4>
          <ul className="activity-list">
            {seller.recentActivity.slice(0, 3).map((activity, idx) => (
              <li key={idx} className="activity-item">
                <span className="activity-icon">{activity.icon}</span>
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{activity.time}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SellerFollow;
