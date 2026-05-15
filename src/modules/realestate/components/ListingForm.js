import React from "react";
import { LISTING_TYPE_OPTIONS, TITLE_DEED_OPTIONS } from "../realEstateConstants";

const ListingForm = ({
  activeRole,
  editListingId,
  listingForm,
  fieldErrors,
  loading,
  onInputChange,
  onToggleChange,
  onSubmit,
}) => {
  if (!["owner", "agent", "builder"].includes(activeRole)) {
    return null;
  }

  return (
    <article className="realestate-surface-card">
      <div className="realestate-section-heading">
        <h2>{editListingId ? "Edit ad" : "Post an ad"}</h2>
        <p>{listingForm.postingType === "property" ? "List a property for sale or rent" : "Tell us what you're looking for"}</p>
      </div>

      <form className="realestate-form-grid" onSubmit={onSubmit}>
        {/* POSTING TYPE TOGGLE */}
        <div className="realestate-posting-type-toggle">
          <label className="realestate-toggle-option">
            <input
              type="radio"
              name="postingType"
              value="property"
              checked={listingForm.postingType === "property"}
              onChange={onInputChange}
            />
            <span>🏠 I'm Selling/Renting</span>
          </label>
          <label className="realestate-toggle-option">
            <input
              type="radio"
              name="postingType"
              value="requirement"
              checked={listingForm.postingType === "requirement"}
              onChange={onInputChange}
            />
            <span>🔍 I'm Looking For</span>
          </label>
        </div>

        {/* COMMON FIELDS */}
        <label className="realestate-field">
          <span>Title</span>
          <input name="title" value={listingForm.title} onChange={onInputChange} placeholder={listingForm.postingType === "property" ? "Property title" : "What are you looking for?"} />
          {fieldErrors.title ? <small className="realestate-field-error">{fieldErrors.title}</small> : null}
        </label>

        <label className="realestate-field">
          <span>Intent</span>
          <select name="intent" value={listingForm.intent} onChange={onInputChange}>
            <option value="sale">{listingForm.postingType === "property" ? "Sale" : "Looking to Buy"}</option>
            <option value="rent">{listingForm.postingType === "property" ? "Rent" : "Looking to Rent"}</option>
          </select>
        </label>

        {/* PROPERTY POSTING FIELDS */}
        {listingForm.postingType === "property" ? (
          <>
            <label className="realestate-field">
              <span>Price</span>
              <input name="priceLabel" value={listingForm.priceLabel} onChange={onInputChange} placeholder="Ex: 96 Lakhs" />
              {fieldErrors.priceLabel ? <small className="realestate-field-error">{fieldErrors.priceLabel}</small> : null}
            </label>
          </>
        ) : (
          <>
            <label className="realestate-field">
              <span>Budget (Min)</span>
              <input name="minBudget" value={listingForm.minBudget} onChange={onInputChange} placeholder="Ex: 20 Lakhs" />
            </label>

            <label className="realestate-field">
              <span>Budget (Max)</span>
              <input name="maxBudget" value={listingForm.maxBudget} onChange={onInputChange} placeholder="Ex: 50 Lakhs" />
            </label>
          </>
        )}

        <label className="realestate-field">
          <span>Location</span>
          <input name="location" value={listingForm.location} onChange={onInputChange} />
          {fieldErrors.location ? <small className="realestate-field-error">{fieldErrors.location}</small> : null}
        </label>

        {listingForm.postingType === "requirement" && (
          <label className="realestate-field">
            <span>Other Preferred Areas</span>
            <textarea name="preferredLocations" value={listingForm.preferredLocations} onChange={onInputChange} placeholder="List any other areas you're interested in" rows="2" />
          </label>
        )}

        <label className="realestate-field">
          <span>Locality</span>
          <input name="locality" value={listingForm.locality} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Type</span>
          <select name="type" value={listingForm.type} onChange={onInputChange}>
            {LISTING_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="realestate-field">
          <span>Bedrooms</span>
          <input name="bedrooms" type="number" min="0" value={listingForm.bedrooms} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Bathrooms</span>
          <input name="bathrooms" type="number" min="0" value={listingForm.bathrooms} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Furnishing</span>
          <select name="furnishing" value={listingForm.furnishing} onChange={onInputChange}>
            <option value="Furnished">Furnished</option>
            <option value="Semi Furnished">Semi Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>
        </label>

        <label className="realestate-field">
          <span>Area (sq ft)</span>
          <input name="areaSqft" type="number" min="100" value={listingForm.areaSqft} onChange={onInputChange} />
          {fieldErrors.areaSqft ? <small className="realestate-field-error">{fieldErrors.areaSqft}</small> : null}
        </label>

        <label className="realestate-field">
          <span>Carpet area</span>
          <input name="carpetAreaSqft" type="number" min="0" value={listingForm.carpetAreaSqft} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Built-up area</span>
          <input name="builtUpAreaSqft" type="number" min="0" value={listingForm.builtUpAreaSqft} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Land size</span>
          <input name="landSizeSqft" type="number" min="0" value={listingForm.landSizeSqft} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Floor number</span>
          <input name="floorNumber" type="number" min="0" value={listingForm.floorNumber} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Total floors</span>
          <input name="totalFloors" type="number" min="0" value={listingForm.totalFloors} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Parking spots</span>
          <input name="parkingSpots" type="number" min="0" value={listingForm.parkingSpots} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Age of property (years)</span>
          <input name="propertyAgeYears" type="number" min="0" value={listingForm.propertyAgeYears} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Address</span>
          <input name="address" value={listingForm.address} onChange={onInputChange} />
          {fieldErrors.address ? <small className="realestate-field-error">{fieldErrors.address}</small> : null}
        </label>

        <label className="realestate-field">
          <span>Landmark</span>
          <input name="landmark" value={listingForm.landmark} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Contact phone</span>
          <input name="contactPhone" value={listingForm.contactPhone} onChange={onInputChange} />
          {fieldErrors.contactPhone ? <small className="realestate-field-error">{fieldErrors.contactPhone}</small> : null}
        </label>

        <label className="realestate-field">
          <span>WhatsApp</span>
          <input name="whatsappNumber" value={listingForm.whatsappNumber} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Map latitude</span>
          <input name="mapLocationLat" value={listingForm.mapLocationLat} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Map longitude</span>
          <input name="mapLocationLng" value={listingForm.mapLocationLng} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span className="realestate-field-label-row">
            <span>Photo URLs (one per line)</span>
            <span className="realestate-helper-links">
              <a href="https://imgbb.com/upload" target="_blank" rel="noopener noreferrer">
                Upload via ImgBB
              </a>
              <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer">
                Upload via Postimages
              </a>
            </span>
          </span>
          <textarea rows="3" name="mediaGalleryInput" value={listingForm.mediaGalleryInput} onChange={onInputChange} />
          <small className="realestate-field-hint">Upload there, then paste each direct image URL on a new line.</small>
        </label>

        <label className="realestate-field">
          <span>Video tour URL</span>
          <input name="videoTourUrl" value={listingForm.videoTourUrl} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Floor plan URL</span>
          <input name="floorPlanUrl" value={listingForm.floorPlanUrl} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Brochure PDF URL</span>
          <input name="brochureUrl" value={listingForm.brochureUrl} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Map preview URL</span>
          <input name="mapPreviewUrl" value={listingForm.mapPreviewUrl} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>{listingForm.postingType === "property" ? "Amenities (comma separated)" : "Must-have amenities"}</span>
          <input 
            name={listingForm.postingType === "property" ? "amenitiesInput" : "mustHaveAmenities"} 
            value={listingForm.postingType === "property" ? listingForm.amenitiesInput : listingForm.mustHaveAmenities} 
            onChange={onInputChange} 
            placeholder={listingForm.postingType === "property" ? "WiFi, Parking, Gym..." : "Swimming pool, Gym, Security..."}
          />
        </label>

        {listingForm.postingType === "requirement" && (
          <label className="realestate-field">
            <span>Preferred Move-in Date</span>
            <input 
              type="date"
              name="moveInDate" 
              value={listingForm.moveInDate} 
              onChange={onInputChange} 
            />
          </label>
        )}

        <label className="realestate-field">
          <span>Nearby school (km)</span>
          <input name="nearbySchoolKm" value={listingForm.nearbySchoolKm} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Nearby hospital (km)</span>
          <input name="nearbyHospitalKm" value={listingForm.nearbyHospitalKm} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Nearby metro (km)</span>
          <input name="nearbyMetroKm" value={listingForm.nearbyMetroKm} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>RERA number</span>
          <input name="reraNumber" value={listingForm.reraNumber} onChange={onInputChange} />
        </label>

        <label className="realestate-field">
          <span>Title deed status</span>
          <select name="titleDeedStatus" value={listingForm.titleDeedStatus} onChange={onInputChange}>
            {TITLE_DEED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="realestate-field realestate-field-inline">
          <span>Tax receipt</span>
          <input type="checkbox" checked={listingForm.taxReceipt} onChange={(event) => onToggleChange("taxReceipt", event.target.checked)} />
        </label>

        <label className="realestate-field realestate-field-inline">
          <span>Building permit</span>
          <input type="checkbox" checked={listingForm.buildingPermit} onChange={(event) => onToggleChange("buildingPermit", event.target.checked)} />
        </label>

        <label className="realestate-field realestate-field-inline">
          <span>Encumbrance certificate</span>
          <input type="checkbox" checked={listingForm.encumbranceCertificate} onChange={(event) => onToggleChange("encumbranceCertificate", event.target.checked)} />
        </label>

        <label className="realestate-field realestate-field-inline">
          <span>Ready to move</span>
          <input type="checkbox" checked={listingForm.readyToMove} onChange={(event) => onToggleChange("readyToMove", event.target.checked)} />
        </label>

        <label className="realestate-field realestate-field-inline">
          <span>Under construction</span>
          <input type="checkbox" checked={listingForm.underConstruction} onChange={(event) => onToggleChange("underConstruction", event.target.checked)} />
        </label>

        <label className="realestate-field realestate-field-wide">
          <span>Description</span>
          <textarea rows="4" name="description" value={listingForm.description} onChange={onInputChange} />
        </label>

        <button type="submit" className="realestate-primary-button" disabled={loading}>
          {loading ? "Saving..." : editListingId ? "Update listing" : "Submit listing"}
        </button>
      </form>
    </article>
  );
};

export default ListingForm;
