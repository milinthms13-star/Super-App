import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import PropertyCard from "./components/PropertyCard";
import PropertyDetailTabs from "./components/PropertyDetailTabs";
import QuickFilters from "./components/QuickFilters";
import LoanCalculator from "./components/LoanCalculator";
import PopularLocations from "./components/PopularLocations";
import PropertyCategories from "./components/PropertyCategories";
import {
  ALL_SEED_PROPERTIES,
  HOME_LOAN_PARTNERS,
  MARKET_TRENDS,
  RBI_RATE_INFO,
} from "./realEstateConstants";
import {
  calculateEMI,
  normalizeProperty,
} from "./realEstateUtils";

const WORKSPACE_VIEWS = [
  {
    id: "preview",
    title: "360 Preview",
    subtitle: "Immersive property tour",
    label: "Open tour",
    description:
      "Walk through images, videos, floor plans, and neighborhood context in a single command center.",
  },
  {
    id: "insights",
    title: "Market Pulse",
    subtitle: "Pricing, demand, and offer signals",
    label: "See insights",
    description:
      "Compare similar homes, pricing trends, and nearby market signals before making decisions.",
  },
  {
    id: "connect",
    title: "Seller Connect",
    subtitle: "Talk, schedule, and save with ease",
    label: "Connect now",
    description:
      "Stay on top of leads, schedule visits, and keep seller communication in a single workspace.",
  },
];

