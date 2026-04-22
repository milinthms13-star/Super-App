import React, { useEffect, useMemo, useState, useRef } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/Classifieds.css";
import MultiSelectFilter from "./MultiSelectFilter";
import ImageLightbox from "./ImageLightbox";
import SpamWarning from "./SpamWarning";
import ResponseTimeBadge from "./ResponseTimeBadge";
import ToastContainer from "./ToastContainer";
import PriceHistory from "./PriceHistory";
import SellerFollow from "./SellerFollow";
import ReviewCard from "./ReviewCard";
import Wishlist from "./Wishlist";
import ChatBox from "./ChatBox";
import SellerStore from "./SellerStore";
import BulkActions from "./BulkActions";
import AdvancedReporting from "./AdvancedReporting";
import NotificationCenter from "./NotificationCenter";
import CategoryForms from "./CategoryForms";
import ListingTemplates from "./ListingTemplates";
import AutoRelist from "./AutoRelist";
import ScheduledPosting from "./ScheduledPosting";
import BulkImport from "./BulkImport";
import QuickDuplicate from "./QuickDuplicate";

// Map component - using a simple fallback for demonstration
const MapComponent = ({ location, latitude = 0, longitude = 0 }) => {
  return (
    <div className="classifieds-map-container">
      <iframe
        title={`Map for ${location}`}
        width="100%"
        height="300"
        style={{ border: "1px solid #ddd", borderRadius: "8px" }}
        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDummyKey&q=${encodeURIComponent(location)}`}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

const ROLE_MODES = [
  {
    id: "buyer",
    title: "Buyer",
    description: "Search nearby deals, save favorites, and contact sellers quickly.",
  },
  {
    id: "seller",
    title: "Seller",
    description: "Post ads, manage responses, and grow as a local micro-entrepreneur.",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Moderate listings, fight spam, and monitor marketplace health.",
  },
];

const DEFAULT_AD_FORM = {
  title: "",
  description: "",
  price: "",
  category: "Electronics",
  location: "",
  condition: "Used",
  mediaCount: "4",
  plan: "free",
};

const normalizeListing = (listing, index) => ({
  id: listing?.id || `classified-${index + 1}`,
  title: listing?.title || "Marketplace Listing",
  description:
    listing?.description ||
    "Trusted local listing with seller details, direct chat, and location-first discovery.",
  price: Number(listing?.price || 0),
  category: listing?.category || "Electronics",
  location: listing?.location || "Kerala",
  locality: listing?.locality || listing?.location || "Prime area",
  condition: listing?.condition || "Used",
  seller: listing?.seller || "Trusted Seller",
  sellerRole: listing?.sellerRole || "Seller",
  sellerEmail: listing?.sellerEmail || "",
  posted: listing?.posted || "2026-04-18",
  image: listing?.image || "Ad listing",
  featured: Boolean(listing?.featured),
  urgent: Boolean(listing?.urgent),
  verified: listing?.verified !== false,
  views: Number(listing?.views || 0),
  favorites: Number(listing?.favorites || 0),
  chats: Number(listing?.chats || 0),
  moderationStatus: listing?.moderationStatus || (listing?.verified === false ? "pending" : "approved"),
  languageSupport:
    Array.isArray(listing?.languageSupport) && listing.languageSupport.length > 0
      ? listing.languageSupport
      : ["English", "Malayalam"],
  tags:
    Array.isArray(listing?.tags) && listing.tags.length > 0
      ? listing.tags
      : [listing?.category || "General", listing?.condition || "Used"],
  mapLabel: listing?.mapLabel || `${listing?.location || "Kerala"} local discovery zone`,
  contactOptions:
    Array.isArray(listing?.contactOptions) && listing.contactOptions.length > 0
      ? listing.contactOptions
      : ["Chat"],
  mediaGallery:
    Array.isArray(listing?.mediaGallery) && listing.mediaGallery.length > 0
      ? listing.mediaGallery
      : ["Primary image"],
  monetizationPlan: listing?.monetizationPlan || (listing?.featured ? "Featured" : "Free"),
  spamScore: listing?.spamScore || 0,
  spamFlags: listing?.spamFlags || [],
  responseTimeMinutes: listing?.responseTimeMinutes || (listing?.verified ? 60 : 180),
  isOnline: listing?.isOnline || false,
  priceHistory: listing?.priceHistory || [],
  reviews: listing?.reviews || [],
  followers: listing?.followers || 0,
  messages: listing?.messages || [],
});

const getBaseRole = (currentUser) => {
  if (currentUser?.registrationType === "admin" || currentUser?.role === "admin") {
    return "admin";
  }

  if (currentUser?.registrationType === "entrepreneur" || currentUser?.role === "business") {
    return "seller";
  }

  return "buyer";
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const Classifieds = () => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    createClassifiedListing,
    sendClassifiedMessage,
    reportClassifiedListing,
    updateClassifiedListing,
    moderateClassifiedListing,
    deleteClassifiedListing,
    mockData,
  } = useApp();
  const [activeRole, setActiveRole] = useState(() => getBaseRole(currentUser));
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [locationFilter, setLocationFilter] = useState([]);
  const [conditionFilter, setConditionFilter] = useState([]);
  const [priceFilter, setPriceFilter] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [toasts, setToasts] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [listingForm, setListingForm] = useState(DEFAULT_AD_FORM);
  const [chatInput, setChatInput] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingListingId, setEditingListingId] = useState("");
  const [savedSearches, setSavedSearches] = useState([]);
  const [selectedListings, setSelectedListings] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [followedSellers, setFollowedSellers] = useState(new Set());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWithListing, setChatWithListing] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [selectedSellerStore, setSelectedSellerStore] = useState(null);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [reportingOpen, setReportingOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [showCategoryForms, setShowCategoryForms] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({});
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [autoRelistOpen, setAutoRelistOpen] = useState(false);
  const [selectedListingForRelist, setSelectedListingForRelist] = useState(null);
  const [scheduledPostingOpen, setScheduledPostingOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [quickDuplicateOpen, setQuickDuplicateOpen] = useState(false);
  const [selectedListingForDuplicate, setSelectedListingForDuplicate] = useState(null);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [scheduledListings, setScheduledListings] = useState([]);
  const fileInputRef = useRef(null);

  const handleSaveSearch = () => {
    const searchName = prompt("Enter a name for this saved search:");
    if (!searchName?.trim()) return;

    const searchData = {
      id: `search-${Date.now()}`,
      name: searchName.trim(),
      filters: {
        searchText,
        categoryFilter,
        locationFilter,
        conditionFilter,
        priceFilter,
        sortBy,
      },
      createdAt: new Date().toISOString(),
    };

    setSavedSearches(current => [...current, searchData]);
    setStatusMessage(`Search "${searchName}" saved successfully.`);
  };

  const handleImageUpload = (files) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUploadedImages((current) => [
            ...current,
            {
              id: `img-${Date.now()}-${Math.random()}`,
              data: event.target.result,
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
    addToast(`${files.length} image(s) uploaded successfully.`, 'success');
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleImageUpload(event.dataTransfer.files);
  };

  const removeImage = (imageId) => {
    setUploadedImages((current) =>
      current.filter((img) => img.id !== imageId)
    );
    addToast("Image removed.", 'info');
  };

  const handleSubmitReview = async () => {
    if (!selectedListing || !reviewText.trim()) {
      addToast("Please write a review before submitting.", 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const review = {
        id: `review-${Date.now()}`,
        rating: reviewRating,
        comment: reviewText.trim(),
        reviewerName: currentUser?.name || "Anonymous",
        reviewerEmail: currentUser?.email || "",
        createdAt: new Date().toISOString(),
      };

      await reportClassifiedListing(selectedListing.id, { review });
      setReviewText("");
      setReviewRating(5);
      setShowReviewForm(false);
      addToast(`Review submitted for ${selectedListing.title}.`, 'success');
    } catch (error) {
      setStatusMessage("Review could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSearch = (search) => {
    setSearchText(search.filters.searchText || "");
    setCategoryFilter(search.filters.categoryFilter || []);
    setLocationFilter(search.filters.locationFilter || []);
    setConditionFilter(search.filters.conditionFilter || []);
    setPriceFilter(search.filters.priceFilter || []);
    setSortBy(search.filters.sortBy || "featured");
    addToast(`Loaded saved search "${search.name}".`, 'info');
  };

  const handleDeleteSearch = (searchId) => {
    setSavedSearches(current => current.filter(search => search.id !== searchId));
    addToast("Saved search deleted.", 'info');
  };

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(current => [...current, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  const handleSelectListing = (listingId, selected) => {
    setSelectedListings(current => {
      const next = new Set(current);
      if (selected) {
        next.add(listingId);
      } else {
        next.delete(listingId);
      }
      return next;
    });
  };

  const handleSelectAllListings = (selected) => {
    if (selected) {
      setSelectedListings(new Set(filteredListings.map(listing => listing.id)));
    } else {
      setSelectedListings(new Set());
    }
  };

  const handleBulkAction = async () => {
    if (!selectedListings.size || !bulkAction) return;

    setSubmitting(true);
    try {
      const promises = Array.from(selectedListings).map(listingId => {
        if (bulkAction === "delete") {
          return deleteClassifiedListing(listingId);
        } else if (bulkAction === "approve") {
          return moderateClassifiedListing(listingId, "approve");
        } else if (bulkAction === "reject") {
          return moderateClassifiedListing(listingId, "reject");
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      setSelectedListings(new Set());
      setBulkAction("");
      setStatusMessage(`Bulk ${bulkAction} completed for ${selectedListings.size} listings.`);
    } catch (error) {
      setStatusMessage("Bulk action failed. Some operations may not have completed.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setActiveRole(getBaseRole(currentUser));
  }, [currentUser]);

  const listings = useMemo(
    () =>
      (Array.isArray(mockData?.classifiedsListings) ? mockData.classifiedsListings : []).map(
        normalizeListing
      ),
    [mockData?.classifiedsListings]
  );

  const messageRecords = Array.isArray(mockData?.classifiedsMessages)
    ? mockData.classifiedsMessages
    : [];
  const reportRecords = Array.isArray(mockData?.classifiedsReports)
    ? mockData.classifiedsReports
    : [];

  const categories = useMemo(
    () => [...new Set(listings.map((listing) => listing.category))],
    [listings]
  );

  const locations = useMemo(
    () => [...new Set(listings.map((listing) => listing.location))],
    [listings]
  );

  const conditions = useMemo(
    () => [...new Set(listings.map((listing) => listing.condition))],
    [listings]
  );

  const priceRanges = ["Under 10k", "10k - 50k", "50k - 1L", "1L+"];

  const filteredListings = useMemo(() => {
    const visibleListings = listings.filter((listing) => {
      if (listing.moderationStatus === "rejected" && activeRole !== "admin") {
        return false;
      }

      const matchesSearch =
        !searchText ||
        [
          listing.title,
          listing.description,
          listing.category,
          listing.location,
          listing.seller,
          listing.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(listing.category);
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(listing.location);
      const matchesCondition = conditionFilter.length === 0 || conditionFilter.includes(listing.condition);
      
      const matchesPrice = 
        priceFilter.length === 0 ||
        priceFilter.some(range => {
          if (range === "Under 10k") return listing.price < 10000;
          if (range === "10k - 50k") return listing.price >= 10000 && listing.price <= 50000;
          if (range === "50k - 1L") return listing.price > 50000 && listing.price <= 100000;
          if (range === "1L+") return listing.price > 100000;
          return false;
        });

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesCondition &&
        matchesPrice
      );
    });

    const sortedResults = [...visibleListings];
    sortedResults.sort((first, second) => {
      if (sortBy === "latest") {
        return new Date(second.posted) - new Date(first.posted);
      }
      if (sortBy === "price-low") {
        return first.price - second.price;
      }
      if (sortBy === "price-high") {
        return second.price - first.price;
      }
      if (sortBy === "popular") {
        return second.chats + second.favorites - (first.chats + first.favorites);
      }

      return (
        Number(second.featured) - Number(first.featured) ||
        Number(second.urgent) - Number(first.urgent) ||
        new Date(second.posted) - new Date(first.posted)
      );
    });

    return sortedResults;
  }, [
    activeRole,
    categoryFilter,
    conditionFilter,
    listings,
    locationFilter,
    priceFilter,
    searchText,
    sortBy,
  ]);

  // Pagination logic
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredListings.slice(startIndex, endIndex);
  }, [filteredListings, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, categoryFilter, locationFilter, conditionFilter, priceFilter, sortBy]);

  useEffect(() => {
    if (!filteredListings.length) {
      setSelectedListingId("");
      return;
    }

    const selectedVisible = filteredListings.some(
      (listing) => String(listing.id) === String(selectedListingId)
    );

    if (!selectedVisible) {
      setSelectedListingId(filteredListings[0].id);
    }
  }, [filteredListings, selectedListingId]);

  const editingListing = editingListingId ? listings.find(listing => listing.id === editingListingId) : null;

  useEffect(() => {
    if (editingListing) {
      setListingForm({
        title: editingListing.title || "",
        description: editingListing.description || "",
        price: editingListing.price || "",
        category: editingListing.category || "Electronics",
        location: editingListing.location || "",
        condition: editingListing.condition || "Used",
        mediaCount: editingListing.mediaCount || "4",
        plan: editingListing.featured ? "featured" : editingListing.urgent ? "urgent" : "free",
      });
    } else {
      setListingForm(DEFAULT_AD_FORM);
    }
  }, [editingListing, editingListingId, listings]);

  const classifiedFavorites = Array.isArray(favorites)
    ? favorites.filter((item) => item?.domain === "classifieds")
    : [];
  const favoriteIds = new Set(classifiedFavorites.map((item) => String(item.id)));
  const selectedListing =
    filteredListings.find((listing) => String(listing.id) === String(selectedListingId)) || null;
  const selectedMessages = selectedListing
    ? messageRecords.filter((message) => String(message.listingId) === String(selectedListing.id))
    : [];
  const selectedReportCount = selectedListing
    ? reportRecords.filter((report) => String(report.listingId) === String(selectedListing.id)).length
    : 0;

  const sellerListings = useMemo(
    () => listings.filter(listing => listing.sellerEmail === currentUser?.email),
    [listings, currentUser?.email]
  );

  const sellerStats = useMemo(() => {
    if (!sellerListings.length) return null;

    const totalViews = sellerListings.reduce((sum, listing) => sum + listing.views, 0);
    const totalChats = sellerListings.reduce((sum, listing) => sum + listing.chats, 0);
    const totalFavorites = sellerListings.reduce((sum, listing) => sum + listing.favorites, 0);
    const avgPrice = sellerListings.reduce((sum, listing) => sum + listing.price, 0) / sellerListings.length;

    return {
      totalListings: sellerListings.length,
      activeListings: sellerListings.filter(l => l.moderationStatus === "approved").length,
      totalViews,
      totalChats,
      totalFavorites,
      avgPrice: Math.round(avgPrice),
      conversionRate: totalViews > 0 ? Math.round((totalChats / totalViews) * 100) : 0,
    };
  }, [sellerListings]);

  const featuredListings = filteredListings.filter((listing) => listing.featured).slice(0, 3);
  const recentListings = [...filteredListings]
    .sort((first, second) => new Date(second.posted) - new Date(first.posted))
    .slice(0, 4);
  const leadBoard = useMemo(
    () =>
      listings
        .filter((listing) => listing.chats > 0)
        .sort((first, second) => second.chats - first.chats)
        .slice(0, 5)
        .map((listing) => ({
          id: listing.id,
          title: listing.title,
          chats: listing.chats,
          location: listing.location,
        })),
    [listings]
  );

  const dashboardStats = useMemo(
    () => ({
      liveListings: listings.length,
      verifiedListings: listings.filter((listing) => listing.verified).length,
      featuredListings: listings.filter((listing) => listing.featured).length,
      chatEngagement: listings.reduce((total, listing) => total + listing.chats, 0),
      savedAds: classifiedFavorites.length,
      reports: reportRecords.length,
    }),
    [classifiedFavorites.length, listings, reportRecords.length]
  );

  const handleFavoriteToggle = (listing) => {
    const favoriteId = `classifieds-${listing.id}`;
    if (favoriteIds.has(favoriteId)) {
      removeFavorite(favoriteId);
      setStatusMessage(`${listing.title} removed from saved ads.`);
      return;
    }

    addToFavorites({
      id: favoriteId,
      domain: "classifieds",
      title: listing.title,
      price: listing.price,
      location: listing.location,
      category: listing.category,
    });
    setStatusMessage(`${listing.title} saved to your wishlist.`);
  };

  const handleListingInputChange = (event) => {
    const { name, value } = event.target;
    setListingForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleListingSubmit = async (event) => {
    event.preventDefault();

    if (!listingForm.title.trim() || !listingForm.description.trim() || !listingForm.location.trim()) {
      setStatusMessage("Add a title, description, and location before publishing an ad.");
      return;
    }

    if (Number(listingForm.price || 0) <= 0) {
      setStatusMessage("Enter a valid price before publishing an ad.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingListingId) {
        // Update existing listing
        const updatedListing = await updateClassifiedListing(editingListingId, {
          ...listingForm,
          price: Number(listingForm.price),
          mediaCount: Number(listingForm.mediaCount),
        });
        setEditingListingId("");
        setSelectedListingId(updatedListing?.id || "");
        setStatusMessage("Ad updated successfully and stored in the database.");
      } else {
        // Create new listing
        const createdListing = await createClassifiedListing({
          ...listingForm,
          price: Number(listingForm.price),
          mediaCount: Number(listingForm.mediaCount),
        });
        setListingForm(DEFAULT_AD_FORM);
        setSelectedListingId(createdListing?.id || "");
        setStatusMessage("Ad submitted successfully and stored in the database.");
      }
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Ad could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedListing || !chatInput.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await sendClassifiedMessage(selectedListing.id, { text: chatInput.trim() });
      setChatInput("");
      setStatusMessage(`Message sent to ${selectedListing.seller} and stored in the database.`);
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Message could not be sent."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!selectedListing || !reportReason.trim()) {
      setStatusMessage("Enter a short reason before reporting this ad.");
      return;
    }

    setSubmitting(true);
    try {
      await reportClassifiedListing(selectedListing.id, { reason: reportReason.trim() });
      setReportReason("");
      setStatusMessage(`Report submitted for ${selectedListing.title} and stored in the database.`);
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Report could not be saved."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminAction = async (action, successMessage) => {
    if (!selectedListing) {
      return;
    }

    setSubmitting(true);
    try {
      await moderateClassifiedListing(selectedListing.id, action);
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Moderation update failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteClassifiedListing(selectedListing.id);
      setStatusMessage(`${selectedListing.title} was deleted from the database.`);
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Listing could not be deleted."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="classifieds-page">
      <section className="classifieds-hero">
        <div>
          <p className="classifieds-eyebrow">TradePost classifieds</p>
          <h1>Local buying, selling, discovery, and direct buyer-seller conversations in one flow.</h1>
          <p className="classifieds-hero-copy">
            This classified marketplace is now backed by persisted module data, so ads, messages,
            moderation activity, and reports survive refreshes and stay stored in the backend.
          </p>
        </div>

        <div className="classifieds-stats-grid">
          <article className="classifieds-stat-card">
            <strong>{dashboardStats.liveListings}</strong>
            <span>Live ads</span>
          </article>
          <article className="classifieds-stat-card">
            <strong>{dashboardStats.verifiedListings}</strong>
            <span>Verified listings</span>
          </article>
          <article className="classifieds-stat-card">
            <strong>{dashboardStats.chatEngagement}</strong>
            <span>Chat interactions</span>
          </article>
          <article className="classifieds-stat-card">
            <strong>{dashboardStats.reports}</strong>
            <span>Stored reports</span>
          </article>
        </div>
      </section>

      {/* Toolbar for Priority Set #3 Features */}
      <div className="classifieds-toolbar">
        <button
          className="toolbar-btn notification-btn"
          onClick={() => setNotificationCenterOpen(true)}
          title="Open notifications"
        >
          🔔 Notifications
        </button>

        {getBaseRole(currentUser) === 'seller' && (
          <>
            <button
              className="toolbar-btn bulk-actions-btn"
              onClick={() => setBulkActionsOpen(true)}
              title="Bulk manage listings"
            >
              📋 Manage Listings
            </button>
            <button
              className="toolbar-btn reporting-btn"
              onClick={() => setReportingOpen(true)}
              title="View analytics"
            >
              📊 Analytics
            </button>

            {/* Priority Set #4 Seller Tools */}
            <button
              className="toolbar-btn templates-btn"
              onClick={() => setTemplatesOpen(true)}
              title="Manage listing templates"
            >
              📚 Templates
            </button>
            <button
              className="toolbar-btn schedule-btn"
              onClick={() => {
                if (selectedListing) {
                  setScheduledPostingOpen(true);
                } else {
                  addToast('Please select a listing first', 'warning');
                }
              }}
              title="Schedule listing post"
            >
              📅 Schedule
            </button>
            <button
              className="toolbar-btn import-btn"
              onClick={() => setBulkImportOpen(true)}
              title="Bulk import listings"
            >
              📂 Import
            </button>
            <button
              className="toolbar-btn duplicate-btn"
              onClick={() => {
                if (selectedListing) {
                  setSelectedListingForDuplicate(selectedListing);
                  setQuickDuplicateOpen(true);
                } else {
                  addToast('Please select a listing first', 'warning');
                }
              }}
              title="Quick duplicate listing"
            >
              📋 Duplicate
            </button>
          </>
        )}

        <button
          className="toolbar-btn category-forms-btn"
          onClick={() => setShowCategoryForms(true)}
          title="Add category details"
        >
          📝 Category Details
        </button>
      </div>

      <section className="classifieds-role-strip">
        {ROLE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`classifieds-role-card ${activeRole === mode.id ? "active" : ""}`}
            onClick={() => setActiveRole(mode.id)}
          >
            <strong>{mode.title}</strong>
            <span>{mode.description}</span>
          </button>
        ))}
      </section>

      {statusMessage ? <div className="classifieds-status-banner">{statusMessage}</div> : null}

      <section className="classifieds-layout">
        <div className="classifieds-main-column">
          <article className="classifieds-surface-card classifieds-filter-card">
            <div className="classifieds-section-heading">
              <h2>Search and filters</h2>
              <p>Keyword discovery, location-first browsing, category filters, and sorting built for fast ad hunting.</p>
            </div>

            <div className="classifieds-filter-grid">
              <label className="classifieds-field classifieds-field-search">
                <span>Search ads</span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search by title, category, seller, or keyword"
                />
              </label>

              <MultiSelectFilter
                label="Category"
                options={categories}
                selected={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Select categories..."
              />

              <MultiSelectFilter
                label="Location"
                options={locations}
                selected={locationFilter}
                onChange={setLocationFilter}
                placeholder="Select locations..."
              />

              <MultiSelectFilter
                label="Condition"
                options={conditions}
                selected={conditionFilter}
                onChange={setConditionFilter}
                placeholder="Select conditions..."
              />

              <MultiSelectFilter
                label="Price range"
                options={priceRanges}
                selected={priceFilter}
                onChange={setPriceFilter}
                placeholder="Select price ranges..."
              />

              <label className="classifieds-field">
                <span>Sort by</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="featured">Featured first</option>
                  <option value="latest">Latest</option>
                  <option value="price-low">Price low to high</option>
                  <option value="price-high">Price high to low</option>
                  <option value="popular">Most engaged</option>
                </select>
              </label>
            </div>

            <div className="classifieds-filter-actions">
              <button type="button" className="classifieds-inline-button" onClick={handleSaveSearch}>
                Save this search
              </button>
              {savedSearches.length > 0 && (
                <div className="classifieds-saved-searches">
                  <span>Saved searches:</span>
                  {savedSearches.map((search) => (
                    <button
                      key={search.id}
                      type="button"
                      className="classifieds-inline-button"
                      onClick={() => handleLoadSearch(search)}
                      title={`Load ${search.name}`}
                    >
                      {search.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>

          <section className="classifieds-highlights-grid">
            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Featured ads</h2>
                <p>Premium placements for urgent or revenue-generating listings.</p>
              </div>
              <div className="classifieds-mini-list">
                {featuredListings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className="classifieds-mini-item"
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <strong>{listing.title}</strong>
                    <span>{formatPrice(listing.price)} in {listing.location}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Recently posted</h2>
                <p>Latest ads from buyers, sellers, recruiters, and local service providers.</p>
              </div>
              <div className="classifieds-mini-list">
                {recentListings.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    className="classifieds-mini-item"
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <strong>{listing.title}</strong>
                    <span>{listing.posted}</span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <article className="classifieds-surface-card">
            <div className="classifieds-section-heading">
              <h2>Marketplace listings</h2>
              <p>{filteredListings.length} ads matched the current filters.</p>
              {activeRole === "admin" && filteredListings.length > 0 && (
                <div className="classifieds-bulk-actions">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedListings.size === filteredListings.length && filteredListings.length > 0}
                      onChange={(e) => handleSelectAllListings(e.target.checked)}
                    />
                    Select all
                  </label>
                  {selectedListings.size > 0 && (
                    <>
                      <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                        <option value="">Choose action</option>
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                        <option value="delete">Delete</option>
                      </select>
                      <button
                        type="button"
                        className="classifieds-inline-button danger"
                        onClick={handleBulkAction}
                        disabled={submitting || !bulkAction}
                      >
                        Apply to {selectedListings.size} selected
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="classifieds-listings-grid">
              {paginatedListings.map((listing) => {
                const favoriteId = `classifieds-${listing.id}`;
                const isSaved = favoriteIds.has(favoriteId);
                const isSelected = selectedListings.has(listing.id);

                return (
                  <article
                    key={listing.id}
                    className={`classifieds-listing-card ${selectedListing?.id === listing.id ? "selected" : ""} ${isSelected ? "bulk-selected" : ""}`}
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    {activeRole === "admin" && (
                      <div className="classifieds-bulk-checkbox">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectListing(listing.id, e.target.checked);
                          }}
                        />
                      </div>
                    )}
                    <div className="classifieds-listing-media">
                      <span>{listing.image}</span>
                    </div>
                    <div className="classifieds-listing-body">
                      <div className="classifieds-listing-badges">
                        {listing.featured ? <span className="classifieds-badge accent">Featured</span> : null}
                        {listing.urgent ? <span className="classifieds-badge urgent">Urgent</span> : null}
                        <span className={`classifieds-badge ${listing.verified ? "verified" : "pending"}`}>
                          {listing.verified ? "Verified" : "Pending review"}
                        </span>
                      </div>
                      <h3>{listing.title}</h3>
                      <strong>{formatPrice(listing.price)}</strong>
                      <p>{listing.category} • {listing.condition} • {listing.location}</p>
                      <div className="classifieds-card-meta">
                        <span>{listing.seller}</span>
                        <span>{listing.chats} chats</span>
                        <span>{listing.posted}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="classifieds-inline-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFavoriteToggle(listing);
                      }}
                    >
                      {isSaved ? "Saved" : "Save"}
                    </button>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="classifieds-pagination">
                <button
                  type="button"
                  className="classifieds-pagination-button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                <div className="classifieds-pagination-info">
                  <span>
                    Page {currentPage} of {totalPages} ({filteredListings.length} total)
                  </span>
                </div>
                <button
                  type="button"
                  className="classifieds-pagination-button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </article>

          {(activeRole === "seller" || activeRole === "admin") ? (
            <>
              {activeRole === "seller" && sellerStats && (
                <article className="classifieds-surface-card">
                  <div className="classifieds-section-heading">
                    <h2>Your seller dashboard</h2>
                    <p>Track your listings performance and engagement metrics.</p>
                  </div>
                  <div className="classifieds-stats-grid">
                    <article className="classifieds-stat-card">
                      <strong>{sellerStats.totalListings}</strong>
                      <span>Total ads</span>
                    </article>
                    <article className="classifieds-stat-card">
                      <strong>{sellerStats.activeListings}</strong>
                      <span>Active ads</span>
                    </article>
                    <article className="classifieds-stat-card">
                      <strong>{formatCompactNumber(sellerStats.totalViews)}</strong>
                      <span>Total views</span>
                    </article>
                    <article className="classifieds-stat-card">
                      <strong>{sellerStats.totalChats}</strong>
                      <span>Chat inquiries</span>
                    </article>
                    <article className="classifieds-stat-card">
                      <strong>{sellerStats.conversionRate}%</strong>
                      <span>Conversion rate</span>
                    </article>
                    <article className="classifieds-stat-card">
                      <strong>{formatPrice(sellerStats.avgPrice)}</strong>
                      <span>Avg. price</span>
                    </article>
                  </div>
                </article>
              )}

              <article className="classifieds-surface-card">
                <div className="classifieds-section-heading">
                  <h2>{editingListingId ? "Edit ad" : "Post a new ad"}</h2>
                  <p>{editingListingId ? "Update your existing ad with new details." : "Create a local classified with title, description, price, category, location, media, and promotion plan."}</p>
                </div>

              <form className="classifieds-form-grid" onSubmit={handleListingSubmit}>
                <label className="classifieds-field">
                  <span>Title</span>
                  <input name="title" value={listingForm.title} onChange={handleListingInputChange} />
                </label>

                <label className="classifieds-field">
                  <span>Price</span>
                  <input
                    name="price"
                    type="number"
                    min="1"
                    value={listingForm.price}
                    onChange={handleListingInputChange}
                  />
                </label>

                <label className="classifieds-field">
                  <span>Category</span>
                  <select name="category" value={listingForm.category} onChange={handleListingInputChange}>
                    {["Vehicles", "Electronics", "Real Estate", "Jobs", "Services"].map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="classifieds-field">
                  <span>Location</span>
                  <input name="location" value={listingForm.location} onChange={handleListingInputChange} />
                </label>

                <label className="classifieds-field">
                  <span>Condition</span>
                  <select name="condition" value={listingForm.condition} onChange={handleListingInputChange}>
                    {["New", "Like New", "Used"].map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="classifieds-field">
                  <span>Media count</span>
                  <select name="mediaCount" value={listingForm.mediaCount} onChange={handleListingInputChange}>
                    {["1", "2", "4", "6", "8"].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="classifieds-field">
                  <span>Promotion plan</span>
                  <select name="plan" value={listingForm.plan} onChange={handleListingInputChange}>
                    <option value="free">Free listing</option>
                    <option value="featured">Featured ad</option>
                    <option value="urgent">Urgent tag</option>
                    <option value="subscription">Seller subscription</option>
                  </select>
                </label>

                <div className="classifieds-field classifieds-field-full">
                  <span>Upload images</span>
                  <div
                    className={`classifieds-image-upload-zone ${dragOver ? "drag-over" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="classifieds-upload-content">
                      <span className="classifieds-upload-icon">📁</span>
                      <p>Drag and drop images here or click to select</p>
                      <span className="classifieds-upload-hint">Supports JPG, PNG, GIF (Max 5MB each)</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                  </div>
                  {uploadedImages.length > 0 && (
                    <div className="classifieds-uploaded-images">
                      <p className="classifieds-uploaded-count">
                        {uploadedImages.length} image(s) uploaded
                      </p>
                      <div className="classifieds-image-gallery">
                        {uploadedImages.map((img) => (
                          <div key={img.id} className="classifieds-image-item">
                            <img src={img.data} alt={img.name} />
                            <button
                              type="button"
                              className="classifieds-image-remove"
                              onClick={() => removeImage(img.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <label className="classifieds-field classifieds-field-full">
                  <span>Description</span>
                  <textarea
                    rows="4"
                    name="description"
                    value={listingForm.description}
                    onChange={handleListingInputChange}
                    placeholder="Explain the item, condition, deal terms, and pickup or service details"
                  />
                </label>

                <button type="submit" className="classifieds-primary-button" disabled={submitting}>
                  {submitting ? "Saving..." : editingListingId ? "Update ad" : "Submit ad"}
                </button>
                {editingListingId && (
                  <button
                    type="button"
                    className="classifieds-secondary-button"
                    onClick={() => {
                      setEditingListingId("");
                      setListingForm(DEFAULT_AD_FORM);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </form>
            </article>
            </>
          ) : null}

          <section className="classifieds-ops-grid">
            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Trust and moderation</h2>
                <p>Verification, report flows, spam detection, and admin approval keep the marketplace healthy.</p>
              </div>
              <div className="classifieds-checklist">
                <div>
                  <strong>Secure access</strong>
                  <span>OTP login, email login, and Google sign-in ready in the FRS.</span>
                </div>
                <div>
                  <strong>Safety actions</strong>
                  <span>Report ad, block user, review queue, and anti-spam screening.</span>
                </div>
                <div>
                  <strong>Approval system</strong>
                  <span>{dashboardStats.reports} reports currently stored for moderation attention.</span>
                </div>
              </div>
            </article>

            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Monetization</h2>
                <p>Free posting works for casual users, while paid placement and subscriptions unlock revenue.</p>
              </div>
              <div className="classifieds-checklist">
                <div>
                  <strong>Free</strong>
                  <span>Limited ad posting with standard visibility.</span>
                </div>
                <div>
                  <strong>Featured and urgent</strong>
                  <span>Home feed visibility, top placement, and higher response rate.</span>
                </div>
                <div>
                  <strong>Seller Pro</strong>
                  <span>Subscription-led tools for repeat sellers and micro-businesses.</span>
                </div>
              </div>
            </article>
          </section>
        </div>

        <aside className="classifieds-detail-column">
          <article className="classifieds-detail-card">
            {selectedListing ? (
              <>
                <div className="classifieds-detail-header">
                  <div>
                    <div className="classifieds-listing-badges">
                      {selectedListing.featured ? <span className="classifieds-badge accent">Featured</span> : null}
                      {selectedListing.urgent ? <span className="classifieds-badge urgent">Urgent</span> : null}
                      <span className={`classifieds-badge ${selectedListing.verified ? "verified" : "pending"}`}>
                        {selectedListing.verified ? "Verified seller" : "Pending verification"}
                      </span>
                    </div>
                    <h2>{selectedListing.title}</h2>
                    <p>{selectedListing.location} • {selectedListing.locality}</p>
                  </div>
                  <button
                    type="button"
                    className="classifieds-inline-button"
                    onClick={() => handleFavoriteToggle(selectedListing)}
                  >
                    {favoriteIds.has(`classifieds-${selectedListing.id}`) ? "Saved" : "Save"}
                  </button>
                </div>

                <div className="classifieds-detail-media">
                  <strong>{selectedListing.image}</strong>
                  <span>{selectedListing.mediaGallery.length} media items stored for this ad</span>
                  <button
                    type="button"
                    className="classifieds-inline-button"
                    onClick={() => {
                      setLightboxOpen(true);
                      setLightboxIndex(0);
                    }}
                  >
                    View gallery
                  </button>
                </div>

                <SpamWarning
                  spamScore={selectedListing.spamScore}
                  spamFlags={selectedListing.spamFlags}
                />

                <div className="classifieds-detail-price">
                  <strong>{formatPrice(selectedListing.price)}</strong>
                  <span>{selectedListing.category} • {selectedListing.condition}</span>
                </div>

                <div className="price-history-section">
                  <PriceHistory 
                    priceHistory={selectedListing.priceHistory}
                    currentPrice={selectedListing.price}
                    currency="₹"
                  />
                </div>

                <div className="wishlist-section">
                  <Wishlist 
                    isInWishlist={wishlistItems.has(selectedListing.id)}
                    listingId={selectedListing.id}
                    onWishlistChange={(isWishlisted) => {
                      if (isWishlisted) {
                        setWishlistItems(prev => new Set([...prev, selectedListing.id]));
                        addToast(`${selectedListing.title} added to wishlist.`, 'success');
                      } else {
                        setWishlistItems(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(selectedListing.id);
                          return newSet;
                        });
                        addToast(`${selectedListing.title} removed from wishlist.`, 'info');
                      }
                    }}
                  />
                </div>

                <p className="classifieds-detail-description">{selectedListing.description}</p>

                <div className="classifieds-chip-cloud">
                  {selectedListing.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="classifieds-map-card">
                  <strong>Location map</strong>
                  <span>{selectedListing.mapLabel}</span>
                  <MapComponent location={selectedListing.location} />
                </div>

                <section className="classifieds-surface-subcard">
                  <div className="classifieds-section-heading">
                    <h3>Ratings & Reviews</h3>
                    <p>See what other buyers think about this listing and seller.</p>
                  </div>
                  <div className="classifieds-rating-summary">
                    <div className="classifieds-rating-display">
                      <span className="classifieds-rating-value">
                        {selectedListing.averageRating || 4.8}
                      </span>
                      <span className="classifieds-rating-stars">
                        {'⭐'.repeat(Math.round(selectedListing.averageRating || 4.8))}
                      </span>
                      <span className="classifieds-review-count">
                        ({selectedListing.totalReviews || 0} reviews)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="classifieds-inline-button"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                  >
                    {showReviewForm ? "Cancel review" : "Write a review"}
                  </button>
                  {showReviewForm && (
                    <div className="classifieds-review-form">
                      <label className="classifieds-field">
                        <span>Rating</span>
                        <div className="classifieds-star-input">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={`classifieds-star ${
                                star <= reviewRating ? "active" : ""
                              }`}
                              onClick={() => setReviewRating(star)}
                            >
                              ⭐
                            </button>
                          ))}
                        </div>
                      </label>
                      <label className="classifieds-field">
                        <span>Your review</span>
                        <textarea
                          rows="3"
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Share your experience with this listing..."
                          maxLength={500}
                        />
                        <span className="classifieds-char-count">
                          {reviewText.length}/500
                        </span>
                      </label>
                      <button
                        type="button"
                        className="classifieds-primary-button"
                        onClick={handleSubmitReview}
                        disabled={submitting || !reviewText.trim()}
                      >
                        {submitting ? "Submitting..." : "Submit review"}
                      </button>
                    </div>
                  )}
                  {selectedListing.reviews && selectedListing.reviews.length > 0 && (
                    <div className="classifieds-reviews-list">
                      <strong>Recent reviews</strong>
                      {selectedListing.reviews.slice(0, 5).map((review, idx) => (
                        <ReviewCard
                          key={`${review.id || idx}`}
                          review={{
                            id: review.id || idx,
                            rating: review.rating || 5,
                            title: review.title,
                            comment: review.comment,
                            buyerName: review.reviewerName || 'Anonymous',
                            buyerAvatar: review.reviewerAvatar,
                            date: review.createdAt || new Date().toISOString(),
                            verified: review.verified !== false,
                            pros: review.pros || [],
                            cons: review.cons || [],
                            images: review.images || [],
                            helpfulCount: review.helpful || 0,
                            userMarkedHelpful: false,
                            tags: review.tags || [],
                            sellerResponse: review.sellerResponse,
                          }}
                          onHelpful={(helpful) => {
                            addToast(helpful ? 'Marked as helpful' : 'Removed helpful mark', 'info');
                          }}
                          onReport={(reviewId) => {
                            addToast('Review reported for review', 'info');
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <div className="classifieds-seller-card">
                  <SellerFollow
                    seller={{
                      name: selectedListing.seller,
                      avatar: selectedListing.sellerAvatar || '/default-avatar.png',
                      verified: selectedListing.verified,
                      rating: selectedListing.sellerRating || 4.8,
                      reviewCount: selectedListing.sellerReviewCount || 45,
                      listingCount: selectedListing.sellerListingCount || 24,
                      followers: selectedListing.followers || 0,
                      responseTime: `~${selectedListing.responseTimeMinutes} min`,
                      memberSince: 'Jan 2024',
                      positivePercentage: 98,
                      verificationBadges: ['email', 'phone', selectedListing.verified ? 'identity' : null].filter(Boolean),
                    }}
                    isFollowing={followedSellers.has(selectedListing.seller)}
                    onFollowChange={(isFollowing) => {
                      if (isFollowing) {
                        setFollowedSellers(prev => new Set([...prev, selectedListing.seller]));
                        addToast(`You followed ${selectedListing.seller}.`, 'success');
                      } else {
                        setFollowedSellers(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(selectedListing.seller);
                          return newSet;
                        });
                        addToast(`You unfollowed ${selectedListing.seller}.`, 'info');
                      }
                    }}
                  />
                </div>

                <div className="classifieds-kpi-row">
                  <div>
                    <strong>{formatCompactNumber(selectedListing.views)}</strong>
                    <span>Views</span>
                  </div>
                  <div>
                    <strong>{selectedListing.favorites}</strong>
                    <span>Saves</span>
                  </div>
                  <div>
                    <strong>{selectedListing.chats}</strong>
                    <span>Chats</span>
                  </div>
                </div>

                <div className="classifieds-action-stack">
                  <button
                    type="button"
                    className="classifieds-primary-button"
                    onClick={() => {
                      setChatWithListing(selectedListing);
                      setChatOpen(true);
                    }}
                  >
                    💬 Chat with Seller
                  </button>
                  <button
                    type="button"
                    className="classifieds-secondary-button"
                    onClick={() => addToast(`Call request shared with ${selectedListing.seller}.`, 'info')}
                  >
                    📞 Call Seller
                  </button>
                  <button
                    type="button"
                    className="classifieds-secondary-button"
                    onClick={() => addToast(`Price alerts enabled for ${selectedListing.title}.`, 'success')}
                  >
                    🔔 Price Alert
                  </button>
                </div>

                <section className="classifieds-chat-card">
                  <div className="classifieds-section-heading">
                    <h3>Buyer and seller chat</h3>
                    <p>Message history is loaded from the backend store for this listing.</p>
                  </div>
                  <div className="classifieds-message-list">
                    {selectedMessages.length ? (
                      selectedMessages.map((message, index) => (
                        <div key={`${message.id || message.from}-${index}`} className="classifieds-message-item">
                          <strong>{message.from}</strong>
                          <span>{message.text}</span>
                        </div>
                      ))
                    ) : (
                      <div className="classifieds-message-item">
                        <strong>TradePost</strong>
                        <span>No stored messages yet for this listing.</span>
                      </div>
                    )}
                  </div>
                  <div className="classifieds-message-composer">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Type a message for the seller"
                    />
                    <button type="button" onClick={handleSendMessage} disabled={submitting}>
                      Send
                    </button>
                  </div>
                </section>

                <section className="classifieds-surface-subcard">
                  <div className="classifieds-section-heading">
                    <h3>Favorites and safety</h3>
                    <p>Save ads, report abuse, and block suspicious users without leaving the listing.</p>
                  </div>
                  <div className="classifieds-inline-actions">
                    <button
                      type="button"
                      className="classifieds-inline-button"
                      onClick={() => handleFavoriteToggle(selectedListing)}
                    >
                      {favoriteIds.has(`classifieds-${selectedListing.id}`) ? "Remove wishlist" : "Save to wishlist"}
                    </button>
                    <button
                      type="button"
                      className="classifieds-inline-button"
                      onClick={() => setStatusMessage(`User blocked for ${selectedListing.title}.`)}
                    >
                      Block user
                    </button>
                    <button
                      type="button"
                      className="classifieds-inline-button danger"
                      onClick={handleReportSubmit}
                      disabled={submitting}
                    >
                      Report ad
                    </button>
                  </div>
                  <label className="classifieds-field classifieds-field-full">
                    <span>Report reason</span>
                    <textarea
                      rows="3"
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      placeholder="Explain why this listing should be reviewed"
                    />
                  </label>
                  <p className="classifieds-detail-description">Stored reports for this ad: {selectedReportCount}</p>
                </section>

                {leadBoard.length ? (
                  <section className="classifieds-surface-subcard">
                    <div className="classifieds-section-heading">
                      <h3>Lead activity</h3>
                      <p>High-intent listings with the strongest buyer engagement.</p>
                    </div>
                    <div className="classifieds-mini-list compact">
                      {leadBoard.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          className="classifieds-mini-item"
                          onClick={() => setSelectedListingId(lead.id)}
                        >
                          <strong>{lead.title}</strong>
                          <span>{lead.location} • {lead.chats} chats</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}

                {(activeRole === "seller" || activeRole === "admin") &&
                (selectedListing.sellerEmail === currentUser?.email ||
                  activeRole === "admin") ? (
                  <section className="classifieds-surface-subcard">
                    <div className="classifieds-section-heading">
                      <h3>Listing actions</h3>
                      <p>Manage live ads directly from persisted marketplace data.</p>
                    </div>
                    <div className="classifieds-inline-actions">
                      {activeRole === "admin" ? (
                        <button
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() =>
                            handleAdminAction("approve", `${selectedListing.title} approved and saved.`)
                          }
                        >
                          Approve ad
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() => setEditingListingId(selectedListing.id)}
                        >
                          Edit ad
                        </button>
                      )}
                      {activeRole === "admin" ? (
                        <button
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() =>
                            handleAdminAction("flag", `${selectedListing.title} flagged for review.`)
                          }
                        >
                          Flag listing
                        </button>
                      ) : (
                        <button type="button" className="classifieds-inline-button" disabled>
                          Awaiting tools
                        </button>
                      )}
                      <button
                        type="button"
                        className="classifieds-inline-button danger"
                        onClick={activeRole === "admin"
                          ? () => handleAdminAction("reject", `${selectedListing.title} rejected and stored.`)
                          : handleDeleteListing}
                      >
                        {activeRole === "admin" ? "Reject ad" : "Delete ad"}
                      </button>
                    </div>
                    {activeRole === "admin" ? (
                      <button
                        type="button"
                        className="classifieds-secondary-button"
                        onClick={handleDeleteListing}
                        disabled={submitting}
                      >
                        Permanently delete listing
                      </button>
                    ) : null}
                  </section>
                ) : null}
              </>
            ) : (
              <div className="classifieds-empty-state">
                No ads match the current filters. Adjust search, category, location, or price to continue.
              </div>
            )}
          </article>
        </aside>
      </section>

      {lightboxOpen && (
        <ImageLightbox
          images={selectedListing?.mediaGallery || []}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {chatOpen && chatWithListing && (
        <ChatBox
          listing={chatWithListing}
          seller={{
            name: chatWithListing.seller,
            avatar: chatWithListing.sellerAvatar || '/default-avatar.png',
            verified: chatWithListing.verified,
            responseTime: chatWithListing.responseTimeMinutes,
            positiveFeedback: 98,
          }}
          currentUser={currentUser}
          isOpen={chatOpen}
          onClose={() => {
            setChatOpen(false);
            setChatWithListing(null);
            addToast('Chat closed', 'info');
          }}
        />
      )}

      {storeOpen && selectedSellerStore && (
        <SellerStore
          seller={selectedSellerStore}
          listings={mockData.filter(l => l.seller === selectedSellerStore.name)}
          onListingClick={(listing) => {
            setSelectedListingId(listing.id);
            setStoreOpen(false);
            addToast(`Viewing ${listing.title}`, 'info');
          }}
          onClose={() => {
            setStoreOpen(false);
            setSelectedSellerStore(null);
          }}
        />
      )}

      {bulkActionsOpen && getBaseRole(currentUser) === 'seller' && (
        <BulkActions
          listings={mockData}
          userListings={mockData.filter(l => l.seller === currentUser?.name)}
          onAction={(action, listingIds) => {
            addToast(`${action} action completed for ${listingIds.length} listings`, 'success');
          }}
        />
      )}

      {reportingOpen && getBaseRole(currentUser) === 'seller' && (
        <AdvancedReporting
          listings={mockData.filter(l => l.seller === currentUser?.name)}
          analyticsData={{}}
        />
      )}

      {notificationCenterOpen && (
        <NotificationCenter
          onClose={() => setNotificationCenterOpen(false)}
        />
      )}

      {showCategoryForms && (
        <div className="category-forms-modal">
          <div className="modal-backdrop" onClick={() => setShowCategoryForms(false)} />
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowCategoryForms(false)}>✕</button>
            <CategoryForms
              selectedCategory={listingForm.category || 'electronics'}
              formData={categoryFormData}
              onFormDataChange={setCategoryFormData}
            />
          </div>
        </div>
      )}

      {templatesOpen && selectedListing && (
        <ListingTemplates
          currentListing={selectedListing}
          savedTemplates={savedTemplates}
          onSaveTemplate={(template) => {
            setSavedTemplates([...savedTemplates, template]);
            addToast('Template saved successfully', 'success');
          }}
          onApplyTemplate={(templateData) => {
            setEditingListingId("");
            setListingForm((currentForm) => ({
              ...currentForm,
              ...templateData,
              price:
                templateData.price !== undefined
                  ? String(templateData.price)
                  : currentForm.price,
            }));
            setTemplatesOpen(false);
            addToast('Template applied to the ad form', 'info');
          }}
          onDeleteTemplate={(templateId) => {
            setSavedTemplates(savedTemplates.filter(t => t.id !== templateId));
            addToast('Template deleted', 'info');
          }}
          onClose={() => setTemplatesOpen(false)}
        />
      )}

      {autoRelistOpen && selectedListingForRelist && (
        <AutoRelist
          listingId={selectedListingForRelist.id}
          currentConfig={selectedListingForRelist.autoRelistConfig || {}}
          onSave={(config) => {
            addToast('Auto-relist settings saved', 'success');
            setAutoRelistOpen(false);
          }}
          onClose={() => setAutoRelistOpen(false)}
        />
      )}

      {scheduledPostingOpen && selectedListing && (
        <ScheduledPosting
          currentListing={selectedListing}
          scheduledListings={scheduledListings}
          onSchedule={(item) => {
            setScheduledListings([...scheduledListings, item]);
            addToast('Listing scheduled successfully', 'success');
            setScheduledPostingOpen(false);
          }}
          onCancel={(scheduleId) => {
            setScheduledListings(scheduledListings.filter(s => s.id !== scheduleId));
            addToast('Scheduled post cancelled', 'info');
          }}
          onClose={() => setScheduledPostingOpen(false)}
        />
      )}

      {bulkImportOpen && (
        <BulkImport
          existingListings={mockData}
          onImport={(importedListings) => {
            addToast(`Imported ${importedListings.length} listings successfully`, 'success');
            setBulkImportOpen(false);
          }}
          onClose={() => setBulkImportOpen(false)}
        />
      )}

      {quickDuplicateOpen && selectedListingForDuplicate && (
        <QuickDuplicate
          selectedListing={selectedListingForDuplicate}
          allListings={mockData}
          onDuplicate={(duplicates) => {
            addToast(`Created ${duplicates.length} duplicate listing(s)`, 'success');
            setQuickDuplicateOpen(false);
            setSelectedListingForDuplicate(null);
          }}
          onClose={() => {
            setQuickDuplicateOpen(false);
            setSelectedListingForDuplicate(null);
          }}
        />
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default Classifieds;
