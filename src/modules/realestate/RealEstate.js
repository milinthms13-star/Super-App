import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import "../../styles/RealEstate.css";
import FiltersPanel from "./components/FiltersPanel";
import PropertyCard from "./components/PropertyCard";
import LeadBoard from "./components/LeadBoard";
import VisitBoard from "./components/VisitBoard";
import ListingForm from "./components/ListingForm";
import AdminPanel from "./components/AdminPanel";
import LoanCalculator from "./components/LoanCalculator";
import PropertyDetailTabs from "./components/PropertyDetailTabs";
import HomeSphere from "./HomeSphere";


import {
  CONSTRUCTION_SERVICES,
  DEFAULT_LISTING_FORM,
  HOME_LOAN_PARTNERS,
  REAL_ESTATE_SEED_PROPERTIES,
  ROLE_MODES,
  SUBSCRIPTION_PLANS,
  TENANT_UTILITIES,
} from "./realEstateConstants";
import {
  buildListingPayloadFromForm,
  calculateEMI,
  formatCompactNumber,
  formatDateTime,
  getAllowedRoleModes,
  getPreferredRoleMode,
  getUserIdentity,
  normalizeProperty,
  parseAmenitiesInput,
  resolveErrorMessage,
  validateListingForm,
} from "./realEstateUtils";

const initialFilters = {
  searchText: "",
  intentFilter: "all",
  locationFilter: "All",
  typeFilter: "All",
  maxPriceFilter: 500,
  minSqftFilter: 0,
  sourceFilter: "all",
  possessionFilter: "all",
  nearbyFilter: "all",
  amenityFilter: "all",
  verifiedFilter: "all",
  sortBy: "featured",
};
const buildDefaultFilters = (maxPriceValue = 500) => ({
  ...initialFilters,
  maxPriceFilter: Math.max(1, Math.round(maxPriceValue || 500)),
});

