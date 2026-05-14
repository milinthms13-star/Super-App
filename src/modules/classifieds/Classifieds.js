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

// Map component - uses environment variable for API key
const MapComponent = ({ location, latitude = 0, longitude = 0 }) => {
  const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  if (!mapsApiKey) {
    console.warn('Google Maps API key not configured. Maps will not display.');
    return (
      <div className="classifieds-map-container" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        <p>Map unavailable - API key not configured</p>
      </div>
    );
  }

  return (
    <div className="classifieds-map-container">
      <iframe
        title={`Map for ${location}`}
        width="100%"
        height="300"
        style={{ border: "1px solid #ddd", borderRadius: "8px" }}
        src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(location)}`}
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

const CORE_CATEGORIES = [
  "Jobs",
  "Vehicles",
  "Properties",
  "Electronics",
  "Home Appliances",
  "Services",
  "Rentals",
  "Pets",
  "Used Items",
  "Business for Sale",
];

const KERALA_DISTRICTS = [
  "All Districts",
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

const RISKY_CATEGORIES = new Set(["Jobs", "Properties", "Rentals", "Business for Sale"]);
const SPAM_KEYWORDS = ["advance payment", "guaranteed job", "no inspection", "crypto only", "telegram only"];

const TITLE_SUGGESTIONS = {
  Jobs: ["Need delivery executive - Kochi", "Hiring AC technician - Thrissur"],
  Vehicles: ["2019 Swift VXI well maintained", "Royal Enfield Classic 350 single owner"],
  Properties: ["2BHK apartment for sale in Kakkanad", "5 cent plot near NH bypass"],
  Electronics: ["iPhone 13 128GB with bill", "Dell laptop i5 11th Gen lightly used"],
  "Home Appliances": ["LG 7kg washing machine in good condition", "Double door fridge urgent sale"],
  Services: ["Home tuition for Class 8-10", "Electrician available in Ernakulam"],
  Rentals: ["1BHK rental near Technopark", "Scooter available for monthly rent"],
  Pets: ["Labrador puppies vaccinated", "Persian cat adoption"],
  "Used Items": ["Office chair set of 4", "Study table with storage"],
  "Business for Sale": ["Running bakery for sale in Kozhikode", "Salon with full setup for transfer"],
};

const PRICE_HINTS = {
  Jobs: "Salary-based listing. Keep price as monthly salary or CTC (example: 18000).",
  Vehicles: "Most local used-vehicle listings perform well with realistic price + year model.",
  Properties: "Mention total price clearly and include area details in description.",
  Electronics: "Compare recent market listings and keep 5-10% negotiation room.",
  "Home Appliances": "Condition + age drives price. Add warranty info for better trust.",
  Services: "Use per-service or monthly retainership pricing for clarity.",
  Rentals: "Include deposit and monthly rent split in description.",
  Pets: "Follow legal and ethical compliance; include vaccination details.",
  "Used Items": "Smaller ticket items sell faster with round-number pricing.",
  "Business for Sale": "Add monthly turnover/profit details to justify asking price.",
};

const QUICK_CHAT_REPLIES = [
  "Is this available?",
  "Can you share exact location?",
  "Can you share more photos?",
];

const DEFAULT_AD_FORM = {
  title: "",
  description: "",
  price: "",
  category: "Electronics",
  location: "",
  district: "Ernakulam",
  pincode: "",
  condition: "Used",
  mediaCount: "4",
  plan: "free",
};

const getExpiryDateFromPosted = (postedDate) => {
  const posted = new Date(postedDate);
  if (Number.isNaN(posted.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return fallback.toISOString().slice(0, 10);
  }
  posted.setDate(posted.getDate() + 30);
  return posted.toISOString().slice(0, 10);
};

const deriveDistrict = (listing = {}) => {
  const districtValue = String(listing?.district || "").trim();
  if (districtValue) {
    return districtValue;
  }

  const locationText = String(listing?.location || "").toLowerCase();
  if (locationText.includes("kochi") || locationText.includes("ernakulam")) return "Ernakulam";
  if (locationText.includes("trivandrum") || locationText.includes("thiruvananthapuram")) return "Thiruvananthapuram";
  if (locationText.includes("kozhikode")) return "Kozhikode";
  if (locationText.includes("thrissur")) return "Thrissur";
  if (locationText.includes("kannur")) return "Kannur";
  if (locationText.includes("kollam")) return "Kollam";
  return "Ernakulam";
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
  district: deriveDistrict(listing),
  pincode: String(listing?.pincode || ""),
  locality: listing?.locality || listing?.location || "Prime area",
  condition: listing?.condition || "Used",
  seller: listing?.seller || "Trusted Seller",
  sellerRole: listing?.sellerRole || "Seller",
  sellerEmail: listing?.sellerEmail || "",
  posted: listing?.posted || "2026-04-18",
  expiresAt: listing?.expiresAt || getExpiryDateFromPosted(listing?.posted || "2026-04-18"),
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

const normalizeModerationStatus = (listing = {}) =>
  String(listing?.moderationStatus || (listing?.verified === false ? "pending" : "approved"))
    .trim()
    .toLowerCase();

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

const getSellerInitials = (sellerName = "") => {
  const initials = String(sellerName)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase())
    .join("");
  return initials || "NA";
};

const getRelativeTimeLabel = (postedDate) => {
  const postedTimestamp = new Date(postedDate).getTime();
  if (!postedTimestamp || Number.isNaN(postedTimestamp)) {
    return "Recently listed";
  }

  const elapsedMs = Date.now() - postedTimestamp;
  const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
};

const getSellerIdentity = (listing = {}) => ({
  sellerName: String(listing?.seller || "").trim().toLowerCase(),
  sellerEmail: String(listing?.sellerEmail || "")
    .trim()
    .toLowerCase(),
});

const isSameSeller = (listing = {}, seller = {}) => {
  const listingIdentity = getSellerIdentity(listing);
  const sellerIdentity = {
    sellerName: String(seller?.name || "").trim().toLowerCase(),
    sellerEmail: String(seller?.email || "").trim().toLowerCase(),
  };

  if (sellerIdentity.sellerEmail && listingIdentity.sellerEmail) {
    return sellerIdentity.sellerEmail === listingIdentity.sellerEmail;
  }

  return Boolean(sellerIdentity.sellerName) && sellerIdentity.sellerName === listingIdentity.sellerName;
};

const isListingVisibleToRole = (listing = {}, activeRole = "buyer", currentUser = null) => {
  if (activeRole === "admin") {
    return true;
  }

  if (normalizeModerationStatus(listing) === "approved") {
    return true;
  }

  if (activeRole !== "seller") {
    return false;
  }

  return isSameSeller(listing, {
    name: currentUser?.businessName || currentUser?.name,
    email: currentUser?.email,
  });
};

const Classifieds = () => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    createClassifiedListing,
    sendClassifiedMessage,
    reportClassifiedListing,
    addClassifiedReview,
    updateClassifiedListing,
    moderateClassifiedListing,
    deleteClassifiedListing,
    getClassifiedSavedSearches = async () => [],
    saveClassifiedSearch = async () => ({ savedSearches: [] }),
    acknowledgeClassifiedSavedSearch = async () => ({ savedSearches: [] }),
    deleteClassifiedSavedSearch = async () => [],
    getRecentlyViewedClassifieds = async () => [],
    trackClassifiedListingView = async () => ({}),
    classifiedsListings = [],
    classifiedsMessages = [],
    classifiedsReports = [],
    classifiedsBannedUsers = [],
  } = useApp();
  const [activeRole, setActiveRole] = useState(() => getBaseRole(currentUser));
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [locationFilter, setLocationFilter] = useState([]);
  const [districtFilter, setDistrictFilter] = useState("All Districts");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [nearMeOnly, setNearMeOnly] = useState(false);
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
  const [recentlyViewedListings, setRecentlyViewedListings] = useState([]);
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
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false);
  const [showListingPreview, setShowListingPreview] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [adminModerationReason, setAdminModerationReason] = useState("");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [managedCategories, setManagedCategories] = useState(CORE_CATEGORIES);
  const [listingExpiryDays, setListingExpiryDays] = useState("30");
  const fileInputRef = useRef(null);
  const trackedViewIdsRef = useRef(new Set());
  const baseRole = getBaseRole(currentUser);
  const currentUserDistrict = String(currentUser?.district || "Ernakulam");
  const currentUserPincode = String(currentUser?.pincode || "682001");
  const blockedUsersStorageKey = useMemo(
    () => `classifieds-blocked-users-${String(currentUser?.email || "guest").toLowerCase()}`,
    [currentUser?.email]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(blockedUsersStorageKey);
      const parsedValue = rawValue ? JSON.parse(rawValue) : [];
      setBlockedUsers(
        Array.isArray(parsedValue)
          ? parsedValue.map((value) => String(value || "").trim()).filter(Boolean)
          : []
      );
    } catch (error) {
      setBlockedUsers([]);
    }
  }, [blockedUsersStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(blockedUsersStorageKey, JSON.stringify(blockedUsers));
  }, [blockedUsers, blockedUsersStorageKey]);

  const handleSaveSearch = async () => {
    const searchName = prompt("Enter a name for this saved search:");
    if (!searchName?.trim()) return;

    try {
      const response = await saveClassifiedSearch({
        name: searchName.trim(),
        filters: {
          searchText,
          categoryFilter,
          locationFilter,
          districtFilter,
          pincodeFilter,
          nearMeOnly,
          conditionFilter,
          priceFilter,
          sortBy,
        },
        notificationsEnabled: true,
      });

      setSavedSearches(Array.isArray(response?.savedSearches) ? response.savedSearches : []);
      setStatusMessage(`Search "${searchName}" saved successfully with alerts enabled.`);
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Saved search could not be stored."
      );
    }
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
        rating: reviewRating,
        comment: reviewText.trim(),
      };

      await addClassifiedReview(selectedListing.id, review);
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

  const handleLoadSearch = async (search) => {
    setSearchText(search.filters.searchText || "");
    setCategoryFilter(search.filters.categoryFilter || []);
    setLocationFilter(search.filters.locationFilter || []);
    setDistrictFilter(search.filters.districtFilter || "All Districts");
    setPincodeFilter(search.filters.pincodeFilter || "");
    setNearMeOnly(Boolean(search.filters.nearMeOnly));
    setConditionFilter(search.filters.conditionFilter || []);
    setPriceFilter(search.filters.priceFilter || []);
    setSortBy(search.filters.sortBy || "featured");
    addToast(`Loaded saved search "${search.name}".`, 'info');

    try {
      const response = await acknowledgeClassifiedSavedSearch(search.id);
      if (Array.isArray(response?.savedSearches)) {
        setSavedSearches(response.savedSearches);
      }
    } catch (error) {
      // Alerts are helpful but optional; loading the search still succeeds.
    }
  };

  const handleDeleteSearch = async (searchId) => {
    try {
      const nextSavedSearches = await deleteClassifiedSavedSearch(searchId);
      setSavedSearches(Array.isArray(nextSavedSearches) ? nextSavedSearches : []);
      addToast("Saved search deleted.", 'info');
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || error.message || "Saved search could not be deleted."
      );
    }
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

  useEffect(() => {
    let isMounted = true;

    Promise.all([getClassifiedSavedSearches(), getRecentlyViewedClassifieds()])
      .then(([savedSearchRecords, recentlyViewedRecords]) => {
        if (!isMounted) {
          return;
        }

        setSavedSearches(Array.isArray(savedSearchRecords) ? savedSearchRecords : []);
        setRecentlyViewedListings(Array.isArray(recentlyViewedRecords) ? recentlyViewedRecords : []);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSavedSearches([]);
        setRecentlyViewedListings([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const listings = useMemo(
    () =>
      (Array.isArray(classifiedsListings) ? classifiedsListings : []).map(normalizeListing),
    [classifiedsListings]
  );

  const messageRecords = Array.isArray(classifiedsMessages)
    ? classifiedsMessages
    : [];
  const reportRecords = Array.isArray(classifiedsReports)
    ? classifiedsReports
    : [];
  const adminBannedUsers = useMemo(
    () =>
      Array.isArray(classifiedsBannedUsers)
        ? classifiedsBannedUsers.map((entry) => ({
            sellerEmail: String(entry?.sellerEmail || "").trim().toLowerCase(),
            sellerName: String(entry?.sellerName || entry?.name || "Seller").trim(),
            reason: String(entry?.reason || "").trim(),
            createdAt: entry?.createdAt,
          }))
        : [],
    [classifiedsBannedUsers]
  );

  const categories = useMemo(
    () => Array.from(new Set([...(managedCategories || []), ...listings.map((listing) => listing.category)])),
    [listings, managedCategories]
  );

  const locations = useMemo(
    () => [...new Set(listings.map((listing) => listing.location))],
    [listings]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set([
          ...KERALA_DISTRICTS,
          ...listings.map((listing) => String(listing?.district || "").trim()).filter(Boolean),
        ])
      ),
    [listings]
  );

  const conditions = useMemo(
    () => [...new Set(listings.map((listing) => listing.condition))],
    [listings]
  );

  const priceRanges = ["Under 10k", "10k - 50k", "50k - 1L", "1L+"];

  const roleVisibleListings = useMemo(
    () => listings.filter((listing) => isListingVisibleToRole(listing, activeRole, currentUser)),
    [activeRole, currentUser, listings]
  );

  const filteredListings = useMemo(() => {
    const visibleListings = roleVisibleListings.filter((listing) => {
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
      const matchesDistrict = districtFilter === "All Districts" || listing.district === districtFilter;
      const matchesPincode =
        !pincodeFilter.trim() || String(listing.pincode || "").includes(pincodeFilter.trim());
      const matchesNearby =
        !nearMeOnly ||
        listing.district === currentUserDistrict ||
        (String(listing.pincode || "").slice(0, 3) &&
          String(listing.pincode || "").slice(0, 3) === currentUserPincode.slice(0, 3));
      const isNotBlocked = !blockedUsers.includes(listing.seller);
      const isNotAdminBanned =
        adminBannedUsers.length === 0 ||
        !adminBannedUsers.some(
          (bannedUser) =>
            String(bannedUser?.sellerEmail || "").trim().toLowerCase() ===
            String(listing?.sellerEmail || "").trim().toLowerCase()
        );
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
        matchesDistrict &&
        matchesPincode &&
        matchesNearby &&
        isNotBlocked &&
        isNotAdminBanned &&
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
    categoryFilter,
    conditionFilter,
    currentUserDistrict,
    currentUserPincode,
    districtFilter,
    blockedUsers,
    adminBannedUsers,
    locationFilter,
    nearMeOnly,
    pincodeFilter,
    priceFilter,
    roleVisibleListings,
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
  }, [searchText, categoryFilter, locationFilter, districtFilter, pincodeFilter, nearMeOnly, conditionFilter, priceFilter, sortBy]);

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
        district: editingListing.district || "Ernakulam",
        pincode: editingListing.pincode || "",
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
    () => {
      const normalizedEmail = String(currentUser?.email || "")
        .trim()
        .toLowerCase();
      const normalizedNames = [
        currentUser?.businessName,
        currentUser?.name,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);

      return listings.filter((listing) => {
        if (normalizedEmail) {
          return String(listing.sellerEmail || "").trim().toLowerCase() === normalizedEmail;
        }

        return normalizedNames.includes(String(listing.seller || "").trim().toLowerCase());
      });
    },
    [currentUser?.businessName, currentUser?.email, currentUser?.name, listings]
  );

  const selectedSellerListings = useMemo(() => {
    if (!selectedSellerStore) {
      return [];
    }

    return roleVisibleListings.filter((listing) => isSameSeller(listing, selectedSellerStore));
  }, [roleVisibleListings, selectedSellerStore]);

  const sellerStats = useMemo(() => {
    if (!sellerListings.length) return null;

    const totalViews = sellerListings.reduce((sum, listing) => sum + listing.views, 0);
    const totalChats = sellerListings.reduce((sum, listing) => sum + listing.chats, 0);
    const totalFavorites = sellerListings.reduce((sum, listing) => sum + listing.favorites, 0);
    const avgPrice = sellerListings.reduce((sum, listing) => sum + listing.price, 0) / sellerListings.length;
    const now = new Date();
    const expiredListings = sellerListings.filter(
      (listing) => new Date(listing.expiresAt || getExpiryDateFromPosted(listing.posted)).getTime() < now.getTime()
    );
    const pendingApproval = sellerListings.filter(
      (listing) => normalizeModerationStatus(listing) !== "approved"
    );

    return {
      totalListings: sellerListings.length,
      activeListings: sellerListings.filter(l => l.moderationStatus === "approved").length,
      expiredListings: expiredListings.length,
      pendingApproval: pendingApproval.length,
      totalViews,
      totalChats,
      totalFavorites,
      avgPrice: Math.round(avgPrice),
      conversionRate: totalViews > 0 ? Math.round((totalChats / totalViews) * 100) : 0,
      expiringSoonListings: sellerListings.filter((listing) => {
        const expiryDate = new Date(listing.expiresAt || getExpiryDateFromPosted(listing.posted));
        const diffDays = Math.round((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return diffDays >= 0 && diffDays <= 3;
      }),
      pendingApprovalListings: pendingApproval,
    };
  }, [sellerListings]);

  const openSellerStore = (listing = selectedListing) => {
    if (!listing) {
      return;
    }

    const matchingListings = roleVisibleListings.filter((candidate) => isSameSeller(candidate, {
      name: listing.seller,
      email: listing.sellerEmail,
    }));

    const ratingValues = matchingListings
      .map((candidate) => Number(candidate.sellerRating || candidate.averageRating || 0))
      .filter((value) => value > 0);
    const responseTimes = matchingListings
      .map((candidate) => Number(candidate.responseTimeMinutes || 0))
      .filter((value) => value > 0);

    const averageRating =
      ratingValues.length > 0
        ? Math.round(
            (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length) * 10
          ) / 10
        : 4.8;
    const averageResponseTime =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : 120;

    setSelectedSellerStore({
      name: listing.seller,
      email: listing.sellerEmail || "",
      avatar: listing.sellerAvatar || "/default-avatar.png",
      verified: matchingListings.some((candidate) => candidate.verified),
      followers: Math.max(...matchingListings.map((candidate) => Number(candidate.followers || 0)), 0),
      rating: averageRating,
      reviewCount: matchingListings.reduce(
        (sum, candidate) => sum + Number(candidate.sellerReviewCount || candidate.totalReviews || 0),
        0
      ),
      responseTime: `~${averageResponseTime} min`,
      bio:
        listing.sellerBio ||
        `${listing.sellerRole || "Seller"} with ${matchingListings.length || 1} active marketplace listing${
          matchingListings.length === 1 ? "" : "s"
        }.`,
    });
    setStoreOpen(true);
  };

  const featuredListings = filteredListings.filter((listing) => listing.featured).slice(0, 3);
  const recentListings = [...filteredListings]
    .sort((first, second) => new Date(second.posted) - new Date(first.posted))
    .slice(0, 4);
  const savedSearchAlerts = savedSearches.filter((search) => Number(search?.newMatchCount || 0) > 0);
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
  const trendingListings = useMemo(
    () =>
      [...filteredListings]
        .sort(
          (first, second) =>
            second.views + second.chats * 2 + second.favorites - (first.views + first.chats * 2 + first.favorites)
        )
        .slice(0, 5),
    [filteredListings]
  );
  const trendingCategories = useMemo(
    () =>
      Object.values(
        filteredListings.reduce((accumulator, listing) => {
          const key = String(listing.category || "General");
          if (!accumulator[key]) {
            accumulator[key] = { id: key, label: key, count: 0 };
          }
          accumulator[key].count += 1;
          return accumulator;
        }, {})
      )
        .sort((first, second) => second.count - first.count)
        .slice(0, 5),
    [filteredListings]
  );
  const suggestedSearches = useMemo(() => {
    const suggestions = [];
    trendingCategories.forEach((category) => {
      suggestions.push(`${category.label} near me`);
    });
    trendingListings.forEach((listing) => {
      suggestions.push(listing.title);
      suggestions.push(`${listing.category} in ${listing.location}`);
    });

    return Array.from(new Set(suggestions.filter(Boolean))).slice(0, 8);
  }, [trendingCategories, trendingListings]);

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

  const nearbyListings = useMemo(
    () =>
      listings
        .filter((listing) => listing.district === currentUserDistrict)
        .sort((first, second) => new Date(second.posted) - new Date(first.posted))
        .slice(0, 5),
    [currentUserDistrict, listings]
  );

  const listingTitleSuggestions = TITLE_SUGGESTIONS[listingForm.category] || [];
  const listingPriceHint = PRICE_HINTS[listingForm.category] || "Add a realistic market price to improve response rate.";
  const duplicateDraftWarning = useMemo(() => {
    const normalizedTitle = String(listingForm.title || "").trim().toLowerCase();
    if (!normalizedTitle || !sellerListings.length) {
      return null;
    }
    const duplicate = sellerListings.find(
      (listing) =>
        String(listing.title || "").trim().toLowerCase() === normalizedTitle &&
        String(listing.location || "").trim().toLowerCase() ===
          String(listingForm.location || "").trim().toLowerCase()
    );
    return duplicate || null;
  }, [listingForm.location, listingForm.title, sellerListings]);

  const listingCompletenessScore = useMemo(() => {
    const checks = [
      Boolean(listingForm.title.trim()),
      Boolean(listingForm.description.trim()),
      Number(listingForm.price || 0) > 0,
      Boolean(listingForm.category),
      Boolean(listingForm.location.trim()),
      Boolean(listingForm.district),
      /^\d{6}$/.test(String(listingForm.pincode || "")),
      uploadedImages.length > 0,
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [listingForm, uploadedImages.length]);

  const riskyCategorySelected = RISKY_CATEGORIES.has(String(listingForm.category));
  const spamKeywordHits = useMemo(
    () =>
      listings.filter((listing) => {
        const text = `${listing.title} ${listing.description}`.toLowerCase();
        return SPAM_KEYWORDS.some((keyword) => text.includes(keyword));
      }),
    [listings]
  );

  const adminModerationQueue = useMemo(
    () => ({
      pendingApprovals: listings.filter((listing) => normalizeModerationStatus(listing) !== "approved").length,
      riskyCategoryPending: listings.filter(
        (listing) =>
          RISKY_CATEGORIES.has(String(listing.category || "")) &&
          normalizeModerationStatus(listing) !== "approved"
      ).length,
      reportedListings: reportRecords.length,
      spamKeywordDetections: spamKeywordHits.length,
    }),
    [listings, reportRecords.length, spamKeywordHits.length]
  );

  const isBuyerView = activeRole === "buyer";
  const showRoleSwitcher = baseRole !== "buyer";
  const showMarketplaceSignals = trendingCategories.length > 0 || suggestedSearches.length > 0;
  const showFeaturedPanel = featuredListings.length > 0;
  const showRecentPanel = recentListings.length > 0;
  const showRecentlyViewedPanel = recentlyViewedListings.length > 0;
  const showHighlightsSection = showFeaturedPanel || showRecentPanel || showRecentlyViewedPanel;

  useEffect(() => {
    if (!selectedListing?.id) {
      return;
    }

    const listingId = String(selectedListing.id);
    if (trackedViewIdsRef.current.has(listingId)) {
      return;
    }

    let isActive = true;
    trackedViewIdsRef.current.add(listingId);

    trackClassifiedListingView(listingId)
      .then((response) => {
        if (isActive && Array.isArray(response?.recentlyViewed)) {
          setRecentlyViewedListings((currentListings) => {
            const nextListings = response.recentlyViewed;
            const hasSameListings =
              currentListings.length === nextListings.length &&
              currentListings.every(
                (listing, index) => String(listing?.id) === String(nextListings[index]?.id)
              );

            return hasSameListings ? currentListings : nextListings;
          });
        }
      })
      .catch(() => {
        if (isActive) {
          trackedViewIdsRef.current.delete(listingId);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedListing?.id]);

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

  const handleUseNearMeFilter = () => {
    setNearMeOnly(true);
    setDistrictFilter(currentUserDistrict || "Ernakulam");
    setPincodeFilter(currentUserPincode || "");
    addToast("Nearby filter enabled using your profile district.", "success");
  };

  const handleQuickChatMessage = (message) => {
    setChatInput(message);
  };

  const handleOfferPrice = () => {
    if (!selectedListing) {
      return;
    }
    const offerAmount = Math.round(Number(selectedListing.price || 0) * 0.9);
    setChatInput(`My offer price is INR ${offerAmount}. Is it negotiable?`);
  };

  const handleShareLocationInChat = () => {
    if (!selectedListing) {
      return;
    }
    setChatInput(`Please check location pin: ${selectedListing.location}, ${selectedListing.locality}.`);
  };

  const handleBlockUser = (sellerName) => {
    if (!sellerName) {
      return;
    }

    setBlockedUsers((current) => Array.from(new Set([...current, sellerName])));
    setStatusMessage(`User ${sellerName} blocked from your marketplace view.`);
  };

  const handleUnblockUser = (sellerName) => {
    setBlockedUsers((current) => current.filter((user) => user !== sellerName));
    setStatusMessage(`${sellerName} removed from blocked users.`);
  };

  const handleRelistExpired = async (listing) => {
    if (!listing) {
      return;
    }

    setSubmitting(true);
    try {
      const relistDate = new Date();
      const relistExpiry = new Date();
      relistExpiry.setDate(relistExpiry.getDate() + Math.max(7, Number(listingExpiryDays || 30)));
      await updateClassifiedListing(listing.id, {
        posted: relistDate.toISOString().slice(0, 10),
        expiresAt: relistExpiry.toISOString().slice(0, 10),
        moderationStatus: "approved",
        monetizationPlan: "Paid Relist",
      });
      addToast(`Paid relist requested for ${listing.title}.`, "success");
    } catch (error) {
      setStatusMessage(error.response?.data?.message || error.message || "Relist failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCustomCategory = () => {
    const categoryName = customCategoryInput.trim();
    if (!categoryName) {
      return;
    }
    setManagedCategories((current) => Array.from(new Set([...current, categoryName])));
    setCategoryFilter((current) => Array.from(new Set([...current, categoryName])));
    addToast(`Category "${categoryName}" added to current filters.`, "info");
    setCustomCategoryInput("");
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

    if (!/^\d{6}$/.test(String(listingForm.pincode || ""))) {
      setStatusMessage("Enter a valid 6-digit pincode before publishing.");
      return;
    }

    if (!editingListingId && uploadedImages.length === 0) {
      setStatusMessage("Upload at least one image before publishing.");
      return;
    }

    if (duplicateDraftWarning && !editingListingId) {
      setStatusMessage(
        `Possible duplicate detected: "${duplicateDraftWarning.title}" already exists in ${duplicateDraftWarning.location}.`
      );
      return;
    }

    if (listingCompletenessScore < 65) {
      setStatusMessage("Listing completeness is low. Add more details before publishing.");
      return;
    }

    const moderationStatus = riskyCategorySelected ? "pending" : "approved";
    const listingExpiryInDays = Math.max(7, Number(listingExpiryDays || 30));
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + listingExpiryInDays);

    setSubmitting(true);
    try {
      if (editingListingId) {
        // Update existing listing
        const updatedListing = await updateClassifiedListing(editingListingId, {
          ...listingForm,
          price: Number(listingForm.price),
          mediaCount: Number(listingForm.mediaCount),
          pincode: String(listingForm.pincode || ""),
          district: listingForm.district || deriveDistrict({ location: listingForm.location }),
          expiresAt: expiryDate.toISOString().slice(0, 10),
          moderationStatus,
          verificationBadges: ["phone", "email"],
          image: uploadedImages[0]?.name || "Ad listing",
          mediaGallery:
            uploadedImages.length > 0
              ? uploadedImages.map((image) => image.name || "Listing image")
              : undefined,
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
          pincode: String(listingForm.pincode || ""),
          district: listingForm.district || deriveDistrict({ location: listingForm.location }),
          expiresAt: expiryDate.toISOString().slice(0, 10),
          moderationStatus,
          featured: listingForm.plan === "featured",
          urgent: listingForm.plan === "urgent",
          monetizationPlan: listingForm.plan,
          verificationBadges: ["phone", "email"],
          image: uploadedImages[0]?.name || "Ad listing",
          mediaGallery: uploadedImages.map((image) => image.name || "Listing image"),
        });
        setListingForm(DEFAULT_AD_FORM);
        setUploadedImages([]);
        setShowListingPreview(false);
        setSelectedListingId(createdListing?.id || "");
        setStatusMessage(
          moderationStatus === "pending"
            ? "Ad submitted and moved to admin approval because it is in a risky category."
            : "Ad submitted successfully and stored in the database."
        );
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
      await moderateClassifiedListing(selectedListing.id, action, {
        reason: adminModerationReason.trim(),
      });
      setAdminModerationReason("");
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
    <div className={`classifieds-page ${isBuyerView ? "buyer-mode" : ""}`}>
      <section className="classifieds-hero">
        <div>
          <p className="classifieds-eyebrow">TradePost classifieds</p>
          <h1>Local buying, selling, discovery, and direct buyer-seller conversations in one flow.</h1>
          {!isBuyerView && (
            <p className="classifieds-hero-copy">
              This classified marketplace is now backed by persisted module data, so ads, messages,
              moderation activity, and reports survive refreshes and stay stored in the backend.
            </p>
          )}
        </div>

        {!isBuyerView && (
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
        )}
      </section>

      <section className="classifieds-mobile-quickbar" aria-label="Mobile quick listing controls">
        <div className="classifieds-mobile-search-wrap">
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search listings in Kerala"
          />
          <button
            type="button"
            className="classifieds-inline-button"
            onClick={() => setMobileFilterSheetOpen(true)}
          >
            Filters
          </button>
        </div>
        <div className="classifieds-mobile-category-chips">
          {CORE_CATEGORIES.slice(0, 10).map((category) => (
            <button
              key={`chip-${category}`}
              type="button"
              className={`classifieds-inline-button ${categoryFilter.includes(category) ? "active" : ""}`}
              onClick={() =>
                setCategoryFilter((current) =>
                  current.includes(category)
                    ? current.filter((item) => item !== category)
                    : [...current, category]
                )
              }
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="classifieds-scam-banner">
        <strong>Safety alert:</strong> Never pay advance without verification. Use in-app chat, verify seller
        phone/email, and report suspicious offers.
      </section>

      {/* Toolbar for Priority Set #3 Features */}
      <div className="classifieds-toolbar">
        <button
          className="toolbar-btn notification-btn"
          onClick={() => setNotificationCenterOpen(true)}
          title="Open notifications"
        >
          Notifications
        </button>

        {isBuyerView && (
          <button
            className="toolbar-btn post-ad-btn"
            onClick={() => setActiveRole("seller")}
            title="Create a new ad"
          >
            Post Ad
          </button>
        )}

        {baseRole === 'seller' && (
          <>
            <button
              className="toolbar-btn bulk-actions-btn"
              onClick={() => setBulkActionsOpen(true)}
              title="Bulk manage listings"
            >
              Manage Listings
            </button>
            <button
              className="toolbar-btn reporting-btn"
              onClick={() => setReportingOpen(true)}
              title="View analytics"
            >
              Analytics
            </button>

            {/* Priority Set #4 Seller Tools */}
            <button
              className="toolbar-btn templates-btn"
              onClick={() => setTemplatesOpen(true)}
              title="Manage listing templates"
            >
              Templates
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
              Schedule
            </button>
            <button
              className="toolbar-btn import-btn"
              onClick={() => setBulkImportOpen(true)}
              title="Bulk import listings"
            >
              Import
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
              Duplicate
            </button>
          </>
        )}

        {!isBuyerView && (
          <button
            className="toolbar-btn category-forms-btn"
            onClick={() => setShowCategoryForms(true)}
            title="Add category details"
          >
            Category Details
          </button>
        )}
      </div>

      {showRoleSwitcher && (
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
      )}

      {statusMessage ? <div className="classifieds-status-banner">{statusMessage}</div> : null}

      <section className="classifieds-layout">
        <div className="classifieds-main-column">
          <article className="classifieds-surface-card classifieds-filter-card">
            <div className="classifieds-section-heading">
              <h2>Search and filters</h2>
              {!isBuyerView && (
                <p>Keyword discovery, location-first browsing, category filters, and sorting built for fast ad hunting.</p>
              )}
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

              <label className="classifieds-field">
                <span>District</span>
                <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label className="classifieds-field">
                <span>Pincode / local search</span>
                <input
                  type="text"
                  value={pincodeFilter}
                  maxLength={6}
                  onChange={(event) => setPincodeFilter(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Search by pincode"
                />
              </label>

              <label className="classifieds-field">
                <span>Nearby options</span>
                <div className="classifieds-filter-toggle-row">
                  <label className="classifieds-checkbox-inline">
                    <input
                      type="checkbox"
                      checked={nearMeOnly}
                      onChange={(event) => setNearMeOnly(event.target.checked)}
                    />
                    Only near me
                  </label>
                  <button type="button" className="classifieds-inline-button" onClick={handleUseNearMeFilter}>
                    Use my location
                  </button>
                </div>
              </label>

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
                    <div key={search.id} className="classifieds-saved-search-chip">
                      <button
                        type="button"
                        className="classifieds-inline-button"
                        onClick={() => handleLoadSearch(search)}
                        title={`Load ${search.name}`}
                      >
                        {search.name}
                        {search.newMatchCount ? ` - ${search.newMatchCount} new` : ""}
                      </button>
                      <button
                        type="button"
                        className="classifieds-inline-button danger"
                        onClick={() => handleDeleteSearch(search.id)}
                        aria-label={`Delete saved search ${search.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>

          {savedSearchAlerts.length > 0 && (
            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Saved search alerts</h2>
                <p>Fresh matches for the searches you asked us to watch.</p>
              </div>
              <div className="classifieds-mini-list">
                {savedSearchAlerts.map((search) => (
                  <div key={search.id} className="classifieds-mini-item">
                    <strong>{search.name}</strong>
                    <span>{search.newMatchCount} new match{search.newMatchCount === 1 ? "" : "es"}</span>
                    {Array.isArray(search.previewListings) && search.previewListings.length > 0 ? (
                      <span>
                        {search.previewListings
                          .slice(0, 2)
                          .map((listing) => listing.title)
                          .join(" - ")}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="classifieds-inline-button"
                      onClick={() => handleLoadSearch(search)}
                    >
                      View matches
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}

          {nearbyListings.length > 0 && (
            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Nearby listings</h2>
                <p>Fresh ads from {currentUserDistrict} and nearby localities.</p>
              </div>
              <div className="classifieds-mini-list">
                {nearbyListings.map((listing) => (
                  <button
                    key={`${listing.id}-nearby`}
                    type="button"
                    className="classifieds-mini-item"
                    onClick={() => setSelectedListingId(listing.id)}
                  >
                    <strong>{listing.title}</strong>
                    <span>{listing.location} - {listing.district}</span>
                    <span>{formatPrice(listing.price)} - {getRelativeTimeLabel(listing.posted)}</span>
                  </button>
                ))}
              </div>
            </article>
          )}

          {showMarketplaceSignals && (
            <article className="classifieds-surface-card classifieds-market-signal-card">
              <div className="classifieds-section-heading">
                <h2>Marketplace pulse</h2>
                <p>Visibility into active demand, trending categories, and search behavior.</p>
              </div>
              <div className="classifieds-market-signal-grid">
                {trendingCategories.length > 0 && (
                  <div className="classifieds-market-signal-block">
                    <strong>Trending categories</strong>
                    <div className="classifieds-chip-cloud">
                      {trendingCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() => setCategoryFilter([category.label])}
                        >
                          {category.label} ({category.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {suggestedSearches.length > 0 && (
                  <div className="classifieds-market-signal-block">
                    <strong>Suggested searches</strong>
                    <div className="classifieds-chip-cloud">
                      {suggestedSearches.map((query) => (
                        <button
                          key={query}
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() => setSearchText(query)}
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          )}

          {showHighlightsSection && (
            <section className="classifieds-highlights-grid">
              {showFeaturedPanel && (
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
              )}

              {showRecentPanel && (
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
                        <span>{getRelativeTimeLabel(listing.posted)} in {listing.location}</span>
                        <span>{formatCompactNumber(listing.views)} views - {listing.chats} chats</span>
                      </button>
                    ))}
                  </div>
                </article>
              )}

              {showRecentlyViewedPanel && (
                <article className="classifieds-surface-card">
                  <div className="classifieds-section-heading">
                    <h2>Recently viewed</h2>
                    <p>Pick up where you left off without searching again.</p>
                  </div>
                  <div className="classifieds-mini-list">
                    {recentlyViewedListings.slice(0, 4).map((listing) => (
                      <button
                        key={`${listing.id}-recent`}
                        type="button"
                        className="classifieds-mini-item"
                        onClick={() => setSelectedListingId(listing.id)}
                      >
                        <strong>{listing.title}</strong>
                        <span>{listing.location} - Viewed recently</span>
                      </button>
                    ))}
                  </div>
                </article>
              )}
            </section>
          )}

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
              {paginatedListings.length === 0 ? (
                <div className="classifieds-empty-state classifieds-listings-empty">
                  <strong>No listings match the current filters.</strong>
                  <span>Try broader filters or be the first to post in your locality.</span>
                  <button
                    type="button"
                    className="classifieds-inline-button"
                    onClick={() => setActiveRole("seller")}
                  >
                    Post your ad
                  </button>
                </div>
              ) : (
                paginatedListings.map((listing) => {
                const favoriteId = `classifieds-${listing.id}`;
                const isSaved = favoriteIds.has(favoriteId);
                const isSelected = selectedListings.has(listing.id);

                return (
                  <article
                    key={listing.id}
                    className={`classifieds-listing-card ${selectedListing?.id === listing.id ? "selected" : ""} ${isSelected ? "bulk-selected" : ""} ${listing.featured ? "is-featured" : ""} ${listing.urgent ? "is-urgent" : ""}`}
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
                      <div className="classifieds-listing-media-top">
                        <span className="classifieds-media-pill">{listing.category}</span>
                        {listing.isOnline ? <span className="classifieds-media-pill live">Live</span> : null}
                      </div>
                      <span className="classifieds-listing-media-image">{listing.image}</span>
                      <strong className="classifieds-listing-media-title">{listing.title}</strong>
                      <span className="classifieds-listing-media-location">
                        {listing.location} | {listing.district} {listing.pincode ? `| ${listing.pincode}` : ""}
                      </span>
                      <span className="classifieds-listing-media-posted">
                        Posted: {new Date(listing.posted).toLocaleDateString("en-IN")}
                      </span>
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
                      <p>
                        {listing.category} - {listing.condition} - {listing.location} - {listing.district}
                        {listing.pincode ? ` (${listing.pincode})` : ""}
                      </p>
                      <div className="classifieds-seller-row">
                        <span className="classifieds-seller-avatar">{getSellerInitials(listing.seller)}</span>
                        <span className="classifieds-seller-name">{listing.seller}</span>
                        {listing.verified ? <span className="classifieds-seller-verified">Verified</span> : null}
                        {listing.verified ? <span className="classifieds-seller-verified">Phone + Email</span> : null}
                      </div>
                      <div className="classifieds-card-meta">
                        <span>{formatCompactNumber(listing.views)} views</span>
                        <span>{listing.chats} chats</span>
                        <span>{formatCompactNumber(listing.favorites)} saves</span>
                        <span>{getRelativeTimeLabel(listing.posted)}</span>
                      </div>
                      <div className="classifieds-chip-cloud muted">
                        {(Array.isArray(listing.tags) ? listing.tags : [])
                          .slice(0, 3)
                          .map((tag) => (
                            <span key={`${listing.id}-${tag}`}>{tag}</span>
                          ))}
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
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="classifieds-pagination">
                <button
                  type="button"
                  className="classifieds-pagination-button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
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
                  Next
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
                      <strong>{sellerStats.expiredListings}</strong>
                      <span>Expired ads</span>
                    </article>
                    <article className="classifieds-stat-card">
                      <strong>{sellerStats.pendingApproval}</strong>
                      <span>Pending approval</span>
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
                    <article className="classifieds-stat-card">
                      <strong>{formatCompactNumber(sellerStats.totalFavorites)}</strong>
                      <span>Wishlist saves</span>
                    </article>
                  </div>
                  {sellerStats.expiringSoonListings.length > 0 && (
                    <div className="classifieds-expiry-list">
                      <strong>Expiring soon</strong>
                      {sellerStats.expiringSoonListings.slice(0, 3).map((listing) => (
                        <div key={`exp-${listing.id}`} className="classifieds-expiry-item">
                          <span>{listing.title} (Expires {new Date(listing.expiresAt).toLocaleDateString("en-IN")})</span>
                          <button
                            type="button"
                            className="classifieds-inline-button"
                            onClick={() => handleRelistExpired(listing)}
                            disabled={submitting}
                          >
                            Paid relist
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              )}

              <article className="classifieds-surface-card">
                <div className="classifieds-section-heading">
                  <h2>{editingListingId ? "Edit ad" : "Post a new ad"}</h2>
                  <p>{editingListingId ? "Update your existing ad with new details." : "Create a local classified with title, description, price, category, location, media, and promotion plan."}</p>
                </div>

              <div className="classifieds-listing-quality-panel">
                <div className="classifieds-listing-quality-score">
                  <strong>Completeness score: {listingCompletenessScore}%</strong>
                  <span>Aim for 80%+ to improve reach and trust.</span>
                </div>
                {listingTitleSuggestions.length > 0 && (
                  <div className="classifieds-listing-quality-block">
                    <strong>Title suggestions</strong>
                    <div className="classifieds-chip-cloud">
                      {listingTitleSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() => setListingForm((current) => ({ ...current, title: suggestion }))}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="classifieds-listing-quality-block">
                  <strong>Price suggestion</strong>
                  <span>{listingPriceHint}</span>
                </div>
                {duplicateDraftWarning ? (
                  <div className="classifieds-listing-warning">
                    Similar listing exists: {duplicateDraftWarning.title} ({duplicateDraftWarning.location})
                  </div>
                ) : null}
                {riskyCategorySelected ? (
                  <div className="classifieds-listing-warning">
                    This category needs admin approval before it goes live.
                  </div>
                ) : null}
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
                    {categories.map((category) => (
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
                  <span>District</span>
                  <select name="district" value={listingForm.district} onChange={handleListingInputChange}>
                    {districts
                      .filter((district) => district !== "All Districts")
                      .map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="classifieds-field">
                  <span>Pincode</span>
                  <input
                    name="pincode"
                    value={listingForm.pincode}
                    maxLength={6}
                    onChange={(event) =>
                      setListingForm((current) => ({
                        ...current,
                        pincode: event.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                    placeholder="6-digit pincode"
                  />
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
                    <option value="featured">Featured ad (top placement)</option>
                    <option value="urgent">Urgent sale badge</option>
                    <option value="subscription">Business seller plan</option>
                    <option value="paid-relist">Paid relisting</option>
                  </select>
                </label>

                <label className="classifieds-field">
                  <span>Listing expiry window (days)</span>
                  <select value={listingExpiryDays} onChange={(event) => setListingExpiryDays(event.target.value)}>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="45">45 days</option>
                    <option value="60">60 days</option>
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
                      <span className="classifieds-upload-icon">Upload</span>
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
                              X
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
                <button
                  type="button"
                  className="classifieds-secondary-button"
                  onClick={() => setShowListingPreview((current) => !current)}
                >
                  {showListingPreview ? "Hide preview" : "Preview before publish"}
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

              {showListingPreview ? (
                <div className="classifieds-preview-card">
                  <strong>Listing Preview</strong>
                  <h3>{listingForm.title || "Listing title"}</h3>
                  <p>{listingForm.category} | {listingForm.condition} | {listingForm.location || "Location"}</p>
                  <p>{listingForm.description || "Description preview appears here."}</p>
                  <span>{listingForm.price ? formatPrice(listingForm.price) : "Price pending"}</span>
                </div>
              ) : null}
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
                  <span>
                    {dashboardStats.reports} reports currently stored for moderation attention. Risky categories
                    route to admin approval automatically.
                  </span>
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
                <div>
                  <strong>Local ad banners</strong>
                  <span>District-targeted banner slots for partners and local businesses.</span>
                </div>
              </div>
            </article>
          </section>

          {activeRole === "admin" ? (
            <article className="classifieds-surface-card">
              <div className="classifieds-section-heading">
                <h2>Admin moderation panel</h2>
                <p>Approve/reject queue, spam signals, banned users, category controls, and expiry settings.</p>
              </div>
              <div className="classifieds-admin-grid">
                <div>
                  <strong>{adminModerationQueue.pendingApprovals}</strong>
                  <span>Pending approvals</span>
                </div>
                <div>
                  <strong>{adminModerationQueue.riskyCategoryPending}</strong>
                  <span>Risky category queue</span>
                </div>
                <div>
                  <strong>{adminModerationQueue.reportedListings}</strong>
                  <span>Reported listings queue</span>
                </div>
                <div>
                  <strong>{adminModerationQueue.spamKeywordDetections}</strong>
                  <span>Spam keyword detections</span>
                </div>
              </div>

              {spamKeywordHits.length > 0 ? (
                <div className="classifieds-spam-queue">
                  <strong>Spam keyword matches</strong>
                  {spamKeywordHits.slice(0, 5).map((listing) => (
                    <div key={`spam-${listing.id}`} className="classifieds-expiry-item">
                      <span>{listing.title} ({listing.category})</span>
                      <button
                        type="button"
                        className="classifieds-inline-button"
                        onClick={() => setSelectedListingId(listing.id)}
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="classifieds-admin-controls">
                <label className="classifieds-field">
                  <span>Category management</span>
                  <div className="classifieds-filter-toggle-row">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(event) => setCustomCategoryInput(event.target.value)}
                      placeholder="Add custom category"
                    />
                    <button type="button" className="classifieds-inline-button" onClick={handleAddCustomCategory}>
                      Add
                    </button>
                  </div>
                </label>
                <label className="classifieds-field">
                  <span>Listing expiry control (days)</span>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={listingExpiryDays}
                    onChange={(event) => setListingExpiryDays(event.target.value)}
                  />
                </label>
              </div>

              <div className="classifieds-banned-users">
                <strong>Banned users list</strong>
                {adminBannedUsers.length === 0 ? <span>No banned users synced from backend.</span> : null}
                {adminBannedUsers.map((seller) => (
                  <div key={`ban-${seller.sellerEmail || seller.sellerName}`} className="classifieds-expiry-item">
                    <span>
                      {seller.sellerName}
                      {seller.reason ? ` - ${seller.reason}` : ""}
                    </span>
                    <small>{seller.sellerEmail}</small>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
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
                    <p>
                      {selectedListing.location} - {selectedListing.locality} - {selectedListing.district}
                      {selectedListing.pincode ? ` (${selectedListing.pincode})` : ""}
                    </p>
                    {selectedListing.moderationNotes ? (
                      <p className="classifieds-detail-description">
                        <strong>Moderator note:</strong> {selectedListing.moderationNotes}
                      </p>
                    ) : null}
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
                  <span>{selectedListing.category} - {selectedListing.condition}</span>
                </div>

                <div className="price-history-section">
                  <PriceHistory 
                    priceHistory={selectedListing.priceHistory}
                    currentPrice={selectedListing.price}
                    currency="INR"
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
                        {'*'.repeat(Math.round(selectedListing.averageRating || 4.8))}
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
                              *
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
                      email: selectedListing.sellerEmail,
                      avatar: selectedListing.sellerAvatar || '/default-avatar.png',
                      verified: selectedListing.verified,
                      rating: selectedListing.sellerRating || 4.8,
                      reviewCount: selectedListing.sellerReviewCount || selectedListing.totalReviews || 0,
                      listingCount:
                        listings.filter((listing) =>
                          isSameSeller(listing, {
                            name: selectedListing.seller,
                            email: selectedListing.sellerEmail,
                          })
                        ).length || 1,
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
                    onMessageSeller={() => {
                      setChatWithListing(selectedListing);
                      setChatOpen(true);
                    }}
                    onViewStore={() => openSellerStore(selectedListing)}
                    onViewAllListings={() => openSellerStore(selectedListing)}
                    onViewReviews={() => setShowReviewForm(true)}
                    onReportSeller={() => {
                      setReportReason((currentReason) =>
                        currentReason || `Seller conduct review requested for ${selectedListing.seller}`
                      );
                      addToast(`Seller report draft prepared for ${selectedListing.seller}.`, 'warning');
                    }}
                  />
                </div>

                <div className="classifieds-inline-actions">
                  <button
                    type="button"
                    className="classifieds-inline-button"
                    onClick={() => openSellerStore(selectedListing)}
                  >
                    View seller store
                  </button>
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
                    Chat with Seller
                  </button>
                  <button
                    type="button"
                    className="classifieds-secondary-button"
                    onClick={() => addToast(`Call request shared with ${selectedListing.seller}.`, 'info')}
                  >
                    Call Seller
                  </button>
                  <button
                    type="button"
                    className="classifieds-secondary-button"
                    onClick={() => addToast(`Price alerts enabled for ${selectedListing.title}.`, 'success')}
                  >
                    Price Alert
                  </button>
                </div>

                <section className="classifieds-chat-card">
                  <div className="classifieds-section-heading">
                    <h3>Buyer and seller chat</h3>
                    <p>Message history is loaded from the backend store for this listing.</p>
                    <span className="classifieds-chat-status">
                      Seller status: {selectedListing.isOnline ? "Online now" : `Last seen ${getRelativeTimeLabel(selectedListing.posted)}`}
                    </span>
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
                  <div className="classifieds-chat-quick-replies">
                    {QUICK_CHAT_REPLIES.map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        className="classifieds-inline-button"
                        onClick={() => handleQuickChatMessage(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                    <button type="button" className="classifieds-inline-button" onClick={handleOfferPrice}>
                      Offer price
                    </button>
                    <button type="button" className="classifieds-inline-button" onClick={handleShareLocationInChat}>
                      Share location
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
                      onClick={() => handleBlockUser(selectedListing.seller)}
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
                  <div className="classifieds-blocked-users">
                    <strong>Blocked users</strong>
                    {blockedUsers.length === 0 ? <span>No blocked users.</span> : null}
                    {blockedUsers.map((sellerName) => (
                      <div key={`blocked-${sellerName}`} className="classifieds-expiry-item">
                        <span>{sellerName}</span>
                        <button
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() => handleUnblockUser(sellerName)}
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
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
                          <span>{lead.location} - {lead.chats} chats</span>
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
                    {activeRole === "admin" ? (
                      <label className="classifieds-field classifieds-field-full">
                        <span>Moderation note</span>
                        <textarea
                          rows="2"
                          value={adminModerationReason}
                          onChange={(event) => setAdminModerationReason(event.target.value)}
                          placeholder="Example: Missing ownership proof. Re-upload document to proceed."
                        />
                      </label>
                    ) : null}
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
                      {activeRole === "admin" ? (
                        <button
                          type="button"
                          className="classifieds-inline-button"
                          onClick={() =>
                            handleAdminAction(
                              "return_to_review",
                              `${selectedListing.title} returned to seller review queue.`
                            )
                          }
                        >
                          Return to review
                        </button>
                      ) : null}
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
        <div className="seller-store-modal" role="dialog" aria-label="Seller store">
          <div className="seller-store-content">
            <SellerStore
              seller={selectedSellerStore}
              listings={selectedSellerListings}
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
          </div>
        </div>
      )}

      {bulkActionsOpen && baseRole === 'seller' && (
        <BulkActions
          listings={listings}
          userListings={sellerListings}
          onAction={(action, listingIds) => {
            addToast(`${action} action completed for ${listingIds.length} listings`, 'success');
          }}
        />
      )}

      {reportingOpen && baseRole === 'seller' && (
        <AdvancedReporting
          listings={sellerListings}
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
            <button className="modal-close" onClick={() => setShowCategoryForms(false)}>X</button>
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
          existingListings={listings}
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
          allListings={listings}
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

      {mobileFilterSheetOpen ? (
        <div className="classifieds-filter-sheet-overlay" onClick={() => setMobileFilterSheetOpen(false)}>
          <div className="classifieds-filter-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="classifieds-filter-sheet-header">
              <strong>Filters</strong>
              <button type="button" className="classifieds-inline-button" onClick={() => setMobileFilterSheetOpen(false)}>
                Close
              </button>
            </div>
            <div className="classifieds-filter-sheet-body">
              <label className="classifieds-field">
                <span>District</span>
                <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
                  {districts.map((district) => (
                    <option key={`sheet-${district}`} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>
              <label className="classifieds-field">
                <span>Pincode</span>
                <input
                  type="text"
                  value={pincodeFilter}
                  maxLength={6}
                  onChange={(event) => setPincodeFilter(event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="6-digit pincode"
                />
              </label>
              <label className="classifieds-checkbox-inline">
                <input
                  type="checkbox"
                  checked={nearMeOnly}
                  onChange={(event) => setNearMeOnly(event.target.checked)}
                />
                Only near me
              </label>
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
          </div>
        </div>
      ) : null}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default Classifieds;
