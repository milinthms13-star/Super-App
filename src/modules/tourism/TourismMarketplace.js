import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import { tourismService } from "../../services/tourismService";
import FilterPanel from "./components/FilterPanel";
import PackageCard from "./components/PackageCard";
import BookingSheet from "./components/BookingSheet";
import VendorPanel from "./components/VendorPanel";
import AdminPanel from "./components/AdminPanel";
import BookingHistory from "./components/BookingHistory";
import {
  FALLBACK_ADMIN_REVIEW_ITEMS,
  FALLBACK_COUPONS,
  FALLBACK_PACKAGES,
  FALLBACK_VENDOR_PIPELINE,
  HOTEL_CATEGORIES,
  KERALA_DESTINATIONS,
  OFFICIAL_LINKS,
  PACKAGE_CATEGORIES,
  PAYMENT_OPTIONS,
  PICKUP_CITIES,
  TRAVELER_TYPES,
  formatInr,
} from "./tourismData";
import "./TourismMarketplace.css";

const DEFAULT_BOOKING_FORM = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  travelerCount: 2,
  pickupCity: PICKUP_CITIES[0],
  hotelCategory: HOTEL_CATEGORIES[1],
  travelDate: "",
  paymentType: PAYMENT_OPTIONS[0].id,
  couponCode: "",
  bookingNote: "",
};

const DEFAULT_VENDOR_DRAFT = {
  title: "",
  destination: "Munnar",
  category: "Nature",
  durationDays: 3,
  startPrice: 12000,
  imageGalleryText: "",
  availableDatesText: "",
  seasonalPricingText: '[{"season":"Peak","startDate":"2026-11-01","endDate":"2027-01-31","price":15000}]',
};

const normalizeText = (value = "") => String(value || "").trim();

const validateBookingForm = (form) => {
  const errors = {};
  if (normalizeText(form.customerName).length < 2) {
    errors.customerName = "Enter a valid name";
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizeText(form.customerEmail))) {
    errors.customerEmail = "Enter a valid email";
  }
  if (normalizeText(form.customerPhone).replace(/\D/g, "").length < 10) {
    errors.customerPhone = "Enter a valid phone number";
  }
  if (!normalizeText(form.travelDate)) {
    errors.travelDate = "Select travel date";
  }
  return errors;
};

const parseList = (value = "", separator = ",") =>
  normalizeText(value)
    .split(separator)
    .map((item) => normalizeText(item))
    .filter(Boolean);