const generateToastId = () => `re-toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const mapRoleModeForPayload = (activeRole) =>
  activeRole === "builder" ? "builder" : activeRole === "owner" ? "owner" : "agent";
const formatInr = (amountInr) => `\u20b9${Number(amountInr || 0).toLocaleString("en-IN")}`;

const getDuplicateListingQueue = (properties) => {
  const signatureMap = new Map();
  properties.forEach((property) => {
    const signature = `${String(property.title || "").trim().toLowerCase()}::${String(
      property.location || ""
    )
      .trim()
      .toLowerCase()}`;
    signatureMap.set(signature, [...(signatureMap.get(signature) || []), property]);
  });
  return [...signatureMap.values()].filter((items) => items.length > 1).flat();
};

const RealEstate = () => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    mockData,
    apiCall = async () => ({}),
    createRealEstateListing = async () => null,
    updateRealEstateListing = async () => null,
    sendRealEstateEnquiry = async () => null,
    updateRealEstateLead = async () => null,
    scheduleRealEstateVisit = async () => null,
    updateRealEstateVisit = async () => null,
    sendRealEstateMessage = async () => null,
    addRealEstateReview = async () => null,
    reportRealEstateListing = async () => null,
    moderateRealEstateListing = async () => null,
    deleteRealEstateListing = async () => null,
  } = useApp();

  const [activeRole, setActiveRole] = useState(() => getPreferredRoleMode(currentUser));
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reportReason, setReportReason] = useState("");
  const [visitDateTime, setVisitDateTime] = useState("");
  const [visitMode, setVisitMode] = useState("onsite");
  const [visitNote, setVisitNote] = useState("");
  const [listingForm, setListingForm] = useState(DEFAULT_LISTING_FORM);
  const [listingFieldErrors, setListingFieldErrors] = useState({});
  const [editListingId, setEditListingId] = useState("");
  const location = useLocation();
  const [selectedService, setSelectedService] = useState(CONSTRUCTION_SERVICES[0].id);
  const [loanAmount, setLoanAmount] = useState("72");
  const [loanTenure, setLoanTenure] = useState("20");
  const [loanInterest, setLoanInterest] = useState("8.5");
  const [loanEstimateResult, setLoanEstimateResult] = useState("");
  const [loanEligibility, setLoanEligibility] = useState({ monthlyIncome: "95000", existingEmi: "15000" });
  const [maintenanceRequest, setMaintenanceRequest] = useState("");
  const [maintenanceType, setMaintenanceType] = useState(TENANT_UTILITIES[0]);
  const [toasts, setToasts] = useState([]);
  const [sellerWorkspaceMode, setSellerWorkspaceMode] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [asyncState, setAsyncState] = useState({
    listingSubmit: false,
    leadUpdate: false,
    visitUpdate: false,
    visitCreate: false,
    enquiry: false,
    message: false,
    review: false,
    report: false,
    deleteListing: false,
    moderation: false,
    payment: false,
    maintenance: false,
    loanApply: false,
  });
  const [subscriptionState, setSubscriptionState] = useState({
    planId: "",
    gateway: "razorpay",
    invoiceNumber: "",
    expiresOn: "",
    featuredCredits: 0,
  });
  const bankComparison = useMemo(
    () => HOME_LOAN_PARTNERS.map((partner, index) => ({ ...partner, processingFee: index === 0 ? 0.5 : 0.75 })),
    []
  );

  const pushToast = (message, type = "success") => {
    const toast = { id: generateToastId(), message, type };
    setToasts((current) => [toast, ...current].slice(0, 5));
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 3800);
  };

  const runAsync = async (key, fn) => {
    setAsyncState((state) => ({ ...state, [key]: true }));
    try {
      return await fn();
    } finally {
      setAsyncState((state) => ({ ...state, [key]: false }));
    }
  };

  const { ownerId: currentOwnerId } = useMemo(() => getUserIdentity(currentUser), [currentUser]);
  const allowedRoleModes = useMemo(() => getAllowedRoleModes(currentUser), [currentUser]);
  const currentUserEmail = useMemo(() => String(currentUser?.email || "").trim().toLowerCase(), [currentUser?.email]);

  const sourceProperties = useMemo(() => {
    const incomingProperties = Array.isArray(mockData?.realestateProperties) ? mockData.realestateProperties : [];
    return incomingProperties.length > 0 ? incomingProperties : REAL_ESTATE_SEED_PROPERTIES;
  }, [mockData?.realestateProperties]);

  const properties = useMemo(
    () => sourceProperties.map((property, index) => normalizeProperty(property, index)),
    [sourceProperties]
  );

  const locations = useMemo(() => ["All", ...new Set(properties.map((property) => property.location))], [properties]);
  const propertyTypes = useMemo(() => ["All", ...new Set(properties.map((property) => property.type))], [properties]);
  const allAmenities = useMemo(
    () => [...new Set(properties.flatMap((property) => property.amenities || []))].sort(),
    [properties]
  );
  const maxPrice = useMemo(
    () => Math.max(...properties.map((property) => property.priceValue || 0), 1),
    [properties]
  );
  const maxArea = useMemo(
    () => Math.max(...properties.map((property) => property.areaSqft || 0), 100),
    [properties]
  );

  useEffect(() => {
    const normalizedMax = Math.max(1, Math.round(maxPrice));
    setFilters((state) => ({
      ...state,
      maxPriceFilter: Math.min(normalizedMax, Number(state.maxPriceFilter || normalizedMax)),
    }));
    setDraftFilters((state) => ({
      ...state,
      maxPriceFilter: Math.min(normalizedMax, Number(state.maxPriceFilter || normalizedMax)),
    }));
  }, [maxPrice]);

  const filteredProperties = useMemo(() => {
    const next = properties.filter((property) => {
      const searchHaystack = [
        property.title,
        property.location,
        property.locality,
        property.type,
        property.sellerName,
        property.description,
        property.priceLabel,
        property.landmark,
        property.address,
        ...(property.amenities || []),
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !filters.searchText || searchHaystack.includes(filters.searchText.toLowerCase());
      const matchesIntent = filters.intentFilter === "all" || property.intent === filters.intentFilter;
      const matchesType = filters.typeFilter === "All" || property.type === filters.typeFilter;
      const matchesLocation = filters.locationFilter === "All" || property.location === filters.locationFilter;
      const matchesPrice = property.priceValue <= Number(filters.maxPriceFilter || maxPrice);
      const matchesArea = property.areaSqft >= Number(filters.minSqftFilter || 0);
      const matchesSource = filters.sourceFilter === "all" || property.listedBy === filters.sourceFilter;
      const matchesVerified =
        filters.verifiedFilter === "all" ||
        (filters.verifiedFilter === "verified-only" && property.verified) ||
        (filters.verifiedFilter === "ready-only" && property.readyToMove);
      const matchesPossession =
        filters.possessionFilter === "all" ||
        (filters.possessionFilter === "ready" && property.readyToMove) ||
        (filters.possessionFilter === "under-construction" && property.underConstruction);
      const matchesAmenity = filters.amenityFilter === "all" || property.amenities.includes(filters.amenityFilter);
      const matchesNearby =
        filters.nearbyFilter === "all" ||
        (filters.nearbyFilter === "school" && typeof property.nearbySchoolKm === "number" && property.nearbySchoolKm <= 3) ||
        (filters.nearbyFilter === "hospital" && typeof property.nearbyHospitalKm === "number" && property.nearbyHospitalKm <= 3) ||
        (filters.nearbyFilter === "metro" && typeof property.nearbyMetroKm === "number" && property.nearbyMetroKm <= 2.5);

      return (
        matchesSearch &&
        matchesIntent &&
        matchesType &&
        matchesLocation &&
        matchesPrice &&
        matchesArea &&
        matchesSource &&
        matchesVerified &&
        matchesPossession &&
        matchesAmenity &&
        matchesNearby
      );
    });

    next.sort((first, second) => {
      if (filters.sortBy === "price-asc") return first.priceValue - second.priceValue;
      if (filters.sortBy === "price-desc") return second.priceValue - first.priceValue;
      if (filters.sortBy === "newest") return new Date(second.postedOn) - new Date(first.postedOn);
      if (filters.sortBy === "popularity") return second.leads.length - first.leads.length;
      return Number(second.featured) - Number(first.featured) || second.rating - first.rating;
    });

    return next;
  }, [filters, maxPrice, properties]);

  useEffect(() => {
    if (!filteredProperties.length) {
      setSelectedPropertyId("");
      return;
    }

    const selectedStillVisible = filteredProperties.some((property) => String(property.id) === String(selectedPropertyId));
    if (!selectedStillVisible) {
      setSelectedPropertyId(filteredProperties[0].id);
    }
  }, [filteredProperties, selectedPropertyId]);

  useEffect(() => {
    if (!allowedRoleModes.includes(activeRole)) {
      setActiveRole(getPreferredRoleMode(currentUser));
    }
  }, [activeRole, allowedRoleModes, currentUser]);

  const selectedProperty =
    filteredProperties.find((property) => String(property.id) === String(selectedPropertyId)) || null;
  const selectedMessages = selectedProperty ? selectedProperty.chatPreview : [];
  const similarProperties = useMemo(() => {
    if (!selectedProperty) return [];
    return filteredProperties
      .filter(
        (property) =>
          property.id !== selectedProperty.id &&
          (property.location === selectedProperty.location || property.type === selectedProperty.type)
      )
      .slice(0, 3);
  }, [filteredProperties, selectedProperty]);

  const canManageProperty = (property) => {
    if (!property) return false;
    if (activeRole === "admin") return true;
    if (!["owner", "agent", "builder"].includes(activeRole)) return false;
    const propertyOwnerId = String(property.ownerId || "").trim();
    const propertySellerEmail = String(property.sellerEmail || "").trim().toLowerCase();
    const normalizedOwnerId = String(currentOwnerId || "").trim();

    return (
      (propertyOwnerId && normalizedOwnerId && propertyOwnerId === normalizedOwnerId) ||
      (propertySellerEmail && currentUserEmail && propertySellerEmail === currentUserEmail)
    );
  };

  const propertyFavorites = Array.isArray(favorites)
    ? favorites.filter((item) => item?.domain === "realestate")
    : [];
  const favoriteIds = new Set(propertyFavorites.map((item) => String(item.id)));

  const visibleLeadProperties = useMemo(() => {
    if (activeRole === "admin") return properties;
    if (!["owner", "agent", "builder"].includes(activeRole)) return [];
    return properties.filter((property) => canManageProperty(property));
  }, [activeRole, properties, currentOwnerId, currentUserEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const leadBoard = useMemo(
    () =>
      visibleLeadProperties
        .flatMap((property) =>
          property.leads.map((lead) => ({
            ...lead,
            propertyTitle: property.title,
            propertyId: property.id,
          }))
        )
        .sort((first, second) => (first.priority === "Hot" ? -1 : 1) - (second.priority === "Hot" ? -1 : 1))
        .slice(0, 8),
    [visibleLeadProperties]
  );

  const visitBoard = useMemo(
    () =>
      visibleLeadProperties
        .flatMap((property) =>
          (Array.isArray(property.visits) ? property.visits : []).map((visit) => ({
            ...visit,
            propertyTitle: property.title,
            propertyId: property.id,
          }))
        )
        .sort((first, second) => new Date(first.scheduledAt) - new Date(second.scheduledAt))
        .slice(0, 8),
    [visibleLeadProperties]
  );

  const adminQueues = useMemo(() => {
    const pendingListings = properties.filter((property) => !property.verified);
    const reportedListings = properties.filter(
      (property) =>
        property.disputeCount > 0 ||
        (Array.isArray(property.reports) && property.reports.some((report) => report.status === "open"))
    );
    const duplicateListings = getDuplicateListingQueue(properties);
    const suspiciousAgents = properties.filter(
      (property) => property.listedBy === "Agent" && (property.disputeCount >= 2 || property.reports.length >= 2)
    );
    const documentVerification = properties.filter(
      (property) =>
        !property.reraNumber ||
        property.titleDeedStatus !== "verified" ||
        !property.taxReceipt ||
        !property.buildingPermit ||
        !property.encumbranceCertificate
    );
    const rejectedListings = properties.filter((property) => property.verificationStatus === "Rejected");
    return {
      pendingListings,
      reportedListings,
      duplicateListings,
      suspiciousAgents,
      documentVerification,
      rejectedListings,
    };
  }, [properties]);

  const dashboardStats = useMemo(() => {
    const verifiedCount = properties.filter((property) => property.verified).length;
    const rentCount = properties.filter((property) => property.intent === "rent").length;
    const activeLeads = properties.reduce((total, property) => total + property.leads.length, 0);
    const pendingDocs = adminQueues.documentVerification.length;

    return [
      { label: "Active listings", value: formatCompactNumber(properties.length) },
      { label: "Verified listings", value: formatCompactNumber(verifiedCount) },
      { label: "Rental inventory", value: formatCompactNumber(rentCount) },
      { label: "Open leads", value: formatCompactNumber(activeLeads) },
      { label: "Doc checks pending", value: formatCompactNumber(pendingDocs) },
    ];
  }, [adminQueues.documentVerification.length, properties]);

  const handleFilterDraftChange = (key, value) => {
    setDraftFilters((state) => ({ ...state, [key]: value }));
    setFilters((state) => ({ ...state, [key]: value }));
  };

  const handleApplyFilters = (nextFilters = draftFilters) => {
    setFilters((state) => ({
      ...state,
      ...nextFilters,
      maxPriceFilter: Math.max(1, Math.min(Number(nextFilters.maxPriceFilter || maxPrice), Math.round(maxPrice))),
      minSqftFilter: Math.max(0, Number(nextFilters.minSqftFilter || 0)),
    }));
    pushToast("Filters applied.");
  };

  const handleResetFilters = () => {
    const defaults = buildDefaultFilters(maxPrice);
    setDraftFilters(defaults);
    setFilters(defaults);
    pushToast("Filters reset to default.");
  };

  const handleFavoriteToggle = (property) => {
    const favoriteId = `realestate-${property.id}`;
    if (favoriteIds.has(favoriteId)) {
      removeFavorite(favoriteId);
      pushToast(`${property.title} removed from favorites.`, "info");
      return;
    }

    addToFavorites({
      id: favoriteId,
      domain: "realestate",
      title: property.title,
      priceLabel: property.priceLabel,
      location: property.location,
      type: property.type,
    });
    pushToast(`${property.title} saved to favorites.`);
  };

  const handleListingInputChange = ({ target }) => {
    setListingForm((currentForm) => ({
      ...currentForm,
      [target.name]: target.value,
    }));
    setListingFieldErrors((errors) => ({ ...errors, [target.name]: "" }));
  };

  const handleListingToggleChange = (fieldName, checked) => {
    setListingForm((state) => ({ ...state, [fieldName]: checked }));
  };

  const handleListingSubmit = async (event) => {
    event.preventDefault();
    const validationResult = validateListingForm(listingForm);
    setListingFieldErrors(validationResult.fieldErrors);
    if (!validationResult.isValid) {
      pushToast(
        listingForm.postingType === "requirement"
          ? "Complete title, location, type, and at least one budget field."
          : "Complete title, location, price, type, and area.",
        "error"
      );
      return;
    }

    const payload = buildListingPayloadFromForm(listingForm, mapRoleModeForPayload(activeRole));
    await runAsync("listingSubmit", async () => {
      try {
        if (editListingId) {
          const updatedListing = await updateRealEstateListing(editListingId, payload);
          setSelectedPropertyId(updatedListing?.id || editListingId);
          pushToast(
            listingForm.postingType === "requirement"
              ? "Requirement updated successfully."
              : "Listing updated successfully."
          );
        } else {
          const createdListing = await createRealEstateListing(payload);
          setSelectedPropertyId(createdListing?.id || "");
          pushToast(
            listingForm.postingType === "requirement"
              ? "Requirement posted successfully. Matching owners and agents can now respond."
              : "Listing drafted successfully. It is now waiting for admin approval."
          );
        }
        setListingForm(DEFAULT_LISTING_FORM);
        setListingFieldErrors({});
        setEditListingId("");
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Listing could not be saved."), "error");
      }
    });
  };

  const handleEditListing = (property) => {
    setEditListingId(property.id);
    setListingForm({
      ...DEFAULT_LISTING_FORM,
      postingType: property.postingType || "property",
      title: property.title,
      intent: property.intent,
      priceLabel: property.priceLabel,
      location: property.location,
      locality: property.locality || "",
      type: property.type,
      bedrooms: String(property.bedrooms || 0),
      bathrooms: String(property.bathrooms || 0),
      furnishing: property.furnishing,
      areaSqft: String(property.areaSqft || ""),
      carpetAreaSqft: property.carpetAreaSqft ? String(property.carpetAreaSqft) : "",
      builtUpAreaSqft: property.builtUpAreaSqft ? String(property.builtUpAreaSqft) : "",
      landSizeSqft: property.landSizeSqft ? String(property.landSizeSqft) : "",
      floorNumber: property.floorNumber !== null ? String(property.floorNumber) : "",
      totalFloors: property.totalFloors !== null ? String(property.totalFloors) : "",
      parkingSpots: property.parkingSpots !== null ? String(property.parkingSpots) : "",
      propertyAgeYears: property.propertyAgeYears !== null ? String(property.propertyAgeYears) : "",
      possession: property.possession || "Ready to move",
      address: property.address || "",
      landmark: property.landmark || "",
      contactPhone: property.contactPhone || "",
      whatsappNumber: property.whatsappNumber || "",
      mapLocationLat: property.mapLocationLat !== null ? String(property.mapLocationLat) : "",
      mapLocationLng: property.mapLocationLng !== null ? String(property.mapLocationLng) : "",
      mapPreviewUrl: property.mapPreviewUrl || "",
      videoTourUrl: property.videoTourUrl || "",
      floorPlanUrl: property.floorPlanUrl || "",
      brochureUrl: property.brochureUrl || "",
      mediaGalleryInput: property.mediaGallery.map((media) => media.url).join("\n"),
      amenitiesInput: parseAmenitiesInput(property.amenities.join(",")).join(", "),
      nearbySchoolKm: property.nearbySchoolKm !== null ? String(property.nearbySchoolKm) : "",
      nearbyHospitalKm: property.nearbyHospitalKm !== null ? String(property.nearbyHospitalKm) : "",
      nearbyMetroKm: property.nearbyMetroKm !== null ? String(property.nearbyMetroKm) : "",
      readyToMove: Boolean(property.readyToMove),
      underConstruction: Boolean(property.underConstruction),
      reraNumber: property.reraNumber || "",
      titleDeedStatus: property.titleDeedStatus || "pending",
      taxReceipt: Boolean(property.taxReceipt),
      buildingPermit: Boolean(property.buildingPermit),
      encumbranceCertificate: Boolean(property.encumbranceCertificate),
      description: property.description || "",
      minBudget: property.minBudget || "",
      maxBudget: property.maxBudget || "",
      preferredLocations: property.preferredLocations || "",
      mustHaveAmenities: property.mustHaveAmenities || "",
      moveInDate: property.moveInDate || "",
    });
  };

  const handleEnquirySubmit = async () => {
    if (!selectedProperty) return;

    await runAsync("enquiry", async () => {
      try {
        await sendRealEstateEnquiry(selectedProperty.id, {
          message: enquiryMessage.trim(),
          channel: "Enquiry",
        });
        pushToast(
          enquiryMessage.trim()
            ? `Enquiry sent to ${selectedProperty.sellerName}. Lead added to seller dashboard.`
            : `Quick enquiry sent for ${selectedProperty.title}.`
        );
        setEnquiryMessage("");
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Enquiry could not be sent."), "error");
      }
    });
  };

  const handleLeadStageUpdate = async (propertyId, leadId, status, leadName) => {
    await runAsync("leadUpdate", async () => {
      try {
        await updateRealEstateLead(propertyId, leadId, { status });
        pushToast(
          status === "contacted"
            ? `${leadName} marked as contacted.`
            : `${leadName} moved to ${status.replace("_", " ")}.`
        );
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Lead update could not be saved."), "error");
      }
    });
  };

  const handleVisitSchedule = async () => {
    if (!selectedProperty || !visitDateTime) {
      pushToast("Pick a visit date and time before scheduling a property visit.", "error");
      return;
    }

    await runAsync("visitCreate", async () => {
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
        pushToast(`Visit scheduled for ${selectedProperty.title}. Seller reminders are now queued.`);
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Visit could not be scheduled."), "error");
      }
    });
  };

  const handleVisitStatusUpdate = async (propertyId, visitId, status) => {
    await runAsync("visitUpdate", async () => {
      try {
        await updateRealEstateVisit(propertyId, visitId, { status });
        pushToast(
          status === "confirmed"
            ? "Visit confirmed and reminder timeline refreshed."
            : status === "completed"
              ? "Visit marked as completed."
              : "Visit updated successfully."
        );
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Visit update could not be saved."), "error");
      }
    });
  };

  const handleSendMessage = async () => {
    if (!selectedProperty || !chatInput.trim()) return;
    await runAsync("message", async () => {
      try {
        await sendRealEstateMessage(selectedProperty.id, { text: chatInput.trim() });
        pushToast(`Message delivered to ${selectedProperty.sellerName}.`);
        setChatInput("");
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Message could not be delivered."), "error");
      }
    });
  };

  const handleReviewSubmit = async () => {
    if (!selectedProperty) return;
    const normalizedComment = reviewComment.trim();
    if (!normalizedComment) {
      pushToast("Add a short review comment before submitting.", "error");
      return;
    }
    await runAsync("review", async () => {
      try {
        await addRealEstateReview(selectedProperty.id, {
          rating: Number(reviewRating),
          comment: normalizedComment,
        });
        setReviewComment("");
        setReviewRating("5");
        pushToast(`Review submitted for ${selectedProperty.sellerName}.`);
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Review could not be submitted."), "error");
      }
    });
  };

  const handleReportSubmit = async () => {
    if (!selectedProperty) return;
    const normalizedReason = reportReason.trim();
    if (!normalizedReason) {
      pushToast("Add a report reason before flagging a listing.", "error");
      return;
    }
    await runAsync("report", async () => {
      try {
        await reportRealEstateListing(selectedProperty.id, { reason: normalizedReason });
        setReportReason("");
        pushToast(`Fake listing report submitted for ${selectedProperty.title}.`);
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Listing report could not be submitted."), "error");
      }
    });
  };

  const confirmDeleteListing = async () => {
    if (!selectedProperty) return;
    await runAsync("deleteListing", async () => {
      try {
        await deleteRealEstateListing(selectedProperty.id);
        setEditListingId("");
        setListingForm(DEFAULT_LISTING_FORM);
        setConfirmDeleteOpen(false);
        pushToast(`${selectedProperty.title} was removed from the marketplace.`);
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Listing could not be deleted."), "error");
      }
    });
  };

  const handleAdminAction = async (action) => {
    if (!selectedProperty) return;
    if (action === "verify-user") {
      pushToast(`User verification completed for ${selectedProperty.title}.`);
      return;
    }

    await runAsync("moderation", async () => {
      try {
        const moderationAction = action === "approve" ? "approve" : action === "reject" ? "reject" : "flag";
        await moderateRealEstateListing(selectedProperty.id, moderationAction);
        pushToast(
          moderationAction === "approve"
            ? `Listing approved for ${selectedProperty.title}.`
            : moderationAction === "reject"
              ? `Listing rejected for ${selectedProperty.title}.`
              : `Listing flagged for moderation: ${selectedProperty.title}.`
        );
      } catch (error) {
        pushToast(resolveErrorMessage(error, "Admin action could not be completed."), "error");
      }
    });
  };

  const handleConstructionRequest = (serviceId) => {
    const service = CONSTRUCTION_SERVICES.find((item) => item.id === serviceId);
    setSelectedService(serviceId);
    pushToast(`Request submitted for ${service?.title || "construction support"}.`);
  };

  const handleLoanEstimate = () => {
    const monthly = calculateEMI(loanAmount, loanInterest, loanTenure);
    const income = Number(loanEligibility.monthlyIncome || 0);
    const existingEmi = Number(loanEligibility.existingEmi || 0);
    if (!monthly || !income) {
      setLoanEstimateResult("Enter valid loan amount, interest, tenure, and income.");
      return;
    }
    const eligible = Math.max(0, Math.round((income * 0.5 - existingEmi) * 120));
    setLoanEstimateResult(
      `Estimated EMI ${formatInr(monthly)} / month. Eligibility approx ${formatInr(eligible)} based on income profile.`
    );
    pushToast("Home loan estimate is ready.");
  };

  const handleLoanApply = async (bankName) => {
    if (!selectedProperty) return;
    await runAsync("loanApply", async () => {
      try {
        await sendRealEstateEnquiry(selectedProperty.id, {
          channel: "Enquiry",
          message: `Home loan application requested with ${bankName} for ${selectedProperty.title}.`,
        });
      } catch (error) {
        // Keep lead flow resilient even if loan lead fails.
      }
      pushToast(`Loan enquiry created for ${bankName}.`);
    });
  };

  const handleMaintenanceSubmit = async () => {
    if (!maintenanceRequest.trim()) {
      pushToast("Describe the maintenance support you need before sending the request.", "error");
      return;
    }

    await runAsync("maintenance", async () => {
      const ticketId = `SRV-${Date.now().toString().slice(-6)}`;
      setMaintenanceRequest("");
      pushToast(`Service ticket ${ticketId} created for ${maintenanceType}. Technician assignment in progress.`);
    });
  };

  const handleSubscriptionUpgrade = async (planId, gateway) => {
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
    if (!plan) return;

    await runAsync("payment", async () => {
      try {
        const response = await apiCall("/subscriptions/subscribe", "POST", {
          planId,
          billingCycle: "monthly",
          paymentMethodId: gateway,
        });
        const expiresOn =
          response?.data?.expiresOn ||
          new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const invoiceNumber = response?.data?.invoiceNumber || `INV-${Date.now().toString().slice(-8)}`;
        setSubscriptionState({
          planId,
          gateway,
          invoiceNumber,
          expiresOn,
          featuredCredits: plan.featuredCredits,
        });
        pushToast(`${plan.name} activated via ${gateway.toUpperCase()}. Invoice ${invoiceNumber} generated.`);
      } catch (error) {
        const fallbackInvoice = `INV-${Date.now().toString().slice(-8)}`;
        setSubscriptionState({
          planId,
          gateway,
          invoiceNumber: fallbackInvoice,
          expiresOn: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          featuredCredits: plan.featuredCredits,
        });
        pushToast(
          `${plan.name} marked active (offline fallback). ${resolveErrorMessage(
            error,
            "Payment gateway currently unavailable."
          )}`,
          "info"
        );
      }
    });
  };

  const isBuyerMode = activeRole === "buyer";
  const buyerQuickStats = dashboardStats.slice(0, 3);

  const openSellerWorkspace = useCallback((options = {}) => {
    if (!allowedRoleModes.includes("owner")) {
      pushToast("Enable seller access to post properties.", "info");
      return false;
    }

    setActiveRole("owner");
    setSellerWorkspaceMode(true);
    if (options?.postingType === "property" || options?.postingType === "requirement") {
      setEditListingId("");
      setListingFieldErrors({});
      setListingForm({
        ...DEFAULT_LISTING_FORM,
        postingType: options.postingType,
        title: "",
        description: "",
        priceLabel: "",
        minBudget: "",
        maxBudget: "",
        preferredLocations: "",
        mustHaveAmenities: "",
        moveInDate: "",
      });
    }
    return true;
  }, [allowedRoleModes, pushToast]);

  const handleOpenSellerWorkspace = () => {
    openSellerWorkspace({ postingType: "property" });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenPost =
      params.get("post") === "1" ||
      params.get("action") === "post" ||
      params.get("view") === "post";
    const postingType = ["property", "requirement"].includes(params.get("postingType"))
      ? params.get("postingType")
      : "property";

    if (shouldOpenPost) {
      openSellerWorkspace({ postingType });
    }
  }, [location.search, openSellerWorkspace]);

  const scrollToBuyerListings = () => {
    if (typeof document === "undefined") return;
    const target = document.querySelector(".homesphere-listings-container");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="realestate-shell">
      {isBuyerMode ? (
        <section className="realestate-buyer-quickbar">
          <div className="realestate-buyer-quickbar-main">
            <h1>Find your next home in fewer clicks</h1>
            <p>Search, filter, and contact sellers directly from listings.</p>
            <div className="realestate-buyer-quickbar-actions">
                <button type="button" className="realestate-primary-button" onClick={scrollToBuyerListings}>
                  Explore listings
                </button>
                <button type="button" className="realestate-secondary-button" onClick={handleOpenSellerWorkspace}>
                  Post an ad
              </button>
            </div>
          </div>
          <div className="realestate-buyer-quickbar-stats">
            {buyerQuickStats.map((stat) => (
              <article key={stat.label} className="realestate-buyer-stat-pill">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </div>
        </section>
      ) : !sellerWorkspaceMode ? (
        <>
          <section className="realestate-hero">
            <div className="realestate-hero-copy">
              <h1>Find verified homes, rentals and land in one place.</h1>
              <p>Search fast, connect with trusted sellers, and act on property leads immediately.</p>
              <div className="realestate-hero-actions">
                <button
                  type="button"
                  className="realestate-primary-button"
                  onClick={() => {
                    setSellerWorkspaceMode(false);
                    setActiveRole("buyer");
                  }}
                >
                  Explore listings
                </button>
                <button
                  type="button"
                  className="realestate-secondary-button"
                  onClick={handleOpenSellerWorkspace}
                >
                  Post an ad
                </button>
              </div>
              <div className="realestate-hero-tags">
                <span>Verified listings</span>
                <span>Quick connect</span>
                <span>Multi-language</span>
              </div>
            </div>

            <div className="realestate-hero-panel">
              <h2>Why HomeSphere</h2>
              <ul>
                <li>Post properties & ads instantly</li>
                <li>Easy search for homes, rentals and land.</li>
                <li>Chat, book visits and close deals quickly.</li>
              </ul>
            </div>
          </section>

          <section className="realestate-stats-grid">
            {dashboardStats.map((stat) => (
              <article key={stat.label} className="realestate-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </article>
            ))}
          </section>
        </>
      ) : null}
      <section className="realestate-role-section" style={{ display: isBuyerMode || sellerWorkspaceMode ? "none" : "block" }}>
        <div className="realestate-section-heading">
          <h2>Role-based experience</h2>
          <p>Switch between buyer, seller, broker, builder, and admin journeys without leaving the marketplace.</p>
        </div>
        <div className="realestate-role-grid">
          {ROLE_MODES.map((roleMode) => (
            <button
              key={roleMode.id}
              type="button"
              className={`realestate-role-card ${activeRole === roleMode.id ? "active" : ""}`}
              onClick={() => {
                if (allowedRoleModes.includes(roleMode.id)) {
                  setActiveRole(roleMode.id);
                  setSellerWorkspaceMode(false);
                } else {
                  pushToast(`Your account cannot access the ${roleMode.title} workspace.`, "info");
                }
              }}
              aria-disabled={!allowedRoleModes.includes(roleMode.id)}
            >
              <strong>{roleMode.title}</strong>
              <span>{roleMode.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="realestate-ecosystem-grid" style={{ display: isBuyerMode || sellerWorkspaceMode ? "none" : "block" }}>
        <article className="realestate-surface-card">
          <div className="realestate-section-heading">
            <h2>Real Estate Ecosystem</h2>
            <p>One platform for listings, construction, financing, tenancy, and homeowner services.</p>
          </div>
          <div className="realestate-service-grid">
            {CONSTRUCTION_SERVICES.map((service) => (
              <button
                key={service.id}
                type="button"
                className={`realestate-service-card ${selectedService === service.id ? "active" : ""}`}
                onClick={() => handleConstructionRequest(service.id)}
              >
                <strong>{service.title}</strong>
                <span>{service.description}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      {/* HOMESPHERE FOR BUYERS */}
      {isBuyerMode ? (
        <HomeSphere
          onNavigateToDashboard={(role, options = {}) => {
            const normalizedRole = String(role || "").toLowerCase() === "seller" ? "owner" : String(role || "").toLowerCase();
            if (normalizedRole !== "owner") {
              pushToast("Enable seller access to post properties.", "info");
              return false;
            }
            return openSellerWorkspace({ postingType: options?.postingType || "property" });
          }}
        />
      ) : null}

      {!isBuyerMode && sellerWorkspaceMode ? (
        <section className="realestate-surface-card">
          <div className="realestate-section-heading">
            <h2>HomeSphere posting workspace</h2>
            <p>Create your ad directly here without opening the old mixed marketplace view.</p>
          </div>
          <div className="realestate-inline-actions">
            <button
              type="button"
              className="realestate-inline-button"
              onClick={() => {
                setSellerWorkspaceMode(false);
                setActiveRole("buyer");
              }}
            >
              Back to buyer listings
            </button>
          </div>
        </section>
      ) : null}

      <section className="realestate-main-grid" style={{ display: isBuyerMode ? "none" : "grid" }}>
        <div className="realestate-left-column">
          {!sellerWorkspaceMode && selectedProperty ? null : (
            <h1 className="sr-only">homesphere turns property discovery into a verified marketplace</h1>
          )}
          {!sellerWorkspaceMode ? (
            <>
              <FiltersPanel
                filters={draftFilters}
                onChange={handleFilterDraftChange}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                locations={locations}
                propertyTypes={propertyTypes}
                amenities={allAmenities}
                maxPrice={maxPrice}
                maxArea={maxArea}
              />

              <article className="realestate-listing-card">
                <div className="realestate-section-heading">
                  <h2>Marketplace inventory</h2>
                  <p>{filteredProperties.length} properties match the current search.</p>
                </div>
                {filteredProperties.length === 0 ? (
                  <div className="realestate-empty-state realestate-empty-state-actions">
                    <h3>No properties match these filters</h3>
                    <p>Try widening your budget, reducing minimum area, or relaxing nearby constraints.</p>
                    <div className="realestate-inline-actions">
                      <button type="button" className="realestate-inline-button" onClick={handleResetFilters}>
                        Reset all filters
                      </button>
                      <button
                        type="button"
                        className="realestate-inline-button"
                        onClick={() =>
                          handleApplyFilters({
                            ...buildDefaultFilters(maxPrice),
                            verifiedFilter: "verified-only",
                            nearbyFilter: "metro",
                          })
                        }
                      >
                        Show verified near metro
                      </button>
                      <button
                        type="button"
                        className="realestate-inline-button"
                        onClick={() => {
                          setDraftFilters((state) => ({ ...state, searchText: "", amenityFilter: "all", locationFilter: "All" }));
                          handleApplyFilters({ ...filters, searchText: "", amenityFilter: "all", locationFilter: "All" });
                        }}
                      >
                        Relax text + amenity filters
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="realestate-property-grid">
                    {filteredProperties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        isActive={selectedProperty?.id === property.id}
                        isFavorite={favoriteIds.has(`realestate-${property.id}`)}
                        canManage={canManageProperty(property)}
                        onSelect={setSelectedPropertyId}
                        onEdit={handleEditListing}
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
            </>
          ) : null}

          {!sellerWorkspaceMode ? (
            <article className="realestate-operations-grid">
            <LeadBoard
              activeRole={activeRole}
              leadBoard={leadBoard}
              onStageUpdate={handleLeadStageUpdate}
              loading={asyncState.leadUpdate}
            />
            <VisitBoard
              visitBoard={visitBoard}
              onStatusUpdate={handleVisitStatusUpdate}
              loading={asyncState.visitUpdate}
            />
            <section className="realestate-surface-card">
              <div className="realestate-section-heading">
                <h2>Monetization</h2>
                <p>Razorpay/Stripe activation, invoice tracking, plan expiry, and featured credits.</p>
              </div>
              <div className="realestate-plan-list">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <div key={plan.id} className="realestate-plan-card">
                    <strong>{plan.name}</strong>
                    <span>{formatInr(plan.amountInr)}/month - {plan.featuredCredits} featured credits</span>
                    <div className="realestate-inline-actions">
                      <button
                        type="button"
                        className="realestate-plan-button"
                        onClick={() => handleSubscriptionUpgrade(plan.id, "razorpay")}
                        disabled={asyncState.payment}
                      >
                        Razorpay
                      </button>
                      <button
                        type="button"
                        className="realestate-inline-button"
                        onClick={() => handleSubscriptionUpgrade(plan.id, "stripe")}
                        disabled={asyncState.payment}
                      >
                        Stripe
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {subscriptionState.invoiceNumber ? (
                <p className="realestate-pitch">
                  Active plan: {subscriptionState.planId} | Invoice {subscriptionState.invoiceNumber} | Expires{" "}
                  {subscriptionState.expiresOn} | Featured credits {subscriptionState.featuredCredits}
                </p>
              ) : null}
            </section>
          </article>
          ) : null}

          <ListingForm
            activeRole={activeRole}
            editListingId={editListingId}
            listingForm={listingForm}
            fieldErrors={listingFieldErrors}
            loading={asyncState.listingSubmit}
            onInputChange={handleListingInputChange}
            onToggleChange={handleListingToggleChange}
            onSubmit={handleListingSubmit}
          />

          {activeRole === "admin" ? (
            <AdminPanel properties={properties} leadBoard={leadBoard} queues={adminQueues} />
          ) : null}
        </div>

        <aside className="realestate-right-column" style={{ display: sellerWorkspaceMode ? "none" : "block" }}>
          <article className="realestate-detail-card">
              <h1 className="sr-only">homesphere turns property discovery into a verified marketplace</h1>
            <PropertyDetailTabs
              property={selectedProperty}

              canManage={canManageProperty(selectedProperty)}

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
                  onApply={handleLoanApply}
                  loading={asyncState.loanApply}
                />
              }
              uiMessages={{
                onRequestDocuments: () => pushToast("Document request drafted. Seller can share PDFs via chat."),
                onViewVerificationHistory: () => pushToast("Verification history opened (demo)."),
                messages: (
                  <section className="realestate-chat-card">
                    <div className="realestate-section-heading">
                      <h3>In-app messaging</h3>
                      <p>Images, files, and instant follow-up live here.</p>
                    </div>
                    <div className="realestate-message-list">
                      {selectedMessages.map((message, index) => (
                        <div key={`${message.from}-${index}`} className="realestate-message-item">
                          <strong>{message.from}</strong>
                          <span>{message.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="realestate-message-composer">
                      <input type="text" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Type a message" />
                      <button type="button" onClick={handleSendMessage} disabled={asyncState.message}>
                        {asyncState.message ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </section>
                ),
                reviews: (
                  <section className="realestate-review-section">
                    <div className="realestate-section-heading">
                      <h3>Reviews and reporting</h3>
                      <p>Rate trusted agents and flag suspicious behavior quickly.</p>
                    </div>
                    <div className="realestate-review-list">
                      {selectedProperty?.reviews?.length ? (
                        selectedProperty.reviews.map((review, index) => (
                          <div key={`${review.author}-${index}`} className="realestate-review-item">
                            <strong>{review.author}</strong>
                            <span>{review.score} / 5</span>
                            <p>{review.comment}</p>
                          </div>
                        ))
                      ) : (
                        <div className="realestate-review-item">
                          <strong>No reviews yet</strong>
                          <p>The first verified buyer review will appear here.</p>
                        </div>
                      )}
                    </div>
                    <label className="realestate-field">
                      <span>Review rating</span>
                      <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)}>
                        {["5", "4", "3", "2", "1"].map((score) => (
                          <option key={score} value={score}>
                            {score} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="realestate-field">
                      <span>Review comment</span>
                      <textarea
                        rows="3"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Share how responsive or trustworthy the listing owner was"
                      />
                    </label>
                    <label className="realestate-field">
                      <span>Report concern</span>
                      <textarea
                        rows="3"
                        value={reportReason}
                        onChange={(event) => setReportReason(event.target.value)}
                        placeholder="Explain why the listing looks suspicious or inaccurate"
                      />
                    </label>
                    <div className="realestate-inline-actions">
                      <button type="button" className="realestate-inline-button" onClick={handleReviewSubmit} disabled={asyncState.review}>
                        Rate agent / builder
                      </button>
                      <button type="button" className="realestate-inline-button danger" onClick={handleReportSubmit} disabled={asyncState.report}>
                        Report fake listing
                      </button>
                    </div>
                  </section>
                ),
                actions: (
                  <>
                    <div className="realestate-action-stack">
                      <button type="button" className="realestate-primary-button" onClick={handleEnquirySubmit} disabled={asyncState.enquiry}>
                        {asyncState.enquiry ? "Sending..." : "Send enquiry"}
                      </button>
                      <button
                        type="button"
                        className="realestate-secondary-button"
                        onClick={() => pushToast(`Call request shared with ${selectedProperty?.sellerName}.`)}
                      >
                        Call owner / agent
                      </button>
                      <button
                        type="button"
                        className="realestate-secondary-button"
                        onClick={() =>
                          pushToast(
                            selectedProperty?.whatsappNumber
                              ? `WhatsApp enquiry initiated: ${selectedProperty.whatsappNumber}`
                              : `WhatsApp contact initiated with ${selectedProperty?.sellerName}.`
                          )
                        }
                      >
                        WhatsApp contact
                      </button>
                      <button type="button" className="realestate-secondary-button" onClick={() => pushToast("Property link copied to clipboard for sharing.")}>
                        Share property
                      </button>
                      <button type="button" className="realestate-secondary-button" onClick={() => pushToast("Brochure download started (demo).")}>
                        Download brochure
                      </button>
                      <button type="button" className="realestate-secondary-button" onClick={() => pushToast(`Price drop alert enabled for ${selectedProperty?.title}.`)}>
                        Enable alert
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

                    {!canManageProperty(selectedProperty) ? (
                      <section className="realestate-chat-card">
                        <div className="realestate-section-heading">
                          <h3>Schedule visit</h3>
                          <p>Book an onsite or virtual visit with conflict-aware seller scheduling.</p>
                        </div>
                        <label className="realestate-field">
                          <span>Visit date and time</span>
                          <input type="datetime-local" value={visitDateTime} onChange={(event) => setVisitDateTime(event.target.value)} />
                        </label>
                        <label className="realestate-field">
                          <span>Visit mode</span>
                          <select value={visitMode} onChange={(event) => setVisitMode(event.target.value)}>
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
                            placeholder="Share gate access, preferred slot, or virtual meeting details"
                          />
                        </label>
                        <button type="button" className="realestate-primary-button" onClick={handleVisitSchedule} disabled={asyncState.visitCreate}>
                          {asyncState.visitCreate ? "Scheduling..." : "Schedule visit"}
                        </button>
                      </section>
                    ) : null}

                    {similarProperties.length ? (
                      <section className="realestate-similar-section">
                        <div className="realestate-section-heading">
                          <h3>Similar properties</h3>
                          <p>Nearby supply to keep discovery moving.</p>
                        </div>
                        <div className="realestate-similar-list">
                          {similarProperties.map((property) => (
                            <button key={property.id} type="button" className="realestate-similar-item" onClick={() => setSelectedPropertyId(property.id)}>
                              <strong>{property.title}</strong>
                              <span>{property.priceLabel}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {activeRole === "admin" ? (
                      <section className="realestate-admin-actions">
                        <div className="realestate-section-heading">
                          <h3>Admin actions</h3>
                          <p>Moderate the listing, verify the owner, or escalate disputes.</p>
                        </div>
                        <div className="realestate-inline-actions">
                          <button type="button" className="realestate-inline-button" onClick={() => handleAdminAction("approve")} disabled={asyncState.moderation}>
                            Approve listing
                          </button>
                          <button type="button" className="realestate-inline-button" onClick={() => handleAdminAction("verify-user")} disabled={asyncState.moderation}>
                            Verify user
                          </button>
                          <button type="button" className="realestate-inline-button danger" onClick={() => handleAdminAction("reject")} disabled={asyncState.moderation}>
                            Reject listing
                          </button>
                        </div>
                      </section>
                    ) : null}
                  </>
                ),
              }}
            />
          </article>
        </aside>
      </section>

      {toasts.length ? (
        <div className="realestate-toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`realestate-toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}

      {confirmDeleteOpen ? (
        <div className="realestate-modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm delete listing">
          <div className="realestate-modal-card">
            <h3>Delete listing?</h3>
            <p>This action removes the property listing and cannot be undone.</p>
            <div className="realestate-inline-actions">
              <button type="button" className="realestate-inline-button" onClick={() => setConfirmDeleteOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="realestate-inline-button danger"
                onClick={confirmDeleteListing}
                disabled={asyncState.deleteListing}
              >
                {asyncState.deleteListing ? "Deleting..." : "Delete listing"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RealEstate;