const HomeSphere = ({ onNavigateToDashboard }) => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    mockData,
    sendRealEstateEnquiry = async () => null,
    sendRealEstateMessage = async () => null,
    scheduleRealEstateVisit = async () => null,
    addRealEstateReview = async () => null,
    reportRealEstateListing = async () => null,
  } = useApp();

  // Core filtering state
  const [searchText, setSearchText] = useState("");
  const [intentFilter, setIntentFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [readyToMoveOnly, setReadyToMoveOnly] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedWorkspaceIndex, setSelectedWorkspaceIndex] = useState(0);

  // Property detail state
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reportReason, setReportReason] = useState("");
  const [visitDateTime, setVisitDateTime] = useState("");
  const [visitMode, setVisitMode] = useState("onsite");
  const [visitNote, setVisitNote] = useState("");

  // Loan calculator state
  const [loanAmount, setLoanAmount] = useState("72");
  const [loanTenure, setLoanTenure] = useState("20");
  const [loanInterest, setLoanInterest] = useState("8.5");
  const [loanEstimateResult, setLoanEstimateResult] = useState("");
  const [loanEligibility, setLoanEligibility] = useState({ monthlyIncome: "95000", existingEmi: "15000" });

  // Nominatim search autocomplete
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const nominatimDebounce = useRef(null);

  const fetchLocationSuggestions = useCallback((query) => {
    clearTimeout(nominatimDebounce.current);
    if (!query || query.length < 3) { setLocationSuggestions([]); return; }
    nominatimDebounce.current = setTimeout(async () => {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en", "User-Agent": "HomeSphere/1.0" } }
        );
        const data = await resp.json();
        setLocationSuggestions(
          data.map((item) => ({
            label: item.display_name.split(",").slice(0, 3).join(", "),
            city: item.address?.city || item.address?.town || item.address?.village || "",
          }))
        );
        setShowLocationSuggestions(true);
      } catch { setLocationSuggestions([]); }
    }, 400);
  }, []);

  const [asyncState, setAsyncState] = useState({
    enquiry: false,
    message: false,
    visitCreate: false,
    review: false,
    report: false,
  });

  const [toasts, setToasts] = useState([]);

  const pushToast = (message, type = "success") => {
    const toast = { id: `hs-toast-${Date.now()}`, message, type };
    setToasts((current) => [toast, ...current].slice(0, 5));
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 3800);
  };

  // Load properties — use ALL_SEED_PROPERTIES (6 properties across India) as fallback
  const sourceProperties = useMemo(() => {
    const incomingProperties = Array.isArray(mockData?.realestateProperties)
      ? mockData.realestateProperties
      : [];
    return incomingProperties.length > 0
      ? incomingProperties
      : ALL_SEED_PROPERTIES;
  }, [mockData?.realestateProperties]);

  const properties = useMemo(
    () => sourceProperties.map((property, index) => normalizeProperty(property, index)),
    [sourceProperties]
  );

  // Extract metadata
  const locations = useMemo(
    () => ["All", ...new Set(properties.map((property) => property.location))],
    [properties]
  );

  const propertyTypes = useMemo(
    () => ["All", ...new Set(properties.map((property) => property.type))],
    [properties]
  );

  const listingSectionRef = useRef(null);

  const handleExploreListings = () => {
    setIntentFilter("all");
    listingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const heroStats = useMemo(() => {
    const verifiedCount = properties.filter((property) => property.verified).length;
    const readyCount = properties.filter((property) => property.readyToMove).length;
    const avgPrice =
      properties.length > 0
        ? Math.round(
            properties.reduce((total, property) => total + (property.priceValue || 0), 0) /
              properties.length
          )
        : 0;

    return {
      total: properties.length,
      verified: verifiedCount,
      ready: readyCount,
      avgPrice,
    };
  }, [properties]);

  // Active city market trend chip
  const activeTrend = useMemo(() => {
    const city = locationFilter !== "All" ? locationFilter : null;
    if (!city) return null;
    const entry = Object.entries(MARKET_TRENDS).find(([k]) => k.toLowerCase() === city.toLowerCase());
    return entry ? entry[1] : null;
  }, [locationFilter]);

  // Apply filters
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const searchHaystack = [
        property.title,
        property.location,
        property.locality,
        property.type,
        property.sellerName,
        property.description,
        property.landmark,
        property.address,
        ...(property.amenities || []),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText || searchHaystack.includes(searchText.toLowerCase());
      const matchesIntent =
        intentFilter === "all" || property.intent === intentFilter;
      const matchesType = typeFilter === "All" || property.type === typeFilter;
      const matchesLocation =
        locationFilter === "All" || property.location === locationFilter;
      const matchesVerified =
        !verifiedOnly || property.verified || property.readyToMove;
      const matchesReady = !readyToMoveOnly || property.readyToMove;

      return (
        matchesSearch &&
        matchesIntent &&
        matchesType &&
        matchesLocation &&
        matchesVerified &&
        matchesReady
      );
    });
  }, [properties, searchText, intentFilter, typeFilter, locationFilter, verifiedOnly, readyToMoveOnly]);

  // Sort properties
  const sortedProperties = useMemo(() => {
    const copy = [...filteredProperties];
    if (sortBy === "price-asc") return copy.sort((a, b) => a.priceValue - b.priceValue);
    if (sortBy === "price-desc") return copy.sort((a, b) => b.priceValue - a.priceValue);
    if (sortBy === "newest") return copy.sort((a, b) => new Date(b.postedOn) - new Date(a.postedOn));
    if (sortBy === "rating") return copy.sort((a, b) => b.rating - a.rating);
    if (sortBy === "ppsf-asc") return copy.sort((a, b) => {
      const pa = a.areaSqft > 0 ? (a.priceValue * 100000) / a.areaSqft : Infinity;
      const pb = b.areaSqft > 0 ? (b.priceValue * 100000) / b.areaSqft : Infinity;
      return pa - pb;
    });
    return copy; // featured
  }, [filteredProperties, sortBy]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const workspaceProperties = useMemo(() => {
    const topProperties = sortedProperties.length > 0 ? sortedProperties : properties;
    return topProperties.slice(0, 3);
  }, [sortedProperties, properties]);

  const workspaceCount = workspaceProperties.length;

  const handleNextWorkspace = () => {
    if (workspaceCount === 0) return;
    setSelectedWorkspaceIndex((index) => (index + 1) % workspaceCount);
  };

  const selectedWorkspaceProperty = useMemo(
    () => workspaceProperties[selectedWorkspaceIndex] || workspaceProperties[0] || null,
    [workspaceProperties, selectedWorkspaceIndex]
  );

  useEffect(() => {
    if (selectedWorkspaceIndex >= workspaceCount) {
      setSelectedWorkspaceIndex(0);
    }
  }, [selectedWorkspaceIndex, workspaceCount]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.id)),
    [favorites]
  );

  const redirectToWorkspace = ({ postingType = "property" } = {}) => {
    // Use "seller" so both legacy and current real-estate shells route correctly.
    const movedToDashboard = onNavigateToDashboard?.("seller", { postingType });
    if (!movedToDashboard) {
      pushToast("Posting workspace is currently unavailable. Please try again.", "info");
    }
    return movedToDashboard;
  };

  const handlePostPropertyClick = () => redirectToWorkspace({ postingType: "property" });
  const handlePostRequirementClick = () => redirectToWorkspace({ postingType: "requirement" });

  const handleFavoriteToggle = (property) => {
    const fullId = `realestate-${property.id}`;
    if (favoriteIds.has(fullId)) {
      removeFavorite(fullId);
      pushToast("Removed from favorites");
    } else {
      addToFavorites({
        id: fullId,
        domain: "realestate",
        title: property.title || "Property",
        priceLabel: property.priceLabel || "",
        location: property.location || "",
        type: property.type || "Property",
      });
      pushToast("Added to favorites");
    }
  };

  const handleEnquirySubmit = async () => {
    if (!selectedProperty) return;
    setAsyncState((s) => ({ ...s, enquiry: true }));
    try {
      await sendRealEstateEnquiry(selectedProperty.id, {
        message: enquiryMessage.trim(),
        channel: "Enquiry",
      });
      pushToast(enquiryMessage.trim() ? "Enquiry sent successfully" : "Quick enquiry sent");
      setEnquiryMessage("");
    } finally {
      setAsyncState((s) => ({ ...s, enquiry: false }));
    }
  };

  const handleSendMessage = async (messageOverride = "") => {
    const text = messageOverride.trim() || chatInput.trim();
    if (!text || !selectedProperty) return;
    setAsyncState((s) => ({ ...s, message: true }));
    try {
      await sendRealEstateMessage(selectedProperty.id, { text });
      pushToast("Message sent successfully");
      if (!messageOverride) {
        setChatInput("");
      }
    } finally {
      setAsyncState((s) => ({ ...s, message: false }));
    }
  };

  const handleVisitSchedule = async () => {
    if (!selectedProperty || !visitDateTime) {
      pushToast("Pick a visit date and time before scheduling.", "error");
      return;
    }

    setAsyncState((s) => ({ ...s, visitCreate: true }));
    try {
      await scheduleRealEstateVisit(selectedProperty.id, {
        scheduledAt: new Date(visitDateTime).toISOString(),
        durationMinutes: 45,
        mode: visitMode,
        note: visitNote.trim(),
      });
      setVisitDateTime("");
      setVisitMode("onsite");
      setVisitNote("");
      pushToast("Visit scheduled successfully");
    } finally {
      setAsyncState((s) => ({ ...s, visitCreate: false }));
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim() || !selectedProperty) return;
    setAsyncState((s) => ({ ...s, review: true }));
    try {
      await addRealEstateReview(selectedProperty.id, {
        rating: Number(reviewRating),
        comment: reviewComment,
      });
      pushToast("Review submitted");
      setReviewComment("");
    } finally {
      setAsyncState((s) => ({ ...s, review: false }));
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim() || !selectedProperty) return;
    setAsyncState((s) => ({ ...s, report: true }));
    try {
      await reportRealEstateListing(selectedProperty.id, {
        reason: reportReason,
      });
      pushToast("Report submitted. Our team will review it.");
      setReportReason("");
    } finally {
      setAsyncState((s) => ({ ...s, report: false }));
    }
  };

  const handleLoanEstimate = () => {
    // calculateEMI(amountInLakhs, annualRatePct, tenureYears)
    const emi = calculateEMI(
      Number(loanAmount),
      Number(loanInterest),
      Number(loanTenure)
    );
    setLoanEstimateResult(`EMI: ₹${Math.round(emi).toLocaleString("en-IN")}/month`);
  };

  const bankComparison = useMemo(
    () =>
      HOME_LOAN_PARTNERS.map((partner, index) => ({
        ...partner,
        processingFee: index === 0 ? 0.5 : 0.75,
      })),
    []
  );

  return (
    <div className="realestate-shell homesphere-shell">
      {/* PREMIUM SEARCH HERO */}
      <section className="homesphere-hero">
        <div className="homesphere-hero-content">
          <div className="homesphere-hero-kicker">HomeSphere Premium</div>
          <h1>Find your next home with confidence</h1>
          <p>Search verified homes, rentals, and plots in one clean space. Discover faster, compare better, and connect instantly.</p>

          {/* INTENT TOGGLE */}
          <div className="homesphere-intent-toggle">
            {[
              { value: "all", label: "All" },
              { value: "sale", label: "Buy" },
              { value: "rent", label: "Rent" },
              { value: "project", label: "Commercial" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`homesphere-toggle-btn ${intentFilter === option.value ? "active" : ""}`}
                onClick={() => setIntentFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* SEARCH BAR + LOCATION + TYPE */}
          <div className="homesphere-search-row" style={{ position: "relative" }}>
            <input
              type="text"
              className="homesphere-search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by location, landmark, builder..."
            />
            <div className="hs-location-autocomplete" style={{ position: "relative" }}>
              <input
                type="text"
                className="homesphere-search-select"
                placeholder="City or area…"
                value={locationFilter === "All" ? "" : locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value || "All");
                  fetchLocationSuggestions(e.target.value);
                }}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                aria-label="Filter by location"
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <ul className="hs-location-suggestions" role="listbox">
                  {locationSuggestions.map((s, i) => (
                    <li
                      key={i}
                      role="option"
                      className="hs-location-suggestion-item"
                      onMouseDown={() => {
                        const city = s.city || s.label.split(",")[0];
                        setLocationFilter(city);
                        setShowLocationSuggestions(false);
                      }}
                    >
                      📍 {s.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select
              className="homesphere-search-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* MARKET TREND CHIP */}
          {activeTrend && (
            <div className="hs-trend-chips">
              <span className="hs-trend-chip">
                📈 {locationFilter}: +{activeTrend.yoyGrowthPct}% YoY
              </span>
              <span className="hs-trend-chip">
                💰 ₹{activeTrend.avgPricePerSqft.toLocaleString("en-IN")}/sqft
              </span>
              <span className="hs-trend-chip hs-trend-demand">
                {activeTrend.demandIndex} demand
              </span>
            </div>
          )}

          {/* RBI RATE TICKER */}
          <div className="hs-rbi-ticker">
            🏦 RBI repo: <strong>{RBI_RATE_INFO.repoRate}%</strong> · Home loans: <strong>{RBI_RATE_INFO.homeLoansRangeMin}–{RBI_RATE_INFO.homeLoansRangeMax}%</strong> · {RBI_RATE_INFO.lastUpdated}
          </div>

          <div className="homesphere-hero-actions">
            <button
              type="button"
              className="realestate-primary-button"
              onClick={handlePostPropertyClick}
            >
              Post Property
            </button>
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={handlePostRequirementClick}
            >
              Post Requirement
            </button>
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={handleExploreListings}
            >
              Explore Listings
            </button>
          </div>
        </div>

        <div className="homesphere-hero-panel">
          <h2>Market snapshot</h2>
          <div className="homesphere-hero-stats">
            <div className="homesphere-stat-tile">
              <strong>{heroStats.total}</strong>
              <span>Active listings</span>
            </div>
            <div className="homesphere-stat-tile">
              <strong>{heroStats.verified}</strong>
              <span>Verified homes</span>
            </div>
            <div className="homesphere-stat-tile">
              <strong>{heroStats.ready}</strong>
              <span>Ready to move</span>
            </div>
            <div className="homesphere-stat-tile">
              <strong>{heroStats.avgPrice.toLocaleString("en-IN")}</strong>
              <span>Avg budget (lakhs)</span>
            </div>
          </div>
        </div>
      </section>

      {/* HOMESPHERE 360 COMMAND CENTER */}
      <section className="homesphere-360-shell">
        <div className="homesphere-360-header">
          <div>
            <div className="homesphere-360-kicker">HomeSphere 360</div>
            <h2>Jump into a full property command center</h2>
            <p>
              Preview homes, compare trends, and take action from a unified workspace without leaving your search.
            </p>
            <div className="homesphere-360-view-cards">
              {WORKSPACE_VIEWS.map((view) => (
                <div key={view.id} className="homesphere-360-view-card">
                  <strong>{view.title}</strong>
                  <span>{view.subtitle}</span>
                </div>
              ))}
            </div>
           </div>
           <div className="homesphere-360-toolbar">
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={handleNextWorkspace}
            >
              Next workspace
            </button>
            <button
              type="button"
              className="realestate-primary-button"
              onClick={() => {
                if (selectedWorkspaceProperty) {
                  setSelectedPropertyId(selectedWorkspaceProperty.id);
                  pushToast(`Selected ${selectedWorkspaceProperty.title} for deeper review.`);
                }
              }}
            >
              Open listing
            </button>
          </div>
        </div>

        <div className="homesphere-360-panel">
          <div className="homesphere-360-preview">
            {selectedWorkspaceProperty ? (
              <div
                className="homesphere-360-preview-image"
                style={{
                  backgroundImage: `url(${selectedWorkspaceProperty.image || selectedWorkspaceProperty.mediaGallery[0]?.url || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&h=800&fit=crop"})`,
                }}
              >
                <div className="homesphere-360-preview-badge">
                  {selectedWorkspaceProperty.intent === "rent" ? "Rental" : "For Sale"}
                </div>
                <div className="homesphere-360-preview-copy">
                  <strong>{selectedWorkspaceProperty.title}</strong>
                  <span>{selectedWorkspaceProperty.location} • {selectedWorkspaceProperty.area}</span>
                </div>
              </div>
            ) : (
              <div className="homesphere-360-placeholder">
                <p>No workspace property is available right now.</p>
              </div>
            )}
          </div>

          <aside className="homesphere-360-sidebar">
            <div className="homesphere-workspace-chips">
              {workspaceProperties.map((property, index) => (
                <button
                  key={property.id}
                  type="button"
                  className={`homesphere-workspace-chip ${selectedWorkspaceIndex === index ? "active" : ""}`}
                  onClick={() => setSelectedWorkspaceIndex(index)}
                >
                  <span>{property.location}</span>
                  <small>{property.type}</small>
                </button>
              ))}
            </div>
            <div className="homesphere-workspace-details">
              <h3>{selectedWorkspaceProperty?.title || "Workspace preview"}</h3>
              <p>{selectedWorkspaceProperty?.description || "Select a workspace to preview property details, tour media, and launch action workflows."}</p>
              {selectedWorkspaceProperty ? (
                <ul>
                  <li><strong>Price:</strong> {selectedWorkspaceProperty.priceLabel}</li>
                  <li><strong>Area:</strong> {selectedWorkspaceProperty.area}</li>
                  <li><strong>Bedrooms:</strong> {selectedWorkspaceProperty.bedrooms}</li>
                  <li><strong>Bathrooms:</strong> {selectedWorkspaceProperty.bathrooms}</li>
                </ul>
              ) : null}
            </div>
            <div className="homesphere-workspace-actions">
              <button
                type="button"
                className="realestate-primary-button"
                onClick={() => {
                  if (selectedWorkspaceProperty) {
                    setSelectedPropertyId(selectedWorkspaceProperty.id);
                    pushToast("Workspace item selected. Scroll to listing for full details.");
                    listingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              >
                Review listing
              </button>
              <button
                type="button"
                className="realestate-secondary-button"
                onClick={() => pushToast("360 workspace insights loaded. Open property report to continue.")}
              >
                View insights
              </button>
            </div>
          </aside>
        </div>
      </section>

      {/* QUICK FILTER CHIPS */}
      <QuickFilters
        verifiedOnly={verifiedOnly}
        onVerifiedToggle={() => setVerifiedOnly(!verifiedOnly)}
        readyToMoveOnly={readyToMoveOnly}
        onReadyToggle={() => setReadyToMoveOnly(!readyToMoveOnly)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        resultCount={sortedProperties.length}
      />

      <div className="homesphere-main-layout">
        {/* FEATURED LISTINGS GRID */}
        <section className="homesphere-listings-section">
          <article className="homesphere-listings-container">
            <div className="homesphere-listings-header" ref={listingSectionRef}>
              <h2>Featured properties</h2>
              <p>Tap a listing to open complete details and owner actions.</p>
            </div>
            {sortedProperties.length === 0 ? (
              <div className="homesphere-empty-state">
                <h3>No properties match your search</h3>
                <p>Try adjusting filters or exploring all listings</p>
                <button
                  type="button"
                  className="realestate-inline-button"
                  onClick={() => {
                    setSearchText("");
                    setVerifiedOnly(false);
                    setReadyToMoveOnly(false);
                    setTypeFilter("All");
                    setLocationFilter("All");
                  }}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="homesphere-property-grid">
                {sortedProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isActive={selectedProperty?.id === property.id}
                    isFavorite={favoriteIds.has(`realestate-${property.id}`)}
                    onSelect={setSelectedPropertyId}
                    onFavoriteToggle={handleFavoriteToggle}
                    hasSubscription={currentUser?.subscriptionStatus === "active" || currentUser?.isPremium}
                    onSubscribeClick={() => {
                      pushToast("Subscribe to view contact details of property posters!", "info");
                    }}
                  />
                ))}
              </div>
            )}
          </article>
        </section>

        {/* PROPERTY DETAIL PANEL (STICKY RIGHT) */}
        <aside className="homesphere-detail-panel">
          <article className="homesphere-detail-card">
            {selectedProperty ? (
              <PropertyDetailTabs
                property={selectedProperty}
                canManage={false}
                loanCalculator={
                  <LoanCalculator
                    loanAmount={loanAmount}
                    setLoanAmount={setLoanAmount}
                    loanTenure={loanTenure}
                    setLoanTenure={setLoanTenure}
                    loanInterest={loanInterest}
                    setLoanInterest={setLoanInterest}
                    loanEligibility={loanEligibility}
                    setLoanEligibility={setLoanEligibility}
                    bankComparison={bankComparison}
                    loanEstimateResult={loanEstimateResult}
                    onEstimate={handleLoanEstimate}
                    propertyLocation={selectedProperty?.location}
                    propertyPriceValue={selectedProperty?.priceValue}
                    isUnderConstruction={selectedProperty?.underConstruction}
                    loading={false}
                  />
                }
                uiMessages={{
                  onRequestDocuments: () =>
                    pushToast("Document request drafted. Owner can share files in chat."),
                  onViewVerificationHistory: () =>
                    pushToast("Verification timeline opened (demo)."),
                  messages: (
                    <section className="homesphere-chat-section">
                      <div className="realestate-section-heading">
                        <h3>
                          {selectedProperty?.postingType === "requirement"
                            ? "Contact buyer"
                            : "Contact owner"}
                        </h3>
                      </div>
                      <div className="homesphere-message-composer">
                        <textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={
                            selectedProperty?.postingType === "requirement"
                              ? "Share a matching property for this requirement..."
                              : "Ask about the property..."
                          }
                          rows="3"
                        />
                        <button
                          type="button"
                          className="realestate-primary-button"
                          onClick={handleSendMessage}
                          disabled={asyncState.message}
                        >
                          {asyncState.message ? "Sending..." : "Send message"}
                        </button>
                      </div>
                    </section>
                  ),
                  reviews: (
                    <section className="homesphere-review-section">
                      <div className="realestate-section-heading">
                        <h3>Reviews and Report</h3>
                      </div>
                      <div className="homesphere-review-list">
                        {selectedProperty?.reviews?.length ? (
                          selectedProperty.reviews.map((review, idx) => (
                            <div key={idx} className="homesphere-review-item">
                              <strong>{review.author}</strong>
                              <span>{review.score}/5</span>
                              <p>{review.comment}</p>
                            </div>
                          ))
                        ) : (
                          <p className="homesphere-no-reviews">No reviews yet</p>
                        )}
                      </div>
                      <div className="homesphere-review-form">
                        <label>
                          <span>Rating</span>
                          <select
                            value={reviewRating}
                            onChange={(e) => setReviewRating(e.target.value)}
                          >
                            {["5", "4", "3", "2", "1"].map((s) => (
                              <option key={s} value={s}>
                                {s} / 5
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Comment</span>
                          <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="Share your experience..."
                            rows="2"
                          />
                        </label>
                        <button
                          type="button"
                          className="realestate-inline-button"
                          onClick={handleReviewSubmit}
                          disabled={asyncState.review}
                        >
                          {asyncState.review ? "Submitting..." : "Submit review"}
                        </button>
                      </div>
                      <label>
                        <span>Report concern</span>
                        <textarea
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder="Why is this listing suspicious?"
                          rows="2"
                        />
                      </label>
                      <button
                        type="button"
                        className="realestate-inline-button danger"
                        onClick={handleReportSubmit}
                        disabled={asyncState.report}
                      >
                        {asyncState.report ? "Reporting..." : "Report listing"}
                      </button>
                    </section>
                  ),
                  actions: (
                    <section className="realestate-chat-card">
                      <div className="realestate-section-heading">
                        <h3>Buyer actions</h3>
                        <p>Send enquiry, schedule visits, and keep communication in one place.</p>
                      </div>
                      <div className="realestate-action-stack">
                        <button
                          type="button"
                          className="realestate-primary-button"
                          onClick={handleEnquirySubmit}
                          disabled={asyncState.enquiry}
                        >
                          {asyncState.enquiry ? "Sending..." : "Send enquiry"}
                        </button>
                        <button
                          type="button"
                          className="realestate-secondary-button"
                          onClick={() =>
                            pushToast(`Call request shared with ${selectedProperty?.sellerName}.`)
                          }
                        >
                          Call owner / agent
                        </button>
                        <button
                          type="button"
                          className="realestate-secondary-button"
                          onClick={() =>
                            handleSendMessage(
                              chatInput.trim() ||
                                `Hi, I'm interested in ${selectedProperty?.title}. Please share more details.`
                            )
                          }
                        >
                          Message seller
                        </button>
                        <button
                          type="button"
                          className="realestate-secondary-button"
                          onClick={() =>
                            pushToast("Property link copied to clipboard for sharing.")
                          }
                        >
                          Share property
                        </button>
                      </div>

                      <label className="realestate-field">
                        <span>Enquiry message</span>
                        <textarea
                          rows="3"
                          value={enquiryMessage}
                          onChange={(event) => setEnquiryMessage(event.target.value)}
                          placeholder="Share budget, move-in timeline, or site visit request"
                        />
                      </label>

                      <div className="realestate-section-heading">
                        <h3>Schedule visit</h3>
                        <p>Book onsite or virtual visits with reminder support.</p>
                      </div>
                      <label className="realestate-field">
                        <span>Visit date and time</span>
                        <input
                          type="datetime-local"
                          value={visitDateTime}
                          onChange={(event) => setVisitDateTime(event.target.value)}
                        />
                      </label>
                      <label className="realestate-field">
                        <span>Visit mode</span>
                        <select
                          value={visitMode}
                          onChange={(event) => setVisitMode(event.target.value)}
                        >
                          <option value="onsite">Onsite</option>
                          <option value="virtual">Virtual</option>
                        </select>
                      </label>
                      <label className="realestate-field">
                        <span>Visit note</span>
                        <textarea
                          rows="2"
                          value={visitNote}
                          onChange={(event) => setVisitNote(event.target.value)}
                          placeholder="Share preferred slot, gate access, or video-call details"
                        />
                      </label>
                      <button
                        type="button"
                        className="realestate-primary-button"
                        onClick={handleVisitSchedule}
                        disabled={asyncState.visitCreate}
                      >
                        {asyncState.visitCreate ? "Scheduling..." : "Schedule visit"}
                      </button>
                    </section>
                  ),
                }}
              />
            ) : (
              <div className="homesphere-detail-empty">
                <h3>Select a property</h3>
                <p>Click any listing to view details, schedule a visit, and contact the owner.</p>
                <button
                  type="button"
                  className="realestate-primary-button"
                  onClick={handlePostPropertyClick}
                >
                  Post your property
                </button>
                <button
                  type="button"
                  className="realestate-secondary-button"
                  onClick={handlePostRequirementClick}
                >
                  Post your requirement
                </button>
              </div>
            )}
          </article>
        </aside>
      </div>

      {/* TOAST NOTIFICATIONS */}
      <div className="homesphere-toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`homesphere-toast homesphere-toast-${toast.type}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* POPULAR LOCATIONS SECTION */}
      <PopularLocations
        locations={locations}
        onLocationClick={(location) => setLocationFilter(location)}
      />

      {/* PROPERTY CATEGORIES SECTION */}
      <PropertyCategories
        propertyTypes={propertyTypes}
        onTypeClick={(type) => setTypeFilter(type)}
      />
    </div>
  );
};

export default HomeSphere;
