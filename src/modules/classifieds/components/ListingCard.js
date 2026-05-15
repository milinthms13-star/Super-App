import React, { useState } from "react";

const ListingCard = ({
  listing,
  isActive,
  isFavorite,
  canManage,
  onSelect,
  onEdit,
  onFavoriteToggle,
  hasSubscription = false,
  onSubscribeClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const trustSignals = [
    Boolean(listing.verified),
    Boolean(listing.sellerRating >= 4),
    listing.condition === "New",
    Boolean(listing.warranty),
    Boolean(listing.originalReceipt),
  ];
  const trustScore = trustSignals.filter(Boolean).length;
  const trustLabel = trustScore >= 4 ? "High trust" : trustScore >= 2 ? "Good trust" : "Trust pending";

  return (
    <article
      className={`classifieds-listing-card image-first ${isActive ? "active" : ""}`}
      onClick={() => {
        onSelect(listing.id);
        setIsExpanded(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Space") {
          event.preventDefault();
          onSelect(listing.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* IMAGE-FIRST SECTION - PROMINENT */}
      <div className="classifieds-listing-image-container">
        {listing.image ? (
          <img
            src={listing.image}
            alt={listing.title}
            className="classifieds-listing-image"
          />
        ) : (
          <div className="classifieds-listing-image-placeholder">
            <span>📦</span>
          </div>
        )}

        {/* OVERLAY BADGES */}
        <div className="classifieds-listing-badges-overlay">
          <span className={`classifieds-badge ${listing.verified ? "verified" : "pending"}`}>
            {listing.verified ? "✓ Verified" : "Pending"}
          </span>
          {listing.featured && <span className="classifieds-badge featured">⭐ Featured</span>}
          {listing.condition === "New" && <span className="classifieds-badge new">🆕 New</span>}
        </div>

        {/* FAVORITE BUTTON (STICKY TOP RIGHT) */}
        <button
          type="button"
          className="classifieds-favorite-btn"
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle(listing.id);
          }}
          aria-label={`${isFavorite ? "Remove from" : "Add to"} favorites`}
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>

        {/* MEDIA COUNT */}
        <div className="classifieds-media-count">
          📸 {listing.mediaGallery?.length || listing.mediaCount || 0}
        </div>
      </div>

      {/* QUICK INFO - ALWAYS VISIBLE */}
      <div className="classifieds-listing-quick-info">
        <div className="classifieds-price-and-location">
          <strong className="classifieds-price">{listing.priceLabel}</strong>
          <span className="classifieds-location">📍 {listing.location}</span>
        </div>

        {/* MAIN CTA AND MINI BADGES */}
        <div className="classifieds-listing-actions">
          <span className={`classifieds-trust-pill trust-${trustScore >= 4 ? "high" : trustScore >= 2 ? "good" : "pending"}`}>
            {trustLabel}
          </span>
          <button
            type="button"
            className="classifieds-primary-button-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(listing.id);
            }}
          >
            View
          </button>
        </div>
      </div>

      {/* EXPANDED DETAILS - SHOWN ON CLICK OR HOVER */}
      {isActive || isExpanded ? (
        <div className="classifieds-listing-details-expanded">
          <h3>{listing.title}</h3>

          <div className="classifieds-listing-specs">
            <span>📂 {listing.category}</span>
            <span>🔧 {listing.condition}</span>
            {listing.brand && <span>🏷️ {listing.brand}</span>}
          </div>

          <div className="classifieds-listing-highlights">
            <div className="classifieds-condition-badge">
              <span>{listing.condition}</span>
            </div>
            {listing.warranty && (
              <div className="classifieds-warranty-badge">
                <span>🛡️ Warranty available</span>
              </div>
            )}
          </div>

          {listing.description && (
            <p className="classifieds-listing-description">
              {listing.description.length > 100
                ? `${listing.description.substring(0, 100)}...`
                : listing.description}
            </p>
          )}

          <div className="classifieds-listing-footer">
            {hasSubscription ? (
              <>
                <span className="classifieds-contact-info">👤 {listing.listedBy}</span>
                {listing.phone && <span className="classifieds-contact-info">📱 {listing.phone}</span>}
                {listing.sellerId && <span className="classifieds-contact-info">🆔 {listing.sellerId}</span>}
              </>
            ) : (
              <button
                type="button"
                className="classifieds-subscription-unlock-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubscribeClick?.();
                }}
              >
                🔒 Subscribe to view contact
              </button>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
};

export default ListingCard;