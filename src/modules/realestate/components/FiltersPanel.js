import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * FiltersPanel — Professional upgrade
 * - Bedroom count filter
 * - Price per sqft filter
 * - RERA verified filter
 * - Location autocomplete using Nominatim (free OSM geocoding)
 * - Saved searches (localStorage — no backend needed)
 */

const SAVED_SEARCHES_KEY = "re_saved_searches_v1";

const loadSavedSearches = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveSavedSearches = (searches) => {
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches.slice(0, 10)));
  } catch {}
};

// Nominatim location autocomplete (free OpenStreetMap API)
const useNominatimSuggestions = (query) => {
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en", "User-Agent": "HomeSphere/1.0" } }
        );
        const data = await resp.json();
        setSuggestions(
          data.map((item) => ({
            label: item.display_name.split(",").slice(0, 3).join(", "),
            city: item.address?.city || item.address?.town || item.address?.village || item.address?.county || "",
          }))
        );
      } catch {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return suggestions;
};

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
  const [showSaved, setShowSaved] = useState(false);
  const [savedSearches, setSavedSearches] = useState(loadSavedSearches);
  const [searchName, setSearchName] = useState("");
  const [locationQuery, setLocationQuery] = useState(filters.locationFilter !== "All" ? filters.locationFilter : "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const locationSuggestions = useNominatimSuggestions(locationQuery);
  const locationInputRef = useRef(null);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const updateDraft = useCallback((key, value) => {
    setDraftFilters((cur) => ({ ...cur, [key]: value }));
    if (typeof onChange === "function") onChange(key, value);
  }, [onChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if ((draftFilters.searchText || "").trim()) count++;
    if (draftFilters.intentFilter !== "all") count++;
    if (draftFilters.locationFilter !== "All") count++;
    if (draftFilters.typeFilter !== "All") count++;
    if (Number(draftFilters.maxPriceFilter) < Math.max(1, Math.round(maxPrice))) count++;
    if (Number(draftFilters.minSqftFilter) > 0) count++;
    if (draftFilters.sourceFilter !== "all") count++;
    if (draftFilters.possessionFilter !== "all") count++;
    if (draftFilters.nearbyFilter !== "all") count++;
    if (draftFilters.amenityFilter !== "all") count++;
    if (draftFilters.verifiedFilter !== "all") count++;
    if (draftFilters.sortBy !== "featured") count++;
    if (draftFilters.bedroomsFilter && draftFilters.bedroomsFilter !== "all") count++;
    if (draftFilters.reraFilter === "rera-only") count++;
    if (Number(draftFilters.maxPricePerSqft) > 0) count++;
    return count;
  }, [draftFilters, maxPrice]);

  const handleSaveSearch = () => {
    const name = searchName.trim() || `Search ${savedSearches.length + 1}`;
    const newEntry = { name, filters: { ...draftFilters }, savedAt: Date.now() };
    const updated = [newEntry, ...savedSearches].slice(0, 10);
    setSavedSearches(updated);
    saveSavedSearches(updated);
    setSearchName("");
  };

  const handleLoadSavedSearch = (entry) => {
    setDraftFilters(entry.filters);
    setShowSaved(false);
    onApply(entry.filters);
  };

  const handleDeleteSaved = (idx) => {
    const updated = savedSearches.filter((_, i) => i !== idx);
    setSavedSearches(updated);
    saveSavedSearches(updated);
  };

  return (
    <article className="realestate-filter-card">
      <div className="realestate-section-heading">
        <h2>Smart search</h2>
        <p>Advanced filters including RERA, bedroom count, price/sqft, and location autocomplete.</p>
      </div>

      <div className="realestate-filter-grid">
        {/* SEARCH TEXT */}
        <label className="realestate-field">
          <span>Search</span>
          <input
            type="text"
            value={draftFilters.searchText}
            onChange={(e) => updateDraft("searchText", e.target.value)}
            placeholder="Title, location, seller, landmark"
            aria-label="Search properties"
          />
        </label>

        {/* INTENT */}
        <label className="realestate-field">
          <span>Listing intent</span>
          <select value={draftFilters.intentFilter} onChange={(e) => updateDraft("intentFilter", e.target.value)}>
            <option value="all">All</option>
            <option value="sale">Buy</option>
            <option value="rent">Rent</option>
            <option value="project">Projects</option>
          </select>
        </label>

        {/* LOCATION WITH NOMINATIM AUTOCOMPLETE */}
        <label className="realestate-field" style={{ position: "relative" }}>
          <span>Location</span>
          <div className="re-filter-location-wrap">
            <select
              value={draftFilters.locationFilter}
              onChange={(e) => updateDraft("locationFilter", e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <input
              ref={locationInputRef}
              type="text"
              className="re-filter-location-search"
              placeholder="Or search any India city…"
              value={locationQuery}
              onChange={(e) => { setLocationQuery(e.target.value); setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              aria-label="Search location with autocomplete"
            />
          </div>
          {showSuggestions && locationSuggestions.length > 0 && (
            <ul className="re-filter-suggestions" role="listbox">
              {locationSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  role="option"
                  className="re-filter-suggestion-item"
                  onMouseDown={() => {
                    updateDraft("locationFilter", s.city || s.label.split(",")[0]);
                    setLocationQuery(s.city || s.label.split(",")[0]);
                    setShowSuggestions(false);
                  }}
                >
                  📍 {s.label}
                </li>
              ))}
            </ul>
          )}
        </label>

        {/* PROPERTY TYPE */}
        <label className="realestate-field">
          <span>Property type</span>
          <select value={draftFilters.typeFilter} onChange={(e) => updateDraft("typeFilter", e.target.value)}>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        {/* BEDROOMS FILTER (NEW) */}
        <label className="realestate-field">
          <span>Bedrooms</span>
          <select
            value={draftFilters.bedroomsFilter || "all"}
            onChange={(e) => updateDraft("bedroomsFilter", e.target.value)}
          >
            <option value="all">Any</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
            <option value="0">Studio</option>
          </select>
        </label>

        {/* MAX BUDGET */}
        <label className="realestate-field">
          <span>Max budget (Lakhs): {Math.round(draftFilters.maxPriceFilter)}</span>
          <input
            type="range"
            min="1"
            max={Math.max(1, Math.round(maxPrice))}
            value={draftFilters.maxPriceFilter}
            onChange={(e) => updateDraft("maxPriceFilter", Number(e.target.value))}
          />
        </label>

        {/* MIN AREA */}
        <label className="realestate-field">
          <span>Min area (sq ft): {Math.round(draftFilters.minSqftFilter)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(100, Math.round(maxArea))}
            value={draftFilters.minSqftFilter}
            onChange={(e) => updateDraft("minSqftFilter", Number(e.target.value))}
          />
        </label>

        {/* PRICE PER SQFT FILTER (NEW) */}
        <label className="realestate-field">
          <span>Max price per sq ft (₹)</span>
          <input
            type="number"
            placeholder="e.g. 5000"
            value={draftFilters.maxPricePerSqft || ""}
            onChange={(e) => updateDraft("maxPricePerSqft", e.target.value)}
            min="0"
          />
        </label>

        {/* SOURCE */}
        <label className="realestate-field">
          <span>Listing source</span>
          <select value={draftFilters.sourceFilter} onChange={(e) => updateDraft("sourceFilter", e.target.value)}>
            <option value="all">Owner / Agent / Builder</option>
            <option value="Owner">Owner only</option>
            <option value="Agent">Agent only</option>
            <option value="Builder">Builder only</option>
          </select>
        </label>

        {/* POSSESSION */}
        <label className="realestate-field">
          <span>Possession</span>
          <select value={draftFilters.possessionFilter} onChange={(e) => updateDraft("possessionFilter", e.target.value)}>
            <option value="all">All</option>
            <option value="ready">Ready to move</option>
            <option value="under-construction">Under construction</option>
          </select>
        </label>

        {/* NEARBY SIGNAL */}
        <label className="realestate-field">
          <span>Nearby signal</span>
          <select value={draftFilters.nearbyFilter} onChange={(e) => updateDraft("nearbyFilter", e.target.value)}>
            <option value="all">Any</option>
            <option value="school">School within 3 km</option>
            <option value="hospital">Hospital within 3 km</option>
            <option value="metro">Metro within 2.5 km</option>
          </select>
        </label>

        {/* RERA VERIFIED FILTER (NEW) */}
        <label className="realestate-field">
          <span>RERA status</span>
          <select
            value={draftFilters.reraFilter || "all"}
            onChange={(e) => updateDraft("reraFilter", e.target.value)}
          >
            <option value="all">All listings</option>
            <option value="rera-only">RERA registered only</option>
          </select>
        </label>

        {/* SORT */}
        <label className="realestate-field">
          <span>Sort by</span>
          <select value={draftFilters.sortBy} onChange={(e) => updateDraft("sortBy", e.target.value)}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="ppsf-asc">Price/sqft: Low to high</option>
            <option value="rating">Highest rated</option>
          </select>
        </label>

        {/* AMENITY */}
        <label className="realestate-field">
          <span>Amenity</span>
          <select value={draftFilters.amenityFilter} onChange={(e) => updateDraft("amenityFilter", e.target.value)}>
            <option value="all">All amenities</option>
            {amenities.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        {/* VERIFIED VIEW */}
        <label className="realestate-field">
          <span>Verified view</span>
          <select value={draftFilters.verifiedFilter} onChange={(e) => updateDraft("verifiedFilter", e.target.value)}>
            <option value="all">All listings</option>
            <option value="verified-only">Verified only</option>
            <option value="ready-only">Ready-to-move only</option>
          </select>
        </label>
      </div>

      {/* FILTER ACTIONS */}
      <div className="realestate-filter-actions">
        <span className="realestate-filter-summary">
          {activeFilterCount} active filter{activeFilterCount !== 1 ? "s" : ""}
        </span>
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
            setDraftFilters((cur) => ({
              ...cur,
              nearbyFilter: "metro",
              verifiedFilter: "verified-only",
              possessionFilter: "ready",
              reraFilter: "rera-only",
            }))
          }
        >
          Verified + RERA + Metro
        </button>
      </div>

      {/* SAVED SEARCHES */}
      <div className="re-saved-searches">
        <button
          type="button"
          className="re-saved-toggle"
          onClick={() => setShowSaved((s) => !s)}
        >
          💾 {showSaved ? "Hide" : "Saved searches"} ({savedSearches.length})
        </button>

        {showSaved && (
          <div className="re-saved-panel">
            <div className="re-saved-save-row">
              <input
                type="text"
                placeholder="Name this search…"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="re-saved-name-input"
                maxLength={40}
              />
              <button type="button" className="realestate-inline-button" onClick={handleSaveSearch}>
                Save current filters
              </button>
            </div>

            {savedSearches.length === 0 ? (
              <p className="re-saved-empty">No saved searches yet.</p>
            ) : (
              <ul className="re-saved-list">
                {savedSearches.map((entry, idx) => (
                  <li key={entry.savedAt} className="re-saved-item">
                    <button
                      type="button"
                      className="re-saved-load-btn"
                      onClick={() => handleLoadSavedSearch(entry)}
                    >
                      🔖 {entry.name}
                    </button>
                    <span className="re-saved-meta">
                      {new Date(entry.savedAt).toLocaleDateString("en-IN")}
                    </span>
                    <button
                      type="button"
                      className="re-saved-delete-btn"
                      onClick={() => handleDeleteSaved(idx)}
                      aria-label={`Delete saved search: ${entry.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default FiltersPanel;
