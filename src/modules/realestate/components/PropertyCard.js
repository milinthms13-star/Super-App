import React, { useState } from "react";

const PropertyCard = ({
  property,
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
  const isRequirement = property.postingType === "requirement";
  
  const trustSignals = [
    Boolean(property.verified),
    Boolean(property.reraNumber),
    property.titleDeedStatus === "verified",
    Boolean(property.taxReceipt),
    Boolean(property.buildingPermit),
    Boolean(property.encumbranceCertificate),
  ];
  const trustScore = trustSignals.filter(Boolean).length;
  const trustLabel = trustScore >= 5 ? "High trust" : trustScore >= 3 ? "Good trust" : "Trust pending";
  const possessionLabel = property.readyToMove
    ? "Ready to move"
    : property.underConstruction
    ? "Under construction"
    : property.possession || "Possession to be announced";

  // Calculate EMI estimate (mock)
  const emiEstimate = Math.round(property.priceValue * 0.008 * (20 * 12) / ((20 * 12) + 1));

  return (
    <article
      className={`realestate-property-card image-first ${isActive ? "active" : ""}`}
      onClick={() => {
        onSelect(property.id);
        setIsExpanded(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Space") {
          event.preventDefault();
          onSelect(property.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {/* IMAGE-FIRST SECTION - PROMINENT */}
      <div className="realestate-property-image-container">
        {property.image ? (
          <img 
            src={property.image} 
            alt={property.title} 
            className="realestate-property-image" 
          />
        ) : (
          <div className="realestate-property-image-placeholder">
            <span>📷</span>
          </div>
        )}
        
        {/* OVERLAY BADGES */}
        <div className="realestate-property-badges-overlay">
          {isRequirement ? (
            <span className="realestate-badge requirement">🔍 Looking For</span>
          ) : (
            <>
              <span className={`realestate-badge ${property.verified ? "verified" : "pending"}`}>
                {property.verified ? "✓ Verified" : "Pending"}
              </span>
              {property.featured && <span className="realestate-badge featured">⭐ Featured</span>}
            </>
          )}
        </div>

        {/* FAVORITE BUTTON (STICKY TOP RIGHT) */}
        <button
          type="button"
          className="realestate-favorite-btn"
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle(property.id);
          }}
          aria-label={`${isFavorite ? "Remove from" : "Add to"} favorites`}
        >
          {isFavorite ? "❤️" : "🤍"}
        </button>

        {/* MEDIA COUNT */}
        <div className="realestate-media-count">
          📸 {property.mediaGallery?.length || property.mediaCount || 0}
        </div>
      </div>

      {/* QUICK INFO - ALWAYS VISIBLE */}
      <div className="realestate-property-quick-info">
        <div className="realestate-price-and-location">
          {isRequirement ? (
            <>
              <strong className="realestate-price">
                {property.minBudget && property.maxBudget 
                  ? `${property.minBudget} - ${property.maxBudget}`
                  : property.maxBudget 
                  ? `Up to ${property.maxBudget}`
                  : "Budget negotiable"
                }
              </strong>
              <span className="realestate-location">📍 {property.location}</span>
            </>
          ) : (
            <>
              <strong className="realestate-price">{property.priceLabel}</strong>
              <span className="realestate-location">{property.location}</span>
            </>
          )}
        </div>
        
        {/* MAIN CTA AND MINI BADGES */}
        <div className="realestate-property-actions">
          <span className={`realestate-trust-pill trust-${trustScore >= 5 ? "high" : trustScore >= 3 ? "good" : "pending"}`}>
            {trustLabel}
          </span>
          <button
            type="button"
            className="realestate-primary-button-sm"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(property.id);
            }}
          >
            View
          </button>
        </div>
      </div>

      {/* EXPANDED DETAILS - SHOWN ON CLICK OR HOVER */}
      {isActive || isExpanded ? (
        <div className="realestate-property-details-expanded">
          <h3>{property.title}</h3>
          
          {isRequirement ? (
            <>
              <div className="realestate-property-specs">
                <span>🏠 {property.type}</span>
                <span>🛏️ {property.bedrooms || "Any"}</span>
                <span>🔖 {property.intent === "sale" ? "Looking to Buy" : "Looking to Rent"}</span>
              </div>

              <div className="realestate-property-highlights">
                <div className="realestate-budget-badge">
                  <strong>Budget: {property.minBudget && property.maxBudget ? `${property.minBudget} - ${property.maxBudget}` : property.maxBudget ? `Up to ${property.maxBudget}` : "Flexible"}</strong>
                  <span>{property.moveInDate ? `Move-in: ${property.moveInDate}` : "Timeline flexible"}</span>
                </div>
              </div>

              {property.mustHaveAmenities && (
                <div className="realestate-property-amenities-preview">
                  <strong style={{ display: "block", marginBottom: "0.3rem" }}>Must-haves:</strong>
                  {property.mustHaveAmenities.split(",").slice(0, 3).map((amenity, idx) => (
                    <span key={idx}>{amenity.trim()}</span>
                  ))}
                  {property.mustHaveAmenities.split(",").length > 3 && (
                    <span>+{property.mustHaveAmenities.split(",").length - 3} more</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="realestate-property-specs">
                <span>🏠 {property.type}</span>
                <span>🛏️ {property.bedrooms || "Studio"}</span>
                <span>📐 {property.area}</span>
              </div>

              <div className="realestate-property-highlights">
                <div className="realestate-emi-badge">
                  <strong>₹{(emiEstimate / 100000).toFixed(1)}L/mo</strong>
                  <span>EMI estimate</span>
                </div>
                <div className="realestate-possession-badge">
                  <span>{possessionLabel}</span>
                </div>
              </div>

              <div className="realestate-property-amenities-preview">
                {property.amenities?.slice(0, 3).map((amenity) => (
                  <span key={amenity}>{amenity}</span>
                ))}
                {property.amenities?.length > 3 && (
                  <span>+{property.amenities.length - 3} more</span>
                )}
              </div>
            </>
          )}

          <div className="realestate-property-amenities-preview">
            {property.amenities?.slice(0, 3).map((amenity) => (
              <span key={amenity}>{amenity}</span>
            ))}
            {property.amenities?.length > 3 && (
              <span>+{property.amenities.length - 3} more</span>
            )}
          </div>

          <div className="realestate-property-footer">
            {hasSubscription ? (
              <>
                <span className="realestate-contact-info">👤 {property.listedBy}</span>
                {property.phone && <span className="realestate-contact-info">📱 {property.phone}</span>}
                {property.supperappId && <span className="realestate-contact-info">🆔 {property.supperappId}</span>}
              </>
            ) : (
              <button
                type="button"
                className="realestate-subscription-unlock-btn"
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

export default PropertyCard;
