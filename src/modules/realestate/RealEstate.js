import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/RealEstate.css";

const ROLE_MODES = [
  {
    id: "buyer",
    title: "Buyer / Tenant",
    description: "Search verified properties, save favorites, and connect with sellers.",
  },
  {
    id: "owner",
    title: "Property Owner",
    description: "Post sale or rental listings with media, pricing, and amenities.",
  },
  {
    id: "agent",
    title: "Agent / Broker",
    description: "Manage multiple listings, premium boosts, and active leads.",
  },
  {
    id: "builder",
    title: "Builder / Developer",
    description: "Launch projects, manage inventory, and showcase unit availability.",
  },
  {
    id: "admin",
    title: "Admin",
    description: "Approve listings, verify users, monitor disputes, and track analytics.",
  },
];

const DEFAULT_LISTING_FORM = {
  title: "",
  intent: "sale",
  priceLabel: "",
  location: "",
  type: "Flat",
  bedrooms: "2",
  furnishing: "Semi Furnished",
  areaSqft: "",
};

const REAL_ESTATE_SEED_PROPERTIES = [
  {
    id: "re-1",
    title: "Skyline Residency 3 BHK",
    price: "95 Lakhs",
    priceLabel: "95 Lakhs",
    priceValue: 95,
    area: "1650 sq ft",
    areaSqft: 1650,
    location: "Kochi",
    locality: "Kakkanad",
    type: "Flat",
    intent: "sale",
    image: "Skyline tower",
    bedrooms: 3,
    bathrooms: 3,
    furnishing: "Semi Furnished",
    amenities: ["Covered parking", "Clubhouse", "Security", "Power backup"],
    sellerName: "Amina Niyas",
    sellerRole: "Owner",
    listedBy: "Owner",
    verified: true,
    verificationStatus: "Verified",
    featured: true,
    postedOn: "2026-04-18",
    possession: "Ready to move",
    description: "A family-ready apartment near the IT corridor with metro access, strong resale demand, and community amenities.",
    mapLabel: "Kakkanad smart city corridor",
    rating: 4.8,
    reviewCount: 36,
    premiumPlan: "Featured Listing",
    mediaCount: 12,
    hasVideoTour: true,
    leads: [
      { name: "Riyas", channel: "Chat", priority: "Hot" },
      { name: "Aparna", channel: "Call", priority: "Warm" },
    ],
    chatPreview: [
      { from: "Amina Niyas", text: "The price is negotiable for immediate buyers." },
      { from: "Platform Bot", text: "Floor plan and legal summary are available on request." },
    ],
    reviews: [
      { author: "Shahid", score: 5, comment: "Verified documents and fast site visit support." },
      { author: "Maya", score: 4, comment: "Responsive owner and good neighborhood access." },
    ],
    languageSupport: ["English", "Malayalam"],
    disputeCount: 0,
    status: "available",
  },
  {
    id: "re-2",
    title: "Seabreeze Garden Villa",
    price: "2.4 Crores",
    priceLabel: "2.4 Crores",
    priceValue: 240,
    area: "4200 sq ft",
    areaSqft: 4200,
    location: "Calicut",
    locality: "Beypore",
    type: "Villa",
    intent: "sale",
    image: "Luxury villa",
    bedrooms: 4,
    bathrooms: 4,
    furnishing: "Furnished",
    amenities: ["Private garden", "CCTV", "Modular kitchen", "Waterfront access"],
    sellerName: "Nadira Estates",
    sellerRole: "Agent",
    listedBy: "Agent",
    verified: true,
    verificationStatus: "Verified",
    featured: true,
    postedOn: "2026-04-16",
    possession: "Ready to move",
    description: "Premium waterfront villa curated for end users and NRI investors looking for a landmark address in North Kerala.",
    mapLabel: "Beypore marina belt",
    rating: 4.9,
    reviewCount: 22,
    premiumPlan: "Agent Pro",
    mediaCount: 18,
    hasVideoTour: true,
    leads: [
      { name: "Fathima", channel: "Enquiry", priority: "Hot" },
      { name: "Joseph", channel: "Chat", priority: "Warm" },
    ],
    chatPreview: [
      { from: "Nadira Estates", text: "We can arrange a virtual tour for outstation buyers." },
    ],
    reviews: [{ author: "Nived", score: 5, comment: "Great coordination and transparent pricing." }],
    languageSupport: ["English", "Malayalam", "Hindi"],
    disputeCount: 0,
    status: "sold",
  },
  {
    id: "re-3",
    title: "Smart Rental Studio",
    price: "28,000 / month",
    priceLabel: "28,000 / month",
    priceValue: 28,
    area: "640 sq ft",
    areaSqft: 640,
    location: "Trivandrum",
    locality: "Technopark Phase 1",
    type: "Studio",
    intent: "rent",
    image: "Rental studio",
    bedrooms: 1,
    bathrooms: 1,
    furnishing: "Furnished",
    amenities: ["Wi-Fi", "Lift", "Security", "Housekeeping access"],
    sellerName: "Rohit Menon",
    sellerRole: "Owner",
    listedBy: "Owner",
    verified: true,
    verificationStatus: "Verified",
    featured: false,
    postedOn: "2026-04-19",
    possession: "Immediate",
    description: "Compact and fully furnished studio close to the IT park, built for young professionals and short commute living.",
    mapLabel: "Technopark rental cluster",
    rating: 4.4,
    reviewCount: 19,
    premiumPlan: "Starter",
    mediaCount: 9,
    hasVideoTour: false,
    leads: [
      { name: "Devika", channel: "Call", priority: "Warm" },
      { name: "Nikhil", channel: "Chat", priority: "Warm" },
    ],
    chatPreview: [
      { from: "Rohit Menon", text: "Rent includes maintenance. Security deposit is three months." },
    ],
    reviews: [{ author: "Arun", score: 4, comment: "Well-maintained and easy move-in process." }],
    languageSupport: ["English", "Malayalam", "Tamil"],
    disputeCount: 0,
  },
  {
    id: "re-4",
    title: "Town Square Commercial Floor",
    price: "1.35 Crores",
    priceLabel: "1.35 Crores",
    priceValue: 135,
    area: "2200 sq ft",
    areaSqft: 2200,
    location: "Thrissur",
    locality: "MG Road",
    type: "Commercial",
    intent: "sale",
    image: "Commercial space",
    bedrooms: 0,
    bathrooms: 2,
    furnishing: "Unfurnished",
    amenities: ["Road frontage", "Elevator", "Power backup", "Visitor parking"],
    sellerName: "Metro Asset Brokers",
    sellerRole: "Agent",
    listedBy: "Agent",
    verified: false,
    verificationStatus: "Pending",
    featured: false,
    postedOn: "2026-04-15",
    possession: "Ready to fit out",
    description: "High-visibility commercial inventory suited for clinics, offices, and branded retail expansion in central Thrissur.",
    mapLabel: "MG Road business district",
    rating: 4.2,
    reviewCount: 11,
    premiumPlan: "Featured Listing",
    mediaCount: 10,
    hasVideoTour: true,
    leads: [{ name: "Suresh", channel: "Enquiry", priority: "Hot" }],
    chatPreview: [
      { from: "Metro Asset Brokers", text: "We can share footfall data and rental yield estimates." },
    ],
    reviews: [{ author: "Retail partner", score: 4, comment: "Good access and clear commercial approvals." }],
    languageSupport: ["English", "Malayalam", "Hindi"],
    disputeCount: 1,
  },
  {
    id: "re-5",
    title: "Green Haven Plots",
    price: "18 Lakhs onwards",
    priceLabel: "18 Lakhs onwards",
    priceValue: 18,
    area: "2400 sq ft",
    areaSqft: 2400,
    location: "Kannur",
    locality: "Taliparamba",
    type: "Land",
    intent: "sale",
    image: "Residential plots",
    bedrooms: 0,
    bathrooms: 0,
    furnishing: "Unfurnished",
    amenities: ["Compound wall", "Drainage", "Wide road", "Clear title"],
    sellerName: "Malabar Land Makers",
    sellerRole: "Builder",
    listedBy: "Builder",
    verified: true,
    verificationStatus: "Verified",
    featured: false,
    postedOn: "2026-04-17",
    possession: "Immediate registration",
    description: "Approved villa plots in a fast-growing residential pocket with strong end-user demand and financing support.",
    mapLabel: "Taliparamba residential expansion zone",
    rating: 4.6,
    reviewCount: 14,
    premiumPlan: "Agent Pro",
    mediaCount: 7,
    hasVideoTour: false,
    leads: [{ name: "Akhil", channel: "Call", priority: "Warm" }],
    chatPreview: [
      { from: "Malabar Land Makers", text: "Plot sizes can be combined for larger villa development." },
    ],
    reviews: [{ author: "Investor", score: 5, comment: "Documentation and title clarity were excellent." }],
    languageSupport: ["English", "Malayalam"],
    disputeCount: 0,
  },
  {
    id: "re-6",
    title: "Azure Heights Project Launch",
    price: "72 Lakhs onwards",
    priceLabel: "72 Lakhs onwards",
    priceValue: 72,
    area: "1380 sq ft",
    areaSqft: 1380,
    location: "Kochi",
    locality: "Edappally",
    type: "Flat",
    intent: "project",
    image: "Project launch",
    bedrooms: 3,
    bathrooms: 2,
    furnishing: "Semi Furnished",
    amenities: ["Swimming pool", "Gym", "Children's park", "EV charging"],
    sellerName: "West Coast Builders",
    sellerRole: "Builder",
    developer: "West Coast Builders",
    listedBy: "Builder",
    verified: true,
    verificationStatus: "Verified",
    featured: true,
    postedOn: "2026-04-20",
    possession: "Dec 2027",
    description: "A newly launched apartment project with phased inventory management, pre-launch pricing, and digital brochure access.",
    mapLabel: "Edappally metro growth corridor",
    rating: 4.7,
    reviewCount: 27,
    premiumPlan: "Featured Listing",
    mediaCount: 15,
    hasVideoTour: true,
    projectUnits: 84,
    leads: [
      { name: "Haritha", channel: "Enquiry", priority: "Hot" },
      { name: "Manu", channel: "Chat", priority: "Warm" },
    ],
    chatPreview: [
      { from: "West Coast Builders", text: "Inventory blocks A and B are now open for early booking." },
    ],
    reviews: [
      { author: "Home buyer", score: 5, comment: "Builder team shared plans and payment schedule clearly." },
    ],
    languageSupport: ["English", "Malayalam", "Tamil", "Hindi"],
    disputeCount: 0,
  },
];

