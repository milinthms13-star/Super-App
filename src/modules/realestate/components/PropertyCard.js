import React from "react";

const PropertyCard = ({
  property,
  isActive,
  isFavorite,
  canManage,
  onSelect,
  onEdit,
  onFavoriteToggle,
}) => (
  <article
    className={`realestate-property-card ${isActive ? "active" : ""}`}
    onClick={() => onSelect(property.id)}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === "Space") {
        event.preventDefault();
        onSelect(property.id);
      }
    }}
    role="button"
    tabIndex={0}
  >
    <div className="realestate-property-topline">
      <span className={`realestate-badge ${property.verified ? "verified" : "pending"}`}>
        {property.verificationStatus}
      </span>
      {property.featured ? <span className="realestate-badge featured">Featured</span> : null}
      <span
        className={`realestate-badge ${
          property.status === "available" ? "available" : property.status === "sold" ? "sold" : "rented"
        }`}
      >
        {property.status}
      </span>
    </div>
    <div className="realestate-property-media-gallery">
      {property.image ? <img src={property.image} alt={property.title} className="realestate-property-image" /> : null}
      <div className="realestate-property-media-meta">
        <strong>{property.mediaGallery.length || property.mediaCount} media assets</strong>
        <span>{property.hasVideoTour ? "Video tour available" : "Image gallery available"}</span>
      </div>
    </div>
    <div className="realestate-property-copy">
      <h3>{property.title}</h3>
      <p className="realestate-price">{property.priceLabel}</p>
      <p>{property.location} · {property.locality}</p>
      <p>{property.type} · {property.bedrooms || "Studio"} bed · {property.area}</p>
      <div className="realestate-property-meta">
        <span>{property.furnishing}</span>
        <span>{property.leads.length} leads</span>
        <span>{property.rating.toFixed(1)} rating</span>
      </div>
    </div>
    <div className="realestate-card-actions">
      <span>{property.listedBy}</span>
      {canManage ? (
        <button
          type="button"
          className="realestate-inline-button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(property);
          }}
        >
          Edit
        </button>
      ) : null}
      <button
        type="button"
        className="realestate-inline-button"
        onClick={(event) => {
          event.stopPropagation();
          onFavoriteToggle(property);
        }}
        aria-label={`${isFavorite ? "Remove" : "Add"} ${property.title} to favorites`}
      >
        {isFavorite ? "Saved" : "Save"}
      </button>
    </div>
  </article>
);

export default PropertyCard;

