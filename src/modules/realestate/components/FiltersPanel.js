import React, { useEffect, useMemo, useState } from "react";

const FiltersPanel = ({
  filters,
  onChange,
  onApply,
  onReset,
  locations,
  propertyTypes,
  amenities,
  maxPrice,
  maxArea,
}) => {
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const updateDraft = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
    if (typeof onChange === "function") {
      onChange(key, value);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if ((draftFilters.searchText || "").trim()) count += 1;
    if (draftFilters.intentFilter !== "all") count += 1;
    if (draftFilters.locationFilter !== "All") count += 1;
    if (draftFilters.typeFilter !== "All") count += 1;
    if (Number(draftFilters.maxPriceFilter) < Math.max(1, Math.round(maxPrice))) count += 1;
    if (Number(draftFilters.minSqftFilter) > 0) count += 1;
    if (draftFilters.sourceFilter !== "all") count += 1;
    if (draftFilters.possessionFilter !== "all") count += 1;
    if (draftFilters.nearbyFilter !== "all") count += 1;
    if (draftFilters.amenityFilter !== "all") count += 1;
    if (draftFilters.verifiedFilter !== "all") count += 1;
    if (draftFilters.sortBy !== "featured") count += 1;
    return count;
  }, [draftFilters, maxPrice]);

  return (
    <article className="realestate-filter-card">
      <div className="realestate-section-heading">
        <h2>Smart search</h2>
        <p>Advanced filters for budget, area, possession, locality signals, and listing trust.</p>
      </div>

      <div className="realestate-filter-grid">
        <label className="realestate-field">
          <span>Search</span>
          <input
            type="text"
            value={draftFilters.searchText}
            onChange={(event) => updateDraft("searchText", event.target.value)}
            placeholder="Title, location, seller, landmark"
            aria-label="Search properties by title, location, seller, or locality"
          />
        </label>

        <label className="realestate-field">
          <span>Listing intent</span>
          <select value={draftFilters.intentFilter} onChange={(event) => updateDraft("intentFilter", event.target.value)}>
            <option value="all">All</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
            <option value="project">Projects</option>
          </select>
        </label>

        <label className="realestate-field">
          <span>Location</span>
          <select value={draftFilters.locationFilter} onChange={(event) => updateDraft("locationFilter", event.target.value)}>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label className="realestate-field">
          <span>Property type</span>
          <select value={draftFilters.typeFilter} onChange={(event) => updateDraft("typeFilter", event.target.value)}>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="realestate-field">
          <span>Max budget (Lakhs): {Math.round(draftFilters.maxPriceFilter)}</span>
          <input
            type="range"
            min="1"
            max={Math.max(1, Math.round(maxPrice))}
            value={draftFilters.maxPriceFilter}
            onChange={(event) => updateDraft("maxPriceFilter", Number(event.target.value))}
          />
        </label>

        <label className="realestate-field">
          <span>Min area (sq ft): {Math.round(draftFilters.minSqftFilter)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(100, Math.round(maxArea))}
            value={draftFilters.minSqftFilter}
            onChange={(event) => updateDraft("minSqftFilter", Number(event.target.value))}
          />
        </label>

        <label className="realestate-field">
          <span>Listing source</span>
          <select value={draftFilters.sourceFilter} onChange={(event) => updateDraft("sourceFilter", event.target.value)}>
            <option value="all">Owner / Agent / Builder</option>
            <option value="Owner">Owner</option>
            <option value="Agent">Agent</option>
            <option value="Builder">Builder</option>
          </select>
        </label>

        <label className="realestate-field">
          <span>Possession status</span>
          <select
            value={draftFilters.possessionFilter}
            onChange={(event) => updateDraft("possessionFilter", event.target.value)}
          >
            <option value="all">All</option>
            <option value="ready">Ready to move</option>
            <option value="under-construction">Under construction</option>
          </select>
        </label>

        <label className="realestate-field">
          <span>Nearby signal</span>
          <select value={draftFilters.nearbyFilter} onChange={(event) => updateDraft("nearbyFilter", event.target.value)}>
            <option value="all">Any</option>
            <option value="school">School within 3 km</option>
            <option value="hospital">Hospital within 3 km</option>
            <option value="metro">Metro within 2.5 km</option>
          </select>
        </label>

        <label className="realestate-field">
          <span>Sort by</span>
          <select value={draftFilters.sortBy} onChange={(event) => updateDraft("sortBy", event.target.value)}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="popularity">Popularity</option>
          </select>
        </label>

        <label className="realestate-field">
          <span>Amenity</span>
          <select value={draftFilters.amenityFilter} onChange={(event) => updateDraft("amenityFilter", event.target.value)}>
            <option value="all">All amenities</option>
            {amenities.map((amenity) => (
              <option key={amenity} value={amenity}>
                {amenity}
              </option>
            ))}
          </select>
        </label>

        <label className="realestate-field">
          <span>Verified view</span>
          <select value={draftFilters.verifiedFilter} onChange={(event) => updateDraft("verifiedFilter", event.target.value)}>
            <option value="all">All listings</option>
            <option value="verified-only">Verified only</option>
            <option value="ready-only">Ready-to-move only</option>
          </select>
        </label>
      </div>

      <div className="realestate-filter-actions">
        <span className="realestate-filter-summary">{activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}</span>
        <button type="button" className="realestate-inline-button" onClick={onReset}>
          Clear filters
        </button>
        <button type="button" className="realestate-primary-button" onClick={() => onApply(draftFilters)}>
          Apply filters
        </button>
        <button
          type="button"
          className="realestate-secondary-button"
          onClick={() =>
            setDraftFilters((current) => ({
              ...current,
              nearbyFilter: "metro",
              verifiedFilter: "verified-only",
              possessionFilter: "ready",
            }))
          }
        >
          Nearby + Verified
        </button>
      </div>
    </article>
  );
};

export default FiltersPanel;
