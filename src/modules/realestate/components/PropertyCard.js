import React, { useMemo, useState } from "react";
import { calculateEMI } from "../realEstateUtils";
import PropertyShareSheet from "./PropertyShareSheet";

/**
 * PropertyCard — Professional upgrade
 * - Native lazy loading on images
 * - Skeleton loading state
 * - Web Share API / share sheet integration
 * - WhatsApp contact button
 * - Neighborhood walkability chips (school, hospital, metro proximity)
 * - Amenity duplicate fix in expanded view
 */

const WALKABILITY_THRESHOLDS = {
  school: { excellent: 1, good: 2, label: "School" },
  hospital: { excellent: 1.5, good: 3, label: "Hospital" },
  metro: { excellent: 1, good: 2.5, label: "Metro" },
};

const getWalkabilityChip = (distKm, type) => {
  const t = WALKABILITY_THRESHOLDS[type];
  if (distKm == null || !t) return null;
  if (distKm <= t.excellent) return { level: "excellent", label: `${t.label} ${distKm} km`, icon: "🟢" };
  if (distKm <= t.good) return { level: "good", label: `${t.label} ${distKm} km`, icon: "🟡" };
  return { level: "far", label: `${t.label} ${distKm} km`, icon: "🔴" };
};

// Skeleton shimmer card shown while image loads
const CardSkeleton = () => (
  <article className="realestate-property-card realestate-card-skeleton" aria-busy="true" aria-label="Loading property">
    <div className="re-skeleton-image" />
    <div className="re-skeleton-body">
      <div className="re-skeleton-line wide" />
      <div className="re-skeleton-line medium" />
      <div className="re-skeleton-line short" />
    </div>
  </article>
);

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
  loading = false,
  isCompared = false,
  onCompareToggle,
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isRequirement = property?.postingType === "requirement";

  const trustSignals = useMemo(() => [
    Boolean(property?.verified),
    Boolean(property?.reraNumber),
    property?.titleDeedStatus === "verified",
    Boolean(property?.taxReceipt),
    Boolean(property?.buildingPermit),
    Boolean(property?.encumbranceCertificate),
  ], [property]);

  const trustScore = trustSignals.filter(Boolean).length;
  const trustLabel =
    trustScore >= 5 ? "High trust" : trustScore >= 3 ? "Good trust" : "Trust pending";

  const possessionLabel = property?.readyToMove
    ? "Ready to move"
    : property?.underConstruction
    ? "Under construction"
    : property?.possession || "TBA";

  const emiEstimate = useMemo(() => {
    if (isRequirement || !property?.priceValue) return 0;
    return calculateEMI(property.priceValue, 8.5, 20);
  }, [isRequirement, property?.priceValue]);

  // Walkability chips
  const walkabilityChips = useMemo(() => {
    const chips = [];
    const schoolChip = getWalkabilityChip(property?.nearbySchoolKm, "school");
    const hospitalChip = getWalkabilityChip(property?.nearbyHospitalKm, "hospital");
    const metroChip = getWalkabilityChip(property?.nearbyMetroKm, "metro");
    if (schoolChip) chips.push(schoolChip);
    if (hospitalChip) chips.push(hospitalChip);
    if (metroChip) chips.push(metroChip);
    return chips;
  }, [property?.nearbySchoolKm, property?.nearbyHospitalKm, property?.nearbyMetroKm]);

  const pricePerSqft = useMemo(() => {
    if (!property?.priceValue || !property?.areaSqft) return null;
    return Math.round((property.priceValue * 100000) / property.areaSqft);
  }, [property?.priceValue, property?.areaSqft]);

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    const number = (property?.whatsappNumber || property?.contactPhone || "").replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hi, I'm interested in your property: ${property?.title} (${property?.priceLabel}). Please share more details.`
    );
    if (number) {
      window.open(`https://wa.me/${number}?text=${msg}`, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) return <CardSkeleton />;
  if (!property) return null;

  return (
    <>
      <article
        className={`realestate-property-card image-first ${isActive ? "active" : ""}`}
        onClick={() => {
          onSelect(property.id);
          setIsExpanded(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(property.id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View property: ${property.title}`}
        aria-pressed={isActive}
      >
        {/* IMAGE */}
        <div className="realestate-property-image-container">
          {!imgLoaded && !imgError && property.image && (
            <div className="re-skeleton-image re-img-placeholder" aria-hidden="true" />
          )}
          {property.image && !imgError ? (
            <img
              src={property.image}
              alt={property.title}
              className="realestate-property-image"
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s" }}
            />
          ) : (
            <div className="realestate-property-image-placeholder" aria-hidden="true">
              <span>🏠</span>
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
                {property.reraNumber && <span className="realestate-badge rera">RERA</span>}
              </>
            )}
          </div>

          {/* ACTIONS OVERLAY */}
          <div className="re-card-overlay-actions">
            <button
              type="button"
              className="realestate-favorite-btn"
              onClick={(e) => { e.stopPropagation(); onFavoriteToggle(property); }}
              aria-label={`${isFavorite ? "Remove from" : "Add to"} favorites`}
              title={isFavorite ? "Remove from favorites" : "Save property"}
            >
              {isFavorite ? "❤️" : "🤍"}
            </button>
            <button
              type="button"
              className="re-card-share-btn"
              onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
              aria-label="Share property"
              title="Share this property"
            >
              🔗
            </button>
            {typeof onCompareToggle === "function" && (
              <button
                type="button"
                className={`re-card-compare-btn ${isCompared ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onCompareToggle(property.id); }}
                aria-label={isCompared ? "Remove from comparison" : "Add to comparison"}
                title={isCompared ? "Remove from comparison" : "Compare"}
              >
                {isCompared ? "⊠" : "⊞"}
              </button>
            )}
          </div>

          {/* MEDIA COUNT */}
          {(property.mediaGallery?.length > 0 || property.mediaCount > 0) && (
            <div className="realestate-media-count">
              📸 {property.mediaGallery?.length || property.mediaCount || 0}
            </div>
          )}

          {/* VIDEO TOUR BADGE */}
          {property.hasVideoTour && (
            <div className="re-card-video-badge" aria-label="Video tour available">▶ Tour</div>
          )}
        </div>

        {/* QUICK INFO */}
        <div className="realestate-property-quick-info">
          <div className="realestate-price-and-location">
            {isRequirement ? (
              <>
                <strong className="realestate-price">
                  {property.minBudget && property.maxBudget
                    ? `${property.minBudget} – ${property.maxBudget}`
                    : property.maxBudget
                    ? `Up to ${property.maxBudget}`
                    : "Budget negotiable"}
                </strong>
                <span className="realestate-location">📍 {property.location}</span>
              </>
            ) : (
              <>
                <strong className="realestate-price">{property.priceLabel}</strong>
                {pricePerSqft && (
                  <span className="re-card-ppsf">₹{pricePerSqft.toLocaleString("en-IN")}/sqft</span>
                )}
                <span className="realestate-location">📍 {property.locality || property.location}</span>
              </>
            )}
          </div>

          <div className="realestate-property-actions">
            <span
              className={`realestate-trust-pill trust-${
                trustScore >= 5 ? "high" : trustScore >= 3 ? "good" : "pending"
              }`}
            >
              {trustLabel}
            </span>
            <button
              type="button"
              className="realestate-primary-button-sm"
              onClick={(e) => { e.stopPropagation(); onSelect(property.id); }}
            >
              View
            </button>
          </div>
        </div>

        {/* WALKABILITY CHIPS */}
        {walkabilityChips.length > 0 && (
          <div className="re-card-walkability">
            {walkabilityChips.map((chip, idx) => (
              <span
                key={idx}
                className={`re-walk-chip re-walk-${chip.level}`}
                title={chip.label}
              >
                {chip.icon} {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* EXPANDED DETAILS */}
        {(isActive || isExpanded) && (
          <div className="realestate-property-details-expanded">
            <h3>{property.title}</h3>

            {isRequirement ? (
              <>
                <div className="realestate-property-specs">
                  <span>🏠 {property.type}</span>
                  <span>🛏️ {property.bedrooms || "Any"} BHK</span>
                  <span>🔖 {property.intent === "sale" ? "Looking to Buy" : "Looking to Rent"}</span>
                </div>
                {property.mustHaveAmenities && (
                  <div className="realestate-property-amenities-preview">
                    <strong style={{ display: "block", marginBottom: "0.3rem" }}>Must-haves:</strong>
                    {property.mustHaveAmenities.split(",").slice(0, 4).map((a, idx) => (
                      <span key={idx}>{a.trim()}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="realestate-property-specs">
                  <span>🏠 {property.type}</span>
                  {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} BHK</span>}
                  <span>📐 {property.area}</span>
                  {property.furnishing && <span>🪑 {property.furnishing}</span>}
                </div>

                <div className="realestate-property-highlights">
                  {emiEstimate > 0 && (
                    <div className="realestate-emi-badge">
                      <strong>₹{Math.round(emiEstimate / 1000)}K/mo</strong>
                      <span>EMI est.</span>
                    </div>
                  )}
                  <div className="realestate-possession-badge">
                    <span>{possessionLabel}</span>
                  </div>
                </div>

                {property.amenities?.length > 0 && (
                  <div className="realestate-property-amenities-preview">
                    {[...new Set(property.amenities)].slice(0, 4).map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                    {property.amenities.length > 4 && (
                      <span>+{property.amenities.length - 4} more</span>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="realestate-property-footer">
              {hasSubscription ? (
                <div className="re-card-contact-row">
                  <span className="realestate-contact-info">👤 {property.listedBy}</span>
                  {(property.contactPhone || property.phone) && (
                    <span className="realestate-contact-info">📱 {property.contactPhone || property.phone}</span>
                  )}
                  {(property.whatsappNumber || property.contactPhone) && (
                    <button
                      type="button"
                      className="re-card-whatsapp-btn"
                      onClick={handleWhatsApp}
                      aria-label="Contact via WhatsApp"
                    >
                      💬 WhatsApp
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="realestate-subscription-unlock-btn"
                  onClick={(e) => { e.stopPropagation(); onSubscribeClick?.(); }}
                >
                  🔒 Subscribe to view contact
                </button>
              )}

              {canManage && typeof onEdit === "function" && (
                <button
                  type="button"
                  className="realestate-inline-button"
                  onClick={(e) => { e.stopPropagation(); onEdit(property.id); }}
                >
                  Edit listing
                </button>
              )}
            </div>
          </div>
        )}
      </article>

      {/* SHARE SHEET MODAL */}
      {showShare && (
        <PropertyShareSheet
          property={property}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
};

export default PropertyCard;
