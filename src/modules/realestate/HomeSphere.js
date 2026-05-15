import React, { useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import PropertyCard from "./components/PropertyCard";
import PropertyDetailTabs from "./components/PropertyDetailTabs";
import QuickFilters from "./components/QuickFilters";
import LoanCalculator from "./components/LoanCalculator";
import PopularLocations from "./components/PopularLocations";
import PropertyCategories from "./components/PropertyCategories";
import VerifiedAgents from "./components/VerifiedAgents";
import DownloadAppCTA from "./components/DownloadAppCTA";
import {
  HOME_LOAN_PARTNERS,
  REAL_ESTATE_SEED_PROPERTIES,
} from "./realEstateConstants";
import {
  calculateEMI,
  normalizeProperty,
} from "./realEstateUtils";

const HomeSphere = ({ onNavigateToDashboard }) => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    mockData,
    sendRealEstateEnquiry = async () => null,
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

  // Property detail state
  const [chatInput, setChatInput] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reportReason, setReportReason] = useState("");

  // Loan calculator state
  const [loanAmount, setLoanAmount] = useState("72");
  const [loanTenure, setLoanTenure] = useState("20");
  const [loanInterest, setLoanInterest] = useState("8.5");
  const [loanEstimateResult, setLoanEstimateResult] = useState("");
  const [asyncState, setAsyncState] = useState({
    enquiry: false,
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

  // Load properties
  const sourceProperties = useMemo(() => {
    const incomingProperties = Array.isArray(mockData?.realestateProperties)
      ? mockData.realestateProperties
      : [];
    return incomingProperties.length > 0
      ? incomingProperties
      : REAL_ESTATE_SEED_PROPERTIES;
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
    if (sortBy === "newest") return copy.reverse();
    return copy; // featured
  }, [filteredProperties, sortBy]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.id)),
    [favorites]
  );

  const canPostProperty =
    currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business";

  const redirectToSellerDashboard = () => {
    if (!canPostProperty) {
      pushToast("Upgrade to a seller account to post property listings.", "info");
      return false;
    }

    const movedToDashboard = onNavigateToDashboard?.("seller");
    if (!movedToDashboard) {
      pushToast("Posting is available after enabling seller access.", "info");
    }
    return movedToDashboard;
  };

  const handleFavoriteToggle = (propertyId) => {
    const fullId = `realestate-${propertyId}`;
    if (favoriteIds.has(fullId)) {
      removeFavorite(fullId);
      pushToast("Removed from favorites");
    } else {
      addToFavorites({
        id: fullId,
        title: selectedProperty?.title || "Property",
        type: "property",
      });
      pushToast("Added to favorites");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedProperty) return;
    setAsyncState((s) => ({ ...s, enquiry: true }));
    try {
      await sendRealEstateEnquiry({
        propertyId: selectedProperty.id,
        message: chatInput,
        userId: currentUser?.email,
      });
      pushToast("Message sent successfully");
      setChatInput("");
    } finally {
      setAsyncState((s) => ({ ...s, enquiry: false }));
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim() || !selectedProperty) return;
    setAsyncState((s) => ({ ...s, review: true }));
    try {
      await addRealEstateReview({
        propertyId: selectedProperty.id,
        rating: Number(reviewRating),
        comment: reviewComment,
        author: currentUser?.name || "Anonymous",
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
      await reportRealEstateListing({
        propertyId: selectedProperty.id,
        reason: reportReason,
        reporter: currentUser?.email,
      });
      pushToast("Report submitted. Our team will review it.");
      setReportReason("");
    } finally {
      setAsyncState((s) => ({ ...s, report: false }));
    }
  };

  const handleLoanEstimate = () => {
    const emi = calculateEMI(
      Number(loanAmount) * 10,
      Number(loanTenure) * 12,
      Number(loanInterest) / 100 / 12
    );
    setLoanEstimateResult(`₹${Math.round(emi).toLocaleString("en-IN")}/month`);
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
          <div className="homesphere-search-row">
            <input
              type="text"
              className="homesphere-search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by location, landmark, builder..."
            />
            <select
              className="homesphere-search-select"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
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
              onClick={() => setIntentFilter("all")}
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
            <div className="homesphere-listings-header">
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
                      // TODO: Open subscription modal
                      alert("Subscribe to view contact details of property posters!");
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
                    loanEligibility={{}}
                    setLoanEligibility={() => {}}
                    bankComparison={bankComparison}
                    loanEstimateResult={loanEstimateResult}
                    onEstimate={handleLoanEstimate}
                    loading={false}
                  />
                }
                uiMessages={{
                  messages: (
                    <section className="homesphere-chat-section">
                      <div className="realestate-section-heading">
                        <h3>Contact owner</h3>
                      </div>
                      <div className="homesphere-message-composer">
                        <textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about the property..."
                          rows="3"
                        />
                        <button
                          type="button"
                          className="realestate-primary-button"
                          onClick={handleSendMessage}
                          disabled={asyncState.enquiry}
                        >
                          {asyncState.enquiry ? "Sending..." : "Send message"}
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

      {/* VERIFIED AGENTS SECTION */}
      <VerifiedAgents />

      {/* DOWNLOAD APP CTA */}
      <DownloadAppCTA />
    </div>
  );
};

export default HomeSphere;
