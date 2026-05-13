import React from "react";

const FiltersPanel = ({
  filters,
  onChange,
  locations,
  propertyTypes,
  amenities,
  maxPrice,
  maxArea,
}) => (
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
          value={filters.searchText}
          onChange={(event) => onChange("searchText", event.target.value)}
          placeholder="Title, location, seller, landmark"
          aria-label="Search properties by title, location, seller, or locality"
        />
      </label>

      <label className="realestate-field">
        <span>Listing intent</span>
        <select value={filters.intentFilter} onChange={(event) => onChange("intentFilter", event.target.value)}>
          <option value="all">All</option>
          <option value="sale">Buy</option>
          <option value="rent">Rent</option>
          <option value="project">Projects</option>
        </select>
      </label>

      <label className="realestate-field">
        <span>Location</span>
        <select value={filters.locationFilter} onChange={(event) => onChange("locationFilter", event.target.value)}>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </label>

      <label className="realestate-field">
        <span>Property type</span>
        <select value={filters.typeFilter} onChange={(event) => onChange("typeFilter", event.target.value)}>
          {propertyTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="realestate-field">
        <span>Max budget (Lakhs): {Math.round(filters.maxPriceFilter)}</span>
        <input
          type="range"
          min="1"
          max={Math.max(1, Math.round(maxPrice))}
          value={filters.maxPriceFilter}
          onChange={(event) => onChange("maxPriceFilter", Number(event.target.value))}
        />
      </label>

      <label className="realestate-field">
        <span>Min area (sq ft): {Math.round(filters.minSqftFilter)}</span>
        <input
          type="range"
          min="0"
          max={Math.max(100, Math.round(maxArea))}
          value={filters.minSqftFilter}
          onChange={(event) => onChange("minSqftFilter", Number(event.target.value))}
        />
      </label>

      <label className="realestate-field">
        <span>Listing source</span>
        <select value={filters.sourceFilter} onChange={(event) => onChange("sourceFilter", event.target.value)}>
          <option value="all">Owner / Agent / Builder</option>
          <option value="Owner">Owner</option>
          <option value="Agent">Agent</option>
          <option value="Builder">Builder</option>
        </select>
      </label>

      <label className="realestate-field">
        <span>Possession status</span>
        <select
          value={filters.possessionFilter}
          onChange={(event) => onChange("possessionFilter", event.target.value)}
        >
          <option value="all">All</option>
          <option value="ready">Ready to move</option>
          <option value="under-construction">Under construction</option>
        </select>
      </label>

      <label className="realestate-field">
        <span>Nearby signal</span>
        <select value={filters.nearbyFilter} onChange={(event) => onChange("nearbyFilter", event.target.value)}>
          <option value="all">Any</option>
          <option value="school">School nearby</option>
          <option value="hospital">Hospital nearby</option>
          <option value="metro">Metro nearby</option>
        </select>
      </label>

      <label className="realestate-field">
        <span>Sort by</span>
        <select value={filters.sortBy} onChange={(event) => onChange("sortBy", event.target.value)}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
          <option value="popularity">Popularity</option>
        </select>
      </label>

      <label className="realestate-field">
        <span>Amenity</span>
        <select value={filters.amenityFilter} onChange={(event) => onChange("amenityFilter", event.target.value)}>
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
        <select value={filters.verifiedFilter} onChange={(event) => onChange("verifiedFilter", event.target.value)}>
          <option value="all">All listings</option>
          <option value="verified-only">Verified only</option>
          <option value="ready-only">Ready-to-move only</option>
        </select>
      </label>
    </div>
  </article>
);

export default FiltersPanel;

