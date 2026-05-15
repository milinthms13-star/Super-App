import React, { useState } from "react";

const ListingCard = ({
  listing,
  isActive,
  isFavorite,
  onSelect,
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
      className={`classifieds-listing-card tradepost-listing-card image-first ${isActive ? "active selected" : ""}`}
      onClick={() => {
        onSelect(listing.id);
        setIsExpanded(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          onSelect(listing.id);
          setIsExpanded(true);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="classifieds-listing-image-container">
        {listing.image ? (
          <img src={listing.image} alt={listing.title} className="classifieds-listing-image" />
        ) : (
          <div className="classifieds-listing-image-placeholder">
            <span>No image</span>
          </div>
        )}

        <div className="classifieds-listing-badges-overlay">
          <span className={`classifieds-badge ${listing.verified ? "verified" : "pending"}`}>
            {listing.verified ? "Verified" : "Pending"}
          </span>
          {listing.featured ? <span className="classifieds-badge featured">Featured</span> : null}
          {listing.condition === "New" ? <span className="classifieds-badge new">New</span> : null}
        </div>

        <button
          type="button"
          className="classifieds-favorite-btn"
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle(listing.id);
          }}
          aria-label={`${isFavorite ? "Remove from" : "Add to"} favorites`}
        >
          {isFavorite ? "Saved" : "Save"}
        </button>

        <div className="classifieds-media-count">
          {listing.mediaGallery?.length || listing.mediaCount || 0} media
        </div>
      </div>

      <div className="classifieds-listing-quick-info">
        <h3 className="tradepost-card-title">{listing.title}</h3>
        <div className="classifieds-price-and-location">
          <strong className="classifieds-price">{listing.priceLabel}</strong>
          <span className="classifieds-location">{listing.location}</span>
        </div>
        <div className="tradepost-card-meta">
          <span>{listing.category}</span>
          <span>{listing.condition}</span>
          <span>{listing.views || 0} views</span>
        </div>

        <div className="classifieds-listing-actions">
          <span className={`classifieds-trust-pill trust-${trustScore >= 4 ? "high" : trustScore >= 2 ? "good" : "pending"}`}>
            {trustLabel}
          </span>
          <button
            type="button"
            className="classifieds-primary-button-sm"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(listing.id);
            }}
          >
            View
          </button>
        </div>
      </div>

      {isActive || isExpanded ? (
        <div className="classifieds-listing-details-expanded">
          <div className="classifieds-listing-specs">
            <span>{listing.category}</span>
            <span>{listing.condition}</span>
            {listing.brand ? <span>{listing.brand}</span> : null}
          </div>

          <div className="classifieds-listing-highlights">
            <div className="classifieds-condition-badge">
              <span>{listing.condition}</span>
            </div>
            {listing.warranty ? (
              <div className="classifieds-warranty-badge">
                <span>Warranty available</span>
              </div>
            ) : null}
          </div>

          {listing.description ? (
            <p className="classifieds-listing-description">
              {listing.description.length > 120 ? `${listing.description.substring(0, 120)}...` : listing.description}
            </p>
          ) : null}

          <div className="classifieds-listing-footer">
            {hasSubscription ? (
              <>
                <span className="classifieds-contact-info">Seller: {listing.listedBy}</span>
                {listing.phone ? <span className="classifieds-contact-info">Phone: {listing.phone}</span> : null}
                {listing.sellerId ? <span className="classifieds-contact-info">Seller ID: {listing.sellerId}</span> : null}
              </>
            ) : (
              <button
                type="button"
                className="classifieds-subscription-unlock-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  onSubscribeClick?.();
                }}
              >
                Subscribe to view contact
              </button>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
};

export default ListingCard;
