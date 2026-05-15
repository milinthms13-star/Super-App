import React, { useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import ListingCard from "./components/ListingCard";
import ListingDetailTabs from "./components/ListingDetailTabs";
import QuickFilters from "./components/QuickFilters";
import PopularCategories from "./components/PopularCategories";
import VerifiedSellers from "./components/VerifiedSellers";
import DownloadAppCTA from "./components/DownloadAppCTA";
import {
  DEFAULT_AD_FORM,
  TRADEPOST_SEED_LISTINGS,
} from "./classifiedsConstants";
import {
  formatDateTime,
  normalizeListing,
} from "./classifiedsUtils";

const TradePostHome = ({ onNavigateToDashboard }) => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    mockData,
    sendClassifiedsEnquiry = async () => null,
    addClassifiedsReview = async () => null,
    reportClassifiedsListing = async () => null,
  } = useApp();

  // Core filtering state
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [conditionFilter, setConditionFilter] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState("");
  const [sortBy, setSortBy] = useState("featured");

  // Listing detail state
  const [chatInput, setChatInput] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reportReason, setReportReason] = useState("");

  // Toast state
  const [toasts, setToasts] = useState([]);
  const [asyncState, setAsyncState] = useState({
    enquiry: false,
    review: false,
    report: false,
  });

  const pushToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Get listings data
  const listings = useMemo(() => {
    const mockListings = mockData?.classifieds?.listings || TRADEPOST_SEED_LISTINGS;
    return mockListings.map((listing, index) => normalizeListing(listing, index));
  }, [mockData]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch =
        !searchText ||
        listing.title.toLowerCase().includes(searchText.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory = categoryFilter === "All" || listing.category === categoryFilter;
      const matchesLocation = locationFilter === "All" || listing.district === locationFilter;
      const matchesCondition = conditionFilter === "All" || listing.condition === conditionFilter;
      const matchesVerified = !verifiedOnly || listing.verified;

      return matchesSearch && matchesCategory && matchesLocation && matchesCondition && matchesVerified;
    });
  }, [listings, searchText, categoryFilter, locationFilter, conditionFilter, verifiedOnly]);

  // Sort listings
  const sortedListings = useMemo(() => {
    const copy = [...filteredListings];
    if (sortBy === "price-asc") return copy.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") return copy.sort((a, b) => b.price - a.price);
    if (sortBy === "newest") return copy.reverse();
    return copy; // featured
  }, [filteredListings, sortBy]);

  const selectedListing = useMemo(
    () => listings.find((l) => l.id === selectedListingId),
    [listings, selectedListingId]
  );

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.id)),
    [favorites]
  );

  const handleFavoriteToggle = (listingId) => {
    const fullId = `classifieds-${listingId}`;
    if (favoriteIds.has(fullId)) {
      removeFavorite(fullId);
      pushToast("Removed from favorites");
    } else {
      addToFavorites({
        id: fullId,
        title: selectedListing?.title || "Listing",
        type: "listing",
      });
      pushToast("Added to favorites");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedListing) return;
    setAsyncState((s) => ({ ...s, enquiry: true }));
    try {
      await sendClassifiedsEnquiry({
        listingId: selectedListing.id,
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
    if (!reviewComment.trim() || !selectedListing) return;
    setAsyncState((s) => ({ ...s, review: true }));
    try {
      await addClassifiedsReview({
        listingId: selectedListing.id,
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
    if (!reportReason.trim() || !selectedListing) return;
    setAsyncState((s) => ({ ...s, report: true }));
    try {
      await reportClassifiedsListing({
        listingId: selectedListing.id,
        reason: reportReason,
        reporter: currentUser?.email,
      });
      pushToast("Report submitted. Our team will review it.");
      setReportReason("");
    } finally {
      setAsyncState((s) => ({ ...s, report: false }));
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(listings.map((l) => l.category));
    return ["All", ...Array.from(cats)];
  }, [listings]);

  const locations = useMemo(() => {
    const locs = new Set(listings.map((l) => l.district));
    return ["All", ...Array.from(locs)];
  }, [listings]);

  const handlePostAdClick = () => {
    const didNavigate = onNavigateToDashboard?.("seller");
    if (didNavigate === false) {
      pushToast("Posting is available after enabling seller access.", "info");
    }
  };

  return (
    <div className="tradepost-home">
      {/* HERO SECTION */}
      <section className="tradepost-hero">
        <div className="tradepost-hero-content">
          <p className="tradepost-eyebrow">TradePost classifieds</p>
          <h1>Local buying, selling, discovery, and direct buyer-seller conversations in one flow.</h1>
          <div className="tradepost-search-row">
            <input
              type="text"
              placeholder="Search listings..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="tradepost-search-input"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="tradepost-filter-select"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="tradepost-filter-select"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="tradepost-primary-button"
              onClick={handlePostAdClick}
            >
              Post an ad
            </button>
          </div>
        </div>
      </section>

      {/* QUICK FILTERS */}
      <QuickFilters
        filters={[
          { label: "Verified only", active: verifiedOnly, onClick: () => setVerifiedOnly(!verifiedOnly) },
          { label: "New condition", active: conditionFilter === "New", onClick: () => setConditionFilter(conditionFilter === "New" ? "All" : "New") },
          { label: "Used condition", active: conditionFilter === "Used", onClick: () => setConditionFilter(conditionFilter === "Used" ? "All" : "Used") },
        ]}
        sortOptions={[
          { value: "featured", label: "Featured" },
          { value: "price-asc", label: "Price: Low to High" },
          { value: "price-desc", label: "Price: High to Low" },
          { value: "newest", label: "Newest First" },
        ]}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* MAIN CONTENT GRID */}
      <div className="tradepost-main-grid">
        <section className="tradepost-listings-section">
          <article className="tradepost-listings-grid">
            {sortedListings.length === 0 ? (
              <div className="tradepost-no-listings">
                <h3>No listings found</h3>
                <p>Try adjusting your filters or search terms.</p>
                <button
                  type="button"
                  className="tradepost-primary-button"
                  onClick={handlePostAdClick}
                >
                  Post the first ad
                </button>
              </div>
            ) : (
              <div className="tradepost-grid">
                {sortedListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    isActive={selectedListing?.id === listing.id}
                    isFavorite={favoriteIds.has(`classifieds-${listing.id}`)}
                    onSelect={setSelectedListingId}
                    onFavoriteToggle={handleFavoriteToggle}
                    hasSubscription={currentUser?.subscriptionStatus === "active" || currentUser?.isPremium}
                    onSubscribeClick={() => {
                      alert("Subscribe to view contact details of sellers!");
                    }}
                  />
                ))}
              </div>
            )}
          </article>
        </section>

        {/* LISTING DETAIL PANEL (STICKY RIGHT) */}
        <aside className="tradepost-detail-panel">
          <article className="tradepost-detail-card">
            {selectedListing ? (
              <ListingDetailTabs
                listing={selectedListing}
                canManage={false}
                uiMessages={{
                  messages: (
                    <section className="tradepost-chat-section">
                      <div className="classifieds-section-heading">
                        <h3>Contact seller</h3>
                      </div>
                      <div className="tradepost-message-composer">
                        <textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about the listing..."
                          rows="3"
                        />
                        <button
                          type="button"
                          className="classifieds-primary-button"
                          onClick={handleSendMessage}
                          disabled={asyncState.enquiry}
                        >
                          {asyncState.enquiry ? "Sending..." : "Send message"}
                        </button>
                      </div>
                    </section>
                  ),
                  reviews: (
                    <section className="tradepost-review-section">
                      <div className="classifieds-section-heading">
                        <h3>Reviews and Report</h3>
                      </div>
                      <div className="tradepost-review-list">
                        {selectedListing?.reviews?.length ? (
                          selectedListing.reviews.map((review, idx) => (
                            <div key={idx} className="tradepost-review-item">
                              <strong>{review.author}</strong>
                              <span>{review.score}/5</span>
                              <p>{review.comment}</p>
                            </div>
                          ))
                        ) : (
                          <p className="tradepost-no-reviews">No reviews yet</p>
                        )}
                      </div>
                      <div className="tradepost-review-form">
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
                          className="classifieds-inline-button"
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
                        className="classifieds-inline-button danger"
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
              <div className="tradepost-detail-empty">
                <h3>Select a listing</h3>
                <p>Click any listing to view details and contact the seller.</p>
                <button
                  type="button"
                  className="classifieds-primary-button"
                  onClick={handlePostAdClick}
                >
                  Post your ad
                </button>
              </div>
            )}
          </article>
        </aside>
      </div>

      {/* TOAST NOTIFICATIONS */}
      <div className="tradepost-toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`tradepost-toast tradepost-toast-${toast.type}`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* POPULAR CATEGORIES SECTION */}
      <PopularCategories
        onCategoryClick={(category) => setCategoryFilter(category)}
      />

      {/* VERIFIED SELLERS SECTION */}
      <VerifiedSellers />

      {/* DOWNLOAD APP CTA */}
      <DownloadAppCTA />
    </div>
  );
};

export default TradePostHome;