const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const resolveErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

const getUserIdentity = (user) => {
  if (!user) {
    return {
      ownerId: "",
      sellerName: "New Partner",
    };
  }

  return {
    ownerId:
      user.id ||
      user.userId ||
      user.email ||
      user.phone ||
      user.username ||
      user.businessName ||
      user.name ||
      "",
    sellerName: user.businessName || user.name || "New Partner",
  };
};

const getAllowedRoleModes = (user) => {
  if (!user) {
    return ["buyer"];
  }

  if (user.registrationType === "admin" || user.role === "admin") {
    return ["buyer", "admin"];
  }

  if (user.registrationType === "entrepreneur" || user.role === "business") {
    return ["buyer", "owner", "agent", "builder"];
  }

  return ["buyer"];
};

const getPreferredRoleMode = (user) => {
  const allowedRoleModes = getAllowedRoleModes(user);

  if (allowedRoleModes.includes("admin")) {
    return "admin";
  }

  if (allowedRoleModes.includes("agent")) {
    return "agent";
  }

  return allowedRoleModes[0] || "buyer";
};

const normalizeProperty = (property, index) => {
  const priceValue =
    typeof property?.priceValue === "number"
      ? property.priceValue
      : Number(String(property?.price || "").replace(/[^0-9.]/g, "")) || 0;
  const areaSqft =
    typeof property?.areaSqft === "number"
      ? property.areaSqft
      : Number(String(property?.area || "").replace(/[^0-9.]/g, "")) || 0;
  const bedrooms =
    typeof property?.bedrooms === "number"
      ? property.bedrooms
      : Number(property?.bedrooms) || 0;
  const bathrooms =
    typeof property?.bathrooms === "number"
      ? property.bathrooms
      : Number(property?.bathrooms) || 0;
  const reviews = Array.isArray(property?.reviews) ? property.reviews : [];
  const reviewCount =
    typeof property?.reviewCount === "number" ? property.reviewCount : reviews.length;
  const rating =
    typeof property?.rating === "number"
      ? property.rating
      : reviews.length > 0
        ? reviews.reduce((sum, review) => sum + Number(review?.score || 0), 0) / reviews.length
        : 0;
  const reports = Array.isArray(property?.reports) ? property.reports : [];

  return {
    id: property?.id || `property-${index + 1}`,
    title: property?.title || "Verified Property",
    price: property?.price || property?.priceLabel || "Price on request",
    priceLabel: property?.priceLabel || property?.price || "Price on request",
    priceValue,
    location: property?.location || "Kerala",
    locality: property?.locality || property?.location || "Prime neighborhood",
    type: property?.type || "Flat",
    intent: property?.intent || "sale",
    area: property?.area || `${areaSqft || 1200} sq ft`,
    areaSqft: areaSqft || 1200,
    bedrooms,
    bathrooms,
    furnishing: property?.furnishing || "Semi Furnished",
    image: property?.image || "Property",
    description:
      property?.description ||
      "Verified listing with strong local demand, transparent pricing, and responsive seller communication.",
    amenities:
      Array.isArray(property?.amenities) && property.amenities.length > 0
        ? property.amenities
        : ["Parking", "Security", "Power Backup"],
    sellerName: property?.sellerName || "Trusted Seller",
    ownerId:
      property?.ownerId ||
      property?.sellerId ||
      property?.ownerEmail ||
      property?.sellerEmail ||
      property?.sellerName ||
      `owner-${index + 1}`,
    sellerEmail: property?.sellerEmail || "",
    sellerRole: property?.sellerRole || "Owner",
    developer: property?.developer || property?.sellerName || "Malabar Estates",
    listedBy: property?.listedBy || property?.sellerRole || "Owner",
    verified: property?.verified !== false,
    verificationStatus: property?.verificationStatus || (property?.verified === false ? "Pending" : "Verified"),
    featured: Boolean(property?.featured),
    postedOn: property?.postedOn || "2026-04-18",
    possession: property?.possession || "Ready to move",
    mapLabel: property?.mapLabel || `${property?.location || "Kerala"} growth corridor`,
    rating,
    reviewCount,
    premiumPlan: property?.premiumPlan || "Featured Listing",
    projectUnits: typeof property?.projectUnits === "number" ? property.projectUnits : 1,
    leads: Array.isArray(property?.leads) ? property.leads : [],
    chatPreview:
      Array.isArray(property?.chatPreview) && property.chatPreview.length > 0
        ? property.chatPreview
        : [
            {
              from: property?.sellerName || "Trusted Seller",
              text: "Hello, happy to share pricing, floor plan, and tour slots.",
            },
          ],
    similarTags:
      Array.isArray(property?.similarTags) && property.similarTags.length > 0
        ? property.similarTags
        : [property?.type || "Flat", property?.location || "Kerala"],
    mediaCount: typeof property?.mediaCount === "number" ? property.mediaCount : 8,
    hasVideoTour: Boolean(property?.hasVideoTour),
    reviews,
    reports,
    languageSupport:
      Array.isArray(property?.languageSupport) && property.languageSupport.length > 0
        ? property.languageSupport
        : ["English", "Malayalam"],
    disputeCount:
      typeof property?.disputeCount === "number" ? property.disputeCount : reports.length,
    status: property?.status || "available",
  };
};