const TourismMarketplace = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState("marketplace");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDestination, setSelectedDestination] = useState("All destinations");
  const [selectedTravelerType, setSelectedTravelerType] = useState("Any");
  const [selectedHotelCategory, setSelectedHotelCategory] = useState("all");
  const [maxBudget, setMaxBudget] = useState(30000);
  const [maxDays, setMaxDays] = useState(6);
  const [searchText, setSearchText] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [bookingForm, setBookingForm] = useState(DEFAULT_BOOKING_FORM);
  const [bookingErrors, setBookingErrors] = useState({});

  const [customRequest, setCustomRequest] = useState({
    travelerName: "",
    phone: "",
    travelerType: "Family",
    destination: "Munnar",
    pickupCity: PICKUP_CITIES[0],
    hotelCategory: HOTEL_CATEGORIES[1],
    startDate: "",
    days: 3,
    estimatedBudget: 15000,
    preferences: "",
  });

  const [dataState, setDataState] = useState({
    packages: FALLBACK_PACKAGES,
    reviews: [],
    bookings: [],
    leads: FALLBACK_VENDOR_PIPELINE,
    vendors: FALLBACK_ADMIN_REVIEW_ITEMS,
    coupons: FALLBACK_COUPONS,
    complaints: [],
    adminQueues: {
      packageApprovalQueue: [],
      vendorApprovalQueue: [],
      kycQueue: [],
      riskFlags: [],
      refundApprovalQueue: [],
      complaints: [],
      featuredPackages: [],
    },
  });

  const [wishlist, setWishlist] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [vendorDraft, setVendorDraft] = useState(DEFAULT_VENDOR_DRAFT);
  const [toasts, setToasts] = useState([]);
  const [loadingState, setLoadingState] = useState({
    boot: true,
    bookingSubmit: false,
    bookingRefresh: false,
    reviewSubmit: false,
    vendorMutate: false,
    adminMutate: false,
    customSubmit: false,
  });

  const currentUserEmail = normalizeText(currentUser?.email).toLowerCase();
  const currentUserRole = normalizeText(currentUser?.role || currentUser?.registrationType).toLowerCase();
  const vendorId = normalizeText(currentUser?.tourismVendorId || currentUser?.businessId || "vendor-highrange");

  const canManageVendor = ["business", "entrepreneur", "vendor", "admin"].includes(currentUserRole);
  const canManageAdmin = ["admin"].includes(currentUserRole);

  const pushToast = (message, type = "success") => {
    const nextToast = { id: `${Date.now()}-${Math.random()}`, message, type };
    setToasts((current) => [nextToast, ...current].slice(0, 5));
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== nextToast.id));
    }, 3500);
  };

  const setLoading = (key, value) => {
    setLoadingState((current) => ({ ...current, [key]: value }));
  };

  const loadBootstrap = useCallback(async () => {
    setLoading("boot", true);
    try {
      const response = await tourismService.getBootstrap({
        email: currentUserEmail || undefined,
        vendorId: canManageVendor ? vendorId : undefined,
      });
      setDataState((current) => ({
        ...current,
        packages: Array.isArray(response.packages) && response.packages.length ? response.packages : FALLBACK_PACKAGES,
        reviews: Array.isArray(response.reviews) ? response.reviews : [],
        bookings: Array.isArray(response.bookings) ? response.bookings : [],
        leads: Array.isArray(response.leads) && response.leads.length ? response.leads : FALLBACK_VENDOR_PIPELINE,
        vendors: Array.isArray(response.vendors) ? response.vendors : [],
        coupons: Array.isArray(response.coupons) && response.coupons.length ? response.coupons : FALLBACK_COUPONS,
        complaints: Array.isArray(response.complaints) ? response.complaints : [],
      }));
    } catch (error) {
      pushToast("Loaded fallback tourism data (backend unavailable).", "info");
    } finally {
      setLoading("boot", false);
    }
  }, [canManageVendor, currentUserEmail, vendorId]);

  const loadBookings = useCallback(async () => {
    if (!currentUserEmail) {
      return;
    }
    setLoading("bookingRefresh", true);
    try {
      const bookings = await tourismService.getBookings({ email: currentUserEmail });
      setDataState((current) => ({ ...current, bookings }));
    } catch (error) {
      pushToast("Unable to refresh booking history right now.", "error");
    } finally {
      setLoading("bookingRefresh", false);
    }
  }, [currentUserEmail]);

  const loadVendorData = useCallback(async () => {
    if (!canManageVendor) {
      return;
    }
    try {
      const [packages, leads] = await Promise.all([
        tourismService.getVendorPackages(vendorId),
        tourismService.getVendorLeads(vendorId),
      ]);
      setDataState((current) => ({
        ...current,
        packages: Array.isArray(packages) && packages.length ? packages : current.packages,
        leads: Array.isArray(leads) ? leads : current.leads,
      }));
    } catch (error) {
      pushToast("Vendor data loaded from cached view.", "info");
    }
  }, [canManageVendor, vendorId]);

  const loadAdminQueues = useCallback(async () => {
    if (!canManageAdmin) {
      return;
    }
    try {
      const adminQueues = await tourismService.getAdminQueues();
      setDataState((current) => ({ ...current, adminQueues }));
    } catch (error) {
      pushToast("Admin queues unavailable. Showing current records.", "info");
    }
  }, [canManageAdmin]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (activeTab === "history") {
      loadBookings();
    }
    if (activeTab === "vendor") {
      loadVendorData();
    }
    if (activeTab === "admin") {
      loadAdminQueues();
    }
  }, [activeTab, loadAdminQueues, loadBookings, loadVendorData]);

  const filteredPackages = useMemo(() => {
    return dataState.packages.filter((pkg) => {
      if (String(pkg.approvalStatus || "approved").toLowerCase() !== "approved") {
        return false;
      }

      const matchesCategory = selectedCategory === "All" || pkg.category === selectedCategory;
      const matchesDestination =
        selectedDestination === "All destinations" || pkg.destination === selectedDestination;
      const matchesTravelerType =
        selectedTravelerType === "Any" || pkg.travelerType === selectedTravelerType;
      const matchesBudget = Number(pkg.startPrice || 0) <= Number(maxBudget || 0);
      const matchesDays = Number(pkg.durationDays || 0) <= Number(maxDays || 0);
      const matchesHotel = selectedHotelCategory === "all" || pkg.hotelCategory === selectedHotelCategory;
      const text = searchText.trim().toLowerCase();
      const matchesText =
        !text ||
        String(pkg.title || "").toLowerCase().includes(text) ||
        String(pkg.destination || "").toLowerCase().includes(text) ||
        (pkg.tags || []).some((tag) => String(tag).toLowerCase().includes(text));

      return (
        matchesCategory &&
        matchesDestination &&
        matchesTravelerType &&
        matchesBudget &&
        matchesDays &&
        matchesHotel &&
        matchesText
      );
    });
  }, [
    dataState.packages,
    maxBudget,
    maxDays,
    searchText,
    selectedCategory,
    selectedDestination,
    selectedHotelCategory,
    selectedTravelerType,
  ]);

  const selectedPackage = useMemo(
    () => dataState.packages.find((pkg) => pkg.id === selectedPackageId) || null,
    [dataState.packages, selectedPackageId]
  );

  const comparePackages = useMemo(
    () => dataState.packages.filter((pkg) => compareIds.includes(pkg.id)),
    [compareIds, dataState.packages]
  );

  const handleCustomRequestChange = (field, value) => {
    setCustomRequest((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitCustomRequest = async (event) => {
    event.preventDefault();
    setLoading("customSubmit", true);
    setTimeout(() => {
      setLoading("customSubmit", false);
      pushToast("Custom request submitted. Vendor matching started.");
      setCustomRequest((current) => ({ ...current, preferences: "" }));
    }, 500);
  };

  const toggleWishlist = (packageId) => {
    setWishlist((current) => {
      if (current.includes(packageId)) {
        pushToast("Removed from wishlist.", "info");
        return current.filter((item) => item !== packageId);
      }
      pushToast("Saved to wishlist.");
      return [...current, packageId];
    });
  };

  const toggleCompare = (packageId) => {
    setCompareIds((current) => {
      if (current.includes(packageId)) {
        return current.filter((item) => item !== packageId);
      }
      if (current.length >= 3) {
        pushToast("You can compare up to 3 packages at once.", "info");
        return current;
      }
      return [...current, packageId];
    });
  };

  const handleAskAgentOnWhatsApp = (pkg) => {
    const phone = normalizeText(pkg.whatsappNumber || pkg.emergencyContact || "+919876500000").replace(/[^\d]/g, "");
    const text = encodeURIComponent(`Hi, I need details for ${pkg.title} (${pkg.destination}) from NilaTravel.`);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleBookingFormChange = (field, value) => {
    setBookingForm((current) => ({ ...current, [field]: value }));
    setBookingErrors((current) => ({ ...current, [field]: "" }));
  };

  const resetBookingSheet = () => {
    setSelectedPackageId("");
    setBookingForm(DEFAULT_BOOKING_FORM);
    setBookingErrors({});
  };

  const handleBookingConfirm = async () => {
    if (!selectedPackage) {
      return;
    }

    const validationErrors = validateBookingForm(bookingForm);
    if (Object.keys(validationErrors).length > 0) {
      setBookingErrors(validationErrors);
      pushToast("Please fix booking form fields before submitting.", "error");
      return;
    }

    setLoading("bookingSubmit", true);
    try {
      const booking = await tourismService.createBooking({
        packageId: selectedPackage.id,
        ...bookingForm,
      });
      setDataState((current) => ({
        ...current,
        bookings: [booking, ...current.bookings],
      }));
      pushToast(`Booking submitted for ${selectedPackage.title}. Status: ${booking.bookingStatus}`);
      resetBookingSheet();
      setActiveTab("history");
    } catch (error) {
      pushToast(error?.response?.data?.message || "Booking submission failed. Try again.", "error");
    } finally {
      setLoading("bookingSubmit", false);
    }
  };

  const handleSubmitReview = async (packageId) => {
    const draft = reviewDrafts[packageId] || { rating: 5, comment: "" };
    if (normalizeText(draft.comment).length < 3) {
      pushToast("Review comment should be at least 3 characters.", "error");
      return;
    }
    setLoading("reviewSubmit", true);
    try {
      const reviewerName = normalizeText(currentUser?.name || "Traveler");
      await tourismService.submitReview({
        packageId,
        reviewerName,
        rating: Number(draft.rating || 5),
        comment: normalizeText(draft.comment),
      });
      pushToast("Review submitted successfully.");
      setReviewDrafts((current) => ({ ...current, [packageId]: { rating: 5, comment: "" } }));
      await loadBootstrap();
    } catch (error) {
      pushToast("Unable to submit review right now.", "error");
    } finally {
      setLoading("reviewSubmit", false);
    }
  };

  const createVendorPayload = () => {
    let seasonalPricing = [];
    try {
      seasonalPricing = JSON.parse(vendorDraft.seasonalPricingText || "[]");
      if (!Array.isArray(seasonalPricing)) {
        seasonalPricing = [];
      }
    } catch (error) {
      seasonalPricing = [];
    }

    return {
      vendorId,
      title: normalizeText(vendorDraft.title),
      destination: normalizeText(vendorDraft.destination),
      category: normalizeText(vendorDraft.category),
      durationDays: Number(vendorDraft.durationDays || 3),
      startPrice: Number(vendorDraft.startPrice || 10000),
      imageGallery: parseList(vendorDraft.imageGalleryText, "\n"),
      availableDates: parseList(vendorDraft.availableDatesText, ","),
      seasonalPricing,
      inclusions: ["Hotel stay", "Local transfer"],
      exclusions: ["Personal expenses"],
      cancellationPolicy: "Free cancellation up to 72 hours before trip start.",
      childPricing: "Below 5 years complimentary.",
      gstAndServiceCharge: "5% GST + 2% service charge",
      tags: ["New listing"],
      itinerary: ["Day 1: Arrival and check-in", "Day 2: Sightseeing", "Day 3: Checkout"],
      mapHighlights: "Local highlights available on booking",
    };
  };

  const handleCreateVendorPackage = async () => {
    const payload = createVendorPayload();
    if (!payload.title || !payload.destination) {
      pushToast("Package title and destination are required.", "error");
      return;
    }
    setLoading("vendorMutate", true);
    try {
      await tourismService.createVendorPackage(payload);
      pushToast("Package created and sent for admin approval.");
      setVendorDraft(DEFAULT_VENDOR_DRAFT);
      await loadVendorData();
      await loadAdminQueues();
    } catch (error) {
      pushToast(error?.response?.data?.message || "Unable to create package.", "error");
    } finally {
      setLoading("vendorMutate", false);
    }
  };

  const handleUpdateVendorPackage = async (pkg) => {
    setLoading("vendorMutate", true);
    try {
      await tourismService.updateVendorPackage(pkg.id, {
        vendorId,
        startPrice: Number(pkg.startPrice || 0) + 500,
      });
      pushToast("Package updated. Re-approval may be required.");
      await loadVendorData();
      await loadAdminQueues();
    } catch (error) {
      pushToast("Unable to update package right now.", "error");
    } finally {
      setLoading("vendorMutate", false);
    }
  };

  const handleDeleteVendorPackage = async (packageId) => {
    setLoading("vendorMutate", true);
    try {
      await tourismService.deleteVendorPackage(packageId, vendorId);
      pushToast("Package deleted.");
      await loadVendorData();
      await loadAdminQueues();
    } catch (error) {
      pushToast("Unable to delete package right now.", "error");
    } finally {
      setLoading("vendorMutate", false);
    }
  };

  const handleVendorLeadStatusUpdate = async (leadId, status) => {
    setLoading("vendorMutate", true);
    try {
      await tourismService.updateVendorLead(leadId, { vendorId, status });
      pushToast(`Lead moved to ${status}.`);
      await loadVendorData();
    } catch (error) {
      pushToast("Unable to update lead status.", "error");
    } finally {
      setLoading("vendorMutate", false);
    }
  };

  const handleAdminVendorUpdate = async (vendorIdArg, payload) => {
    setLoading("adminMutate", true);
    try {
      await tourismService.updateAdminVendor(vendorIdArg, payload);
      pushToast(`Vendor ${payload.approvalStatus}.`);
      await loadBootstrap();
      await loadAdminQueues();
    } catch (error) {
      pushToast("Unable to update vendor approval.", "error");
    } finally {
      setLoading("adminMutate", false);
    }
  };

  const handleAdminPackageUpdate = async (packageId, payload) => {
    setLoading("adminMutate", true);
    try {
      await tourismService.updateAdminPackage(packageId, payload);
      pushToast(`Package ${payload.approvalStatus}.`);
      await loadBootstrap();
      await loadAdminQueues();
    } catch (error) {
      pushToast("Unable to update package approval.", "error");
    } finally {
      setLoading("adminMutate", false);
    }
  };

  const vendorAccessMessage = "Vendor workspace requires business/vendor role login.";
  const adminAccessMessage = "Admin controls require admin role.";

  const bookingHistory = useMemo(() => dataState.bookings, [dataState.bookings]);
  const vendorPackages = useMemo(
    () => dataState.packages.filter((pkg) => String(pkg.vendorId) === vendorId),
    [dataState.packages, vendorId]
  );
  const vendorLeads = useMemo(() => dataState.leads, [dataState.leads]);

  return (
    <div className="tourism-shell">
      <section className="tourism-hero">
        <div className="tourism-hero-copy">
          <p className="tourism-kicker">NilaTravel Tourism Marketplace</p>
          <h1>Kerala tourism packages, local experiences, and verified travel agencies in one module.</h1>
          <p>
            Discover curated trips, compare itineraries, request custom plans, and track bookings with
            vendor and admin workflows built for a Kerala-first travel ecosystem.
          </p>
          <div className="tourism-hero-actions">
            <button type="button" className="tourism-primary-button" onClick={() => setActiveTab("marketplace")}>
              Explore Packages
            </button>
            <button type="button" className="tourism-secondary-button" onClick={() => setActiveTab("custom")}>
              Request Custom Trip
            </button>
          </div>
          <div className="tourism-hero-tags">
            <span>Advance/full payment booking flow</span>
            <span>Verified vendor + KYC controls</span>
            <span>Emergency support and insurance</span>
            <span>Admin moderation and refund governance</span>
          </div>
        </div>
      </section>

      <section className="tourism-nav">
        <button type="button" className={`tourism-nav-item ${activeTab === "marketplace" ? "active" : ""}`} onClick={() => setActiveTab("marketplace")}>
          Marketplace
        </button>
        <button type="button" className={`tourism-nav-item ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          Booking History
        </button>
        <button type="button" className={`tourism-nav-item ${activeTab === "custom" ? "active" : ""}`} onClick={() => setActiveTab("custom")}>
          Custom Trip Desk
        </button>
        <button type="button" className={`tourism-nav-item ${activeTab === "vendor" ? "active" : ""}`} onClick={() => setActiveTab("vendor")}>
          Vendor Workspace
        </button>
        <button type="button" className={`tourism-nav-item ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>
          Admin Controls
        </button>
      </section>

      {activeTab === "marketplace" && (
        <section className="tourism-section">
          <div className="tourism-section-heading">
            <h2>Kerala Package Discovery</h2>
            <p>Search by destination, budget, days, traveler type, and hotel category.</p>
          </div>
          <div className="tourism-search-grid">
            <FilterPanel
              searchText={searchText}
              setSearchText={setSearchText}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedDestination={selectedDestination}
              setSelectedDestination={setSelectedDestination}
              selectedTravelerType={selectedTravelerType}
              setSelectedTravelerType={setSelectedTravelerType}
              maxBudget={maxBudget}
              setMaxBudget={setMaxBudget}
              maxDays={maxDays}
              setMaxDays={setMaxDays}
              selectedHotelCategory={selectedHotelCategory}
              setSelectedHotelCategory={setSelectedHotelCategory}
              packageCategories={PACKAGE_CATEGORIES}
              destinations={KERALA_DESTINATIONS}
              travelerTypes={TRAVELER_TYPES}
              hotelCategories={HOTEL_CATEGORIES}
            />

            <div className="tourism-results">
              <div className="tourism-results-header">
                <h3>{filteredPackages.length} packages found</h3>
                <span>Wishlist, compare, reviews, coupons, and direct WhatsApp support included.</span>
              </div>

              {loadingState.boot ? (
                <div className="tourism-skeleton-grid">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="tourism-package-skeleton" />
                  ))}
                </div>
              ) : (
                <div className="tourism-packages-grid">
                  {filteredPackages.map((pkg) => (
                    <div key={pkg.id}>
                      <PackageCard
                        pkg={pkg}
                        isWishlisted={wishlist.includes(pkg.id)}
                        isCompared={compareIds.includes(pkg.id)}
                        onToggleWishlist={toggleWishlist}
                        onToggleCompare={toggleCompare}
                        onAskAgent={handleAskAgentOnWhatsApp}
                        onBook={setSelectedPackageId}
                      />
                      <div className="tourism-review-card">
                        <label className="tourism-field">
                          <span>Rate package</span>
                          <select
                            value={reviewDrafts[pkg.id]?.rating || 5}
                            onChange={(event) =>
                              setReviewDrafts((current) => ({
                                ...current,
                                [pkg.id]: {
                                  ...(current[pkg.id] || {}),
                                  rating: Number(event.target.value),
                                },
                              }))
                            }
                          >
                            {[5, 4, 3, 2, 1].map((score) => (
                              <option key={score} value={score}>
                                {score}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="tourism-field">
                          <span>Review</span>
                          <textarea
                            rows="2"
                            value={reviewDrafts[pkg.id]?.comment || ""}
                            onChange={(event) =>
                              setReviewDrafts((current) => ({
                                ...current,
                                [pkg.id]: {
                                  ...(current[pkg.id] || {}),
                                  comment: event.target.value,
                                },
                              }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="tourism-secondary-button"
                          onClick={() => handleSubmitReview(pkg.id)}
                          disabled={loadingState.reviewSubmit}
                        >
                          {loadingState.reviewSubmit ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!filteredPackages.length && !loadingState.boot && (
                <div className="tourism-empty-state">
                  No packages match the current filters. Try increasing budget or changing destination.
                </div>
              )}

              {dataState.coupons.length ? (
                <div className="tourism-panel">
                  <h3>Coupons & Offers</h3>
                  <div className="tourism-tags">
                    {dataState.coupons.map((coupon) => (
                      <span key={coupon.code}>
                        {coupon.code}: {coupon.description}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {comparePackages.length >= 2 ? (
                <div className="tourism-panel">
                  <h3>Compare Packages</h3>
                  <div className="tourism-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Package</th>
                          <th>Price</th>
                          <th>Days</th>
                          <th>Hotel</th>
                          <th>Vendor</th>
                          <th>Cancellation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparePackages.map((pkg) => (
                          <tr key={`compare-${pkg.id}`}>
                            <td>{pkg.title}</td>
                            <td>{formatInr(pkg.startPrice)}</td>
                            <td>{pkg.durationDays}</td>
                            <td>{pkg.hotelCategory}</td>
                            <td>{pkg.vendor}</td>
                            <td>{pkg.cancellationPolicy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {activeTab === "history" && (
        <BookingHistory
          bookings={bookingHistory}
          loading={loadingState.bookingRefresh}
          onRefresh={loadBookings}
        />
      )}

      {activeTab === "custom" && (
        <section className="tourism-section">
          <div className="tourism-section-heading">
            <h2>Custom Package Request</h2>
            <p>Tell us your plan and get proposals from verified Kerala travel agencies.</p>
          </div>
          <form className="tourism-custom-form" onSubmit={handleSubmitCustomRequest}>
            <label className="tourism-field">
              <span>Traveler name</span>
              <input
                type="text"
                required
                value={customRequest.travelerName}
                onChange={(event) => handleCustomRequestChange("travelerName", event.target.value)}
              />
            </label>
            <label className="tourism-field">
              <span>Phone</span>
              <input
                type="tel"
                required
                value={customRequest.phone}
                onChange={(event) => handleCustomRequestChange("phone", event.target.value)}
              />
            </label>
            <label className="tourism-field">
              <span>Traveler type</span>
              <select
                value={customRequest.travelerType}
                onChange={(event) => handleCustomRequestChange("travelerType", event.target.value)}
              >
                {TRAVELER_TYPES.filter((item) => item !== "Any").map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="tourism-field">
              <span>Destination focus</span>
              <select
                value={customRequest.destination}
                onChange={(event) => handleCustomRequestChange("destination", event.target.value)}
              >
                {KERALA_DESTINATIONS.filter((item) => item !== "All destinations").map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="tourism-field">
              <span>Pickup city</span>
              <select
                value={customRequest.pickupCity}
                onChange={(event) => handleCustomRequestChange("pickupCity", event.target.value)}
              >
                {PICKUP_CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="tourism-field">
              <span>Hotel category</span>
              <select
                value={customRequest.hotelCategory}
                onChange={(event) => handleCustomRequestChange("hotelCategory", event.target.value)}
              >
                {HOTEL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="tourism-field">
              <span>Preferred start date</span>
              <input
                type="date"
                value={customRequest.startDate}
                onChange={(event) => handleCustomRequestChange("startDate", event.target.value)}
              />
            </label>
            <label className="tourism-field">
              <span>Trip duration (days)</span>
              <input
                type="number"
                min="1"
                max="15"
                value={customRequest.days}
                onChange={(event) => handleCustomRequestChange("days", Number(event.target.value))}
              />
            </label>
            <label className="tourism-field tourism-field-wide">
              <span>Estimated budget (INR)</span>
              <input
                type="number"
                min="5000"
                step="500"
                value={customRequest.estimatedBudget}
                onChange={(event) =>
                  handleCustomRequestChange("estimatedBudget", Number(event.target.value))
                }
              />
            </label>
            <label className="tourism-field tourism-field-wide">
              <span>Preferences</span>
              <textarea
                rows="4"
                placeholder="Include food preference, local experiences, guide language, child requirements"
                value={customRequest.preferences}
                onChange={(event) => handleCustomRequestChange("preferences", event.target.value)}
              />
            </label>
            <div className="tourism-custom-actions tourism-field-wide">
              <button type="submit" className="tourism-primary-button" disabled={loadingState.customSubmit}>
                {loadingState.customSubmit ? "Submitting..." : "Submit Request"}
              </button>
              <button
                type="button"
                className="tourism-secondary-button"
                onClick={() => handleAskAgentOnWhatsApp({ title: "Custom trip request", destination: customRequest.destination })}
              >
                Ask Agent on WhatsApp
              </button>
            </div>
          </form>

          <div className="tourism-official-links">
            <h3>Official Kerala Tourism References</h3>
            <div className="tourism-link-grid">
              {OFFICIAL_LINKS.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                  <strong>{link.name}</strong>
                  <span>{link.description}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "vendor" && (
        <VendorPanel
          canManageVendor={canManageVendor}
          vendorAccessMessage={vendorAccessMessage}
          vendorPackages={vendorPackages}
          vendorLeads={vendorLeads}
          vendorDraft={vendorDraft}
          setVendorDraft={setVendorDraft}
          onCreatePackage={handleCreateVendorPackage}
          onUpdatePackage={handleUpdateVendorPackage}
          onDeletePackage={handleDeleteVendorPackage}
          onLeadStatusUpdate={handleVendorLeadStatusUpdate}
          vendorBusy={loadingState.vendorMutate}
        />
      )}

      {activeTab === "admin" && (
        <AdminPanel
          canManageAdmin={canManageAdmin}
          adminAccessMessage={adminAccessMessage}
          adminQueues={dataState.adminQueues}
          onVendorUpdate={handleAdminVendorUpdate}
          onPackageUpdate={handleAdminPackageUpdate}
          adminBusy={loadingState.adminMutate}
        />
      )}

      <BookingSheet
        selectedPackage={selectedPackage}
        bookingForm={bookingForm}
        bookingErrors={bookingErrors}
        bookingSubmitting={loadingState.bookingSubmit}
        onBookingFormChange={handleBookingFormChange}
        onClose={resetBookingSheet}
        onSubmitBooking={handleBookingConfirm}
      />

      {toasts.length > 0 ? (
        <div className="tourism-toast-stack">
          {toasts.map((toast) => (
            <div key={toast.id} className={`tourism-toast tourism-toast-${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default TourismMarketplace;

