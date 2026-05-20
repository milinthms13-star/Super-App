import React from "react";
import { formatInr } from "../tourismData";
import { getPackageTrustScore } from "../tourismUpgradeUtils";

const PackageCard = ({
  pkg,
  isWishlisted,
  isCompared,
  onToggleWishlist,
  onToggleCompare,
  onAskAgent,
  onBook,
}) => {
  const trust = getPackageTrustScore(pkg);

  return (
    <article className="tourism-package-card tourism-package-card-upgraded">
      <div className="tourism-package-image-wrap">
        <img src={pkg.imageGallery?.[0] || ""} alt={pkg.title} className="tourism-package-image" />
        <div className="tourism-package-overlay">
          <span className="tourism-chip">{pkg.category}</span>
          <span className={`tourism-trust-pill ${trust.tone}`}>{trust.label}</span>
        </div>
      </div>

      <div className="tourism-package-body-upgraded">
        <div className="tourism-package-title-row">
          <h4>{pkg.title}</h4>
          <span className="tourism-rating">
            {Number(pkg.rating || 0).toFixed(1)} ({pkg.reviewsCount || 0} reviews)
          </span>
        </div>

        <p className="tourism-card-meta">
          {pkg.destination} | {pkg.durationDays} days | {pkg.travelerType}
        </p>
        <p className="tourism-card-price">From {formatInr(pkg.startPrice)}</p>

        <div className="tourism-tags">
          {(pkg.tags || []).slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <div className="tourism-package-safety-row">
          <span>{pkg.vendorVerified ? "Verified vendor" : "Verification pending"}</span>
          <span>{pkg.insuranceSupport ? "Insurance supported" : "Insurance optional"}</span>
          <span>{pkg.emergencyContact ? "Emergency contact listed" : "Emergency contact on request"}</span>
        </div>

        <div className="tourism-card-footer upgraded">
          <span>{pkg.availability || "Availability on request"}</span>
          <div className="tourism-inline-actions">
            <button type="button" className="tourism-secondary-button" onClick={() => onToggleWishlist(pkg.id)}>
              {isWishlisted ? "Saved" : "Save"}
            </button>
            <button type="button" className="tourism-secondary-button" onClick={() => onToggleCompare(pkg.id)}>
              {isCompared ? "Compared" : "Compare"}
            </button>
            <button type="button" className="tourism-secondary-button" onClick={() => onAskAgent(pkg)}>
              Ask on WhatsApp
            </button>
            <button type="button" className="tourism-primary-button" onClick={() => onBook(pkg.id)}>
              View and Book
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PackageCard;