const RealEstate = () => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    mockData,
    createRealEstateListing = async () => null,
    updateRealEstateListing = async () => null,
    sendRealEstateEnquiry = async () => null,
    sendRealEstateMessage = async () => null,
    addRealEstateReview = async () => null,
    reportRealEstateListing = async () => null,
    moderateRealEstateListing = async () => null,
    deleteRealEstateListing = async () => null,
  } = useApp();
  const [activeRole, setActiveRole] = useState(() => getPreferredRoleMode(currentUser));
  const [searchText, setSearchText] = useState("");
  const [intentFilter, setIntentFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("All");
  const [bedroomFilter, setBedroomFilter] = useState("Any");
  const [furnishingFilter, setFurnishingFilter] = useState("Any");
  const [locationFilter, setLocationFilter] = useState("All");
  const [budgetFilter, setBudgetFilter] = useState("All");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [reportReason, setReportReason] = useState("");
  const [listingForm, setListingForm] = useState(DEFAULT_LISTING_FORM);
  const [editListingId, setEditListingId] = useState("");
  const { ownerId: currentOwnerId } = useMemo(() => getUserIdentity(currentUser), [currentUser]);
  const allowedRoleModes = useMemo(() => getAllowedRoleModes(currentUser), [currentUser]);
  const currentUserEmail = useMemo(
    () => String(currentUser?.email || "").trim().toLowerCase(),
    [currentUser?.email]
  );

  const sourceProperties = useMemo(() => {
    const incomingProperties = Array.isArray(mockData?.realestateProperties)
      ? mockData.realestateProperties
      : [];
    const hasIncomingData = incomingProperties.length > 0;

    return hasIncomingData ? incomingProperties : REAL_ESTATE_SEED_PROPERTIES;
  }, [mockData?.realestateProperties]);

  const properties = useMemo(
    () => sourceProperties.map((property, index) => normalizeProperty(property, index)),
    [sourceProperties]
  );

  const locations = useMemo(
    () => ["All", ...new Set(properties.map((property) => property.location))],
    [properties]
  );

  const propertyTypes = useMemo(
    () => ["All", ...new Set(properties.map((property) => property.type))],
    [properties]
  );

  const filteredProperties = useMemo(() => {
    const bySearch = properties.filter((property) => {
      const matchesSearch =
        !searchText ||
        [
          property.title,
          property.location,
          property.locality,
          property.type,
          property.sellerName,
          property.description,
          property.priceLabel,
          ...(property.amenities || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      const matchesIntent = intentFilter === "all" || property.intent === intentFilter;
      const matchesType = typeFilter === "All" || property.type === typeFilter;
      const matchesBedrooms =
        bedroomFilter === "Any" ||
        (bedroomFilter === "4+" ? property.bedrooms >= 4 : String(property.bedrooms) === bedroomFilter);
      const matchesFurnishing =
        furnishingFilter === "Any" || property.furnishing === furnishingFilter;
      const matchesLocation =
        locationFilter === "All" || property.location === locationFilter;
      const matchesBudget =
        budgetFilter === "All" ||
        (budgetFilter === "Under 50L" && property.priceValue <= 50) ||
        (budgetFilter === "50L - 1Cr" && property.priceValue > 50 && property.priceValue <= 100) ||
        (budgetFilter === "1Cr - 2Cr" && property.priceValue > 100 && property.priceValue <= 200) ||
        (budgetFilter === "2Cr+" && property.priceValue > 200);

      return (
        matchesSearch &&
        matchesIntent &&
        matchesType &&
        matchesBedrooms &&
        matchesFurnishing &&
        matchesLocation &&
        matchesBudget
      );
    });

    const sorted = [...bySearch];
    sorted.sort((first, second) => {
      if (sortBy === "price-asc") {
        return first.priceValue - second.priceValue;
      }
      if (sortBy === "price-desc") {
        return second.priceValue - first.priceValue;
      }
      if (sortBy === "newest") {
        return new Date(second.postedOn) - new Date(first.postedOn);
      }
      if (sortBy === "popularity") {
        return second.leads.length - first.leads.length;
      }
      return Number(second.featured) - Number(first.featured) || second.rating - first.rating;
    });

    return sorted;
  }, [
    bedroomFilter,
    budgetFilter,
    furnishingFilter,
    intentFilter,
    locationFilter,
    properties,
    searchText,
    sortBy,
    typeFilter,
  ]);

  useEffect(() => {
    if (!filteredProperties.length) {
      setSelectedPropertyId("");
      return;
    }

    const selectedStillVisible = filteredProperties.some(
      (property) => String(property.id) === String(selectedPropertyId)
    );

    if (!selectedStillVisible) {
      setSelectedPropertyId(filteredProperties[0].id);
    }
  }, [filteredProperties, selectedPropertyId]);

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    if (!allowedRoleModes.includes(activeRole)) {
      setActiveRole(getPreferredRoleMode(currentUser));
    }
  }, [activeRole, allowedRoleModes, currentUser]);

  const selectedProperty =
    filteredProperties.find((property) => String(property.id) === String(selectedPropertyId)) || null;

  const propertyFavorites = Array.isArray(favorites)
    ? favorites.filter((item) => item?.domain === "realestate")
    : [];
  const favoriteIds = new Set(propertyFavorites.map((item) => String(item.id)));

  const selectedMessages = selectedProperty ? selectedProperty.chatPreview : [];

  const dashboardStats = useMemo(() => {
    const verifiedCount = properties.filter((property) => property.verified).length;
    const rentCount = properties.filter((property) => property.intent === "rent").length;
    const activeLeads = properties.reduce((total, property) => total + property.leads.length, 0);

    return [
      { label: "Active listings", value: formatCompactNumber(properties.length) },
      { label: "Verified listings", value: formatCompactNumber(verifiedCount) },
      { label: "Rental inventory", value: formatCompactNumber(rentCount) },
      { label: "Open leads", value: formatCompactNumber(activeLeads) },
    ];
  }, [properties]);

  const visibleLeadProperties = useMemo(() => {
    if (activeRole === "admin") {
      return properties;
    }

    if (!["owner", "agent", "builder"].includes(activeRole)) {
      return [];
    }

    return properties.filter((property) => {
      const propertyOwnerId = String(property.ownerId || "").trim();
      const propertySellerEmail = String(property.sellerEmail || "").trim().toLowerCase();
      const normalizedOwnerId = String(currentOwnerId || "").trim();

      return (
        (propertyOwnerId && normalizedOwnerId && propertyOwnerId === normalizedOwnerId) ||
        (propertySellerEmail && currentUserEmail && propertySellerEmail === currentUserEmail)
      );
    });
  }, [activeRole, currentOwnerId, currentUserEmail, properties]);

  const leadBoard = useMemo(() => {
    return visibleLeadProperties
      .flatMap((property) =>
        property.leads.map((lead) => ({
          ...lead,
          propertyTitle: property.title,
          propertyId: property.id,
        }))
      )
      .sort((first, second) => (first.priority === "Hot" ? -1 : 1) - (second.priority === "Hot" ? -1 : 1))
      .slice(0, 6);
  }, [visibleLeadProperties]);

  const similarProperties = useMemo(() => {
    if (!selectedProperty) {
      return [];
    }

    return filteredProperties
      .filter(
        (property) =>
          property.id !== selectedProperty.id &&
          (property.location === selectedProperty.location || property.type === selectedProperty.type)
      )
      .slice(0, 3);
  }, [filteredProperties, selectedProperty]);

  const canManageProperty = (property) => {
    if (!property) {
      return false;
    }

    if (activeRole === "admin") {
      return true;
    }

    if (!["owner", "agent", "builder"].includes(activeRole)) {
      return false;
    }

    const propertyOwnerId = String(property.ownerId || "").trim();
    const propertySellerEmail = String(property.sellerEmail || "").trim().toLowerCase();
    const normalizedOwnerId = String(currentOwnerId || "").trim();

    return (
      (propertyOwnerId && normalizedOwnerId && propertyOwnerId === normalizedOwnerId) ||
      (propertySellerEmail && currentUserEmail && propertySellerEmail === currentUserEmail)
    );
  };

  const handleFavoriteToggle = (property) => {
    const favoriteId = `realestate-${property.id}`;
    const isFavorite = favoriteIds.has(favoriteId);

    if (isFavorite) {
      removeFavorite(favoriteId);
      setStatusMessage(`${property.title} removed from favorites.`);
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
    setStatusMessage(`${property.title} saved to favorites.`);
  };

  const handleEnquirySubmit = async () => {
    if (!selectedProperty) {
      return;
    }

    try {
      await sendRealEstateEnquiry(selectedProperty.id, {
        message: enquiryMessage.trim(),
        channel: "Enquiry",
      });
      setStatusMessage(
        enquiryMessage.trim()
          ? `Enquiry sent to ${selectedProperty.sellerName}. Lead added to seller dashboard.`
          : `Quick enquiry sent for ${selectedProperty.title}.`
      );
      setEnquiryMessage("");
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Enquiry could not be sent."));
    }
  };

  const handleSendMessage = async () => {
    if (!selectedProperty || !chatInput.trim()) {
      return;
    }

    try {
      await sendRealEstateMessage(selectedProperty.id, {
        text: chatInput.trim(),
      });
      setStatusMessage(`Message delivered to ${selectedProperty.sellerName}.`);
      setChatInput("");
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Message could not be delivered."));
    }
  };

  const handleListingInputChange = ({ target }) => {
    setListingForm((currentForm) => ({
      ...currentForm,
      [target.name]: target.value,
    }));
  };

  const handleListingSubmit = async (event) => {
    event.preventDefault();

    const nextListing = {
      title: listingForm.title.trim(),
      intent: listingForm.intent,
      priceLabel: listingForm.priceLabel.trim(),
      location: listingForm.location.trim(),
      locality: listingForm.location.trim(),
      type: listingForm.type,
      areaSqft: Number(listingForm.areaSqft) || 1200,
      bedrooms: Number(listingForm.bedrooms) || 2,
      bathrooms:
        Number(listingForm.bedrooms) > 0 ? Math.max(1, Number(listingForm.bedrooms) - 1) : 0,
      furnishing: listingForm.furnishing,
      roleMode: activeRole === "builder" ? "builder" : activeRole === "owner" ? "owner" : "agent",
    };

    if (!nextListing.title || !nextListing.location || !nextListing.priceLabel || !nextListing.type || !nextListing.areaSqft) {
      setStatusMessage("Complete title, location, price, type, and area before publishing the listing.");
      return;
    }

    try {
      if (editListingId) {
        const updatedListing = await updateRealEstateListing(editListingId, nextListing);
        setSelectedPropertyId(updatedListing?.id || editListingId);
        setStatusMessage("Listing updated successfully.");
      } else {
        const createdListing = await createRealEstateListing(nextListing);
        setSelectedPropertyId(createdListing?.id || "");
        setStatusMessage("Listing drafted successfully. It is now waiting for admin approval.");
      }

      setListingForm(DEFAULT_LISTING_FORM);
      setEditListingId("");
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Listing could not be saved."));
    }
  };

  const handleEditListing = (property) => {
    setEditListingId(property.id);
    setListingForm({
      title: property.title,
      intent: property.intent,
      priceLabel: property.priceLabel,
      location: property.location,
      type: property.type,
      bedrooms: String(property.bedrooms),
      furnishing: property.furnishing,
      areaSqft: String(property.areaSqft),
    });
  };

  const handleAdminAction = async (action) => {
    if (!selectedProperty) {
      return;
    }

    if (action === "User verification") {
      setStatusMessage(`${action} completed for ${selectedProperty.title}.`);
      return;
    }

    try {
      await moderateRealEstateListing(
        selectedProperty.id,
        action === "Approval" ? "approve" : action === "Reject" ? "reject" : "flag"
      );
      setStatusMessage(
        action === "Approval"
          ? `Listing approved for ${selectedProperty.title}.`
          : action === "Reject"
            ? `Listing rejected for ${selectedProperty.title}.`
            : `${action} completed for ${selectedProperty.title}.`
      );
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Admin action could not be completed."));
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedProperty) {
      return;
    }

    const normalizedComment = reviewComment.trim();
    if (!normalizedComment) {
      setStatusMessage("Add a short review comment before submitting.");
      return;
    }

    try {
      await addRealEstateReview(selectedProperty.id, {
        rating: Number(reviewRating),
        comment: normalizedComment,
      });
      setReviewComment("");
      setReviewRating("5");
      setStatusMessage(`Review submitted for ${selectedProperty.sellerName}.`);
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Review could not be submitted."));
    }
  };

  const handleReportSubmit = async () => {
    if (!selectedProperty) {
      return;
    }

    const normalizedReason = reportReason.trim();
    if (!normalizedReason) {
      setStatusMessage("Add a report reason before flagging a listing.");
      return;
    }

    try {
      await reportRealEstateListing(selectedProperty.id, {
        reason: normalizedReason,
      });
      setReportReason("");
      setStatusMessage(`Fake listing report submitted for ${selectedProperty.title}.`);
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Listing report could not be submitted."));
    }
  };

  const handleDeleteCurrentListing = async () => {
    if (!selectedProperty) {
      return;
    }

    try {
      await deleteRealEstateListing(selectedProperty.id);
      setEditListingId("");
      setListingForm(DEFAULT_LISTING_FORM);
      setStatusMessage(`${selectedProperty.title} was removed from the marketplace.`);
    } catch (error) {
      setStatusMessage(resolveErrorMessage(error, "Listing could not be deleted."));
    }
  };

  return (
    <div className="realestate-shell">
      <section className="realestate-hero">
        <div className="realestate-hero-copy">
          <span className="realestate-kicker">FRS - Real Estate Platform</span>
          <h1>HomeSphere turns property discovery into a verified marketplace for buying, renting, and selling.</h1>
          <p>
            Browse trusted listings, empower owners and brokers, and manage the full lead journey
            from first enquiry to closing conversation.
          </p>
          <div className="realestate-hero-actions">
            <button type="button" className="realestate-primary-button" onClick={() => setActiveRole("buyer")}>
              Explore listings
            </button>
            <button
              type="button"
              className="realestate-secondary-button"
              onClick={() => {
                if (allowedRoleModes.includes("owner")) {
                  setActiveRole("owner");
                } else {
                  setStatusMessage("Upgrade to a seller or business account to post property listings.");
                }
              }}
            >
              Post property
            </button>
          </div>
          <div className="realestate-hero-tags">
            <span>Verified listings</span>
            <span>OTP-ready onboarding</span>
            <span>Subscriptions and featured boosts</span>
            <span>English, Malayalam, Tamil, Hindi</span>
          </div>
        </div>

        <div className="realestate-hero-panel">
          <h2>Objectives</h2>
          <ul>
            <li>Digitize property transactions with clear role-based flows.</li>
            <li>Help local brokers, builders, and individuals become digital entrepreneurs.</li>
            <li>Improve trust with verification, reviews, and fake-listing reporting.</li>
            <li>Speed up discovery with filters, alerts, chat, and lead tracking.</li>
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

      <section className="realestate-role-section">
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
                } else {
                  setStatusMessage(`Your account cannot access the ${roleMode.title} workspace.`);
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

      {statusMessage ? <div className="realestate-status-banner">{statusMessage}</div> : null}

      <section className="realestate-main-grid">
        <div className="realestate-left-column">
          <article className="realestate-filter-card">
            <div className="realestate-section-heading">
              <h2>Smart search</h2>
              <p>Location-based discovery with filters for budget, type, bedrooms, furnishing, and ranking.</p>
            </div>

            <div className="realestate-filter-grid">
              <label className="realestate-field">
                <span>Search</span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Title, location, seller, or locality"
                  aria-label="Search properties by title, location, seller, or locality"
                />
              </label>

              <label className="realestate-field">
                <span>Listing intent</span>
                <select value={intentFilter} onChange={(event) => setIntentFilter(event.target.value)}>
                  <option value="all">All</option>
                  <option value="sale">Buy</option>
                  <option value="rent">Rent</option>
                  <option value="project">Projects</option>
                </select>
              </label>

              <label className="realestate-field">
                <span>Location</span>
                <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="realestate-field">
                <span>Property type</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="realestate-field">
                <span>Bedrooms</span>
                <select value={bedroomFilter} onChange={(event) => setBedroomFilter(event.target.value)}>
                  {["Any", "1", "2", "3", "4+"].map((bedroom) => (
                    <option key={bedroom} value={bedroom}>
                      {bedroom}
                    </option>
                  ))}
                </select>
              </label>

              <label className="realestate-field">
                <span>Furnishing</span>
                <select
                  value={furnishingFilter}
                  onChange={(event) => setFurnishingFilter(event.target.value)}
                >
                  {["Any", "Furnished", "Semi Furnished", "Unfurnished"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="realestate-field">
                <span>Budget</span>
                <select value={budgetFilter} onChange={(event) => setBudgetFilter(event.target.value)}>
                  {["All", "Under 50L", "50L - 1Cr", "1Cr - 2Cr", "2Cr+"].map((budget) => (
                    <option key={budget} value={budget}>
                      {budget}
                    </option>
                  ))}
                </select>
              </label>

              <label className="realestate-field">
                <span>Sort by</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to high</option>
                  <option value="price-desc">Price: High to low</option>
                  <option value="popularity">Popularity</option>
                </select>
              </label>
            </div>
          </article>

          <article className="realestate-listing-card">
            <div className="realestate-section-heading">
              <h2>Marketplace inventory</h2>
              <p>{filteredProperties.length} properties match the current search.</p>
            </div>

            <div className="realestate-property-grid">
              {filteredProperties.map((property) => {
                const favoriteId = `realestate-${property.id}`;
                const isFavorite = favoriteIds.has(favoriteId);

                return (
                  <article
                    key={property.id}
                    className={`realestate-property-card ${
                      selectedProperty?.id === property.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedPropertyId(property.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Space") {
                        event.preventDefault();
                        setSelectedPropertyId(property.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="realestate-property-topline">
                      <span className={`realestate-badge ${property.verified ? "verified" : "pending"}`}>
                        {property.verificationStatus}
                      </span>
                      {property.featured ? <span className="realestate-badge featured">Featured</span> : null}
                      <span className={`realestate-badge ${property.status === "available" ? "available" : property.status === "sold" ? "sold" : "rented"}`}>
                        {property.status}
                      </span>
                    </div>
                    <div className="realestate-property-media">
                      <strong>{property.image}</strong>
                      <span>{property.mediaCount} media assets</span>
                    </div>
                    <div className="realestate-property-copy">
                      <h3>{property.title}</h3>
                      <p className="realestate-price">{property.priceLabel}</p>
                      <p>{property.location} · {property.locality}</p>
                      <p>
                        {property.type} · {property.bedrooms || "Studio"} bed · {property.area}
                      </p>
                      <div className="realestate-property-meta">
                        <span>{property.furnishing}</span>
                        <span>{property.leads.length} leads</span>
                        <span>{property.rating.toFixed(1)} rating</span>
                      </div>
                    </div>
                    <div className="realestate-card-actions">
                      <span>{property.listedBy}</span>
                      {canManageProperty(property) ? (
                        <button
                          type="button"
                          className="realestate-inline-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditListing(property);
                          }}
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="realestate-inline-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFavoriteToggle(property);
                        }}
                        aria-label={`${isFavorite ? "Remove" : "Add"} ${property.title} to favorites`}
                      >
                        {isFavorite ? "Saved" : "Save"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="realestate-operations-grid">
            <section className="realestate-surface-card">
              <div className="realestate-section-heading">
                <h2>Lead management</h2>
                <p>
                  {activeRole === "admin"
                    ? "Admins can see marketplace-wide pipeline activity."
                    : "Sellers see only leads for properties they own."}
                </p>
              </div>
              <div className="realestate-lead-list">
                {leadBoard.length ? (
                  leadBoard.map((lead) => (
                    <div key={`${lead.propertyId}-${lead.name}`} className="realestate-lead-item">
                      <strong>{lead.name}</strong>
                      <span>{lead.propertyTitle}</span>
                      <span>{lead.channel} / {lead.priority}</span>
                    </div>
                  ))
                ) : (
                  <div className="realestate-lead-item">
                    <strong>No active leads yet</strong>
                    <span>New enquiries will appear here as buyers contact your listings.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="realestate-surface-card">
              <div className="realestate-section-heading">
                <h2>Monetization</h2>
                <p>Free listing limits, premium placement, and broker subscriptions built into the product.</p>
              </div>
              <div className="realestate-plan-list">
                <div>
                  <strong>Starter</strong>
                  <span>1 free listing, standard search visibility</span>
                </div>
                <div>
                  <strong>Featured</strong>
                  <span>Homepage placement, 2x lead boost, image priority</span>
                </div>
                <div>
                  <strong>Agent Pro</strong>
                  <span>Unlimited listings, lead CRM, analytics, branded profile</span>
                </div>
              </div>
            </section>
          </article>

          {(activeRole === "owner" || activeRole === "agent" || activeRole === "builder") ? (
            <article className="realestate-surface-card">
              <div className="realestate-section-heading">
                <h2>{editListingId ? "Edit listing" : "Publish a property"}</h2>
                <p>{editListingId ? "Update your property details." : "Add a new sale, rental, or project listing with media-ready details."}</p>
              </div>

              <form className="realestate-form-grid" onSubmit={handleListingSubmit}>
                <label className="realestate-field">
                  <span>Title</span>
                  <input name="title" value={listingForm.title} onChange={handleListingInputChange} />
                </label>

                <label className="realestate-field">
                  <span>Intent</span>
                  <select name="intent" value={listingForm.intent} onChange={handleListingInputChange}>
                    <option value="sale">Sale</option>
                    <option value="rent">Rent</option>
                    <option value="project">Project</option>
                  </select>
                </label>

                <label className="realestate-field">
                  <span>Price</span>
                  <input
                    name="priceLabel"
                    value={listingForm.priceLabel}
                    onChange={handleListingInputChange}
                    placeholder="Ex: 96 Lakhs"
                  />
                </label>

                <label className="realestate-field">
                  <span>Location</span>
                  <input name="location" value={listingForm.location} onChange={handleListingInputChange} />
                </label>

                <label className="realestate-field">
                  <span>Type</span>
                  <select name="type" value={listingForm.type} onChange={handleListingInputChange}>
                    <option value="Flat">Flat</option>
                    <option value="Villa">Villa</option>
                    <option value="Land">Land</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </label>

                <label className="realestate-field">
                  <span>Bedrooms</span>
                  <select name="bedrooms" value={listingForm.bedrooms} onChange={handleListingInputChange}>
                    <option value="0">Studio / NA</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </label>

                <label className="realestate-field">
                  <span>Furnishing</span>
                  <select
                    name="furnishing"
                    value={listingForm.furnishing}
                    onChange={handleListingInputChange}
                  >
                    <option value="Furnished">Furnished</option>
                    <option value="Semi Furnished">Semi Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </label>

                <label className="realestate-field">
                  <span>Area (sq ft)</span>
                  <input
                    name="areaSqft"
                    type="number"
                    min="100"
                    value={listingForm.areaSqft}
                    onChange={handleListingInputChange}
                  />
                </label>

                <button type="submit" className="realestate-primary-button">
                  {editListingId ? "Update listing" : "Submit listing"}
                </button>
              </form>
            </article>
          ) : null}

          {activeRole === "admin" ? (
            <article className="realestate-operations-grid">
              <section className="realestate-surface-card">
                <div className="realestate-section-heading">
                  <h2>Governance</h2>
                  <p>Approve listings, verify users, and manage fake-listing reports with a clear audit path.</p>
                </div>
                <div className="realestate-plan-list">
                  <div>
                    <strong>Approval queue</strong>
                    <span>{properties.filter((property) => !property.verified).length} listings pending verification</span>
                  </div>
                  <div>
                    <strong>User verification</strong>
                    <span>Mobile OTP, email login, and role-based access support</span>
                  </div>
                  <div>
                    <strong>Dispute desk</strong>
                    <span>{properties.reduce((total, property) => total + property.disputeCount, 0)} active reports</span>
                  </div>
                </div>
              </section>

              <section className="realestate-surface-card">
                <div className="realestate-section-heading">
                  <h2>Success metrics</h2>
                  <p>Investors and operators can monitor growth, engagement, and subscription revenue.</p>
                </div>
                <div className="realestate-plan-list">
                  <div>
                    <strong>Listings scale</strong>
                    <span>{properties.length} live listings across sale, rent, and project supply</span>
                  </div>
                  <div>
                    <strong>Lead conversion</strong>
                    <span>{leadBoard.filter((lead) => lead.priority === "Hot").length} hot prospects in current pipeline</span>
                  </div>
                  <div>
                    <strong>Recurring revenue</strong>
                    <span>Premium plans from brokers, featured boosts, and project placements</span>
                  </div>
                </div>
              </section>
            </article>
          ) : null}

          <article className="realestate-operations-grid">
            <section className="realestate-surface-card">
              <div className="realestate-section-heading">
                <h2>Platform architecture</h2>
                <p>Core entities and integrations mapped directly from the FRS.</p>
              </div>
              <div className="realestate-chip-cloud">
                {["Users", "Properties", "Property Images", "Leads", "Messages", "Subscriptions", "Reviews"].map(
                  (item) => (
                    <span key={item}>{item}</span>
                  )
                )}
              </div>
              <div className="realestate-chip-cloud integrations">
                {["Google Maps API", "Razorpay", "Stripe", "SMS / OTP", "Push notifications"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>

            <section className="realestate-surface-card">
              <div className="realestate-section-heading">
                <h2>Future roadmap</h2>
                <p>AI recommendations, 360 tours, loan tools, legal help, and blockchain verification are queued for expansion.</p>
              </div>
              <blockquote className="realestate-pitch">
                This platform transforms real estate into a digital-first marketplace, empowering
                individuals, brokers, and developers to transact efficiently while ensuring trust
                through verified listings and smart discovery.
              </blockquote>
            </section>
          </article>
        </div>

        <aside className="realestate-right-column">
          <article className="realestate-detail-card">
            {selectedProperty ? (
              <>
                <div className="realestate-detail-header">
                  <div>
                    <span className={`realestate-badge ${selectedProperty.verified ? "verified" : "pending"}`}>
                      {selectedProperty.verificationStatus}
                    </span>
                    <h2>{selectedProperty.title}</h2>
                    <p>{selectedProperty.location} · {selectedProperty.locality}</p>
                  </div>
                  <div className="realestate-inline-actions">
                    {canManageProperty(selectedProperty) ? (
                      <button
                        type="button"
                        className="realestate-inline-button"
                        onClick={() => handleEditListing(selectedProperty)}
                      >
                        Edit
                      </button>
                    ) : null}
                    {canManageProperty(selectedProperty) ? (
                      <button
                        type="button"
                        className="realestate-inline-button danger"
                        onClick={handleDeleteCurrentListing}
                      >
                        Delete
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="realestate-inline-button"
                      onClick={() => handleFavoriteToggle(selectedProperty)}
                    >
                      {favoriteIds.has(`realestate-${selectedProperty.id}`) ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>

                <div className="realestate-detail-media">
                  <strong>{selectedProperty.image}</strong>
                  <span>{selectedProperty.hasVideoTour ? "Images and video tour available" : "Images and gallery available"}</span>
                </div>

                <div className="realestate-detail-price-row">
                  <strong>{selectedProperty.priceLabel}</strong>
                  <span>{selectedProperty.type} · {selectedProperty.intent}</span>
                </div>

                <div className="realestate-detail-specs">
                  <span>{selectedProperty.bedrooms || "Studio"} bed</span>
                  <span>{selectedProperty.bathrooms} bath</span>
                  <span>{selectedProperty.area}</span>
                  <span>{selectedProperty.furnishing}</span>
                </div>

                <p className="realestate-description">{selectedProperty.description}</p>

                <div className="realestate-chip-cloud">
                  {selectedProperty.amenities.map((amenity) => (
                    <span key={amenity}>{amenity}</span>
                  ))}
                </div>

                <div className="realestate-map-card">
                  <strong>Map location</strong>
                  <span>{selectedProperty.mapLabel}</span>
                </div>

                <div className="realestate-contact-card">
                  <strong>{selectedProperty.sellerName}</strong>
                  <span>{selectedProperty.sellerRole} · {selectedProperty.languageSupport.join(", ")}</span>
                  <span>{selectedProperty.rating.toFixed(1)} / 5 from {selectedProperty.reviewCount} reviews</span>
                </div>

                <div className="realestate-action-stack">
                  <button type="button" className="realestate-primary-button" onClick={handleEnquirySubmit}>
                    Send enquiry
                  </button>
                  <button
                    type="button"
                    className="realestate-secondary-button"
                    onClick={() => setStatusMessage(`Call request shared with ${selectedProperty.sellerName}.`)}
                  >
                    Call owner / agent
                  </button>
                  <button
                    type="button"
                    className="realestate-secondary-button"
                    onClick={() => setStatusMessage(`Price drop alert enabled for ${selectedProperty.title}.`)}
                  >
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
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Type a message"
                    />
                    <button type="button" onClick={handleSendMessage}>
                      Send
                    </button>
                  </div>
                </section>

                <section className="realestate-review-section">
                  <div className="realestate-section-heading">
                    <h3>Reviews and reporting</h3>
                    <p>Rate trusted agents and flag suspicious behavior quickly.</p>
                  </div>
                  <div className="realestate-review-list">
                    {selectedProperty.reviews.length ? (
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
                    <button
                      type="button"
                      className="realestate-inline-button"
                      onClick={handleReviewSubmit}
                    >
                      Rate agent / builder
                    </button>
                    <button
                      type="button"
                      className="realestate-inline-button danger"
                      onClick={handleReportSubmit}
                    >
                      Report fake listing
                    </button>
                  </div>
                </section>

                {similarProperties.length ? (
                  <section className="realestate-similar-section">
                    <div className="realestate-section-heading">
                      <h3>Similar properties</h3>
                      <p>Nearby supply to keep discovery moving.</p>
                    </div>
                    <div className="realestate-similar-list">
                      {similarProperties.map((property) => (
                        <button
                          key={property.id}
                          type="button"
                          className="realestate-similar-item"
                          onClick={() => setSelectedPropertyId(property.id)}
                        >
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
                      <button type="button" className="realestate-inline-button" onClick={() => handleAdminAction("Approval")}>
                        Approve listing
                      </button>
                      <button type="button" className="realestate-inline-button" onClick={() => handleAdminAction("User verification")}>
                        Verify user
                      </button>
                      <button type="button" className="realestate-inline-button danger" onClick={() => handleAdminAction("Reject")}>
                        Reject listing
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <div className="realestate-empty-state">
                No properties match the current filters. Adjust search criteria to continue.
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
};

export default RealEstate;

