import React from "react";
import { formatInr } from "../tourismData";

const PackageCard = ({
  pkg,
  isWishlisted,
  isCompared,
  onToggleWishlist,
  onToggleCompare,
  onAskAgent,
  onBook,
}) => (
  <article className="tourism-package-card">
    <div className="tourism-package-image-wrap">
      <img src={pkg.imageGallery?.[0] || ""} alt={pkg.title} className="tourism-package-image" />
      <div className="tourism-package-overlay">
        <span className="tourism-chip">{pkg.category}</span>
        <span className="tourism-rating">
          {Number(pkg.rating || 0).toFixed(1)} ({pkg.reviewsCount || 0} reviews)
        </span>
      </div>
    </div>
    <h4>{pkg.title}</h4>
    <p className="tourism-card-meta">
      {pkg.destination} | {pkg.durationDays} days | {pkg.travelerType}
    </p>
    <p className="tourism-card-price">From {formatInr(pkg.startPrice)}</p>
    <div className="tourism-tags">
      {(pkg.tags || []).slice(0, 4).map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
    <div className="tourism-card-footer">
      <span>{pkg.availability || "Availability on request"}</span>
      <div className="tourism-inline-actions">
        <button type="button" className="tourism-secondary-button" onClick={() => onToggleWishlist(pkg.id)}>
          {isWishlisted ? "Saved" : "Save"}
        </button>
        <button type="button" className="tourism-secondary-button" onClick={() => onToggleCompare(pkg.id)}>
          {isCompared ? "Compared" : "Compare"}
        </button>
        <button
          type="button"
          className="tourism-secondary-button"
          onClick={() => onAskAgent(pkg)}
        >
          Ask on WhatsApp
        </button>
        <button type="button" className="tourism-primary-button" onClick={() => onBook(pkg.id)}>
          View and Book
        </button>
      </div>
    </div>
  </article>
);

export default PackageCard;

